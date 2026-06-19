import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit, where } from '@/firebase/firestore-compat';
import { useMemo } from 'react';
import { Image } from 'expo-image';
import { AnimatedCardBackground } from './animated-card-bg';

interface RankingCardProps {
  onPress: () => void;
}

export function RankingCard({ onPress }: RankingCardProps) {
  const { firestore, isHydrated } = useFirebase();

  const topUsersQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(
      collection(firestore, 'users'),
      where('wallet.dailySpent', '>', 0),
      orderBy('wallet.dailySpent', 'desc'),
      limit(3)
    );
  }, [firestore, isHydrated]);

  const { data: topUsers } = useCollection(topUsersQuery);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      className="flex-1 rounded-[1.4rem] overflow-hidden border-2 border-white/90 shadow-md"
      style={{ aspectRatio: 1.33, borderRadius: 16 }}
    >
      <AnimatedCardBackground colors={['#FFD54F', '#FFB300', '#F57C00']} sparkleCount={6}>
        <View className="flex-1 pt-1.5 p-1 flex-col items-center justify-between">
          <View className="w-full flex-row justify-center mb-0.5">
            <View className="flex-row items-center gap-1">
              <Crown size={8} color="white" fill="white" />
              <Text className="text-white font-black uppercase text-[7px] tracking-widest">Ranking</Text>
            </View>
          </View>

          <View className="relative flex-row items-end justify-center w-full h-full pb-[18px] -space-x-2.5">
            {/* 2nd */}
            {topUsers && topUsers.length >= 2 ? (
              <View className="relative mb-0.5 z-0 items-center">
                <Image cachePolicy="memory-disk" source={{ uri: topUsers[1]?.avatarUrl || 'https://picsum.photos/200' }}
                  className="h-9 w-9 border-2 border-white rounded-full bg-slate-100" />
                <View className="absolute bottom-[-11px] left-0 right-0 items-center z-20">
                  <Text className="text-[10px]">🥈</Text>
                </View>
              </View>
            ) : (
              <View className="h-9 w-9 border-2 border-white rounded-full bg-slate-200/50 mb-0.5 z-0 items-center justify-center">
                <Text className="text-[10px]">🥈</Text>
              </View>
            )}

            {/* 1st — raised */}
            {topUsers && topUsers.length >= 1 ? (
              <View className="relative bottom-[14px] z-10 items-center">
                <Image cachePolicy="memory-disk" source={{ uri: topUsers[0]?.avatarUrl || 'https://picsum.photos/200' }}
                  className="h-11 w-11 border-2 border-white rounded-full bg-white" />
                <View className="absolute bottom-[-12px] left-0 right-0 items-center z-20">
                  <Text className="text-xs">🥇</Text>
                </View>
              </View>
            ) : (
              <View className="h-11 w-11 border-2 border-white rounded-full bg-slate-100 relative z-10 bottom-[14px] items-center justify-center">
                <Text className="text-xs">🥇</Text>
              </View>
            )}

            {/* 3rd */}
            {topUsers && topUsers.length >= 3 ? (
              <View className="relative mb-0.5 z-0 items-center">
                <Image cachePolicy="memory-disk" source={{ uri: topUsers[2]?.avatarUrl || 'https://picsum.photos/200' }}
                  className="h-9 w-9 border-2 border-white rounded-full bg-slate-100" />
                <View className="absolute bottom-[-11px] left-0 right-0 items-center z-20">
                  <Text className="text-[10px]">🥉</Text>
                </View>
              </View>
            ) : (
              <View className="h-9 w-9 border-2 border-white rounded-full bg-slate-200/50 mb-0.5 z-0 items-center justify-center">
                <Text className="text-[10px]">🥉</Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedCardBackground>
    </TouchableOpacity>
  );
}
