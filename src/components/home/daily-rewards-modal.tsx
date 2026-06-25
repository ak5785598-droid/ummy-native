import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Crown, Gift, Flame } from 'lucide-react-native';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '../../firebase/provider';
import { doc, serverTimestamp, increment } from '@/firebase/firestore-compat';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';

interface DailyRewardsModalProps {
  visible: boolean;
  onClose: () => void;
}

const REWARDS = [
  { day: 1, coins: 5000, emoji: '🪙' },
  { day: 2, coins: 5000, emoji: '🪙' },
  { day: 3, coins: 8000, emoji: '💰' },
  { day: 4, coins: 10000, emoji: '💎' },
  { day: 5, coins: 10000, emoji: '💎' },
  { day: 6, coins: 10000, emoji: '👑' },
  { day: 7, coins: 15000, emoji: '🌟', isBig: true },
];

function getDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isYesterday(ts: any): boolean {
  if (!ts) return false;
  const date = ts?.toDate?.() || new Date(ts);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function isToday(ts: any): boolean {
  if (!ts) return false;
  const date = ts?.toDate?.() || new Date(ts);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function DailyRewardsModal({ visible, onClose }: DailyRewardsModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userRef = useMemoFirebase(
    () => (!firestore || !user?.uid ? null : doc(firestore, 'users', user.uid)),
    [firestore, user?.uid]
  );
  const { data: userData } = useDoc<any>(userRef);

  const [streak, setStreak] = useState(0);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [claimedReward, setClaimedReward] = useState<typeof REWARDS[0] | null>(null);

  useEffect(() => {
    if (!visible || !userData) return;

    const lastClaim = userData?.lastDailyClaimAt;
    const savedStreak = userData?.dailyStreak || 0;

    if (isToday(lastClaim)) {
      setAlreadyClaimed(true);
      setStreak(savedStreak);
    } else if (isYesterday(lastClaim)) {
      setAlreadyClaimed(false);
      setStreak(savedStreak + 1);
    } else {
      setAlreadyClaimed(false);
      setStreak(1);
    }
    setClaimedReward(null);
  }, [visible, userData]);

  const currentDay = Math.min(streak, 7);
  const currentReward = REWARDS.find((r) => r.day === currentDay) || REWARDS[0];

  const handleClaim = async () => {
    if (!user?.uid || !firestore || alreadyClaimed) return;

    const coins = currentReward.coins;

    updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
      'wallet.coins': increment(coins),
      lastDailyClaimAt: serverTimestamp(),
      dailyStreak: streak,
    });

    updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'profile', user.uid), {
      'wallet.coins': increment(coins),
    });

    setClaimedReward(currentReward);
    setAlreadyClaimed(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onClose, 1500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Crown size={24} color="#8b5cf6" />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>Daily Rewards</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: alreadyClaimed ? '#f0fdf4' : '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: alreadyClaimed ? '#bbf7d0' : '#fde68a' }}>
              <Flame size={16} color={alreadyClaimed ? '#22c55e' : '#f59e0b'} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: alreadyClaimed ? '#16a34a' : '#d97706' }}>
                {streak} day streak!
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Sign in daily to earn rewards!</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {REWARDS.slice(0, 4).map((reward) => {
              const isActive = reward.day === currentDay;
              const isDone = reward.day < currentDay || (reward.day === currentDay && alreadyClaimed);
              return (
                <View
                  key={reward.day}
                  style={{
                    flex: 1,
                    minWidth: 70,
                    backgroundColor: isActive ? '#fef3c7' : '#f8fafc',
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: isActive ? '#fbbf24' : isDone ? '#86efac' : '#e2e8f0',
                    opacity: isDone && !isActive ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: isActive ? '#d97706' : '#94a3b8', textTransform: 'uppercase' }}>
                    Day {reward.day}
                  </Text>
                  <Text style={{ fontSize: 18, marginVertical: 4 }}>{reward.emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isActive ? '#92400e' : '#475569' }}>
                    {reward.coins.toLocaleString()}
                  </Text>
                  {isDone && !isActive && <Text style={{ fontSize: 8, color: '#22c55e', marginTop: 2 }}>✓</Text>}
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {REWARDS.slice(4, 6).map((reward) => {
              const isActive = reward.day === currentDay;
              const isDone = reward.day < currentDay || (reward.day === currentDay && alreadyClaimed);
              return (
                <View
                  key={reward.day}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? '#fef3c7' : '#f8fafc',
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: isActive ? '#fbbf24' : isDone ? '#86efac' : '#e2e8f0',
                    opacity: isDone && !isActive ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: isActive ? '#d97706' : '#94a3b8', textTransform: 'uppercase' }}>
                    Day {reward.day}
                  </Text>
                  <Text style={{ fontSize: 18, marginVertical: 4 }}>{reward.emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isActive ? '#92400e' : '#475569' }}>
                    {reward.coins.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>

          <LinearGradient
            colors={REWARDS[6].day === currentDay ? ['#fef3c7', '#fde68a'] : ['#f8fafc', '#f1f5f9']}
            style={{
              borderRadius: 16,
              padding: 14,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: REWARDS[6].day === currentDay ? '#fbbf24' : '#e2e8f0',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#d97706', textTransform: 'uppercase', marginBottom: 4 }}>
              Day 7 - Big Rewards
            </Text>
            <Text style={{ fontSize: 28 }}>🌟</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#92400e', marginTop: 4 }}>
              {REWARDS[6].coins.toLocaleString()} Coins
            </Text>
          </LinearGradient>

          {claimedReward ? (
            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#86efac' }}>
              <Text style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 16 }}>+{claimedReward.coins.toLocaleString()} Coins!</Text>
              <Text style={{ color: '#22c55e', fontSize: 12, marginTop: 2 }}>Claimed successfully!</Text>
            </View>
          ) : alreadyClaimed ? (
            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontWeight: 'bold', fontSize: 14 }}>Already signed in today!</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Come back tomorrow for more</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleClaim} activeOpacity={0.8}>
              <LinearGradient colors={['#8b5cf6', '#6366f1']} style={{ borderRadius: 20, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Sign in Today</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
                  +{currentReward.coins.toLocaleString()} coins
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
