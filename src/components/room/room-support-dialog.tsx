import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, TrendingUp, Gift, Star, Crown, Sparkles, Zap, Heart, Flame, Gem } from 'lucide-react-native';

const ROOM_LEVELS = [
  { level: 1, name: 'Bronze 1', icon: '🥉', minGifts: 0, reward: 100 },
  { level: 2, name: 'Bronze 2', icon: '🥉', minGifts: 500, reward: 250 },
  { level: 3, name: 'Bronze 3', icon: '🥉', minGifts: 1500, reward: 500 },
  { level: 4, name: 'Silver 1', icon: '🥈', minGifts: 5000, reward: 1000 },
  { level: 5, name: 'Silver 2', icon: '🥈', minGifts: 10000, reward: 2000 },
  { level: 6, name: 'Silver 3', icon: '🥈', minGifts: 25000, reward: 4000 },
  { level: 7, name: 'Gold 1', icon: '🥇', minGifts: 50000, reward: 8000 },
  { level: 8, name: 'Gold 2', icon: '🥇', minGifts: 100000, reward: 12000 },
  { level: 9, name: 'Gold 3', icon: '🥇', minGifts: 250000, reward: 20000 },
  { level: 10, name: 'Platinum', icon: '💎', minGifts: 500000, reward: 35000 },
  { level: 11, name: 'Diamond', icon: '💎', minGifts: 1000000, reward: 50000 },
  { level: 12, name: 'Crown', icon: '👑', minGifts: 2500000, reward: 75000 },
  { level: 13, name: 'Royal Crown', icon: '👑', minGifts: 5000000, reward: 100000 },
  { level: 14, name: 'Legendary', icon: '⭐', minGifts: 10000000, reward: 150000 },
  { level: 15, name: 'Mythic', icon: '🔥', minGifts: 25000000, reward: 250000 },
  { level: 16, name: 'Celestial', icon: '🌌', minGifts: 50000000, reward: 400000 },
  { level: 17, name: 'Immortal', icon: '🏆', minGifts: 100000000, reward: 1000000 },
];

interface RoomSupportDialogProps {
  visible: boolean;
  onClose: () => void;
  totalGifts?: number;
  currentLevel?: number;
}

export function RoomSupportDialog({ visible, onClose, totalGifts = 0, currentLevel = 1 }: RoomSupportDialogProps) {
  const level = ROOM_LEVELS.find((l, i) => {
    const next = ROOM_LEVELS[i + 1];
    return totalGifts >= l.minGifts && (!next || totalGifts < next.minGifts);
  }) || ROOM_LEVELS[0];

  const nextLevel = ROOM_LEVELS.find(l => l.minGifts > totalGifts) || ROOM_LEVELS[ROOM_LEVELS.length - 1];
  const progress = nextLevel ? ((totalGifts - level.minGifts) / (nextLevel.minGifts - level.minGifts)) * 100 : 100;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] max-h-[80%] pb-6">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2"><TrendingUp size={16} color="rgba(255,255,255,0.6)" /><Text className="text-white text-base font-bold">Room Support</Text></View>
            <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <View className="px-6 py-4 border-b border-white/10">
            <Text className="text-white/50 text-xs uppercase tracking-widest font-bold mb-1">Current Level</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-3xl">{level.icon}</Text>
              <View className="flex-1">
                <Text className="text-white text-lg font-black">{level.name}</Text>
                <Text className="text-white/30 text-[10px]">{totalGifts.toLocaleString()} gifts total</Text>
                <View className="h-2 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <View className="h-full bg-gradient-to-r from-yellow-400 to-purple-500 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                </View>
                <Text className="text-white/30 text-[8px] mt-0.5">{nextLevel ? `${totalGifts.toLocaleString()} / ${nextLevel.minGifts.toLocaleString()}` : 'MAX LEVEL'}</Text>
              </View>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ROOM_LEVELS.map((l, i) => {
              const isCurrent = l.level === level.level;
              const isUnlocked = totalGifts >= l.minGifts;
              return (
                <View key={l.level} className={`flex-row items-center px-6 py-3 border-b border-white/5 ${isCurrent ? 'bg-yellow-500/10' : ''}`}>
                  <Text className="text-xl w-8">{l.icon}</Text>
                  <View className="flex-1 ml-2">
                    <Text className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-white/30'}`}>{l.name}</Text>
                    {isCurrent && <Text className="text-yellow-400 text-[8px] font-bold uppercase">Current</Text>}
                  </View>
                  <Text className={`text-xs font-bold ${isUnlocked ? 'text-amber-400' : 'text-white/20'}`}>{l.minGifts.toLocaleString()} gifts</Text>
                  <Text className={`text-xs font-bold ml-3 ${isUnlocked ? 'text-emerald-400' : 'text-white/20'}`}>+{l.reward}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
