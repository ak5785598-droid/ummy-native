import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, serverTimestamp, collection, setDoc, increment, arrayUnion } from '../firebase/firestore-compat';
import { getLevelFromSpent } from './use-user-level';
import { calculateLevelUpRewards } from '../lib/level-rewards';

interface LevelUpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  coinsReward: number;
  framesAwarded: string[];
}

/**
 * Detects level-ups and distributes rewards automatically
 * Call this after any totalSpent change
 */
export async function detectAndDistributeLevelUp(
  firestore: any,
  userId: string,
  oldTotalSpent: number,
  newTotalSpent: number
): Promise<LevelUpResult> {
  const oldLevel = getLevelFromSpent(oldTotalSpent);
  const newLevel = getLevelFromSpent(newTotalSpent);

  if (newLevel <= oldLevel) {
    return { leveledUp: false, oldLevel, newLevel: oldLevel, coinsReward: 0, framesAwarded: [] };
  }

  // Calculate rewards
  const { totalCoins, frames } = calculateLevelUpRewards(oldLevel, newLevel);
  const frameIds = frames.map(f => f.frameId || '');

  // Update user document with rewards
  const userRef = doc(firestore, 'users', userId);
  const profileRef = doc(firestore, 'users', userId, 'profile', userId);

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  // Add coins if any
  if (totalCoins > 0) {
    updateData['wallet.coins'] = increment(totalCoins);
  }

  // Add frames to inventory
  if (frameIds.length > 0) {
    updateData['inventory.ownedItems'] = arrayUnion(...frameIds);
  }

  await updateDoc(userRef, updateData);
  await updateDoc(profileRef, updateData);

  // Log transaction for coins
  if (totalCoins > 0) {
    const txRef = doc(collection(firestore, 'users', userId, 'transactions'));
    await setDoc(txRef, {
      amount: totalCoins,
      currency: 'coins',
      type: 'level_up_reward',
      description: `Level Up! Reached Level ${newLevel}. Earned ${totalCoins.toLocaleString()} coins.`,
      timestamp: serverTimestamp(),
    });
  }

  // Log transaction for frames
  for (const frame of frames) {
    const frameTxRef = doc(collection(firestore, 'users', userId, 'transactions'));
    await setDoc(frameTxRef, {
      amount: 0,
      currency: 'coins',
      type: 'level_up_frame',
      description: `Level Up Reward: ${frame.frameName} at Level ${frame.level}`,
      timestamp: serverTimestamp(),
    });
  }

  return {
    leveledUp: true,
    oldLevel,
    newLevel,
    coinsReward: totalCoins,
    framesAwarded: frames.map(f => f.frameName || ''),
  };
}

/**
 * Hook to track level-ups and show notification
 */
export function useLevelUpDetector(userId: string | undefined, totalSpent: number) {
  const prevSpentRef = useRef(totalSpent);
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);

  useEffect(() => {
    prevSpentRef.current = totalSpent;
  }, []);

  const checkLevelUp = async (firestore: any, newTotalSpent: number) => {
    if (!userId || !firestore) return null;

    const oldSpent = prevSpentRef.current;
    prevSpentRef.current = newTotalSpent;

    if (newTotalSpent <= oldSpent) return null;

    const result = await detectAndDistributeLevelUp(firestore, userId, oldSpent, newTotalSpent);

    if (result.leveledUp) {
      setLevelUpResult(result);
    }

    return result;
  };

  const clearLevelUp = () => setLevelUpResult(null);

  return { levelUpResult, checkLevelUp, clearLevelUp };
}
