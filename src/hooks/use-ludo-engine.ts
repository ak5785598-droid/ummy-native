import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFirestore } from '../firebase/provider';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  runTransaction,
  increment,
  deleteDoc,
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
  mode?: string;
  winner?: string;
  isBotMode?: boolean;
  turnStartTime?: any;
  matchStartTime?: any;
  missedTurns?: Record<string, number>;
  finishedRankings?: string[];
  updatedAt: any;
}

const COLOR_START_INDEX = {
  blue: 0,
  red: 13,
  green: 26,
  yellow: 39,
};

const PATH_COORDS = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
  [6,0]
];

const HOME_BASE = {
  blue:   [[1.7, 1.7], [1.7, 3.3], [3.3, 1.7], [3.3, 3.3]],
  red:    [[1.7, 10.7], [1.7, 12.3], [3.3, 10.7], [3.3, 12.3]],
  green:  [[10.7, 10.7], [10.7, 12.3], [12.3, 10.7], [12.3, 12.3]],
  yellow: [[10.7, 1.7], [10.7, 3.3], [12.3, 1.7], [12.3, 3.3]],
};

const HOME_STRETCH = {
  blue:   [[7,1],[7,2],[7,3],[7,4],[7,5]],
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

function getPieceCoords(piece: any): [number, number] | null {
  if (piece.position === 0) {
    const bases = HOME_BASE[piece.color as 'blue'|'red'|'green'|'yellow'];
    const idx = parseInt(piece.id.split('_')[1]);
    return bases[idx] as [number, number];
  }
  if (piece.position >= 58) return [7, 7];
  if (piece.position >= 53) {
    const stretch = HOME_STRETCH[piece.color as 'blue'|'red'|'green'|'yellow'];
    return stretch[piece.position - 53] as [number, number];
  }
  const startIdx = COLOR_START_INDEX[piece.color as 'blue'|'red'|'green'|'yellow'];
  const pathIdx = (startIdx + piece.position - 1) % PATH_COORDS.length;
  return PATH_COORDS[pathIdx] as [number, number];
}

const SAFE_COORDS = [
  [1, 8], [2, 6],
  [6, 1], [8, 2],
  [8, 13], [6, 12],
  [13, 6], [12, 8]
];

function isSafeCell(coord: [number, number]): boolean {
  return SAFE_COORDS.some(c => c[0] === coord[0] && c[1] === coord[1]);
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

  const joinLobby = useCallback(async (userProfile: any, mode: 'quick' | 'classic' = 'quick', isBot: boolean = false) => {
    if (!gameDocRef || !userId || !userProfile) return;

    if (!gameState || gameState.status === 'ended') {
      const initialPieces: LudoPiece[] = [];
      COLOR_ORDER.forEach(color => {
        for (let i = 0; i < 4; i++) {
          initialPieces.push({ 
            id: `${color}_${i}`, 
            ownerUid: color === 'red' ? userId : (isBot && color === 'green' ? 'bot' : ''), 
            color, 
            position: 0 
          });
        }
      });

      await setDoc(gameDocRef, {
        id: `ludo_${roomId}`,
        roomId,
        players: [
          {
            uid: userId,
            username: userProfile.username || 'Player 1',
            avatarUrl: userProfile.avatarUrl || '',
            color: 'red',
            isReady: true,
            isActive: true,
          },
          ...(isBot ? [{
            uid: 'bot',
            username: 'Robot 🤖',
            avatarUrl: 'bot',
            color: 'green',
            isReady: true,
            isActive: true,
          }] : [])
        ],
        pieces: initialPieces,
        turn: userId,
        dice: 1,
        diceRolled: false,
        status: isBot ? 'playing' : 'lobby',
        mode,
        isBotMode: isBot,
        matchStartTime: isBot ? new Date() : null,
        turnStartTime: isBot ? new Date() : null,
        missedTurns: isBot ? { [userId]: 0, bot: 0 } : null,
        updatedAt: new Date(),
      });
    } else {
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

          const newPieces = data.pieces.map((p: any) =>
            p.color === assignedColor ? { ...p, ownerUid: userId } : p
          );

          transaction.update(gameDocRef, {
            players: newPlayers,
            pieces: newPieces,
            status: 'lobby',
            dice: 1,
            updatedAt: new Date(),
          });
        });
      } catch (err) {
        console.error('Failed to join ludo:', err);
      }
    }
  }, [gameDocRef, userId, gameState, roomId, firestore]);

  const startGame = useCallback(async () => {
    if (!gameDocRef || !gameState) return;
    const isHost = gameState.players[0]?.uid === userId;
    if (!isHost) return;
    try {
      await updateDoc(gameDocRef, {
        status: 'playing',
        matchStartTime: new Date(),
        turnStartTime: new Date(),
        missedTurns: gameState.players.reduce((acc: any, p: any) => { acc[p.uid] = 0; return acc; }, {}),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  }, [gameDocRef, gameState, userId]);

  const leaveLobby = useCallback(async () => {
    if (!gameDocRef || !gameState || !userId) return;
    const isHost = gameState.players[0]?.uid === userId;
    try {
      if (isHost) {
        await setDoc(gameDocRef, {
          ...gameState,
          status: 'ended',
          winner: 'closed',
          updatedAt: new Date(),
        });
      } else {
        const newPlayers = gameState.players.filter((p: any) => p.uid !== userId);
        const newPieces = gameState.pieces.map((p: any) =>
          p.ownerUid === userId ? { ...p, ownerUid: '' } : p
        );
        await updateDoc(gameDocRef, {
          players: newPlayers,
          pieces: newPieces,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Failed to leave lobby:', err);
    }
  }, [gameDocRef, gameState, userId]);

  const rollDice = useCallback(async () => {
    if (!gameDocRef || !gameState) return;
    const isBotTurn = gameState.turn === 'bot';
    const isMyTurn = gameState.turn === userId;
    const isHost = gameState.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;
    if (gameState.diceRolled) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    
    // Check if any pieces can move with this roll
    const activePlayerPieces = gameState.pieces.filter((p: any) => p.ownerUid === gameState.turn);
    const hasMovablePieces = activePlayerPieces.some((p: any) => {
      if (p.position === 0 && roll !== 6) return false;
      if (p.position >= 58) return false;
      if (p.position + roll > 58) return false;
      return true;
    });

    try {
      if (!hasMovablePieces) {
        const nextPlayerIndex = (gameState.players.findIndex((p: any) => p.uid === gameState.turn) + 1) % gameState.players.length;
        const nextTurn = gameState.players[nextPlayerIndex].uid;
        
        await updateDoc(gameDocRef, {
          dice: roll,
          diceRolled: true,
          updatedAt: new Date(),
        });
        
        setTimeout(async () => {
          try {
            await updateDoc(gameDocRef, {
              turn: nextTurn,
              dice: 1,
              diceRolled: false,
              turnStartTime: new Date(),
              updatedAt: new Date(),
            });
          } catch {}
        }, 1500);
      } else {
        await updateDoc(gameDocRef, {
          dice: roll,
          diceRolled: true,
          updatedAt: new Date(),
        });
      }
    } catch {}
  }, [gameDocRef, gameState, userId]);

  const movePiece = useCallback(async (pieceId: string) => {
    if (!gameDocRef || !gameState) return;
    const isBotTurn = gameState.turn === 'bot';
    const isMyTurn = gameState.turn === userId;
    const isHost = gameState.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;
    if (!gameState.diceRolled) return;

    const dice = gameState.dice;
    if (!dice) return;

    const pieceIndex = gameState.pieces.findIndex((p: any) => p.id === pieceId);
    if (pieceIndex === -1) return;

    const piece = gameState.pieces[pieceIndex];
    if (piece.ownerUid !== gameState.turn) return;

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

    if (newPos >= 1 && newPos <= 52) {
      const currentPieceCoords = getPieceCoords({ ...piece, position: newPos });
      if (currentPieceCoords && !isSafeCell(currentPieceCoords)) {
        for (let i = 0; i < updatedPieces.length; i++) {
          const other = updatedPieces[i];
          if (other.id === pieceId) continue;
          if (other.position >= 1 && other.position <= 52 && other.ownerUid !== gameState.turn) {
            const otherCoords = getPieceCoords(other);
            if (otherCoords && otherCoords[0] === currentPieceCoords[0] && otherCoords[1] === currentPieceCoords[1]) {
              updatedPieces[i] = { ...other, position: 0 };
            }
          }
        }
      }
    }

    const myPieces = updatedPieces.filter(p => p.ownerUid === gameState.turn);
    const hasOneFinished = myPieces.some(p => p.position >= 58);
    const allFinished = myPieces.every(p => p.position >= 58);

    const isQuick = (gameState.mode || 'quick') === 'quick';
    
    let isGameOver = false;
    let winner = gameState.winner || null;
    let newFinishedRankings = [...(gameState.finishedRankings || [])];

    if (isQuick) {
      if (hasOneFinished) {
        isGameOver = true;
        winner = gameState.turn;
        newFinishedRankings = [gameState.turn];
        
        // Populate remaining rankings by progress sum
        const remainingPlayers = gameState.players
          .filter((p: any) => p.uid !== gameState.turn)
          .map((p: any) => {
            const prog = updatedPieces
              .filter((piece: any) => piece.ownerUid === p.uid)
              .reduce((sum: number, piece: any) => sum + piece.position, 0);
            return { uid: p.uid, prog };
          })
          .sort((a, b) => b.prog - a.prog);
        remainingPlayers.forEach(p => newFinishedRankings.push(p.uid));
      }
    } else {
      // Classic Mode
      if (allFinished && !newFinishedRankings.includes(gameState.turn)) {
        newFinishedRankings.push(gameState.turn);
      }
      
      // Game ends when only 1 active player is left (or all finished)
      if (newFinishedRankings.length >= gameState.players.length - 1) {
        isGameOver = true;
        winner = newFinishedRankings[0] || gameState.turn;
        
        // Add the last remaining player to the end of finishedRankings
        const lastPlayer = gameState.players.find((p: any) => !newFinishedRankings.includes(p.uid));
        if (lastPlayer) {
          newFinishedRankings.push(lastPlayer.uid);
        }
      }
    }

    let nextTurn = gameState.turn;
    if (!isGameOver) {
      // Rotate turn, skipping players who have already finished
      const nextIdx = gameState.players.findIndex((p: any) => p.uid === gameState.turn);
      const shouldRollAgain = dice === 6 && (!allFinished || isQuick);
      
      if (!shouldRollAgain) {
        for (let i = 1; i <= gameState.players.length; i++) {
          const checkIdx = (nextIdx + i) % gameState.players.length;
          const checkPlayerUid = gameState.players[checkIdx].uid;
          if (!newFinishedRankings.includes(checkPlayerUid)) {
            nextTurn = checkPlayerUid;
            break;
          }
        }
      } else {
        nextTurn = gameState.turn;
      }
    }

    const newMissedTurns = { ...(gameState.missedTurns || {}) };
    if (gameState.turn) {
      newMissedTurns[gameState.turn] = 0;
    }

    try {
      await updateDoc(gameDocRef, {
        pieces: updatedPieces,
        turn: nextTurn,
        dice: 1,
        diceRolled: false,
        turnStartTime: new Date(),
        missedTurns: newMissedTurns,
        finishedRankings: newFinishedRankings,
        ...(isGameOver ? { status: 'ended', winner } : {}),
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState, userId]);

  // Host referee logic for Ludo
  useEffect(() => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing' || !userId) return;

    const isHost = gameState.players[0]?.uid === userId;
    if (!isHost) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const turnStart = gameState.turnStartTime ? (gameState.turnStartTime.seconds ? gameState.turnStartTime.seconds * 1000 : new Date(gameState.turnStartTime).getTime()) : now;
      const turnElapsed = now - turnStart;

      if (turnElapsed >= 30000) {
        const activePlayerUid = gameState.turn;
        
        const newMissedCount = (gameState.missedTurns?.[activePlayerUid] || 0) + 1;
        const updatedMissedTurns = { ...(gameState.missedTurns || {}), [activePlayerUid]: newMissedCount };

        if (newMissedCount >= 3) {
          clearInterval(interval);
          const otherPlayer = gameState.players.find((p: any) => p.uid !== activePlayerUid);
          await updateDoc(gameDocRef, {
            status: 'ended',
            winner: otherPlayer?.uid || 'bot',
            updatedAt: new Date(),
          });
        } else {
          const nextPlayerIndex = (gameState.players.findIndex((p: any) => p.uid === activePlayerUid) + 1) % gameState.players.length;
          const nextTurn = gameState.players[nextPlayerIndex].uid;

          await updateDoc(gameDocRef, {
            turn: nextTurn,
            dice: 1,
            diceRolled: false,
            turnStartTime: new Date(),
            missedTurns: updatedMissedTurns,
            updatedAt: new Date(),
          });
        }
      }

      const matchStart = gameState.matchStartTime ? (gameState.matchStartTime.seconds ? gameState.matchStartTime.seconds * 1000 : new Date(gameState.matchStartTime).getTime()) : now;
      const matchElapsed = now - matchStart;
      if (matchElapsed >= 1200000) { // 20 mins
        clearInterval(interval);
        const playerProgress: Record<string, number> = {};
        gameState.players.forEach((p: any) => {
          playerProgress[p.uid] = gameState.pieces
            .filter((piece: any) => piece.ownerUid === p.uid)
            .reduce((sum: number, piece: any) => sum + piece.position, 0);
        });
        
        let bestPlayerUid = gameState.players[0].uid;
        let maxProg = -1;
        gameState.players.forEach((p: any) => {
          if (playerProgress[p.uid] > maxProg) {
            maxProg = playerProgress[p.uid];
            bestPlayerUid = p.uid;
          }
        });

        await updateDoc(gameDocRef, {
          status: 'ended',
          winner: bestPlayerUid,
          updatedAt: new Date(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameDocRef, gameState, userId]);

  const resetGame = useCallback(async () => {
    if (!gameDocRef) return;
    try {
      await deleteDoc(gameDocRef);
    } catch (e) {
      console.log('Error resetting game:', e);
    }
  }, [gameDocRef]);

  return {
    gameState,
    isLoading,
    joinLobby,
    startGame,
    leaveLobby,
    rollDice,
    movePiece,
    resetGame,
  };
}

