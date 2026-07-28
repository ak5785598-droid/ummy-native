import { useState, useCallback, useEffect, useRef } from 'react';
import { useFirestore, useDatabase } from '../firebase/provider';
import {
  ref as databaseRef,
  set as databaseSet,
  update as databaseUpdate,
  remove as databaseRemove,
  onValue,
  runTransaction,
} from 'firebase/database';
import { doc, increment, writeBatch, serverTimestamp } from '@/firebase/firestore-compat';

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
  /** 0 = yard, 1-52 = main path, 53-57 = home stretch, 58 = finished */
  position: number;
}

export interface LudoGameState {
  id: string;
  roomId: string;
  players: LudoPlayer[];
  pieces: LudoPiece[];
  turn: string;           // uid of active player
  dice: number | null;
  diceRolled: boolean;
  consecutiveSixes: number;  // track three-6s rule
  status: 'lobby' | 'playing' | 'ended';
  mode?: string;
  winner?: string;
  isBotMode?: boolean;
  turnStartTime?: number;   // plain Date.now() number
  matchStartTime?: number;
  missedTurns?: Record<string, number>;
  finishedRankings?: string[];
  updatedAt: number;
}

// ── Board geometry ─────────────────────────────────────────────────────────
/** Colour's starting index on the 52-cell main path (position 1 = index 0 for that colour) */
const COLOR_START_INDEX: Record<string, number> = {
  blue: 0, red: 13, green: 26, yellow: 39,
};

/** 52-cell perimeter path [row, col] on a 15×15 grid */
const PATH_COORDS: [number, number][] = [
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
  [6,0],
];  // 52 entries → positions 1..52

/** Home stretch cells for each colour (positions 53..57) */
const HOME_STRETCH: Record<string, [number, number][]> = {
  blue:   [[7,1],[7,2],[7,3],[7,4],[7,5]],
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

/** Yard (home base) slots for each colour */
const HOME_BASE: Record<string, [number, number][]> = {
  blue:   [[1.7,1.7],[1.7,3.3],[3.3,1.7],[3.3,3.3]],
  red:    [[1.7,10.7],[1.7,12.3],[3.3,10.7],[3.3,12.3]],
  green:  [[10.7,10.7],[10.7,12.3],[12.3,10.7],[12.3,12.3]],
  yellow: [[10.7,1.7],[10.7,3.3],[12.3,1.7],[12.3,3.3]],
};

/** Star/safe squares on the main path — absolute path positions for BLUE.
 *  A piece on any of these cannot be captured.
 *  Positions: start squares + 4 shared safe cells per standard board. */
const SAFE_PATH_POSITIONS = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
// Also each colour's personal start square is safe (position 1 for their offset)

/** Entry-to-home-stretch trigger positions (the cell just before home stretch) per colour */
const HOME_ENTRY_POS: Record<string, number> = {
  blue: 52, red: 52, green: 52, yellow: 52,
};

/** Order in which we cycle player turns */
const COLOR_ORDER: LudoPlayer['color'][] = ['red', 'green', 'yellow', 'blue'];

// ── Helper: get board coordinates for a piece ──────────────────────────────
export function getPieceCoords(piece: LudoPiece): [number, number] | null {
  if (piece.position === 0) {
    const idx = parseInt(piece.id.split('_')[1], 10);
    return HOME_BASE[piece.color]?.[idx] as [number, number] ?? null;
  }
  if (piece.position >= 58) return [7, 7]; // finished center
  if (piece.position >= 53) {
    return HOME_STRETCH[piece.color]?.[piece.position - 53] ?? null;
  }
  const startIdx = COLOR_START_INDEX[piece.color] ?? 0;
  const pathIdx = (startIdx + piece.position - 1) % PATH_COORDS.length;
  return PATH_COORDS[pathIdx] ?? null;
}

// ── Helper: is a given absolute path position a safe cell? ────────────────
function isAbsSafePosition(absPathPos: number): boolean {
  // Convert to absolute position (1-52) and check
  return SAFE_PATH_POSITIONS.has(((absPathPos - 1 + 52) % 52) + 1);
}

function isSafeCoord(coord: [number, number]): boolean {
  // Convert coord back to check against known safe cells
  const SAFE_COORDS: [number, number][] = [
    [6,1],[6,2],[1,8],[8,2],[8,13],[6,12],[13,6],[12,8],
    // start squares:
    [6,1],[1,7],[7,13],[13,7],
  ];
  return SAFE_COORDS.some(([r, c]) => r === coord[0] && c === coord[1]);
}

// ── Main hook ──────────────────────────────────────────────────────────────
export function useLudoEngine(
  roomId: string | null,
  userId: string | null,
  onRoundEnd?: (winnerId: string | null, rankings: string[]) => void,
) {
  const firestore = useFirestore();
  const database = useDatabase();
  const [gameState, setGameState] = useState<LudoGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Always-fresh ref — avoids stale closures in interval/callbacks
  const gameStateRef = useRef<LudoGameState | null>(null);
  gameStateRef.current = gameState;

  const gamePath = roomId ? `games/ludo_${roomId}` : null;

  // ── Firebase listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!database || !gamePath) { setIsLoading(false); return; }
    const ref = databaseRef(database, gamePath);
    const unsub = onValue(
      ref,
      snap => {
        const val = snap.val();
        // Store raw RTDB values directly (plain numbers, not wrapped Firestore objects)
        setGameState(val ? (val as LudoGameState) : null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return () => unsub();
  }, [database, gamePath]);

  // ── joinLobby ─────────────────────────────────────────────────────────
  const joinLobby = useCallback(async (
    userProfile: any,
    mode: 'quick' | 'classic' = 'quick',
    isBot: boolean = false,
  ) => {
    if (!database || !gamePath || !userId || !userProfile || !roomId) return;
    const gs = gameStateRef.current;

    if (!gs || gs.status === 'ended') {
      // Host creates fresh game — host always gets red
      const initialPieces: LudoPiece[] = [];
      COLOR_ORDER.forEach(color => {
        for (let i = 0; i < 4; i++) {
          initialPieces.push({
            id: `${color}_${i}`,
            ownerUid: color === 'red' ? userId : (isBot && color === 'green' ? 'bot' : ''),
            color,
            position: 0,
          });
        }
      });

      await databaseSet(databaseRef(database, gamePath), {
        id: `ludo_${roomId}`,
        roomId,
        players: [
          { uid: userId, username: userProfile.username || 'Player 1', avatarUrl: userProfile.avatarUrl || '', color: 'red', isReady: true, isActive: true },
          ...(isBot ? [{ uid: 'bot', username: 'Robot 🤖', avatarUrl: 'bot', color: 'green' as const, isReady: true, isActive: true }] : []),
        ],
        pieces: initialPieces,
        turn: userId,
        dice: null,
        diceRolled: false,
        consecutiveSixes: 0,
        status: isBot ? 'playing' : 'lobby',
        mode,
        isBotMode: isBot,
        matchStartTime: isBot ? Date.now() : undefined,
        turnStartTime: isBot ? Date.now() : undefined,
        missedTurns: isBot ? { [userId]: 0, bot: 0 } : undefined,
        finishedRankings: [],
        updatedAt: Date.now(),
      } satisfies Partial<LudoGameState>);
    } else if (gs.status === 'lobby') {
      if (gs.players.length >= 4) return;
      if (gs.players.find(p => p.uid === userId)) return;

      const assignedColor = COLOR_ORDER[gs.players.length];
      const newPieces = gs.pieces.map(p =>
        p.color === assignedColor ? { ...p, ownerUid: userId } : p,
      );

      await databaseUpdate(databaseRef(database, gamePath), {
        players: [...gs.players, {
          uid: userId,
          username: userProfile.username || `Player ${gs.players.length + 1}`,
          avatarUrl: userProfile.avatarUrl || '',
          color: assignedColor,
          isReady: true,
          isActive: true,
        }],
        pieces: newPieces,
        updatedAt: Date.now(),
      });
    }
  }, [database, gamePath, userId, roomId]);

  // ── startGame ─────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'lobby') return;
    if (gs.players[0]?.uid !== userId) return;
    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        status: 'playing',
        matchStartTime: Date.now(),
        turnStartTime: Date.now(),
        missedTurns: gs.players.reduce((acc: Record<string, number>, p) => { acc[p.uid] = 0; return acc; }, {}),
        updatedAt: Date.now(),
      });
    } catch {}
  }, [database, gamePath, userId]);

  // ── leaveLobby ────────────────────────────────────────────────────────
  const leaveLobby = useCallback(async () => {
    if (!database || !gamePath || !userId) return;
    const gs = gameStateRef.current;
    if (!gs) return;
    const isHost = gs.players[0]?.uid === userId;
    try {
      if (isHost) {
        await databaseUpdate(databaseRef(database, gamePath), { status: 'ended', winner: 'closed', updatedAt: Date.now() });
      } else {
        const newPlayers = gs.players.filter(p => p.uid !== userId);
        const newPieces = gs.pieces.map(p => p.ownerUid === userId ? { ...p, ownerUid: '' } : p);
        await databaseUpdate(databaseRef(database, gamePath), { players: newPlayers, pieces: newPieces, updatedAt: Date.now() });
      }
    } catch {}
  }, [database, gamePath, userId]);

  // ── rollDice ──────────────────────────────────────────────────────────
  // FIXED: stale closure fixed using gameStateRef; auto-pass if no movable pieces
  const rollDice = useCallback(async () => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing') return;

    const isBotTurn = gs.turn === 'bot';
    const isMyTurn = gs.turn === userId;
    const isHost = gs.players[0]?.uid === userId;
    if (!isMyTurn && !(isBotTurn && isHost)) return;
    if (gs.diceRolled) return;

    const roll = Math.floor(Math.random() * 6) + 1;

    // Three 6s rule
    const prevSixes = gs.consecutiveSixes || 0;
    const newConsecutiveSixes = roll === 6 ? prevSixes + 1 : 0;

    if (newConsecutiveSixes >= 3) {
      // Third 6 — forfeit turn, reset consecutive count
      const nextTurn = getNextTurn(gs, gs.turn, gs.finishedRankings || []);
      await databaseUpdate(databaseRef(database, gamePath), {
        dice: roll,
        diceRolled: false,
        consecutiveSixes: 0,
        turn: nextTurn,
        turnStartTime: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

    // Check if ANY piece can move with this roll
    const myPieces = gs.pieces.filter(p => p.ownerUid === gs.turn);
    const hasMovable = myPieces.some(p => canPieceMove(p, roll));

    if (!hasMovable) {
      // Auto-pass: show roll then advance turn
      await databaseUpdate(databaseRef(database, gamePath), {
        dice: roll, diceRolled: true, consecutiveSixes: newConsecutiveSixes, updatedAt: Date.now(),
      });
      setTimeout(async () => {
        const gsCurrent = gameStateRef.current;
        if (!gsCurrent) return;
        const nextTurn = getNextTurn(gsCurrent, gsCurrent.turn, gsCurrent.finishedRankings || []);
        await databaseUpdate(databaseRef(database, gamePath), {
          turn: nextTurn, dice: null, diceRolled: false, consecutiveSixes: 0, turnStartTime: Date.now(), updatedAt: Date.now(),
        }).catch(() => {});
      }, 1500);
    } else {
      await databaseUpdate(databaseRef(database, gamePath), {
        dice: roll, diceRolled: true, consecutiveSixes: newConsecutiveSixes, updatedAt: Date.now(),
      });
    }
  }, [database, gamePath, userId]);

  // ── movePiece ─────────────────────────────────────────────────────────
  // FIXED: reads fresh state from ref, extra turn on capture/home, race condition guarded
  const movePiece = useCallback(async (pieceId: string) => {
    if (!database || !gamePath) return;
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing' || !gs.diceRolled) return;

    const isBotTurn = gs.turn === 'bot';
    const isMyTurn = gs.turn === userId;
    const isHost = gs.players[0]?.uid === userId;
    if (!isMyTurn && !(isBotTurn && isHost)) return;

    const dice = gs.dice;
    if (!dice) return;

    const pieceIndex = gs.pieces.findIndex(p => p.id === pieceId);
    if (pieceIndex === -1) return;

    const piece = gs.pieces[pieceIndex];
    if (piece.ownerUid !== gs.turn) return;
    if (!canPieceMove(piece, dice)) return;

    let newPos = piece.position === 0 ? 1 : piece.position + dice;

    // Clamp to 58 (finished)
    if (newPos > 58) return;

    const updatedPieces = [...gs.pieces];
    updatedPieces[pieceIndex] = { ...piece, position: newPos };

    // ── Capture logic ────────────────────────────────────────────────────
    let didCapture = false;
    if (newPos >= 1 && newPos <= 52) {
      const newCoord = getPieceCoords({ ...piece, position: newPos });
      if (newCoord && !isSafeCoord(newCoord)) {
        for (let i = 0; i < updatedPieces.length; i++) {
          const other = updatedPieces[i];
          if (other.id === pieceId || other.ownerUid === gs.turn) continue;
          if (other.position >= 1 && other.position <= 52) {
            const otherCoord = getPieceCoords(other);
            if (otherCoord && otherCoord[0] === newCoord[0] && otherCoord[1] === newCoord[1]) {
              updatedPieces[i] = { ...other, position: 0 }; // send back to yard
              didCapture = true;
            }
          }
        }
      }
    }

    // ── Win / finish detection ────────────────────────────────────────────
    const didReachHome = newPos === 58;
    const myPieces = updatedPieces.filter(p => p.ownerUid === gs.turn);
    const allFinished = myPieces.every(p => p.position >= 58);
    const isQuick = (gs.mode || 'quick') === 'quick';

    let isGameOver = false;
    let winner: string | null = null;
    let newFinishedRankings = [...(gs.finishedRankings || [])];

    if (isQuick) {
      // Quick mode: first piece to reach home = win
      if (didReachHome) {
        isGameOver = true;
        winner = gs.turn;
        newFinishedRankings = buildFinalRankings(gs.players, updatedPieces, gs.turn);
      }
    } else {
      // Classic mode: all 4 pieces must finish
      if (allFinished && !newFinishedRankings.includes(gs.turn)) {
        newFinishedRankings.push(gs.turn);
      }
      if (newFinishedRankings.length >= gs.players.length - 1) {
        isGameOver = true;
        winner = newFinishedRankings[0] ?? gs.turn;
        const lastPlayer = gs.players.find(p => !newFinishedRankings.includes(p.uid));
        if (lastPlayer) newFinishedRankings.push(lastPlayer.uid);
      }
    }

    // ── Extra turn rules ─────────────────────────────────────────────────
    // Player keeps turn if: rolled 6, captured opponent, or a token reached home
    const extraTurn = dice === 6 || didCapture || didReachHome;
    const newMissedTurns = { ...(gs.missedTurns || {}), [gs.turn]: 0 };

    let nextTurn = gs.turn;
    if (!isGameOver && !extraTurn) {
      nextTurn = getNextTurn(gs, gs.turn, newFinishedRankings);
    }

    try {
      await databaseUpdate(databaseRef(database, gamePath), {
        pieces: updatedPieces,
        turn: nextTurn,
        dice: null,
        diceRolled: false,
        consecutiveSixes: extraTurn && !isGameOver ? gs.consecutiveSixes || 0 : 0,
        turnStartTime: Date.now(),
        missedTurns: newMissedTurns,
        finishedRankings: newFinishedRankings,
        ...(isGameOver ? { status: 'ended', winner } : {}),
        updatedAt: Date.now(),
      });

      if (isGameOver && winner && winner !== 'bot') {
        onRoundEnd?.(winner, newFinishedRankings);
        // Award coins
        if (firestore) {
          try {
            const batch = writeBatch(firestore);
            const userRef = doc(firestore, 'users', winner);
            const profileRef = doc(firestore, 'users', winner, 'profile', winner);
            batch.set(userRef, { 'wallet.coins': increment(5000), updatedAt: serverTimestamp() }, { merge: true });
            batch.set(profileRef, { 'wallet.coins': increment(5000), updatedAt: serverTimestamp() }, { merge: true });
            await batch.commit();
          } catch {}
        }
      } else if (isGameOver) {
        onRoundEnd?.(winner, newFinishedRankings);
      }
    } catch {}
  }, [database, gamePath, userId, firestore, onRoundEnd]);

  // ── Bot AI — moved INTO hook to run even when UI is backgrounded ───────
  useEffect(() => {
    if (!database || !gamePath || !userId) return;

    const interval = setInterval(async () => {
      const gs = gameStateRef.current;
      if (!gs || !gs.isBotMode || gs.status !== 'playing' || gs.turn !== 'bot') return;

      // Only host drives bot
      const isHost = gs.players[0]?.uid === userId;
      if (!isHost) return;

      if (!gs.diceRolled) {
        // Roll dice for bot
        const roll = Math.floor(Math.random() * 6) + 1;
        const prevSixes = gs.consecutiveSixes || 0;
        const newSixes = roll === 6 ? prevSixes + 1 : 0;

        if (newSixes >= 3) {
          const nextTurn = getNextTurn(gs, 'bot', gs.finishedRankings || []);
          await databaseUpdate(databaseRef(database, gamePath), {
            dice: roll, diceRolled: false, consecutiveSixes: 0, turn: nextTurn, turnStartTime: Date.now(), updatedAt: Date.now(),
          }).catch(() => {});
          return;
        }

        const botPieces = gs.pieces.filter(p => p.ownerUid === 'bot');
        const hasMovable = botPieces.some(p => canPieceMove(p, roll));

        if (!hasMovable) {
          const nextTurn = getNextTurn(gs, 'bot', gs.finishedRankings || []);
          await databaseUpdate(databaseRef(database, gamePath), {
            dice: roll, diceRolled: false, consecutiveSixes: newSixes, turn: nextTurn, turnStartTime: Date.now(), updatedAt: Date.now(),
          }).catch(() => {});
        } else {
          await databaseUpdate(databaseRef(database, gamePath), {
            dice: roll, diceRolled: true, consecutiveSixes: newSixes, updatedAt: Date.now(),
          }).catch(() => {});
        }
      } else if (gs.diceRolled && gs.dice) {
        // Choose best piece to move
        const botPieces = gs.pieces.filter(p => p.ownerUid === 'bot' && canPieceMove(p, gs.dice!));
        if (botPieces.length === 0) return;

        let chosen = botPieces[0];

        // Prioritise: capture > enter home stretch > furthest piece
        const capturePiece = botPieces.find(p => {
          const dest = p.position === 0 ? 1 : p.position + (gs.dice || 0);
          if (dest < 1 || dest > 52) return false;
          const startIdx = COLOR_START_INDEX[p.color] ?? 0;
          const pathIdx = (startIdx + dest - 1) % PATH_COORDS.length;
          const [targetR, targetC] = PATH_COORDS[pathIdx];
          // Check if safe to capture (not a safe square)
          if (isSafeCoord([targetR, targetC])) return false;
          return gs.pieces.some(other => {
            if (other.ownerUid === 'bot' || other.position < 1 || other.position > 52) return false;
            const oc = getPieceCoords(other);
            return oc && oc[0] === targetR && oc[1] === targetC;
          });
        });

        if (capturePiece) {
          chosen = capturePiece;
        } else {
          // Furthest piece
          chosen = botPieces.reduce((prev, curr) => curr.position > prev.position ? curr : prev, botPieces[0]);
        }

        // Simulate the move via movePiece
        await (async () => {
          const dice = gs.dice!;
          let newPos = chosen.position === 0 ? 1 : chosen.position + dice;
          if (newPos > 58) return;

          const updatedPieces = [...gs.pieces];
          const idx = updatedPieces.findIndex(p => p.id === chosen.id);
          updatedPieces[idx] = { ...chosen, position: newPos };

          let didCapture = false;
          if (newPos >= 1 && newPos <= 52) {
            const newCoord = getPieceCoords({ ...chosen, position: newPos });
            if (newCoord && !isSafeCoord(newCoord)) {
              for (let i = 0; i < updatedPieces.length; i++) {
                const other = updatedPieces[i];
                if (other.id === chosen.id || other.ownerUid === 'bot') continue;
                if (other.position >= 1 && other.position <= 52) {
                  const oc = getPieceCoords(other);
                  if (oc && oc[0] === newCoord[0] && oc[1] === newCoord[1]) {
                    updatedPieces[i] = { ...other, position: 0 };
                    didCapture = true;
                  }
                }
              }
            }
          }

          const didReachHome = newPos === 58;
          const botPiecesAll = updatedPieces.filter(p => p.ownerUid === 'bot');
          const allFinished = botPiecesAll.every(p => p.position >= 58);
          const isQuick = (gs.mode || 'quick') === 'quick';

          let isGameOver = false;
          let winner: string | null = null;
          let newRankings = [...(gs.finishedRankings || [])];

          if (isQuick && didReachHome) {
            isGameOver = true; winner = 'bot';
            newRankings = buildFinalRankings(gs.players, updatedPieces, 'bot');
          } else if (!isQuick && allFinished && !newRankings.includes('bot')) {
            newRankings.push('bot');
            if (newRankings.length >= gs.players.length - 1) {
              isGameOver = true; winner = newRankings[0];
              const last = gs.players.find(p => !newRankings.includes(p.uid));
              if (last) newRankings.push(last.uid);
            }
          }

          const extraTurn = dice === 6 || didCapture || didReachHome;
          const nextTurn = (!isGameOver && !extraTurn) ? getNextTurn(gs, 'bot', newRankings) : 'bot';

          await databaseUpdate(databaseRef(database, gamePath), {
            pieces: updatedPieces,
            turn: isGameOver ? gs.turn : nextTurn,
            dice: null,
            diceRolled: false,
            consecutiveSixes: 0,
            turnStartTime: Date.now(),
            missedTurns: { ...(gs.missedTurns || {}), bot: 0 },
            finishedRankings: newRankings,
            ...(isGameOver ? { status: 'ended', winner } : {}),
            updatedAt: Date.now(),
          }).catch(() => {});

          if (isGameOver) onRoundEnd?.(winner, newRankings);
        })();
      }
    }, 1800); // bot acts every 1.8s

    return () => clearInterval(interval);
  }, [database, gamePath, userId, onRoundEnd]);

  // ── Host referee: turn timeout + match limit ───────────────────────────
  useEffect(() => {
    if (!database || !gamePath || !userId) return;

    const interval = setInterval(async () => {
      const gs = gameStateRef.current;
      if (!gs || gs.status !== 'playing') return;
      const isHost = gs.players[0]?.uid === userId;
      if (!isHost) return;

      const now = Date.now();
      // FIXED: plain number — no .seconds needed
      const turnStart = typeof gs.turnStartTime === 'number' ? gs.turnStartTime : now;
      const turnElapsed = now - turnStart;

      if (turnElapsed >= 30000) {
        const activeUid = gs.turn;
        const missed = (gs.missedTurns?.[activeUid] || 0) + 1;
        const updatedMissed = { ...(gs.missedTurns || {}), [activeUid]: missed };

        if (missed >= 3) {
          const other = gs.players.find(p => p.uid !== activeUid);
          await databaseUpdate(databaseRef(database, gamePath), {
            status: 'ended', winner: other?.uid || null, updatedAt: Date.now(),
          }).catch(() => {});
          onRoundEnd?.(other?.uid || null, gs.finishedRankings || []);
        } else {
          const nextTurn = getNextTurn(gs, activeUid, gs.finishedRankings || []);
          await databaseUpdate(databaseRef(database, gamePath), {
            turn: nextTurn, dice: null, diceRolled: false, consecutiveSixes: 0,
            turnStartTime: Date.now(), missedTurns: updatedMissed, updatedAt: Date.now(),
          }).catch(() => {});
        }
      }

      // Match timeout: 20 min → winner by most progress
      const matchStart = typeof gs.matchStartTime === 'number' ? gs.matchStartTime : now;
      if (now - matchStart >= 1200000) {
        const bestUid = gs.players.reduce((best, p) => {
          const prog = gs.pieces.filter(pc => pc.ownerUid === p.uid).reduce((s, pc) => s + pc.position, 0);
          const bestProg = gs.pieces.filter(pc => pc.ownerUid === best).reduce((s, pc) => s + pc.position, 0);
          return prog > bestProg ? p.uid : best;
        }, gs.players[0]?.uid ?? '');
        await databaseUpdate(databaseRef(database, gamePath), {
          status: 'ended', winner: bestUid, updatedAt: Date.now(),
        }).catch(() => {});
        onRoundEnd?.(bestUid, gs.finishedRankings || []);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [database, gamePath, userId, onRoundEnd]);

  // ── resetGame ─────────────────────────────────────────────────────────
  const resetGame = useCallback(async () => {
    if (!database || !gamePath) return;
    try { await databaseRemove(databaseRef(database, gamePath)); } catch {}
  }, [database, gamePath]);

  return { gameState, isLoading, joinLobby, startGame, leaveLobby, rollDice, movePiece, resetGame };
}

// ── Pure helpers ───────────────────────────────────────────────────────────

/** Can a piece legally move with this dice roll? */
export function canPieceMove(piece: LudoPiece, dice: number): boolean {
  if (piece.position === 0 && dice !== 6) return false;
  if (piece.position >= 58) return false;
  const dest = piece.position === 0 ? 1 : piece.position + dice;
  if (dest > 58) return false;
  return true;
}

/** Get next player uid, skipping finished players */
function getNextTurn(gs: LudoGameState, currentUid: string, finished: string[]): string {
  const idx = gs.players.findIndex(p => p.uid === currentUid);
  for (let i = 1; i <= gs.players.length; i++) {
    const next = gs.players[(idx + i) % gs.players.length];
    if (!finished.includes(next.uid)) return next.uid;
  }
  return currentUid;
}

/** Build final rankings when someone wins */
function buildFinalRankings(players: LudoPlayer[], pieces: LudoPiece[], winnerId: string): string[] {
  const remaining = players
    .filter(p => p.uid !== winnerId)
    .map(p => ({
      uid: p.uid,
      prog: pieces.filter(pc => pc.ownerUid === p.uid).reduce((s, pc) => s + pc.position, 0),
    }))
    .sort((a, b) => b.prog - a.prog);
  return [winnerId, ...remaining.map(p => p.uid)];
}
