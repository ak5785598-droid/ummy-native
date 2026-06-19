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

    if (!gameState) {
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
      }, 2000);
    }
  }, [gameDocRef, userId, gameState, roomId]);

  const selectMode = useCallback(async (mode: 'freestyle' | 'professional', entryFee: number = 0) => {
    if (!gameDocRef || gameState?.status !== 'mode_select') return;
    try {
      await updateDoc(gameDocRef, {
        status: 'lobby',
        mode,
        entryFee,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState]);

  const joinArena = useCallback(async (userProfile: any) => {
    if (!gameDocRef || !userId || !userProfile || gameState?.status !== 'lobby') return;

    const entryFee = gameState.entryFee || 0;
    if ((userProfile.coins || 0) < entryFee) return;

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

      if (entryFee > 0) {
        await runTransaction(firestore!, async (transaction: any) => {
          const userRef = doc(firestore!, 'users', userId);
          const profileRef = doc(firestore!, 'users', userId, 'profile', userId);
          const walletRef = doc(firestore!, 'walletTransactions', `${userId}_${Date.now()}`);

          transaction.update(userRef, { coins: increment(-entryFee) });
          transaction.update(profileRef, { coins: increment(-entryFee) });
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
        players: arrayUnion(newPlayer),
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
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState]);

  const updateStriker = useCallback(async (pos: number) => {
    if (!gameDocRef || !gameState || gameState.turn !== userId || gameState.status !== 'playing') return;
    try { await updateDoc(gameDocRef, { strikerPos: pos }); } catch {}
  }, [gameDocRef, gameState, userId]);

  const strike = useCallback(async (angle: number, power: number) => {
    if (!gameDocRef || !gameState || gameState.turn !== userId || gameState.status !== 'playing') return;

    const pieces = [...gameState.pieces.map(p => ({ ...p, position: { ...p.position }, velocity: { ...p.velocity } }))];
    const striker = pieces.find(p => p.id === 'striker');
    if (!striker) return;

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

    const currentPlayerIndex = gameState.players.findIndex((p: any) => p.uid === userId);
    const nextPlayer = gameState.players[(currentPlayerIndex + 1) % gameState.players.length];

    try {
      await updateDoc(gameDocRef, {
        pieces: finalPieces,
        turn: nextPlayer.uid,
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

          transaction.update(winnerRef, { coins: increment(prize) });
          transaction.update(winnerProfileRef, { coins: increment(prize) });
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
