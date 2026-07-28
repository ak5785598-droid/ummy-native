import { useState, useCallback, useEffect, useRef } from 'react';
import { useFirestore, useDatabase } from '../firebase/provider';
import {
  ref as databaseRef,
  set as databaseSet,
  update as databaseUpdate,
  onValue,
  runTransaction as rtdbTransaction,
} from 'firebase/database';
import { doc, runTransaction, increment } from '@/firebase/firestore-compat';
import { updatePhysics, createInitialPieces } from '../lib/carrom-physics';

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
  coinColor?: 'black' | 'white'; // Assigned color for this player
  queenCovered?: boolean;        // Has this player covered the queen
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
  turnStartTime?: number;
  matchStartTime?: number;
  missedTurns?: Record<string, number>;
  queenPocketed?: boolean;   // Queen is pocketed but not yet covered
  queenCoveredBy?: string;   // uid of player who covered the queen
  updatedAt: number;
}

export function useCarromEngine(
  roomId: string | null,
  userId: string | null,
  onRoundEnd?: (winnerId: string, prize: number) => void,
) {
  const firestore = useFirestore();
  const [gameState, setGameState] = useState<CarromGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const database = useDatabase();

  // Always-current ref so intervals/callbacks read fresh state without stale closures
  const gameStateRef = useRef<CarromGameState | null>(null);
  gameStateRef.current = gameState;

  const gamePath = roomId ? `games/carrom_${roomId}` : null;

  // ── Firebase realtime listener ─────────────────────────────────────────
  useEffect(() => {
    if (!database || !gamePath) { setIsLoading(false); return; }
    const gameRef = databaseRef(database, gamePath);
    const unsubscribe = onValue(
      gameRef,
      snapshot => {
        const val = snapshot.val();
        if (val) setGameState(val as CarromGameState);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return () => unsubscribe();
  }, [database, gamePath]);

  // ── initializeGame — only resets if NO game node exists (not on 'ended') ─
  const initOnceRef = useRef(false);
  const initializeGame = useCallback(async () => {
    if (!database || !gamePath || !userId || !roomId) return;
    if (initOnceRef.current) return;

    const gs = gameStateRef.current;
    // Only create fresh game if there's nothing in DB yet
    if (!gs) {
      initOnceRef.current = true;
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
      }, 2000);
    }
  }, [database, gamePath, userId, roomId]);

  // ── selectMode ────────────────────────────────────────────────────────────
  const selectMode = useCallback(async (
    mode: 'freestyle' | 'professional',
    entryFee: number = 0,
    isBot: boolean = false,
    userProfile?: any,
  ) => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (gs?.status !== 'mode_select') return;

    try {
      if (isBot && userProfile && userId) {
        const initialPieces = createInitialPieces();
        // Assign striker starting position for player (bottom)
        const strikerPiece = initialPieces.find(p => p.id === 'striker');
        if (strikerPiece) { strikerPiece.position = { x: 50, y: 85 }; }

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
              coinColor: 'black',
              queenCovered: false,
            },
            {
              uid: 'bot',
              username: 'Robot 🤖',
              avatarUrl: 'bot',
              score: 0,
              isReady: true,
              coinColor: 'white',
              queenCovered: false,
            },
          ],
          pieces: initialPieces,
          turn: userId,
          matchStartTime: Date.now(),
          turnStartTime: Date.now(),
          missedTurns: { [userId]: 0, bot: 0 },
          queenPocketed: false,
          queenCoveredBy: '',
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
  }, [database, gamePath, userId]);

  // ── joinArena — Firebase transaction to prevent race condition ────────────
  const joinArena = useCallback(async (userProfile: any, isBot: boolean = false) => {
    if (!database || !gamePath || !userId || !userProfile || !roomId) return;
    const gs = gameStateRef.current;
    if (gs?.status !== 'lobby') return;

    const entryFee = gs.entryFee || 0;
    if ((userProfile?.wallet?.coins || 0) < entryFee) return;

    // Check if already joined
    const alreadyJoined = (gs.players || []).find((p: any) => p.uid === userId);
    if (alreadyJoined) return;

    try {
      // Deduct entry fee via Firestore transaction first
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

      // Use RTDB transaction to safely append player (prevents race condition)
      const playersRef = databaseRef(database, `${gamePath}/players`);
      await rtdbTransaction(playersRef, (currentPlayers: any[]) => {
        const existing = currentPlayers || [];

        // Assign coin color based on join order
        const coinColor = existing.length === 0 ? 'black' : 'white';

        const newPlayer: CarromPlayer = {
          uid: userId,
          username: userProfile.username || 'P',
          avatarUrl: userProfile.avatarUrl || '',
          score: 0,
          isReady: false,
          coinColor,
          queenCovered: false,
        };

        const updated = [...existing, newPlayer];

        if (isBot) {
          updated.push({
            uid: 'bot',
            username: 'Robot 🤖',
            avatarUrl: 'bot',
            score: 0,
            isReady: true,
            coinColor: 'white',
            queenCovered: false,
          });
        }

        return updated;
      });

      await databaseUpdate(databaseRef(database, gamePath), {
        isBotMode: isBot,
        updatedAt: Date.now(),
      });
    } catch (err) {}
  }, [database, gamePath, userId, firestore, roomId]);

  // ── startMatch — host starts game from lobby ──────────────────────────────
  const startMatch = useCallback(async () => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'lobby') return;
    if (gs.players.length < 2) return;

    const initialPieces = createInitialPieces();

    // Assign coin colors to players based on order
    const playersWithColors = gs.players.map((p, idx) => ({
      ...p,
      coinColor: (idx === 0 ? 'black' : 'white') as 'black' | 'white',
      queenCovered: false,
      score: 0,
    }));

    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'playing',
        pieces: initialPieces,
        players: playersWithColors,
        turn: gs.players[0].uid,
        matchStartTime: Date.now(),
        turnStartTime: Date.now(),
        missedTurns: gs.players.reduce((acc: any, p: any) => { acc[p.uid] = 0; return acc; }, {}),
        queenPocketed: false,
        queenCoveredBy: '',
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath]);

  // ── updateStriker position ────────────────────────────────────────────────
  const updateStriker = useCallback(async (pos: number) => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing') return;
    const isBotTurn = gs.turn === 'bot';
    const isMyTurn = gs.turn === userId;
    const isHost = gs.players[0]?.uid === userId;

    if (!isMyTurn && !(isBotTurn && isHost)) return;
    try { await databaseUpdate(databaseRef(database, gamePath), { strikerPos: pos }); } catch {}
  }, [database, gamePath, userId]);

  // ── endMatch — distribute prize, update DB, call onRoundEnd ──────────────
  const endMatch = useCallback(async (winnerId: string) => {
    if (!database || !gamePath || !roomId) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing') return;

    try {
      const entryFee = gs.entryFee || 0;
      const totalPool = entryFee * gs.players.length;
      const prize = Math.floor(totalPool * 0.9);

      if (prize > 0 && winnerId !== 'bot') {
        await runTransaction(firestore!, async (transaction: any) => {
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
        });
      }

      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'ended',
        winner: winnerId,
        prize: prize,
        updatedAt: Date.now(),
      });

      // Fire winner popup
      onRoundEnd?.(winnerId, prize);
    } catch {}
  }, [database, gamePath, gameState, firestore, roomId, onRoundEnd]);

  // ── strike — simulate physics, resolve scoring, advance turn ─────────────
  const strike = useCallback(async (angle: number, power: number) => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing') return;

    const isBotTurn = gs.turn === 'bot';
    const isMyTurn = gs.turn === userId;
    const isHost = gs.players[0]?.uid === userId;
    if (!isMyTurn && !(isBotTurn && isHost)) return;

    // Deep-copy all pieces
    const pieces = gs.pieces.map((p: CarromPiece) => ({
      ...p,
      position: { ...p.position },
      velocity: { ...p.velocity },
    }));

    const striker = pieces.find(p => p.id === 'striker');
    if (!striker) return;

    // Place striker at current position (x from slider, y always at player row)
    striker.position.x = gs.strikerPos ?? 50;
    striker.position.y = 85;
    striker.isPocketed = false;

    // Convert angle to velocity (angle=0 means straight up)
    const rad = (angle - 90) * Math.PI / 180;
    striker.velocity = {
      x: Math.cos(rad) * power,
      y: Math.sin(rad) * power,
    };

    // ── Run physics simulation ──────────────────────────────────────────────
    let currentPieces = pieces;
    const MAX_ITER = 400;
    const allPocketed: CarromPiece[] = [];

    for (let i = 0; i < MAX_ITER; i++) {
      const { pieces: nextPieces, hasMovement, newlyPocketed } = updatePhysics(currentPieces);
      currentPieces = nextPieces;
      if (newlyPocketed.length > 0) {
        allPocketed.push(...newlyPocketed);
      }
      if (!hasMovement) break;
    }

    // ── Determine turn result ───────────────────────────────────────────────
    const currentPlayerUid = gs.turn;
    const currentPlayer = gs.players.find((p: CarromPlayer) => p.uid === currentPlayerUid);
    const myColor = currentPlayer?.coinColor || 'black';

    let strikerPocketed = false;
    let myCoinsIn = 0;
    let opponentCoinsIn = 0;
    let queenIn = false;

    for (const p of allPocketed) {
      if (p.id === 'striker') {
        strikerPocketed = true;
      } else if (p.type === 'queen') {
        queenIn = true;
      } else if (p.type === myColor) {
        myCoinsIn++;
      } else {
        opponentCoinsIn++;
      }
    }

    // ── Scoring ─────────────────────────────────────────────────────────────
    const updatedPlayers = gs.players.map((p: CarromPlayer) => {
      if (p.uid === currentPlayerUid) {
        let newScore = p.score + myCoinsIn;
        // Striker pocketed = opponent gets +1
        return { ...p, score: newScore };
      } else {
        let newScore = p.score;
        if (strikerPocketed) newScore += 1;
        return { ...p, score: newScore };
      }
    });

    // ── Queen rule ───────────────────────────────────────────────────────────
    // If queen was pocketed and player also pocketed at least one of their coins this shot → queen is covered
    let queenPocketed = gs.queenPocketed || false;
    let queenCoveredBy = gs.queenCoveredBy || '';

    if (queenIn && !queenPocketed) {
      if (myCoinsIn > 0) {
        // Queen covered immediately
        queenPocketed = true;
        queenCoveredBy = currentPlayerUid;
        // Queen cover = +3 bonus
        const idx = updatedPlayers.findIndex(p => p.uid === currentPlayerUid);
        if (idx !== -1) updatedPlayers[idx].score += 3;
      } else {
        // Queen pocketed but not covered — queen returns to center
        queenPocketed = false;
        queenCoveredBy = '';
        const queenPiece = currentPieces.find(p => p.id === 'queen');
        if (queenPiece) {
          queenPiece.isPocketed = false;
          queenPiece.position = { x: 50, y: 50 };
          queenPiece.velocity = { x: 0, y: 0 };
        }
      }
    } else if (queenPocketed && !queenCoveredBy && myCoinsIn > 0) {
      // Queen was already pocketed last turn, player now covers it
      queenCoveredBy = currentPlayerUid;
      const idx = updatedPlayers.findIndex(p => p.uid === currentPlayerUid);
      if (idx !== -1) updatedPlayers[idx].score += 3;
    }

    // ── Reset striker always after shot ─────────────────────────────────────
    const finalPieces = currentPieces.map((p: CarromPiece) => {
      if (p.id === 'striker') {
        return { ...p, position: { x: 50, y: 85 }, velocity: { x: 0, y: 0 }, isPocketed: false };
      }
      return p;
    });

    // ── Win condition — all 9 of a player's coins pocketed ──────────────────
    const myPocketedCount = finalPieces.filter(
      (p: CarromPiece) => p.type === myColor && p.isPocketed,
    ).length;
    const hasWon = myPocketedCount >= 9 && (queenCoveredBy !== '' || !finalPieces.find(p => p.id === 'queen' && !p.isPocketed));

    if (hasWon) {
      // Push final state then end match
      await databaseUpdate(databaseRef(database, gamePath), {
        pieces: finalPieces,
        players: updatedPlayers,
        queenPocketed,
        queenCoveredBy,
        updatedAt: Date.now(),
      });
      await endMatch(currentPlayerUid);
      return;
    }

    // ── Determine next turn ─────────────────────────────────────────────────
    // Same turn if: pocketed ≥1 of own coins AND striker not pocketed
    const keepTurn = myCoinsIn > 0 && !strikerPocketed;
    const currentPlayerIndex = gs.players.findIndex((p: CarromPlayer) => p.uid === currentPlayerUid);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gs.players.length;
    const nextPlayerUid = keepTurn ? currentPlayerUid : gs.players[nextPlayerIndex].uid;

    const newMissedTurns = { ...(gs.missedTurns || {}) };
    if (currentPlayerUid) newMissedTurns[currentPlayerUid] = 0;

    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        pieces: finalPieces,
        players: updatedPlayers,
        turn: nextPlayerUid,
        strikerPos: 50,
        turnStartTime: Date.now(),
        missedTurns: newMissedTurns,
        queenPocketed,
        queenCoveredBy,
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, userId, endMatch]);

  // ── Host referee: turn timeout + match timeout ────────────────────────────
  useEffect(() => {
    if (!database || !gamePath || !userId) return;

    const interval = setInterval(async () => {
      const gs = gameStateRef.current;
      if (!gs || gs.status !== 'playing') return;

      const isHost = gs.players[0]?.uid === userId;
      if (!isHost) return;

      const now = Date.now();

      // Turn timeout — 30 seconds
      const turnStart = typeof gs.turnStartTime === 'number' ? gs.turnStartTime : now;
      const turnElapsed = now - turnStart;

      if (turnElapsed >= 30000) {
        const activePlayerUid = gs.turn;
        const missed = (gs.missedTurns?.[activePlayerUid] || 0) + 1;
        const updatedMissed = { ...(gs.missedTurns || {}), [activePlayerUid]: missed };

        if (missed >= 3) {
          // Auto-forfeit: 3 missed turns = lose
          const other = gs.players.find((p: CarromPlayer) => p.uid !== activePlayerUid);
          await databaseUpdate(databaseRef(database, gamePath), {
            status: 'ended',
            winner: other?.uid || '',
            updatedAt: Date.now(),
          });
          onRoundEnd?.(other?.uid || '', 0);
        } else {
          // Skip turn
          const nextIdx = (gs.players.findIndex((p: CarromPlayer) => p.uid === activePlayerUid) + 1) % gs.players.length;
          await databaseUpdate(databaseRef(database, gamePath), {
            turn: gs.players[nextIdx].uid,
            turnStartTime: Date.now(),
            missedTurns: updatedMissed,
            updatedAt: Date.now(),
          });
        }
      }

      // Match timeout — 20 minutes
      const matchStart = typeof gs.matchStartTime === 'number' ? gs.matchStartTime : now;
      if (now - matchStart >= 1200000) {
        let best = gs.players[0].uid;
        let maxScore = -1;
        gs.players.forEach((p: CarromPlayer) => {
          if (p.score > maxScore) { maxScore = p.score; best = p.uid; }
        });
        await databaseUpdate(databaseRef(database, gamePath), {
          status: 'ended',
          winner: best,
          updatedAt: Date.now(),
        });
        onRoundEnd?.(best, 0);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [database, gamePath, userId, onRoundEnd]);

  // ── Bot AI — runs when it's bot's turn ───────────────────────────────────
  useEffect(() => {
    if (!database || !gamePath || !userId) return;

    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing' || gs.turn !== 'bot') return;

    const isHost = gs.players[0]?.uid === userId;
    if (!isHost) return;

    const timer = setTimeout(async () => {
      const currentGs = gameStateRef.current;
      if (!currentGs || currentGs.turn !== 'bot') return;

      // Find a white coin (bot's color) that is not pocketed
      const target = currentGs.pieces.find(
        p => p.type === 'white' && !p.isPocketed,
      ) || currentGs.pieces.find(p => p.type !== 'striker' && !p.isPocketed);

      let angle = 180; // default: straight down (bot is at top)
      let power = 7;

      if (target) {
        // Aim from top-center (bot striker at y=15) toward target
        const strikerX = currentGs.strikerPos ?? 50;
        const strikerY = 15;
        const dx = target.position.x - strikerX;
        const dy = target.position.y - strikerY;
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        angle = deg;
        // Power based on distance
        const dist = Math.sqrt(dx * dx + dy * dy);
        power = Math.min(10, Math.max(4, dist * 0.25));
      }

      // Small random spread for realism
      const jitter = (Math.random() - 0.5) * 8;
      await strike(angle + jitter, power);
    }, 1500);

    return () => clearTimeout(timer);
  }, [gameState?.turn, database, gamePath, userId, strike]);

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
