import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { AnimatedCardBackground } from './animated-card-bg';

interface CpCardProps {
  onPress: () => void;
}

export function CpCard({ onPress }: CpCardProps) {
  const { firestore, isHydrated } = useFirebase();

  const topCpQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'cpPairs'), orderBy('cpValue', 'desc'), limit(3));
  }, [firestore, isHydrated]);

  const { data: topCp } = useCollection(topCpQuery);

  const Pair = ({ pair, size }: { pair?: any; size: 'lg' | 'md' }) => {
    const s = size === 'lg' ? 28 : 20;
    const ov = size === 'lg' ? -7 : -6;
    const bw = size === 'lg' ? 2.5 : 2;
    const has = !!pair?.user1Avatar;

    return (
      <View style={{ flexDirection: 'row', marginLeft: 2 }}>
        {has ? (
          <Image cachePolicy="memory-disk" source={{ uri: pair.user1Avatar || 'https://picsum.photos/200' }}
            style={{ width: s, height: s, borderRadius: s / 2, borderWidth: bw, borderColor: 'white', backgroundColor: '#fce7f3' }} />
        ) : (
          <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: bw, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        )}
        {has ? (
          <Image cachePolicy="memory-disk" source={{ uri: pair.user2Avatar || 'https://picsum.photos/200' }}
            style={{ width: s, height: s, borderRadius: s / 2, borderWidth: bw, borderColor: 'white', backgroundColor: '#fce7f3', marginLeft: ov }} />
        ) : (
          <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: bw, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: ov }} />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      className="flex-1 rounded-[1.4rem] overflow-hidden border-2 border-white/90 shadow-md"
      style={{ aspectRatio: 1.33, borderRadius: 16 }}
    >
      <AnimatedCardBackground colors={['#F06292', '#E91E63', '#880E4F']} sparkleCount={6}>
        <View className="flex-1 pt-1.5 p-1 flex-col items-center justify-between">
          <View className="w-full flex-row justify-center mb-0.5">
            <View className="flex-row items-center gap-1">
              <Heart size={8} color="white" fill="white" />
              <Text className="text-white font-black uppercase text-[7px] tracking-widest">CP</Text>
            </View>
          </View>

          <View className="relative flex-row items-end justify-center w-full h-full pb-[18px]" style={{ gap: 2 }}>
            {/* 2nd */}
            <View className="items-center mb-0.5 z-0">
              <Pair pair={topCp?.[1]} size="md" />
              <Text style={{ fontSize: 8, marginTop: 1 }}>🥈</Text>
            </View>

            {/* 1st — raised */}
            <View className="items-center z-10" style={{ marginBottom: 12 }}>
              <Pair pair={topCp?.[0]} size="lg" />
              <Text style={{ fontSize: 9, marginTop: 1 }}>🥇</Text>
            </View>

            {/* 3rd */}
            <View className="items-center mb-0.5 z-0">
              <Pair pair={topCp?.[2]} size="md" />
              <Text style={{ fontSize: 8, marginTop: 1 }}>🥉</Text>
            </View>
          </View>
        </View>
      </AnimatedCardBackground>
    </TouchableOpacity>
  );
}
