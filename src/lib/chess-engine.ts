/**
 * Chess Engine - FEN parser, move generation, validation.
 * Simplified but functional chess rules.
 */

export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type Piece = { type: PieceType; color: PieceColor } | null;
export type Board = Piece[][]; // board[row][col], row 0 = rank 8 (top)

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ── FEN Parser ──
export function parseFen(fen: string): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const rows = fen.split(' ')[0].split('/');

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        c += parseInt(ch);
      } else {
        const color: PieceColor = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase() as PieceType;
        board[r][c] = { type, color };
        c++;
      }
    }
  }
  return board;
}

export function boardToFen(board: Board, turn: PieceColor): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let row = '';
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) { empty++; continue; }
      if (empty > 0) { row += empty; empty = 0; }
      const ch = p.type.toUpperCase();
      row += p.color === 'w' ? ch : ch.toLowerCase();
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} KQkq - 0 1`;
}

// ── Coordinate helpers ──
export function rcToCoord(r: number, c: number): string {
  return String.fromCharCode(97 + c) + (8 - r);
}

export function coordToRc(coord: string): [number, number] {
  const c = coord.charCodeAt(0) - 97;
  const r = 8 - parseInt(coord[1]);
  return [r, c];
}

// ── Piece color check ──
function isWhite(piece: Piece): boolean { return piece?.color === 'w'; }
function isBlack(piece: Piece): boolean { return piece?.color === 'b'; }
function isEnemy(a: Piece, b: Piece): boolean { return !!a && !!b && a.color !== b.color; }
function isAlly(a: Piece, b: Piece): boolean { return !!a && !!b && a.color === b.color; }

// ── Raw move generation (no check filtering) ──
function rawMoves(board: Board, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];

  const moves: [number, number][] = [];
  const { type, color } = piece;
  const enemy = color === 'w' ? 'b' : 'w';

  const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const canGo = (r: number, c: number) => inBounds(r, c) && !isAlly(piece, board[r][c]);

  const addIfValid = (r: number, c: number) => {
    if (!inBounds(r, c)) return false;
    if (isAlly(piece, board[r][c])) return false;
    moves.push([r, c]);
    return !board[r][c]; // continue sliding if empty
  };

  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      if (!addIfValid(r + dr * i, c + dc * i)) break;
    }
  };

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    // Forward
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      // Double push from start
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push([r + 2 * dir, c]);
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc) && board[r + dir][c + dc]?.color === enemy) {
        moves.push([r + dir, c + dc]);
      }
    }
  }

  if (type === 'n') {
    const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of jumps) addIfValid(r + dr, c + dc);
  }

  if (type === 'b') { slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); }
  if (type === 'r') { slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); }
  if (type === 'q') { slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); }

  if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addIfValid(r + dr, c + dc);
      }
    }
  }

  return moves;
}

// ── Find king position ──
function findKing(board: Board, color: PieceColor): [number, number] {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.type === 'k' && board[r][c]?.color === color) return [r, c];
    }
  }
  return [-1, -1]; // shouldn't happen
}

// ── Is square attacked by enemy? ──
function isAttackedBy(board: Board, r: number, c: number, attackerColor: PieceColor): boolean {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      if (board[rr][cc]?.color === attackerColor) {
        const moves = rawMoves(board, rr, cc);
        if (moves.some(([mr, mc]) => mr === r && mc === c)) return true;
      }
    }
  }
  return false;
}

// ── Is own king in check? ──
function isInCheck(board: Board, color: PieceColor): boolean {
  const [kr, kc] = findKing(board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  return isAttackedBy(board, kr, kc, enemy);
}

// ── Simulate move and check if king is safe ──
function isMoveLegal(board: Board, fromR: number, fromC: number, toR: number, toC: number): boolean {
  const newBoard = board.map(row => [...row]);
  newBoard[toR][toC] = newBoard[fromR][fromC];
  newBoard[fromR][fromC] = null;
  const color = newBoard[toR][toC]!.color;
  return !isInCheck(newBoard, color);
}

// ── Legal moves (with check filtering) ──
export function legalMoves(board: Board, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = rawMoves(board, r, c);
  return raw.filter(([tr, tc]) => isMoveLegal(board, r, c, tr, tc));
}

// ── Make a move (returns new board or null if illegal) ──
export function makeMove(board: Board, fromR: number, fromC: number, toR: number, toC: number): Board | null {
  if (!isMoveLegal(board, fromR, fromC, toR, toC)) return null;
  const newBoard = board.map(row => [...row]);
  newBoard[toR][toC] = newBoard[fromR][fromC];
  newBoard[fromR][fromC] = null;
  return newBoard;
}

// ── Check game status ──
export function getGameStatus(board: Board, turn: PieceColor): 'playing' | 'checkmate' | 'stalemate' {
  const hasLegalMoves = () => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.color === turn && legalMoves(board, r, c).length > 0) return true;
      }
    }
    return false;
  };

  if (!hasLegalMoves()) {
    return isInCheck(board, turn) ? 'checkmate' : 'stalemate';
  }
  return 'playing';
}

// ── Unicode piece symbols ──
const PIECE_UNICODE: Record<string, string> = {
  'wk': '\u2654', 'wq': '\u2655', 'wr': '\u2656', 'wb': '\u2657', 'wn': '\u2658', 'wp': '\u2659',
  'bk': '\u265A', 'bq': '\u265B', 'br': '\u265C', 'bb': '\u265D', 'bn': '\u265E', 'bp': '\u265F',
};

export function pieceToUnicode(piece: Piece): string {
  if (!piece) return '';
  return PIECE_UNICODE[piece.color + piece.type] || '';
}

export function getInitialBoard(): Board {
  return parseFen(INITIAL_FEN);
}
