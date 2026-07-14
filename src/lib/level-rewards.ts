/**
 * Level-Up Reward Configuration
 * Defines coins + frame rewards at each level threshold
 */

export interface LevelReward {
  level: number;
  coins: number;
  frameId?: string;
  frameName?: string;
}

// Level rewards table - coins + frames at specific levels
export const LEVEL_REWARDS: LevelReward[] = [
  { level: 1, coins: 5000 },
  { level: 2, coins: 3000 },
  { level: 3, coins: 3000 },
  { level: 4, coins: 4000 },
  { level: 5, coins: 5000, frameId: 'level_5_frame', frameName: 'Bronze Frame' },
  { level: 6, coins: 4000 },
  { level: 7, coins: 4000 },
  { level: 8, coins: 5000 },
  { level: 9, coins: 5000 },
  { level: 10, coins: 10000, frameId: 'level_10_frame', frameName: 'Silver Frame' },
  { level: 11, coins: 6000 },
  { level: 12, coins: 6000 },
  { level: 13, coins: 7000 },
  { level: 14, coins: 7000 },
  { level: 15, coins: 15000, frameId: 'level_15_frame', frameName: 'Gold Frame' },
  { level: 16, coins: 8000 },
  { level: 17, coins: 8000 },
  { level: 18, coins: 9000 },
  { level: 19, coins: 9000 },
  { level: 20, coins: 25000, frameId: 'level_20_frame', frameName: 'Diamond Frame' },
  { level: 25, coins: 50000, frameId: 'level_25_frame', frameName: 'Royal Frame' },
  { level: 30, coins: 100000, frameId: 'level_30_frame', frameName: 'Legendary Frame' },
  { level: 35, coins: 150000, frameId: 'level_35_frame', frameName: 'Mythic Frame' },
  { level: 40, coins: 250000, frameId: 'level_40_frame', frameName: 'Eternal Frame' },
  { level: 45, coins: 400000, frameId: 'level_45_frame', frameName: 'Celestial Frame' },
  { level: 50, coins: 750000, frameId: 'level_50_frame', frameName: 'Divine Frame' },
];

/**
 * Get reward for reaching a specific level
 */
export function getLevelReward(level: number): LevelReward | null {
  return LEVEL_REWARDS.find(r => r.level === level) || null;
}

/**
 * Calculate total coins earned from level ups between two levels
 */
export function calculateLevelUpRewards(oldLevel: number, newLevel: number): { totalCoins: number; frames: LevelReward[] } {
  let totalCoins = 0;
  const frames: LevelReward[] = [];

  for (const reward of LEVEL_REWARDS) {
    if (reward.level > oldLevel && reward.level <= newLevel) {
      totalCoins += reward.coins;
      if (reward.frameId) {
        frames.push(reward);
      }
    }
  }

  return { totalCoins, frames };
}
