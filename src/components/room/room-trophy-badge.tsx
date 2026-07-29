import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, ChevronDown, X, Crown, Medal } from 'lucide-react-native';
import { TopSupporter } from '../../lib/types';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

import { useUserProfile } from '../../hooks/use-user-profile';

interface RoomTrophyBadgeProps {
  dailyGifts?: number;
  supporters?: TopSupporter[];
  onPress?: () => void;
  onOpenSupport?: () => void;
}

const TARGET = 2500000;

function LiveBadgeAvatar({ sup, idx }: { sup: any; idx: number }) {
  const { profile } = useUserProfile(sup.uid);
  const avatarUrl = profile?.avatarUrl || sup.avatarUrl;
  const name = profile?.username || profile?.name || sup.username || 'U';

  return (
    <View className={`w-4 h-4 rounded-full border overflow-hidden ${idx === 0 ? 'border-yellow-400 z-30' : idx === 1 ? 'border-slate-300 z-20' : 'border-amber-600 z-10'}`}>
      {avatarUrl ? (
        <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) }} className="w-full h-full" />
      ) : (
        <View className="w-full h-full bg-slate-800 items-center justify-center">
          <Text className="text-[4px] text-white font-black">{name.charAt(0)}</Text>
        </View>
      )}
    </View>
  );
}

function getSupporterMillis(s: any): number {
  if (!s?.updatedAt) return Date.now();
  if (typeof s.updatedAt.toMillis === 'function') return s.updatedAt.toMillis();
  if (s.updatedAt.seconds) return s.updatedAt.seconds * 1000;
  if (typeof s.updatedAt === 'number') return s.updatedAt;
  if (typeof s.updatedAt === 'string') return new Date(s.updatedAt).getTime();
  return Date.now();
}

function isToday(millis: number): boolean {
  const d1 = new Date(millis);
  const d2 = new Date();
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function RoomTrophyBadge({ dailyGifts = 0, supporters = [], onOpenSupport, onPress }: RoomTrophyBadgeProps) {
  const progress = Math.min((dailyGifts / TARGET) * 100, 100);

  // Filter top 3 supporters for TODAY only
  const todayTopSupporters = supporters
    .map(s => {
      const millis = getSupporterMillis(s);
      const amount = isToday(millis) ? (s.dailyAmount || s.amount || 0) : 0;
      return { ...s, displayAmount: amount };
    })
    .filter(s => s.displayAmount > 0)
    .sort((a, b) => b.displayAmount - a.displayAmount)
    .slice(0, 3);

  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center mt-2 ml-3 active:scale-95 self-start">
      <View className="flex-row items-center bg-black/50 border border-yellow-500/20 rounded-full pl-0.5 pr-1.5 py-0.5 gap-0.5">
        <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} className="w-5 h-5 rounded-full items-center justify-center">
          <Trophy size={10} color="black" fill="black" />
        </LinearGradient>
        <View className="ml-0.5">
          <Text className="text-[9px] font-black text-yellow-400 leading-none">
            {dailyGifts >= 1000000 ? `${(dailyGifts / 1000000).toFixed(2)}M` : dailyGifts.toLocaleString()}
          </Text>
          <View className="h-0.5 w-8 bg-white/10 rounded-full mt-0.5 overflow-hidden">
            <View className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" style={{ width: `${progress}%` }} />
          </View>
        </View>
        {todayTopSupporters.length > 0 && (
          <View className="flex-row -space-x-1 ml-1">
            {todayTopSupporters.map((sup, idx) => (
              <LiveBadgeAvatar key={sup.uid || idx} sup={sup} idx={idx} />
            ))}
          </View>
        )}


        <ChevronDown size={9} color="rgba(234,179,8,0.3)" />
      </View>
    </TouchableOpacity>
  );
}
