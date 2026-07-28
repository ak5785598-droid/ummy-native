/**
 * Chess Engine — Full Rewrite
 * Implements: castling, en-passant, pawn promotion, correct check detection,
 * full FEN parsing/encoding, legal move generation with pin/check filtering.
 */

export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type Piece = { type: PieceType; color: PieceColor } | null;
export type Board = Piece[][]; // board[row][col], row 0 = rank 8 (top)

// Full FEN state — includes castling rights, en-passant, clocks
export interface ChessState {
  board: Board;
  turn: PieceColor;
  castling: string;       // e.g. "KQkq", "Kq", "-"
  epSquare: string;       // e.g. "e3" or "-"
  halfMove: number;
  fullMove: number;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ── FEN Parse ─────────────────────────────────────────────────────────────
export function parseFen(fen: string): ChessState {
  const parts = fen.split(' ');
  const boardStr = parts[0] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const turn = (parts[1] as PieceColor) || 'w';
  const castling = parts[2] || 'KQkq';
  const epSquare = parts[3] || '-';
  const halfMove = parseInt(parts[4] || '0', 10);
  const fullMove = parseInt(parts[5] || '1', 10);

  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const rows = boardStr.split('/');

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of (rows[r] || '')) {
      if (ch >= '1' && ch <= '8') {
        c += parseInt(ch, 10);
      } else {
        const color: PieceColor = ch === ch.toUpperCase() ? 'w' : 'b';
        board[r][c] = { type: ch.toLowerCase() as PieceType, color };
        c++;
      }
    }
  }

  return { board, turn, castling, epSquare, halfMove, fullMove };
}

// ── FEN Encode ────────────────────────────────────────────────────────────
export function stateToFen(state: ChessState): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let row = '';
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) { empty++; continue; }
      if (empty > 0) { row += empty; empty = 0; }
      const ch = p.type.toUpperCase();
      row += p.color === 'w' ? ch : ch.toLowerCase();
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${state.turn} ${state.castling || '-'} ${state.epSquare || '-'} ${state.halfMove} ${state.fullMove}`;
}

// Legacy compat — extract board from FEN string
export function parseFenBoard(fen: string): Board {
  return parseFen(fen).board;
}

// ── Coordinate helpers ─────────────────────────────────────────────────────
export function rcToCoord(r: number, c: number): string {
  return `${String.fromCharCode(97 + c)}${8 - r}`;
}

export function coordToRc(coord: string): [number, number] {
  const c = coord.charCodeAt(0) - 97;
  const r = 8 - parseInt(coord.slice(1), 10);
  return [r, c];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isAlly(a: Piece, b: Piece): boolean { return !!a && !!b && a.color === b.color; }
function isEnemy(a: Piece, b: Piece): boolean { return !!a && !!b && a.color !== b.color; }
function inBounds(r: number, c: number): boolean { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// ── Find king ─────────────────────────────────────────────────────────────
export function findKing(board: Board, color: PieceColor): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'k' && board[r][c]?.color === color) return [r, c];
  return [-1, -1];
}

// ── Is square attacked by attackerColor? ──────────────────────────────────
// Uses dedicated attack patterns (not legalMoves) to avoid recursion and handle pawn attacks correctly
export function isAttackedBy(board: Board, r: number, c: number, attackerColor: PieceColor): boolean {
  const enemy = attackerColor;

  // Pawn attacks (FIXED: always check both diagonals regardless of occupancy)
  const pawnDir = enemy === 'w' ? 1 : -1; // pawn of attackerColor attacks upward/downward
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir;
    const pc = c + dc;
    if (inBounds(pr, pc) && board[pr][pc]?.type === 'p' && board[pr][pc]?.color === enemy) return true;
  }

  // Knight attacks
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr; const nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc]?.type === 'n' && board[nr][nc]?.color === enemy) return true;
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr; const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.type === 'k' && board[nr][nc]?.color === enemy) return true;
    }
  }

  // Sliding pieces: bishop/queen (diagonals)
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i; const nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      const p = board[nr][nc];
      if (p) {
        if (p.color === enemy && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
    }
  }

  // Sliding pieces: rook/queen (straights)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i; const nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      const p = board[nr][nc];
      if (p) {
        if (p.color === enemy && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
    }
  }

  return false;
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr === -1) return false;
  const enemy = color === 'w' ? 'b' : 'w';
  return isAttackedBy(board, kr, kc, enemy);
}

// ── Raw pseudo-legal moves (no check filtering) ───────────────────────────
function rawMoves(state: ChessState, r: number, c: number): [number, number][] {
  const { board, epSquare } = state;
  const piece = board[r][c];
  if (!piece) return [];

  const moves: [number, number][] = [];
  const { type, color } = piece;
  const enemy = color === 'w' ? 'b' : 'w';

  const canGo = (nr: number, nc: number) => inBounds(nr, nc) && !isAlly(piece, board[nr][nc]);

  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i; const nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      moves.push([nr, nc]);
      if (board[nr][nc]) break; // stop after capture
    }
  };

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // Forward push
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      // Double push from start row
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push([r + 2 * dir, c]);
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const nr = r + dir; const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      // Normal capture
      if (board[nr][nc]?.color === enemy) moves.push([nr, nc]);
      // En-passant capture
      if (epSquare !== '-' && epSquare !== '') {
        const [epr, epc] = coordToRc(epSquare);
        if (nr === epr && nc === epc) moves.push([nr, nc]);
      }
    }
  }

  if (type === 'n') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
      if (canGo(r + dr, c + dc)) moves.push([r + dr, c + dc]);
  }

  if (type === 'b' || type === 'q') {
    slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1);
  }
  if (type === 'r' || type === 'q') {
    slide(-1,0); slide(1,0); slide(0,-1); slide(0,1);
  }

  if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if ((dr !== 0 || dc !== 0) && canGo(r + dr, c + dc)) moves.push([r + dr, c + dc]);

    // ── CASTLING ─────────────────────────────────────────────────────────
    const { castling } = state;
    const backRank = color === 'w' ? 7 : 0;
    if (r === backRank && c === 4) { // King is on its starting square
      const enemyColor = enemy as PieceColor;

      // Kingside (O-O)
      const ksRight = color === 'w' ? 'K' : 'k';
      if (castling.includes(ksRight)) {
        if (!board[backRank][5] && !board[backRank][6] &&
            board[backRank][7]?.type === 'r' &&
            !isAttackedBy(board, backRank, 4, enemyColor) &&
            !isAttackedBy(board, backRank, 5, enemyColor) &&
            !isAttackedBy(board, backRank, 6, enemyColor)) {
          moves.push([backRank, 6]);
        }
      }

      // Queenside (O-O-O)
      const qsRight = color === 'w' ? 'Q' : 'q';
      if (castling.includes(qsRight)) {
        if (!board[backRank][3] && !board[backRank][2] && !board[backRank][1] &&
            board[backRank][0]?.type === 'r' &&
            !isAttackedBy(board, backRank, 4, enemyColor) &&
            !isAttackedBy(board, backRank, 3, enemyColor) &&
            !isAttackedBy(board, backRank, 2, enemyColor)) {
          moves.push([backRank, 2]);
        }
      }
    }
  }

  return moves;
}

// ── Is a move legal (doesn't leave own king in check)? ───────────────────
function isMoveLegal(state: ChessState, fromR: number, fromC: number, toR: number, toC: number): boolean {
  // Simulate move
  const newBoard: Board = state.board.map(row => [...row]);
  const piece = newBoard[fromR][fromC];

  // Handle en-passant capture: remove the captured pawn
  if (piece?.type === 'p' && state.epSquare !== '-' && state.epSquare !== '') {
    const [epr, epc] = coordToRc(state.epSquare);
    if (toR === epr && toC === epc) {
      const capDir = piece.color === 'w' ? 1 : -1; // captured pawn is one rank behind EP square
      newBoard[epr + capDir][epc] = null;
    }
  }

  // Handle castling: move the rook too
  if (piece?.type === 'k') {
    const dc = toC - fromC;
    if (Math.abs(dc) === 2) {
      const backRank = fromR;
      if (dc > 0) { // Kingside
        newBoard[backRank][5] = newBoard[backRank][7];
        newBoard[backRank][7] = null;
      } else { // Queenside
        newBoard[backRank][3] = newBoard[backRank][0];
        newBoard[backRank][0] = null;
      }
    }
  }

  newBoard[toR][toC] = piece;
  newBoard[fromR][fromC] = null;

  return !isInCheck(newBoard, piece!.color);
}

// ── Legal moves (pseudo-legal filtered for check) ─────────────────────────
export function legalMoves(state: ChessState | string, r: number, c: number): [number, number][] {
  // Accept both ChessState and FEN string for backward compat
  const s: ChessState = typeof state === 'string' ? parseFen(state) : state;
  const piece = s.board[r][c];
  if (!piece) return [];
  const raw = rawMoves(s, r, c);
  return raw.filter(([tr, tc]) => isMoveLegal(s, r, c, tr, tc));
}

// ── Apply a move — returns new ChessState or null if illegal ──────────────
export function applyMove(
  state: ChessState,
  fromR: number, fromC: number,
  toR: number, toC: number,
  promoteTo: PieceType = 'q',
): ChessState | null {
  if (!isMoveLegal(state, fromR, fromC, toR, toC)) return null;

  const newBoard: Board = state.board.map(row => [...row]);
  const piece = { ...newBoard[fromR][fromC]! };
  let newEpSquare = '-';
  let newCastling = state.castling;
  let newHalfMove = state.halfMove + 1;

  // En-passant capture
  if (piece.type === 'p' && state.epSquare !== '-' && state.epSquare !== '') {
    const [epr, epc] = coordToRc(state.epSquare);
    if (toR === epr && toC === epc) {
      const capDir = piece.color === 'w' ? 1 : -1;
      newBoard[epr + capDir][epc] = null;
    }
  }

  // Double pawn push — set EP square
  if (piece.type === 'p' && Math.abs(toR - fromR) === 2) {
    const epR = (fromR + toR) / 2;
    newEpSquare = rcToCoord(epR, fromC);
  }

  // Castling: move rook
  if (piece.type === 'k') {
    const dc = toC - fromC;
    if (Math.abs(dc) === 2) {
      const backRank = fromR;
      if (dc > 0) { // Kingside
        newBoard[backRank][5] = newBoard[backRank][7];
        newBoard[backRank][7] = null;
      } else { // Queenside
        newBoard[backRank][3] = newBoard[backRank][0];
        newBoard[backRank][0] = null;
      }
    }
    // King moved — lose all castling rights for this color
    newCastling = newCastling.replace(piece.color === 'w' ? 'K' : 'k', '').replace(piece.color === 'w' ? 'Q' : 'q', '') || '-';
  }

  // Rook moved — lose castling right for that side
  if (piece.type === 'r') {
    const backRank = piece.color === 'w' ? 7 : 0;
    if (fromR === backRank && fromC === 7) newCastling = newCastling.replace(piece.color === 'w' ? 'K' : 'k', '') || '-';
    if (fromR === backRank && fromC === 0) newCastling = newCastling.replace(piece.color === 'w' ? 'Q' : 'q', '') || '-';
  }

  // Rook captured — remove opponent's castling right
  const captured = state.board[toR][toC];
  if (captured?.type === 'r') {
    const oppBackRank = captured.color === 'w' ? 7 : 0;
    if (toR === oppBackRank && toC === 7) newCastling = newCastling.replace(captured.color === 'w' ? 'K' : 'k', '') || '-';
    if (toR === oppBackRank && toC === 0) newCastling = newCastling.replace(captured.color === 'w' ? 'Q' : 'q', '') || '-';
  }

  // Reset half-move clock on pawn move or capture
  if (piece.type === 'p' || captured) newHalfMove = 0;

  // Place piece
  newBoard[toR][toC] = piece;
  newBoard[fromR][fromC] = null;

  // Pawn promotion
  if (piece.type === 'p' && (toR === 0 || toR === 7)) {
    newBoard[toR][toC] = { type: promoteTo, color: piece.color };
  }

  const nextTurn: PieceColor = state.turn === 'w' ? 'b' : 'w';

  return {
    board: newBoard,
    turn: nextTurn,
    castling: newCastling || '-',
    epSquare: newEpSquare,
    halfMove: newHalfMove,
    fullMove: state.turn === 'b' ? state.fullMove + 1 : state.fullMove,
  };
}

// ── Game status ────────────────────────────────────────────────────────────
export function getGameStatus(
  state: ChessState | Board,
  turn?: PieceColor,
): 'playing' | 'checkmate' | 'stalemate' {
  // Accept legacy Board param
  let s: ChessState;
  if (Array.isArray(state)) {
    s = { board: state, turn: turn || 'w', castling: '-', epSquare: '-', halfMove: 0, fullMove: 1 };
  } else {
    s = state;
  }

  const hasLegal = () => {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (s.board[r][c]?.color === s.turn && legalMoves(s, r, c).length > 0) return true;
    return false;
  };

  if (!hasLegal()) {
    return isInCheck(s.board, s.turn) ? 'checkmate' : 'stalemate';
  }
  return 'playing';
}

// ── Legacy compat: makeMove (board-only, auto-promotes to queen) ───────────
export function makeMove(
  board: Board,
  fromR: number, fromC: number,
  toR: number, toC: number,
): Board | null {
  const state: ChessState = { board, turn: board[fromR][fromC]?.color || 'w', castling: '-', epSquare: '-', halfMove: 0, fullMove: 1 };
  const result = applyMove(state, fromR, fromC, toR, toC, 'q');
  return result ? result.board : null;
}

// ── Legacy compat: boardToFen (board + turn → FEN string) ─────────────────
export function boardToFen(board: Board, turn: PieceColor): string {
  const state: ChessState = { board, turn, castling: '-', epSquare: '-', halfMove: 0, fullMove: 1 };
  return stateToFen(state);
}

// ── Unicode piece symbols ──────────────────────────────────────────────────
const PIECE_UNICODE: Record<string, string> = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟',
};

export function pieceToUnicode(piece: Piece): string {
  if (!piece) return '';
  return PIECE_UNICODE[piece.color + piece.type] || '';
}

export function getInitialBoard(): Board {
  return parseFen(INITIAL_FEN).board;
}
