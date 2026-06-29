import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFirestore, useDatabase } from '../firebase/provider';
import { ref as databaseRef, set as databaseSet, update as databaseUpdate, remove as databaseRemove, onValue } from 'firebase/database';
import { doc } from '@/firebase/firestore-compat';

export interface ChessPlayer {
  uid: string;
  username: string;
  avatarUrl: string;
}

export interface ChessGameState {
  id: string;
  roomId: string;
  white: ChessPlayer | null;
  black: ChessPlayer | null;
  turn: 'w' | 'b';
  fen: string;
  status: 'lobby' | 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';
  winner?: string;
  isBotMode?: boolean;
  turnStartTime?: any;
  matchStartTime?: any;
  missedTurns?: Record<string, number>;
  updatedAt: any;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function useChessEngine(roomId: string | null, userId: string | null) {
  const firestore = useFirestore();
  const database = useDatabase();
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const gamePath = roomId ? `games/chess_${roomId}` : null;

  useEffect(() => {
    if (!database || !gamePath) { setIsLoading(false); return; }
    const gameRef = databaseRef(database, gamePath);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setGameState({
          ...val,
          matchStartTime: val.matchStartTime ? { toDate: () => new Date(val.matchStartTime) } : null,
          turnStartTime: val.turnStartTime ? { toDate: () => new Date(val.turnStartTime) } : null,
          updatedAt: val.updatedAt ? { toDate: () => new Date(val.updatedAt) } : null,
        });
      } else {
        setGameState(null);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, [database, gamePath]);

  const startMatch = useCallback(async (userProfile: any, isBot: boolean = false) => {
    if (!database || !gamePath || !userId || !roomId) return;

    if (!gameState || ['ended', 'checkmate', 'stalemate', 'draw', 'resigned'].includes(gameState.status)) {
      await databaseSet(databaseRef(database, gamePath), {
        id: `chess_${roomId}`,
        roomId,
        white: { uid: userId, username: userProfile?.username || 'White', avatarUrl: userProfile?.avatarUrl || '' },
        black: isBot ? { uid: 'bot', username: 'Robot 🤖', avatarUrl: 'bot' } : null,
        turn: 'w',
        fen: INITIAL_FEN,
        status: isBot ? 'playing' : 'lobby',
        isBotMode: isBot,
        matchStartTime: isBot ? Date.now() : null,
        turnStartTime: isBot ? Date.now() : null,
        missedTurns: isBot ? { [userId]: 0, bot: 0 } : null,
        updatedAt: Date.now(),
      });
    } else if (gameState.status === 'lobby' && !gameState.black && gameState.white?.uid !== userId) {
      await databaseUpdate(databaseRef(database, gamePath), {
        black: { uid: userId, username: userProfile?.username || 'Black', avatarUrl: userProfile?.avatarUrl || '' },
        status: 'lobby',
        updatedAt: Date.now(),
      });
    }
  }, [database, gamePath, gameState, userId, roomId]);

  const startGame = useCallback(async () => {
    if (!database || !gamePath || !gameState) return;
    const isHost = gameState.white?.uid === userId;
    if (!isHost) return;
    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'playing',
        matchStartTime: Date.now(),
        turnStartTime: Date.now(),
        missedTurns: {
          [gameState.white?.uid || 'white']: 0,
          [gameState.black?.uid || 'black']: 0,
        },
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to start chess match:', err);
    }
  }, [database, gamePath, gameState, userId]);

  const makeMove = useCallback(async (newFen: string) => {
    if (!database || !gamePath || !gameState || gameState.status !== 'playing') return;
    const nextTurn = gameState.turn === 'w' ? 'b' : 'w';
    const currentTurnUid = gameState.turn === 'w' ? gameState.white?.uid : gameState.black?.uid;
    const newMissedTurns = { ...(gameState.missedTurns || {}) };
    if (currentTurnUid) {
      newMissedTurns[currentTurnUid] = 0;
    }
    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        fen: newFen,
        turn: nextTurn,
        turnStartTime: Date.now(),
        missedTurns: newMissedTurns,
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, gameState]);

  const endGame = useCallback(async (status: 'checkmate' | 'stalemate' | 'draw' | 'ended' | 'resigned', winnerId?: string) => {
    if (!database || !gamePath) return;
    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        status,
        winner: winnerId || null,
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath]);

  // Host referee logic for turn timeouts and match limit
  useEffect(() => {
    if (!database || !gamePath || !gameState || gameState.status !== 'playing' || !userId) return;

    const isHost = gameState.white?.uid === userId;
    if (!isHost) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const turnStart = gameState.turnStartTime ? (gameState.turnStartTime.seconds ? gameState.turnStartTime.seconds * 1000 : new Date(gameState.turnStartTime).getTime()) : now;
      const turnElapsed = now - turnStart;

      if (turnElapsed >= 30000) {
        const activeColor = gameState.turn;
        const activePlayerUid = activeColor === 'w' ? gameState.white?.uid : gameState.black?.uid;
        const opponentUid = activeColor === 'w' ? gameState.black?.uid : gameState.white?.uid;
        
        if (activePlayerUid) {
          const newMissedCount = (gameState.missedTurns?.[activePlayerUid] || 0) + 1;
          const updatedMissedTurns = { ...(gameState.missedTurns || {}), [activePlayerUid]: newMissedCount };

          if (newMissedCount >= 3) {
            clearInterval(interval);
            await databaseUpdate(databaseRef(database, gamePath), {
              status: 'resigned',
              winner: opponentUid || null,
              updatedAt: Date.now(),
            });
          } else {
            const nextTurn = activeColor === 'w' ? 'b' : 'w';
            await databaseUpdate(databaseRef(database, gamePath), {
              turn: nextTurn,
              turnStartTime: Date.now(),
              missedTurns: updatedMissedTurns,
              updatedAt: Date.now(),
            });
          }
        }
      }

      const matchStart = gameState.matchStartTime ? (gameState.matchStartTime.seconds ? gameState.matchStartTime.seconds * 1000 : new Date(gameState.matchStartTime).getTime()) : now;
      const matchElapsed = now - matchStart;
      if (matchElapsed >= 1200000) { // 20 mins
        clearInterval(interval);
        await databaseUpdate(databaseRef(database, gamePath), {
          status: 'draw',
          winner: null,
          updatedAt: Date.now(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [database, gamePath, gameState, userId]);

  return {
    gameState,
    isLoading,
    startMatch,
    startGame,
    makeMove,
    endGame,
  };
}
