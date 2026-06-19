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
  status: 'lobby' | 'playing' | 'checkmate' | 'stalemate' | 'draw';
  winner?: string;
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

  const startMatch = useCallback(async (userProfile: any) => {
    if (!gameDocRef || !userId) return;

    if (!gameState) {
      await setDoc(gameDocRef, {
        id: `chess_${roomId}`,
        roomId,
        white: { uid: userId, username: userProfile?.username || 'White', avatarUrl: userProfile?.avatarUrl || '' },
        black: null,
        turn: 'w',
        fen: INITIAL_FEN,
        status: 'lobby',
        updatedAt: new Date(),
      });
    } else if (gameState.status === 'lobby' && !gameState.black && gameState.white?.uid !== userId) {
      await updateDoc(gameDocRef, {
        black: { uid: userId, username: userProfile?.username || 'Black', avatarUrl: userProfile?.avatarUrl || '' },
        status: 'playing',
        updatedAt: new Date(),
      });
    }
  }, [gameDocRef, gameState, userId, roomId]);

  const makeMove = useCallback(async (newFen: string) => {
    if (!gameDocRef || !gameState || gameState.status !== 'playing') return;
    const nextTurn = gameState.turn === 'w' ? 'b' : 'w';
    try {
      await updateDoc(gameDocRef, {
        fen: newFen,
        turn: nextTurn,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef, gameState]);

  const endGame = useCallback(async (status: 'checkmate' | 'stalemate' | 'draw', winnerId?: string) => {
    if (!gameDocRef) return;
    try {
      await updateDoc(gameDocRef, {
        status,
        winner: winnerId || null,
        updatedAt: new Date(),
      });
    } catch {}
  }, [gameDocRef]);

  return {
    gameState,
    isLoading,
    startMatch,
    makeMove,
    endGame,
  };
}
