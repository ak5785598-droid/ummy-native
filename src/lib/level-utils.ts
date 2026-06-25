/**
 * High-Fidelity Level Calculation Engine
 * Ported from web src/lib/level-utils.ts
 */

export interface LevelProgress {
  currentLevel: number;
  nextLevel: number;
  currentSpent: number;
  nextLevelThreshold: number;
  progressPercent: number;
  remainingToLevelUp: number;
}

const THRESHOLDS = [
  { level: 0, spent: 0 },
  { level: 1, spent: 20000 },
  { level: 10, spent: 3500000000 },
  { level: 20, spent: 10000000000 },
  { level: 30, spent: 100000000000 },
  { level: 40, spent: 2000000000000 },
  { level: 50, spent: 25000000000000 },
  { level: 60, spent: 350000500000000 },
  { level: 70, spent: 5000002500000000 },
  { level: 80, spent: 70000000000000000 },
  { level: 90, spent: 850000000000000000 },
  { level: 100, spent: 1000000000000000000 },
];

export function calculateLevelProgress(totalSpent: number = 0): LevelProgress {
  const spent = isNaN(totalSpent) ? 0 : Math.max(0, totalSpent);
  let currentLevel = 0;
  let nextLevelThreshold = THRESHOLDS[1].spent;

  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (spent >= THRESHOLDS[i].spent) {
      currentLevel = THRESHOLDS[i].level;
      if (i < THRESHOLDS.length - 1) {
        const startLevel = THRESHOLDS[i].level;
        const endLevel = THRESHOLDS[i + 1].level;
        const startSpent = THRESHOLDS[i].spent;
        const endSpent = THRESHOLDS[i + 1].spent;
        const levelsInRange = endLevel - startLevel;
        const spentPerLevel = (endSpent - startSpent) / (levelsInRange || 1);
        const extraSpent = spent - startSpent;
        const extraLevels = Math.floor(extraSpent / (spentPerLevel || 1));
        currentLevel = startLevel + extraLevels;
        nextLevelThreshold = startSpent + (extraLevels + 1) * spentPerLevel;
      } else {
        currentLevel = 100;
        nextLevelThreshold = spent;
      }
    } else {
      break;
    }
  }

  currentLevel = Math.min(currentLevel, 100);
  const remaining = Math.max(0, nextLevelThreshold - spent);
  const currentLevelBaseSpent = THRESHOLDS.find(t => t.level <= currentLevel && t.level + 10 > currentLevel)?.spent || 0;
  const rangeSpent = Math.max(1, nextLevelThreshold - currentLevelBaseSpent);
  const progressPercent = currentLevel >= 100 ? 100 : (1 - (remaining / rangeSpent)) * 100;

  return {
    currentLevel,
    nextLevel: Math.min(currentLevel + 1, 100),
    currentSpent: spent,
    nextLevelThreshold,
    progressPercent: isNaN(progressPercent) ? 0 : Math.min(100, Math.max(0, progressPercent)),
    remainingToLevelUp: remaining,
  };
}

export function getCpLevelFromValue(cpValue: number = 0): number {
  return calculateLevelProgress(cpValue).currentLevel;
}

export function calculateCpLevelProgress(cpValue: number = 0): LevelProgress {
  return calculateLevelProgress(cpValue);
}
