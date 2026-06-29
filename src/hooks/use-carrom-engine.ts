import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFirestore, useDatabase } from '../firebase/provider';
import { ref as databaseRef, set as databaseSet, update as databaseUpdate, remove as databaseRemove, onValue } from 'firebase/database';
import { doc, runTransaction, increment } from '@/firebase/firestore-compat';
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
  const database = useDatabase();

  const gamePath = roomId ? `games/carrom_${roomId}` : null;

  useEffect(() => {
    if (!database || !gamePath) { setIsLoading(false); return; }
    const gameRef = databaseRef(database, gamePath);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setGameState({
          ...val,
          matchStartTime: val.matchStartTime ? { toDate: () => new Date(val.matchStartTime) } : null,
          updatedAt: val.updatedAt ? { toDate: () => new Date(val.updatedAt) } : null,
        });
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, [database, gamePath]);

  const initializeGame = useCallback(async () => {
    if (!database || !gamePath || !userId || !roomId) return;

    if (!gameState || gameState.status === 'ended') {
      await databaseSet(databaseRef(database, gamePath), {
        id: `carrom_${roomId}`,
        roomId,
        players: [],
        turn: '',
        strikerPos: 50,
        pieces: [],
        status: 'loading',
        mode: 'none',
        entryFee: 0,
        updatedAt: Date.now(),
      });

      setTimeout(async () => {
        try { await databaseUpdate(databaseRef(database, gamePath), { status: 'mode_select' }); } catch {}
      }, 5000);
    }
  }, [database, gamePath, userId, gameState, roomId]);

  const selectMode = useCallback(async (mode: 'freestyle' | 'professional', entryFee: number = 0, isBot: boolean = false, userProfile?: any) => {
    if (!database || !gamePath || gameState?.status !== 'mode_select') return;
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

        await databaseUpdate(databaseRef(database, gamePath), {
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
          matchStartTime: Date.now(),
          turnStartTime: Date.now(),
          missedTurns: { [userId]: 0, bot: 0 },
          updatedAt: Date.now(),
        });
      } else {
        await databaseUpdate(databaseRef(database, gamePath), {
          status: 'lobby',
          mode,
          entryFee,
          updatedAt: Date.now(),
        });
      }
    } catch {}
  }, [database, gamePath, gameState, userId]);

  const joinArena = useCallback(async (userProfile: any, isBot: boolean = false) => {
    if (!database || !gamePath || !userId || !userProfile || gameState?.status !== 'lobby' || !roomId) return;

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

      await databaseUpdate(databaseRef(database, gamePath), {
        players: [...gameState.players, ...playersToAdd],
        isBotMode: isBot,
        matchStartTime: isBot ? Date.now() : null,
        turnStartTime: isBot ? Date.now() : null,
        missedTurns: isBot ? { [userId]: 0, bot: 0 } : null,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to join arena:', err);
    }
  }, [database, gamePath, userId, gameState, firestore, roomId]);

  const startMatch = useCallback(async () => {
    if (!database || !gamePath || !gameState || gameState.status !== 'lobby') return;
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
      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'playing',
        pieces: initialPieces,
        turn: gameState.players[0].uid,
        matchStartTime: Date.now(),
        turnStartTime: Date.now(),
        missedTurns: gameState.players.reduce((acc: any, p: any) => { acc[p.uid] = 0; return acc; }, {}),
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, gameState]);

  const updateStriker = useCallback(async (pos: number) => {
    if (!database || !gamePath || !gameState || gameState.status !== 'playing') return;
    const isBotTurn = gameState.turn === 'bot';
    const isMyTurn = gameState.turn === userId;
    const isHost = gameState.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;
    try { await databaseUpdate(databaseRef(database, gamePath), { strikerPos: pos }); } catch {}
  }, [database, gamePath, gameState, userId]);

  const strike = useCallback(async (angle: number, power: number) => {
    if (!database || !gamePath || !gameState || gameState.status !== 'playing') return;
    const isBotTurn = gameState.turn === 'bot';
    const isMyTurn = gameState.turn === userId;
    const isHost = gameState.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;

    const pieces = [...gameState.pieces.map(p => ({ ...p, position: { ...p.position }, velocity: { ...p.velocity } }))];
    const striker = pieces.find(p => p.id === 'striker');
    if (!striker) return;

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
      await databaseUpdate(databaseRef(database, gamePath), {
        pieces: finalPieces,
        turn: nextPlayer.uid,
        turnStartTime: Date.now(),
        missedTurns: newMissedTurns,
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, gameState, userId]);

  const endMatch = useCallback(async (winnerId: string) => {
    if (!database || !gamePath || !gameState || gameState.status !== 'playing' || !roomId) return;

    try {
      await runTransaction(firestore!, async (transaction: any) => {
        const entryFee = gameState.entryFee || 0;
        const totalPlayers = gameState.players.length;
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
      });

      const entryFee = gameState.entryFee || 0;
      const totalPlayers = gameState.players.length;
      const totalPool = entryFee * totalPlayers;
      const prize = Math.floor(totalPool * 0.9);

      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'ended',
        winner: winnerId,
        prize,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to end match:', err);
    }
  }, [database, gamePath, gameState, firestore, roomId]);

  // Host referee logic for Carrom
  useEffect(() => {
    if (!database || !gamePath || !gameState || gameState.status !== 'playing' || !userId) return;

    const isHost = gameState.players[0]?.uid === userId;
    if (!isHost) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const turnStart = gameState.turnStartTime || now;
      const turnElapsed = now - turnStart;

      if (turnElapsed >= 30000) {
        const activePlayerUid = gameState.turn;
        
        const newMissedCount = (gameState.missedTurns?.[activePlayerUid] || 0) + 1;
        const updatedMissedTurns = { ...(gameState.missedTurns || {}), [activePlayerUid]: newMissedCount };

        if (newMissedCount >= 3) {
          clearInterval(interval);
          const otherPlayer = gameState.players.find((p: any) => p.uid !== activePlayerUid);
          await databaseUpdate(databaseRef(database, gamePath), {
            status: 'ended',
            winner: otherPlayer?.uid || 'bot',
            updatedAt: Date.now(),
          });
        } else {
          const nextPlayerIndex = (gameState.players.findIndex((p: any) => p.uid === activePlayerUid) + 1) % gameState.players.length;
          const nextPlayer = gameState.players[nextPlayerIndex];

          await databaseUpdate(databaseRef(database, gamePath), {
            turn: nextPlayer.uid,
            turnStartTime: Date.now(),
            missedTurns: updatedMissedTurns,
            updatedAt: Date.now(),
          });
        }
      }

      const matchStart = gameState.matchStartTime || now;
      const matchElapsed = now - matchStart;
      if (matchElapsed >= 1200000) { // 20 mins
        clearInterval(interval);
        let bestPlayerUid = gameState.players[0].uid;
        let maxScore = -1;
        gameState.players.forEach((p: any) => {
          if (p.score > maxScore) {
            maxScore = p.score;
            bestPlayerUid = p.uid;
          }
        });

        await databaseUpdate(databaseRef(database, gamePath), {
          status: 'ended',
          winner: bestPlayerUid,
          updatedAt: Date.now(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [database, gamePath, gameState, userId]);

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
