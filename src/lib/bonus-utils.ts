/**
 * Bonus system utilities
 * - Dynamic reward rate based on room level
 * - Daily activity points tracking
 * - Expiry logic (next day 24:00 IST)
 * - Bonus history
 */

// Room level → Reward Rate mapping
// Based on GOALS_REWARDS from room-support-dialog.tsx
const ROOM_LEVEL_RATES: { minLevel: number; maxLevel: number; rate: number }[] = [
  { minLevel: 0, maxLevel: 20, rate: 0.10 },   // 10%
  { minLevel: 21, maxLevel: 30, rate: 0.12 },  // 12%
  { minLevel: 31, maxLevel: 40, rate: 0.15 },  // 15%
  { minLevel: 41, maxLevel: 50, rate: 0.17 },  // 17%
  { minLevel: 51, maxLevel: 70, rate: 0.20 },  // 20%
  { minLevel: 71, maxLevel: 90, rate: 0.22 },  // 22%
  { minLevel: 91, maxLevel: 100, rate: 0.25 }, // 25%
];

/**
 * Get reward rate based on room level
 */
export function getRewardRate(roomLevel: number): number {
  for (const tier of ROOM_LEVEL_RATES) {
    if (roomLevel >= tier.minLevel && roomLevel <= tier.maxLevel) {
      return tier.rate;
    }
  }
  return 0.10; // default 10%
}

/**
 * Get reward rate label for display
 */
export function getRewardRateLabel(roomLevel: number): string {
  const rate = getRewardRate(roomLevel);
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Calculate bonus amount from activity points and room level
 */
export function calculateBonus(activityPoints: number, roomLevel: number): number {
  const rate = getRewardRate(roomLevel);
  return Math.floor(activityPoints * rate);
}

/**
 * Get IST now
 */
function getISTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000); // IST = UTC + 5:30
}

/**
 * Get today's IST date string (YYYY-MM-DD)
 */
export function getTodayIST(): string {
  const ist = getISTNow();
  return ist.toISOString().split('T')[0];
}

/**
 * Get expiry time for today's activity points (next day 24:00 IST)
 */
export function getExpiryTimeIST(): Date {
  const ist = getISTNow();
  const tomorrow = new Date(ist);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  return tomorrow;
}

/**
 * Check if daily activity points have expired
 */
export function isDailyPointsExpired(lastResetDate: string): boolean {
  const today = getTodayIST();
  return lastResetDate !== today;
}

/**
 * Calculate time remaining until expiry (next day 24:00 IST)
 */
export function getTimeUntilExpiry(): { hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = getISTNow();
  const expiry = getExpiryTimeIST();
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  return { hours, minutes, seconds, expired: false };
}

/**
 * Format time remaining as string
 */
export function formatTimeUntilExpiry(): string {
  const { hours, minutes, seconds, expired } = getTimeUntilExpiry();
  if (expired) return 'Expired';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

/**
 * Calculate room level from levelPoints (activity-based)
 * Formula: level = floor(sqrt(levelPoints / 100)) + 1
 * This gives levels 1-100+ based on accumulated activity
 */
export function getRoomLevelFromPoints(levelPoints: number): number {
  return Math.floor(Math.sqrt(levelPoints / 100)) + 1;
}

/**
 * Reward rate tiers for display
 */
export const RATE_TIERS = [
  { range: 'Lv 0 - 20', rate: '10%' },
  { range: 'Lv 21 - 30', rate: '12%' },
  { range: 'Lv 31 - 40', rate: '15%' },
  { range: 'Lv 41 - 50', rate: '17%' },
  { range: 'Lv 51 - 70', rate: '20%' },
  { range: 'Lv 71 - 90', rate: '22%' },
  { range: 'Lv 91 - 100', rate: '25%' },
];
