import { useMemo } from 'react';
import { calculateLevelProgress, LevelProgress } from '../lib/level-utils';

export interface UserLevelData {
  level: number;
  nextLevel: number;
  progressPercent: number;
  remainingToLevelUp: number;
  currentSpent: number;
  nextLevelThreshold: number;
}

export function useUserLevel(profile: any): UserLevelData {
  return useMemo(() => {
    const totalSpent = profile?.wallet?.totalSpent || 0;
    const progress: LevelProgress = calculateLevelProgress(totalSpent);
    return {
      level: progress.currentLevel,
      nextLevel: progress.nextLevel,
      progressPercent: progress.progressPercent,
      remainingToLevelUp: progress.remainingToLevelUp,
      currentSpent: progress.currentSpent,
      nextLevelThreshold: progress.nextLevelThreshold,
    };
  }, [profile?.wallet?.totalSpent]);
}

export function getLevelFromSpent(totalSpent: number): number {
  return calculateLevelProgress(totalSpent).currentLevel;
}
