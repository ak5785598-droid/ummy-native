import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, ChevronDown, X, Crown, Medal } from 'lucide-react-native';
import { TopSupporter } from '../../lib/types';
import { Image } from 'expo-image';

interface RoomTrophyBadgeProps {
  dailyGifts?: number;
  supporters?: TopSupporter[];
  onPress?: () => void;
  onOpenSupport?: () => void;
}

const TARGET = 2500000;

export function RoomTrophyBadge({ dailyGifts = 0, supporters = [], onOpenSupport, onPress }: RoomTrophyBadgeProps) {
  const progress = Math.min((dailyGifts / TARGET) * 100, 100);

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
        {supporters.length > 0 && (
          <View className="flex-row -space-x-1 ml-1">
            {supporters.slice(0, 3).map((sup, idx) => (
              <View key={sup.uid || idx} className={`w-4 h-4 rounded-full border overflow-hidden ${idx === 0 ? 'border-yellow-400 z-30' : idx === 1 ? 'border-slate-300 z-20' : 'border-amber-600 z-10'}`}>
                {sup.avatarUrl ? (
                  <Image cachePolicy="memory-disk" source={{ uri: sup.avatarUrl }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full bg-slate-800 items-center justify-center">
                    <Text className="text-[4px] text-white font-black">{(sup.username || 'U').charAt(0)}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        <ChevronDown size={9} color="rgba(234,179,8,0.3)" />
      </View>
    </TouchableOpacity>
  );
}
