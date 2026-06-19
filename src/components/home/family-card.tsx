import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Users } from 'lucide-react-native';
import { useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { AnimatedCardBackground } from './animated-card-bg';

interface FamilyCardProps {
  onPress: () => void;
}

export function FamilyCard({ onPress }: FamilyCardProps) {
  const { firestore, isHydrated } = useFirebase();

  const topFamiliesQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'families'), orderBy('totalWealth', 'desc'), limit(3));
  }, [firestore, isHydrated]);

  const { data: topFamilies } = useCollection(topFamiliesQuery);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      className="flex-1 rounded-[1.4rem] overflow-hidden border-2 border-white/90 shadow-md"
      style={{ aspectRatio: 1.33, borderRadius: 16 }}
    >
      <AnimatedCardBackground colors={['#4FC3F7', '#0288D1', '#01579B']} sparkleCount={6}>
        <View className="flex-1 pt-1.5 p-1 flex-col items-center justify-between">
          <View className="w-full flex-row justify-center mb-0.5">
            <View className="flex-row items-center gap-1">
              <Users size={8} color="white" fill="white" />
              <Text className="text-white font-black uppercase text-[7px] tracking-widest">Family</Text>
            </View>
          </View>

          <View className="relative flex-row items-end justify-center w-full h-full pb-[18px] -space-x-2.5">
            {/* 2nd */}
            {topFamilies && topFamilies.length >= 2 ? (
              <View className="relative mb-0.5 z-0">
                <Image cachePolicy="memory-disk" source={{ uri: topFamilies[1]?.bannerUrl || 'https://picsum.photos/200' }}
                  className="h-9 w-9 border-2 border-white rounded-full bg-blue-100/30" />
                <View className="absolute bottom-[-11px] left-0 right-0 items-center z-20">
                  <Text className="text-[10px]">🥈</Text>
                </View>
              </View>
            ) : (
              <View className="h-9 w-9 border-2 border-white rounded-full bg-white/20 mb-0.5 z-0 items-center justify-center">
                <Text className="text-[10px]">🥈</Text>
              </View>
            )}

            {/* 1st — raised */}
            {topFamilies && topFamilies.length >= 1 ? (
              <View className="relative bottom-[14px] z-10">
                <Image cachePolicy="memory-disk" source={{ uri: topFamilies[0]?.bannerUrl || 'https://picsum.photos/200' }}
                  className="h-11 w-11 border-2 border-white rounded-full bg-blue-50" />
                <View className="absolute bottom-[-12px] left-0 right-0 items-center z-20">
                  <Text className="text-xs">🥇</Text>
                </View>
              </View>
            ) : (
              <View className="h-11 w-11 border-2 border-white rounded-full bg-white/40 items-center justify-center relative z-10 bottom-[14px]">
                <Text className="text-xs">🥇</Text>
              </View>
            )}

            {/* 3rd */}
            {topFamilies && topFamilies.length >= 3 ? (
              <View className="relative mb-0.5 z-0">
                <Image cachePolicy="memory-disk" source={{ uri: topFamilies[2]?.bannerUrl || 'https://picsum.photos/200' }}
                  className="h-9 w-9 border-2 border-white rounded-full bg-blue-100/30" />
                <View className="absolute bottom-[-11px] left-0 right-0 items-center z-20">
                  <Text className="text-[10px]">🥉</Text>
                </View>
              </View>
            ) : (
              <View className="h-9 w-9 border-2 border-white rounded-full bg-white/20 mb-0.5 z-0 items-center justify-center">
                <Text className="text-[10px]">🥉</Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedCardBackground>
    </TouchableOpacity>
  );
}
