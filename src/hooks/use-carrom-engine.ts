import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFirestore } from '../firebase/provider';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  increment,
  runTransaction,
} from '@/firebase/firestore-compat';
import { updatePhysics } from '../lib/carrom-physics';

export interface CarromPiece {
  id: string;
  type: 'white' | 'black' | 'queen' | 'striker';
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  isPocketed: boolean;
}

export interface CarromPlayer {
  uid: string;
  username: string;
  avatarUrl: string;
  score: number;
  isReady: boolean;
}

export interface CarromGameState {
  id: string;
  roomId: string;
  players: CarromPlayer[];
  turn: string;
  strikerPos: number;
  pieces: CarromPiece[];
  status: 'loading' | 'mode_select' | 'lobby' | 'playing' | 'ended';
  mode: 'freestyle' | 'professional' | 'none';
  entryFee: number;
  winner?: string;
  prize?: number;
  isBotMode?: boolean;
  turnStartTime?: any;
  matchStartTime?: any;
  missedTurns?: Record<string, number>;
  updatedAt: any;
}

export function useCarromEngine(roomId: string | null, userId: string | null) {
  const firestore = useFirestore();
  const [gameState, setGameState] = useState<CarromGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const gameDocRef = useMemo(
    () => (!firestore || !roomId) ? null : doc(firestore, 'games', `carrom_${roomId}`),
    [firestore, roomId]
  );

  useEffect(() => {
    if (!gameDocRef) { setIsLoading(false); return; }
    const unsub = onSnapshot(gameDocRef, (snap: any) => {
      if (snap.exists()) {
        setGameState(snap.data() as CarromGameState);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, [gameDocRef]);

  const initializeGame = useCallback(async () => {
    if (!gameDocRef || !userId) return;

    if (!gameState || gameState.status === 'ended') {
      await setDoc(gameDocRef, {
        id: `carrom_${roomId}`,
        roomId,
        players: [],
        turn: '',
        strikerPos: 50,
        pieces: [],
        status: 'loading',
        mode: 'none',
        entryFee: 0,
        updatedAt: new Date(),
      });

      setTimeout(async () => {
        try { await updateDoc(gameDocRef, { status: 'mode_select' }); } catch {}
      }, 5000);
    }
  }, [gameDocRef, userId, gameState, roomId]);

  const selectMode = useCallback(async (mode: 'freestyle' | 'professional', entryFee: number = 0, isBot: boolean = false, userProfile?: any) => {
    if (!gameDocRef || gameState?.status !== 'mode_select') return;
    try {
      if (isBot && userProfile && userId) {
        const initialPieces: CarromPiece[] = [
          { id: 'queen', type: 'queen', position: { x: 50, y: 50 }, velocity: { x: 0, y: 0 }, isPocketed: false },
          ...[...Array(6)].map((_, i) => ({
            id: `r1-${i}`,
            type: (i % 2 === 0 ? 'white' : 'black') as 'white' | 'black',
            position: { x: 50 + Math.cos(i * 60 * Math.PI / 180) * 8, y: 50 + Math.sin(i * 60 * Math.PI / 180) * 8 },
            velocity: { x: 0, y: 0 },
            isPocketed: false,
          })),
          ...[...Array(12)].map((_, i) => ({
            id: `r2-${i}`,
            type: (i % 3 === 0 ? 'white' : 'black') as 'white' | 'black',
            position: { x: 50 + Math.cos(i * 30 * Math.PI / 180) * 16, y: 50 + Math.sin(i * 30 * Math.PI / 180) * 16 },
            velocity: { x: 0, y: 0 },
            isPocketed: false,
          })),
          { id: 'striker', type: 'striker', position: { x: 50, y: 85 }, velocity: { x: 0, y: 0 }, isPocketed: false },
        ];

        await updateDoc(gameDocRef, {
          status: 'playing',
          mode,
          entryFee,
          isBotMode: true,
          players: [
            {
              uid: userId,
              username: userProfile.username || 'Player 1',
              avatarUrl: userProfile.avatarUrl || '',
              score: 0,
              isReady: true,
            },
            {
              uid: 'bot',
              username: 'Robot 🤖',
              avatarUrl: 'bot',
              score: 0,
              isReady: true,
            }
          ],
          pieces: initialPieces,
          turn: userId,
          matchStartTime: new Date(),
          turnStartTime: new Date(),
          missedTurns: { [userId]: 0, bot: 0 },
          updatedAt: new Date(),
        });
      } else {
        await updateDoc(gameDocRef, {
          status: 'lobby',
          mode,
          entryFee,
          updatedAt: new Date(),
        });
      }
    } catch {}
  }, [gameDocRef, gameState, userId]);

  const joinArena = useCallback(async (userProfile: any, isBot: boolean = false) => {
    if (!gameDocRef || !userId || !userProfile || gameState?.status !== 'lobby') return;

    const entryFee = gameState.entryFee || 0;
    if ((userProfile?.wallet?.coins || 0) < entryFee) return;

    const existingPlayer = gameState.players.find((p: any) => p.uid === userId);
    if (existingPlayer) return;
    if (gameState.players.length >= 4) return;

    try {
      const newPlayer: CarromPlayer = {
        uid: userId,
        username: userProfile.username || 'P',
        avatarUrl: userProfile.avatarUrl || '',
        score: 0,
        isReady: false,
      };

      const playersToAdd = [newPlayer];
      if (isBot) {
        playersToAdd.push({
          uid: 'bot',
          username: 'Robot 🤖',
          avatarUrl: 'bot',
          score: 0,
          isReady: true,
        });
      }

      if (entryFee > 0) {
        await runTransaction(firestore!, async (transaction: any) => {
          const userRef = doc(firestore!, 'users', userId);
          const profileRef = doc(firestore!, 'users', userId, 'profile', userId);
          const walletRef = doc(firestore!, 'walletTransactions', `${userId}_${Date.now()}`);

          transaction.update(userRef, { 'wallet.coins': increment(-entryFee) });
          transaction.update(profileRef, { 'wallet.coins': increment(-entryFee) });
          transaction.set(walletRef, {
            userId,
            amount: -entryFee,
            type: 'game_entry',
            gameId: `carrom_${roomId}`,
            timestamp: new Date(),
          });
        });
      }

      await updateDoc(gameDocRef, {
        players: [...gameState.players, ...playersToAdd],
        isBotMode: isBot,
        matchStartTime: isBot ? new Date() : null,
        turnStartTime: isBot ? new Date() : null,
        missedTurns: isBot ? { [userId]: 0, bot: 0 } : null,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to join arena:', err);
    }
  }, [gameDocRef, userId, gameState, firestore, roomId]);

  const startMatch = useCallback(async () => {
    if (!gameDocRef || !gameState || gameState.status !== 'lobby') return;
    if (gameState.players.length < 2) return;

    const initialPieces: CarromPiece[] = [
      { id: 'queen', type: 'queen', position: { x: 50, y: 50 }, velocity: { x: 0, y: 0 }, isPocketed: false },
      ...[...Array(6)].map((_, i) => ({
        id: `r1-${i}`,
        type: (i % 2 === 0 ? 'white' : 'black') as 'white' | 'black',
        position: { x: 50 + Math.cos(i * 60 * Math.PI / 180) * 8, y: 50 + Math.sin(i * 60 * Math.PI / 180) * 8 },
        velocity: { x: 0, y: 0 },
        isPocketed: false,
      })),
      ...[...Array(12)].map((_, i) => ({
        id: `r2-${i}`,
        type: (i % 3 === 0 ? 'white' : 'black') as 'white' | 'black',
        position: { x: 50 + Math.cos(i * 30 * Math.PI / 180) * 16, y: 50 + Math.sin(i * 30 * Math.PI / 180) * 16 },
        velocity: { x: 0, y: 0 },
        isPocketed: false,
      })),
      { id: 'striker', type: 'striker', position: { x: 50, y: 85 }, velocity: { x: 0, y: 0 }, isPocketed: false },
    ];

    try {
      await updateDoc(gameDocRef, {
        status: 'playing',
        pieces: initialPieces,
        turn: gameState.players[0].uid,
        matchStartTime: new Date(),
        turnStartTime: new Date(),
        missedTurns: gameState.players.reduce((acc: any, p: any) => { acc[p.uid] = 0; return acc; }, {}),
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState]);

  const updateStriker = useCallback(async (pos: number) => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing') return;
    const isBotTurn = gameState.turn === 'bot';
    const isMyTurn = gameState.turn === userId;
    const isHost = gameState.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;
    try { await updateDoc(gameDocRef, { strikerPos: pos }); } catch {}
  }, [gameDocRef, gameState, userId]);

  const strike = useCallback(async (angle: number, power: number) => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing') return;
    const isBotTurn = gameState.turn === 'bot';
    const isMyTurn = gameState.turn === userId;
    const isHost = gameState.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;

    const pieces = [...gameState.pieces.map(p => ({ ...p, position: { ...p.position }, velocity: { ...p.velocity } }))];
    const striker = pieces.find(p => p.id === 'striker');
    if (!striker) return;

    // Sync current user-dragged striker position to physics
    striker.position.x = gameState.strikerPos ?? 50;
    striker.position.y = 85;

    const rad = (angle - 90) * Math.PI / 180;
    striker.velocity = {
      x: Math.cos(rad) * power,
      y: Math.sin(rad) * power,
    };

    let currentPieces = pieces;
    let iterations = 0;
    const MAX_ITER = 300;

    while (iterations < MAX_ITER) {
      const { pieces: nextPieces, hasMovement } = updatePhysics(currentPieces);
      currentPieces = nextPieces;
      if (!hasMovement) break;
      iterations++;
    }

    const finalPieces = currentPieces.map(p => {
      if (p.id === 'striker') {
        return { ...p, position: { x: 50, y: 85 }, velocity: { x: 0, y: 0 }, isPocketed: false };
      }
      return p;
    });

    const currentPlayerIndex = gameState.players.findIndex((p: any) => p.uid === gameState.turn);
    const nextPlayer = gameState.players[(currentPlayerIndex + 1) % gameState.players.length];

    const newMissedTurns = { ...(gameState.missedTurns || {}) };
    if (gameState.turn) {
      newMissedTurns[gameState.turn] = 0;
    }

    try {
      await updateDoc(gameDocRef, {
        pieces: finalPieces,
        turn: nextPlayer.uid,
        turnStartTime: new Date(),
        missedTurns: newMissedTurns,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState, userId]);

  const endMatch = useCallback(async (winnerId: string) => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing') return;

    try {
      await runTransaction(firestore!, async (transaction: any) => {
        const gameSnap = await transaction.get(gameDocRef);
        if (!gameSnap.exists()) return;

        const data = gameSnap.data();
        const entryFee = data.entryFee || 0;
        const totalPlayers = data.players.length;
        const totalPool = entryFee * totalPlayers;
        const prize = Math.floor(totalPool * 0.9);

        if (prize > 0) {
          const winnerRef = doc(firestore!, 'users', winnerId);
          const winnerProfileRef = doc(firestore!, 'users', winnerId, 'profile', winnerId);
          const walletRef = doc(firestore!, 'walletTransactions', `win_${winnerId}_${Date.now()}`);

          transaction.update(winnerRef, { 'wallet.coins': increment(prize) });
          transaction.update(winnerProfileRef, { 'wallet.coins': increment(prize) });
          transaction.set(walletRef, {
            userId: winnerId,
            amount: prize,
            type: 'game_win',
            gameId: `carrom_${roomId}`,
            timestamp: new Date(),
          });
        }

        transaction.update(gameDocRef, {
          status: 'ended',
          winner: winnerId,
          prize,
          updatedAt: new Date(),
        });
      });
    } catch (err) {
      console.error('Failed to end match:', err);
    }
  }, [gameDocRef, gameState, firestore, roomId]);

  // Host referee logic for Carrom
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
          const currentPlayerIndex = gameState.players.findIndex((p: any) => p.uid === activePlayerUid);
          const nextPlayer = gameState.players[(currentPlayerIndex + 1) % gameState.players.length];

          await updateDoc(gameDocRef, {
            turn: nextPlayer.uid,
            turnStartTime: new Date(),
            missedTurns: updatedMissedTurns,
            updatedAt: new Date(),
          });
        }
      }

      const matchStart = gameState.matchStartTime ? (gameState.matchStartTime.seconds ? gameState.matchStartTime.seconds * 1000 : new Date(gameState.matchStartTime).getTime()) : now;
      const matchElapsed = now - matchStart;
      if (matchElapsed >= 900000) { // 15 mins
        clearInterval(interval);
        let bestPlayerUid = gameState.players[0].uid;
        let maxScore = -1;
        gameState.players.forEach((p: any) => {
          if (p.score > maxScore) {
            maxScore = p.score;
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

  return {
    gameState,
    isLoading,
    initializeGame,
    selectMode,
    joinArena,
    startMatch,
    updateStriker,
    strike,
    endMatch,
  };

}
