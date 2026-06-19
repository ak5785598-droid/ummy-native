import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFirestore } from '../firebase/provider';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  runTransaction,
  increment,
} from '@/firebase/firestore-compat';

export interface LudoPlayer {
  uid: string;
  username: string;
  avatarUrl: string;
  color: 'red' | 'blue' | 'yellow' | 'green';
  isReady: boolean;
  isActive: boolean;
}

export interface LudoPiece {
  id: string;
  ownerUid: string;
  color: 'red' | 'blue' | 'yellow' | 'green';
  position: number; // 0: Home, 1-52: Path, 53-57: Home Stretch, 58: Finished
}

export interface LudoGameState {
  id: string;
  roomId: string;
  players: LudoPlayer[];
  pieces: LudoPiece[];
  turn: string;
  dice: number | null;
  diceRolled: boolean;
  status: 'lobby' | 'playing' | 'ended';
  winner?: string;
  updatedAt: any;
}

const COLOR_ORDER: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];

export function useLudoEngine(roomId: string | null, userId: string | null) {
  const firestore = useFirestore();
  const [gameState, setGameState] = useState<LudoGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const gameDocRef = useMemo(
    () => (!firestore || !roomId) ? null : doc(firestore, 'games', `ludo_${roomId}`),
    [firestore, roomId]
  );

  useEffect(() => {
    if (!gameDocRef) { setIsLoading(false); return; }
    const unsub = onSnapshot(gameDocRef, (snap: any) => {
      if (snap.exists()) {
        setGameState(snap.data() as LudoGameState);
      } else {
        setGameState(null);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, [gameDocRef]);

  const joinLobby = useCallback(async (userProfile: any) => {
    if (!gameDocRef || !userId || !userProfile) return;

    if (!gameState) {
      // Create new game
      const initialPieces: LudoPiece[] = [];
      COLOR_ORDER.forEach(color => {
        for (let i = 0; i < 4; i++) {
          initialPieces.push({ id: `${color}_${i}`, ownerUid: '', color, position: 0 });
        }
      });

      await setDoc(gameDocRef, {
        id: `ludo_${roomId}`,
        roomId,
        players: [{
          uid: userId,
          username: userProfile.username || 'Player 1',
          avatarUrl: userProfile.avatarUrl || '',
          color: 'red',
          isReady: true,
          isActive: true,
        }],
        pieces: initialPieces,
        turn: userId,
        dice: null,
        diceRolled: false,
        status: 'lobby',
        updatedAt: new Date(),
      });
    } else {
      // Join existing
      if (gameState.players.length >= 4) return;
      if (gameState.players.find((p: any) => p.uid === userId)) return;

      const assignedColor = COLOR_ORDER[gameState.players.length];

      try {
        await runTransaction(firestore!, async (transaction: any) => {
          const snap = await transaction.get(gameDocRef);
          if (!snap.exists()) return;

          const data = snap.data();
          const newPlayers = [...data.players, {
            uid: userId,
            username: userProfile.username || `Player ${data.players.length + 1}`,
            avatarUrl: userProfile.avatarUrl || '',
            color: assignedColor,
            isReady: true,
            isActive: true,
          }];

          // Assign ownerUid to pieces of this color
          const newPieces = data.pieces.map((p: any) =>
            p.color === assignedColor ? { ...p, ownerUid: userId } : p
          );

          transaction.update(gameDocRef, {
            players: newPlayers,
            pieces: newPieces,
            status: newPlayers.length >= 2 ? 'playing' : 'lobby',
            updatedAt: new Date(),
          });
        });
      } catch (err) {
        console.error('Failed to join ludo:', err);
      }
    }
  }, [gameDocRef, userId, gameState, roomId, firestore]);

  const rollDice = useCallback(async () => {
    if (!gameDocRef || !gameState || gameState.turn !== userId || gameState.diceRolled) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    try {
      await updateDoc(gameDocRef, {
        dice: roll,
        diceRolled: true,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState, userId]);

  const movePiece = useCallback(async (pieceId: string) => {
    if (!gameDocRef || !gameState || gameState.turn !== userId || !gameState.diceRolled) return;

    const dice = gameState.dice;
    if (!dice) return;

    const pieceIndex = gameState.pieces.findIndex((p: any) => p.id === pieceId);
    if (pieceIndex === -1) return;

    const piece = gameState.pieces[pieceIndex];
    if (piece.ownerUid !== userId) return;

    let newPos = piece.position;

    if (newPos === 0) {
      if (dice === 6) newPos = 1;
      else return;
    } else {
      newPos += dice;
    }

    if (newPos > 58) return;

    const updatedPieces = [...gameState.pieces];
    updatedPieces[pieceIndex] = { ...piece, position: newPos };

    // Check for capture (landing on same cell as opponent)
    if (newPos >= 1 && newPos <= 52) {
      for (let i = 0; i < updatedPieces.length; i++) {
        const other = updatedPieces[i];
        if (other.id === pieceId) continue;
        if (other.position === newPos && other.ownerUid !== userId && other.position >= 1 && other.position <= 52) {
          updatedPieces[i] = { ...other, position: 0 }; // Send back to home
        }
      }
    }

    // Check win (all 4 pieces at position 58)
    const myPieces = updatedPieces.filter(p => p.ownerUid === userId);
    const allFinished = myPieces.every(p => p.position >= 58);

    // Extra turn on 6
    const nextPlayerIndex = (gameState.players.findIndex((p: any) => p.uid === userId) + 1) % gameState.players.length;
    const nextTurn = dice === 6 ? userId : gameState.players[nextPlayerIndex].uid;

    try {
      await updateDoc(gameDocRef, {
        pieces: updatedPieces,
        turn: nextTurn,
        dice: null,
        diceRolled: false,
        ...(allFinished ? { status: 'ended', winner: userId } : {}),
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState, userId]);

  return {
    gameState,
    isLoading,
    joinLobby,
    rollDice,
    movePiece,
  };
}
