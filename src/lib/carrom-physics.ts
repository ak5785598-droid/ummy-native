/**
 * Carrom Physics Engine — Full Rewrite
 * Fixes: pocket positions, friction order, elastic collision COR, coin count/colors
 */

export interface Vector {
  x: number;
  y: number;
}

export interface CarromPiece {
  id: string;
  type: 'white' | 'black' | 'queen' | 'striker';
  position: Vector;
  velocity: Vector;
  isPocketed: boolean;
}

// Board is 0–100 coordinate space
const BOARD_SIZE = 100;

// Physics constants
const FRICTION = 0.982;          // Friction per frame
const MIN_VELOCITY = 0.08;       // Stop threshold
const BOUNCE_DAMPING = 0.72;     // Wall bounce energy retention
const COR = 0.83;                // Coefficient of Restitution for coin-coin

// Piece radii
export const PIECE_RADIUS = 3.5;
export const STRIKER_RADIUS = 5.5;

// Pocket positions — offset from corners so coins can actually reach them
// Board boundary clamping stops at `radius`, so pockets must be within that
export const POCKET_RADIUS = 9;
export const POCKETS: Vector[] = [
  { x: 4.5,  y: 4.5  },   // Top-left
  { x: 95.5, y: 4.5  },   // Top-right
  { x: 4.5,  y: 95.5 },   // Bottom-left
  { x: 95.5, y: 95.5 },   // Bottom-right
];

// --------------------------------------------------------------------------
// Initial board setup: 9 black + 9 white + 1 queen — standard carrom layout
// --------------------------------------------------------------------------
export function createInitialPieces(): CarromPiece[] {
  const pieces: CarromPiece[] = [];

  // Queen at center
  pieces.push({
    id: 'queen',
    type: 'queen',
    position: { x: 50, y: 50 },
    velocity: { x: 0, y: 0 },
    isPocketed: false,
  });

  // Inner ring: 6 coins alternating black/white (3 black, 3 white)
  // Angles: 0°, 60°, 120°, 180°, 240°, 300°
  const innerColors: ('black' | 'white')[] = ['black', 'white', 'black', 'white', 'black', 'white'];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    pieces.push({
      id: `r1-${i}`,
      type: innerColors[i],
      position: {
        x: 50 + Math.cos(angle) * 8,
        y: 50 + Math.sin(angle) * 8,
      },
      velocity: { x: 0, y: 0 },
      isPocketed: false,
    });
  }

  // Outer ring: 12 coins — 6 black, 6 white alternating
  const outerColors: ('black' | 'white')[] = [
    'black', 'white', 'black', 'white',
    'black', 'white', 'black', 'white',
    'black', 'white', 'black', 'white',
  ];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    pieces.push({
      id: `r2-${i}`,
      type: outerColors[i],
      position: {
        x: 50 + Math.cos(angle) * 16,
        y: 50 + Math.sin(angle) * 16,
      },
      velocity: { x: 0, y: 0 },
      isPocketed: false,
    });
  }

  // Striker (placed by player before each shot — initial pos)
  pieces.push({
    id: 'striker',
    type: 'striker',
    position: { x: 50, y: 85 },
    velocity: { x: 0, y: 0 },
    isPocketed: false,
  });

  return pieces;
}

// --------------------------------------------------------------------------
// Main physics step — called once per frame (or many times in simulation)
// Returns updated pieces, whether any piece is still moving, and newly pocketed list
// --------------------------------------------------------------------------
export function updatePhysics(
  pieces: CarromPiece[],
): {
  pieces: CarromPiece[];
  hasMovement: boolean;
  newlyPocketed: CarromPiece[];
} {
  let hasMovement = false;

  // Deep-copy pieces for mutation
  const newPieces: CarromPiece[] = pieces.map(p => ({
    ...p,
    position: { ...p.position },
    velocity: { ...p.velocity },
  }));

  // ── 1. FRICTION FIRST, THEN POSITION UPDATE ──────────────────────────────
  for (const piece of newPieces) {
    if (piece.isPocketed) continue;

    // Apply friction first
    let vx = piece.velocity.x * FRICTION;
    let vy = piece.velocity.y * FRICTION;

    // Clamp to zero to avoid infinite sliding
    if (Math.abs(vx) < MIN_VELOCITY) vx = 0;
    if (Math.abs(vy) < MIN_VELOCITY) vy = 0;

    // Update position
    let nx = piece.position.x + vx;
    let ny = piece.position.y + vy;

    const r = piece.type === 'striker' ? STRIKER_RADIUS : PIECE_RADIUS;

    // ── 2. WALL BOUNCE — damping applied to pre-friction speed ──────────────
    if (nx <= r) {
      vx = Math.abs(piece.velocity.x) * BOUNCE_DAMPING; // reverse + damp raw vel
      nx = r;
    } else if (nx >= BOARD_SIZE - r) {
      vx = -Math.abs(piece.velocity.x) * BOUNCE_DAMPING;
      nx = BOARD_SIZE - r;
    }

    if (ny <= r) {
      vy = Math.abs(piece.velocity.y) * BOUNCE_DAMPING;
      ny = r;
    } else if (ny >= BOARD_SIZE - r) {
      vy = -Math.abs(piece.velocity.y) * BOUNCE_DAMPING;
      ny = BOARD_SIZE - r;
    }

    piece.velocity.x = vx;
    piece.velocity.y = vy;
    piece.position.x = nx;
    piece.position.y = ny;

    if (vx !== 0 || vy !== 0) hasMovement = true;
  }

  // ── 3. CIRCLE-CIRCLE ELASTIC COLLISION ───────────────────────────────────
  for (let i = 0; i < newPieces.length; i++) {
    for (let j = i + 1; j < newPieces.length; j++) {
      const p1 = newPieces[i];
      const p2 = newPieces[j];
      if (p1.isPocketed || p2.isPocketed) continue;

      const dx = p2.position.x - p1.position.x;
      const dy = p2.position.y - p1.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r1 = p1.type === 'striker' ? STRIKER_RADIUS : PIECE_RADIUS;
      const r2 = p2.type === 'striker' ? STRIKER_RADIUS : PIECE_RADIUS;
      const minDist = r1 + r2;

      if (dist < minDist && dist > 0) {
        // Normal unit vector
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate overlapping pieces
        const overlap = (minDist - dist) / 2;
        p1.position.x -= nx * overlap;
        p1.position.y -= ny * overlap;
        p2.position.x += nx * overlap;
        p2.position.y += ny * overlap;

        // Tangent unit vector
        const tx = -ny;
        const ty = nx;

        // Project velocities onto normal / tangent
        const v1n = p1.velocity.x * nx + p1.velocity.y * ny;
        const v2n = p2.velocity.x * nx + p2.velocity.y * ny;
        const v1t = p1.velocity.x * tx + p1.velocity.y * ty;
        const v2t = p2.velocity.x * tx + p2.velocity.y * ty;

        // Only process if pieces are moving toward each other
        if (v1n - v2n <= 0) continue;

        // Masses: striker is heavier
        const m1 = p1.type === 'striker' ? 1.6 : 1.0;
        const m2 = p2.type === 'striker' ? 1.6 : 1.0;

        // ── FIXED elastic collision formula (COR on relative velocity) ──
        const v1nPrime = (v1n * (m1 - m2 * COR) + v2n * m2 * (1 + COR)) / (m1 + m2);
        const v2nPrime = (v2n * (m2 - m1 * COR) + v1n * m1 * (1 + COR)) / (m1 + m2);

        // Tangent components are unchanged (frictionless tangential)
        p1.velocity.x = v1nPrime * nx + v1t * tx;
        p1.velocity.y = v1nPrime * ny + v1t * ty;
        p2.velocity.x = v2nPrime * nx + v2t * tx;
        p2.velocity.y = v2nPrime * ny + v2t * ty;

        hasMovement = true;
      }
    }
  }

  // ── 4. POCKET DETECTION ───────────────────────────────────────────────────
  const newlyPocketed: CarromPiece[] = [];

  for (const piece of newPieces) {
    if (piece.isPocketed) continue;

    const inPocket = POCKETS.some(pocket => {
      const dx = piece.position.x - pocket.x;
      const dy = piece.position.y - pocket.y;
      return Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS;
    });

    if (inPocket) {
      piece.isPocketed = true;
      piece.velocity = { x: 0, y: 0 };
      newlyPocketed.push({ ...piece });
    }
  }

  return { pieces: newPieces, hasMovement, newlyPocketed };
}
