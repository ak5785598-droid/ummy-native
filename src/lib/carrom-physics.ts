/**
 * Carrom Physics Engine.
 * 2D elastic collisions, friction, and pocketing logic.
 */

export interface Vector {
  x: number;
  y: number;
}

const BOARD_SIZE = 100;
const FRICTION = 0.985;
const MIN_VELOCITY = 0.1;
const BOUNCE_DAMPING = 0.7;
const PIECE_RADIUS = 3.5;
const STRIKER_RADIUS = 5.5;
const POCKET_RADIUS = 8;

export const POCKETS: Vector[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: 100 },
  { x: 100, y: 100 }
];

export function updatePhysics(pieces: any[], _deltaTime: number = 16) {
  let hasMovement = false;

  const newPieces = pieces.map(piece => {
    if (piece.isPocketed) return piece;

    let nextX = piece.position.x + piece.velocity.x;
    let nextY = piece.position.y + piece.velocity.y;

    let nextVelX = piece.velocity.x * FRICTION;
    let nextVelY = piece.velocity.y * FRICTION;

    if (Math.abs(nextVelX) < MIN_VELOCITY) nextVelX = 0;
    if (Math.abs(nextVelY) < MIN_VELOCITY) nextVelY = 0;

    const radius = piece.type === 'striker' ? STRIKER_RADIUS : PIECE_RADIUS;

    if (nextX <= radius || nextX >= BOARD_SIZE - radius) {
      nextVelX = -nextVelX * BOUNCE_DAMPING;
      nextX = nextX <= radius ? radius : BOARD_SIZE - radius;
    }
    if (nextY <= radius || nextY >= BOARD_SIZE - radius) {
      nextVelY = -nextVelY * BOUNCE_DAMPING;
      nextY = nextY <= radius ? radius : BOARD_SIZE - radius;
    }

    if (nextVelX !== 0 || nextVelY !== 0) hasMovement = true;

    return {
      ...piece,
      position: { x: nextX, y: nextY },
      velocity: { x: nextVelX, y: nextVelY }
    };
  });

  // Circle-Circle Collisions
  for (let i = 0; i < newPieces.length; i++) {
    for (let j = i + 1; j < newPieces.length; j++) {
      const p1 = newPieces[i];
      const p2 = newPieces[j];

      if (p1.isPocketed || p2.isPocketed) continue;

      const dx = p2.position.x - p1.position.x;
      const dy = p2.position.y - p1.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const r1 = p1.type === 'striker' ? STRIKER_RADIUS : PIECE_RADIUS;
      const r2 = p2.type === 'striker' ? STRIKER_RADIUS : PIECE_RADIUS;

      if (distance < r1 + r2) {
        const overlap = r1 + r2 - distance;
        const nx = dx / distance;
        const ny = dy / distance;

        // Displace pieces to resolve overlap instantly and avoid stuck states
        const pushX = nx * (overlap / 2);
        const pushY = ny * (overlap / 2);
        p1.position.x -= pushX;
        p1.position.y -= pushY;
        p2.position.x += pushX;
        p2.position.y += pushY;

        // Tangent unit vector
        const tx = -ny;
        const ty = nx;

        // Project velocities onto normal and tangent vectors
        const v1n = p1.velocity.x * nx + p1.velocity.y * ny;
        const v2n = p2.velocity.x * nx + p2.velocity.y * ny;
        const v1t = p1.velocity.x * tx + p1.velocity.y * ty;
        const v2t = p2.velocity.x * tx + p2.velocity.y * ty;

        // Physics constants: Striker is heavier than standard gotis
        const m1 = p1.type === 'striker' ? 1.6 : 1.0;
        const m2 = p2.type === 'striker' ? 1.6 : 1.0;

        // 1D elastic collision formula for normal velocities with restitution coefficient
        const COR = 0.85; // Coefficient of Restitution
        const v1nPrime = ((v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2)) * COR;
        const v2nPrime = ((v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2)) * COR;

        // Reconstruct velocity vectors
        p1.velocity.x = v1nPrime * nx + v1t * tx;
        p1.velocity.y = v1nPrime * ny + v1t * ty;
        p2.velocity.x = v2nPrime * nx + v2t * tx;
        p2.velocity.y = v2nPrime * ny + v2t * ty;

        hasMovement = true;
      }
    }
  }

  // Pocketing Check
  const finalPieces = newPieces.map(piece => {
    if (piece.isPocketed) return piece;

    const isInsidePocket = POCKETS.some(pocket => {
      const dist = Math.sqrt(
        Math.pow(piece.position.x - pocket.x, 2) +
        Math.pow(piece.position.y - pocket.y, 2)
      );
      return dist < POCKET_RADIUS;
    });

    if (isInsidePocket) {
      return { ...piece, isPocketed: true, velocity: { x: 0, y: 0 } };
    }
    return piece;
  });

  return { pieces: finalPieces, hasMovement };
}
