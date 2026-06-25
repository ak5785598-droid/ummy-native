import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFirestore } from '../firebase/provider';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from '@/firebase/firestore-compat';

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
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const gameDocRef = useMemo(
    () => (!firestore || !roomId) ? null : doc(firestore, 'games', `chess_${roomId}`),
    [firestore, roomId]
  );

  useEffect(() => {
    if (!gameDocRef) { setIsLoading(false); return; }
    const unsub = onSnapshot(gameDocRef, (snap: any) => {
      if (snap.exists()) {
        setGameState(snap.data() as ChessGameState);
      } else {
        setGameState(null);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, [gameDocRef]);

  const startMatch = useCallback(async (userProfile: any, isBot: boolean = false) => {
    if (!gameDocRef || !userId) return;

    if (!gameState || ['ended', 'checkmate', 'stalemate', 'draw', 'resigned'].includes(gameState.status)) {
      await setDoc(gameDocRef, {
        id: `chess_${roomId}`,
        roomId,
        white: { uid: userId, username: userProfile?.username || 'White', avatarUrl: userProfile?.avatarUrl || '' },
        black: isBot ? { uid: 'bot', username: 'Robot 🤖', avatarUrl: 'bot' } : null,
        turn: 'w',
        fen: INITIAL_FEN,
        status: isBot ? 'playing' : 'lobby',
        isBotMode: isBot,
        matchStartTime: isBot ? new Date() : null,
        turnStartTime: isBot ? new Date() : null,
        missedTurns: isBot ? { [userId]: 0, bot: 0 } : null,
        updatedAt: new Date(),
      });
    } else if (gameState.status === 'lobby' && !gameState.black && gameState.white?.uid !== userId) {
      await updateDoc(gameDocRef, {
        black: { uid: userId, username: userProfile?.username || 'Black', avatarUrl: userProfile?.avatarUrl || '' },
        status: 'lobby',
        updatedAt: new Date(),
      });
    }
  }, [gameDocRef, gameState, userId, roomId]);

  const startGame = useCallback(async () => {
    if (!gameDocRef || !gameState) return;
    const isHost = gameState.white?.uid === userId;
    if (!isHost) return;
    try {
      await updateDoc(gameDocRef, {
        status: 'playing',
        matchStartTime: new Date(),
        turnStartTime: new Date(),
        missedTurns: {
          [gameState.white?.uid || 'white']: 0,
          [gameState.black?.uid || 'black']: 0,
        },
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to start chess match:', err);
    }
  }, [gameDocRef, gameState, userId]);

  const makeMove = useCallback(async (newFen: string) => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing') return;
    const nextTurn = gameState.turn === 'w' ? 'b' : 'w';
    const currentTurnUid = gameState.turn === 'w' ? gameState.white?.uid : gameState.black?.uid;
    const newMissedTurns = { ...(gameState.missedTurns || {}) };
    if (currentTurnUid) {
      newMissedTurns[currentTurnUid] = 0;
    }
    try {
      await updateDoc(gameDocRef, {
        fen: newFen,
        turn: nextTurn,
        turnStartTime: new Date(),
        missedTurns: newMissedTurns,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState]);

  const endGame = useCallback(async (status: 'checkmate' | 'stalemate' | 'draw' | 'ended' | 'resigned', winnerId?: string) => {
    if (!gameDocRef) return;
    try {
      await updateDoc(gameDocRef, {
        status,
        winner: winnerId || null,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef]);

  // Host referee logic for turn timeouts and match limit
  useEffect(() => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing' || !userId) return;

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
            await updateDoc(gameDocRef, {
              status: 'resigned',
              winner: opponentUid || null,
              updatedAt: new Date(),
            });
          } else {
            const nextTurn = activeColor === 'w' ? 'b' : 'w';
            await updateDoc(gameDocRef, {
              turn: nextTurn,
              turnStartTime: new Date(),
              missedTurns: updatedMissedTurns,
              updatedAt: new Date(),
            });
          }
        }
      }

      const matchStart = gameState.matchStartTime ? (gameState.matchStartTime.seconds ? gameState.matchStartTime.seconds * 1000 : new Date(gameState.matchStartTime).getTime()) : now;
      const matchElapsed = now - matchStart;
      if (matchElapsed >= 1200000) { // 20 mins
        clearInterval(interval);
        await updateDoc(gameDocRef, {
          status: 'draw',
          winner: null,
          updatedAt: new Date(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameDocRef, gameState, userId]);

  return {
    gameState,
    isLoading,
    startMatch,
    startGame,
    makeMove,
    endGame,
  };
}
