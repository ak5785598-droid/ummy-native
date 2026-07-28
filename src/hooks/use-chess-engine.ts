import { useState, useCallback, useEffect, useRef } from 'react';
import { useDatabase } from '../firebase/provider';
import {
  ref as databaseRef,
  set as databaseSet,
  update as databaseUpdate,
  onValue,
} from 'firebase/database';
import { parseFen, stateToFen, ChessState } from '../lib/chess-engine';

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
  status: 'lobby' | 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'ended';
  winner?: string;
  isBotMode?: boolean;
  turnStartTime?: number;      // Always stored as Date.now() number in RTDB
  matchStartTime?: number;
  missedTurns?: Record<string, number>;
  updatedAt: number;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function useChessEngine(
  roomId: string | null,
  userId: string | null,
  onRoundEnd?: (winnerId: string | null, status: string) => void,
) {
  const database = useDatabase();
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Always-current ref — prevents stale closures in intervals/callbacks
  const gameStateRef = useRef<ChessGameState | null>(null);
  gameStateRef.current = gameState;

  const gamePath = roomId ? `games/chess_${roomId}` : null;

  // ── Firebase RTDB listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!database || !gamePath) { setIsLoading(false); return; }
    const gameRef = databaseRef(database, gamePath);
    const unsubscribe = onValue(
      gameRef,
      snapshot => {
        const val = snapshot.val();
        // Store raw RTDB values directly — no Firestore-style wrapping
        setGameState(val ? (val as ChessGameState) : null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return () => unsubscribe();
  }, [database, gamePath]);

  // ── startMatch — start fresh game or join lobby ────────────────────────
  const startMatch = useCallback(async (userProfile: any, isBot: boolean = false) => {
    if (!database || !gamePath || !userId || !roomId) return;

    const gs = gameStateRef.current;
    const isTerminal = !gs || ['checkmate', 'stalemate', 'draw', 'resigned', 'ended'].includes(gs.status);

    if (isTerminal) {
      // Fresh game — current user is white
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
      } as ChessGameState);
    } else if (gs?.status === 'lobby' && !gs.black && gs.white?.uid !== userId) {
      // Second player joins as black
      await databaseUpdate(databaseRef(database, gamePath), {
        black: { uid: userId, username: userProfile?.username || 'Black', avatarUrl: userProfile?.avatarUrl || '' },
        updatedAt: Date.now(),
      });
    }
  }, [database, gamePath, userId, roomId]);

  // ── startGame — host kicks off match from lobby ────────────────────────
  const startGame = useCallback(async () => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'lobby') return;
    const isHost = gs.white?.uid === userId;
    if (!isHost) return;
    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'playing',
        matchStartTime: Date.now(),
        turnStartTime: Date.now(),
        missedTurns: {
          [gs.white?.uid || 'white']: 0,
          [gs.black?.uid || 'black']: 0,
        },
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, userId]);

  // ── makeMove — FIXED: validates turn ownership, stores proper FEN ──────
  const makeMove = useCallback(async (newFen: string, chessState?: ChessState) => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing') return;

    // ── Turn ownership check ────────────────────────────────────────────
    const currentTurnUid = gs.turn === 'w' ? gs.white?.uid : gs.black?.uid;
    if (currentTurnUid !== userId && currentTurnUid !== 'bot') return;

    const nextTurn: 'w' | 'b' = gs.turn === 'w' ? 'b' : 'w';
    const newMissedTurns = { ...(gs.missedTurns || {}) };
    if (currentTurnUid) newMissedTurns[currentTurnUid] = 0;

    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        fen: newFen,
        turn: nextTurn,
        turnStartTime: Date.now(),
        missedTurns: newMissedTurns,
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, userId]);

  // ── endGame — write final status + fire onRoundEnd ────────────────────
  const endGame = useCallback(async (
    status: ChessGameState['status'],
    winnerId?: string,
  ) => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status === 'checkmate' || gs.status === 'stalemate' || gs.status === 'draw' || gs.status === 'resigned' || gs.status === 'ended') return;

    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        status,
        winner: winnerId || null,
        updatedAt: Date.now(),
      });
      onRoundEnd?.(winnerId || null, status);
    } catch {}
  }, [database, gamePath, onRoundEnd]);

  // ── Host referee: turn timeout + match timer ───────────────────────────
  // Uses gameStateRef to avoid stale closures — interval never recreated unnecessarily
  useEffect(() => {
    if (!database || !gamePath || !userId) return;

    const interval = setInterval(async () => {
      const gs = gameStateRef.current;
      if (!gs || gs.status !== 'playing') return;

      // Only white player (host) runs referee
      const isHost = gs.white?.uid === userId;
      if (!isHost) return;

      const now = Date.now();

      // ── Turn timeout (30s) ─────────────────────────────────────────────
      // FIXED: turnStartTime is now stored as plain number — no .seconds needed
      const turnStart = typeof gs.turnStartTime === 'number' ? gs.turnStartTime : now;
      const turnElapsed = now - turnStart;

      if (turnElapsed >= 30000) {
        const activeColor = gs.turn;
        const activeUid = activeColor === 'w' ? gs.white?.uid : gs.black?.uid;
        const opponentUid = activeColor === 'w' ? gs.black?.uid : gs.white?.uid;

        if (activeUid) {
          const missed = (gs.missedTurns?.[activeUid] || 0) + 1;
          const updatedMissed = { ...(gs.missedTurns || {}), [activeUid]: missed };

          if (missed >= 3) {
            // Forfeit — opponent wins
            await databaseUpdate(databaseRef(database, gamePath), {
              status: 'resigned',
              winner: opponentUid || null,
              updatedAt: Date.now(),
            });
            onRoundEnd?.(opponentUid || null, 'resigned');
          } else {
            // Skip turn
            await databaseUpdate(databaseRef(database, gamePath), {
              turn: activeColor === 'w' ? 'b' : 'w',
              turnStartTime: Date.now(),
              missedTurns: updatedMissed,
              updatedAt: Date.now(),
            });
          }
        }
      }

      // ── Match timeout (20 minutes) → draw ─────────────────────────────
      const matchStart = typeof gs.matchStartTime === 'number' ? gs.matchStartTime : now;
      if (now - matchStart >= 1200000) {
        await databaseUpdate(databaseRef(database, gamePath), {
          status: 'draw',
          winner: null,
          updatedAt: Date.now(),
        });
        onRoundEnd?.(null, 'draw');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [database, gamePath, userId, onRoundEnd]);

  return {
    gameState,
    isLoading,
    startMatch,
    startGame,
    makeMove,
    endGame,
  };
}
