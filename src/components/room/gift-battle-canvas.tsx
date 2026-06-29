import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useFirestore } from '../../firebase/provider';
import { doc, onSnapshot } from '@/firebase/firestore-compat';

interface GiftBattleCanvasProps {
  visible: boolean;
  roomId?: string;
}

export function GiftBattleCanvas({ visible, roomId }: GiftBattleCanvasProps) {
  const firestore = useFirestore();
  const [battleState, setBattleState] = useState<any>(null);
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!firestore || !roomId) return;
    const ref = doc(firestore, 'chatRooms', roomId, 'features', 'giftBattle');
    const unsub = onSnapshot(ref, (snap: any) => {
      if (snap.exists()) setBattleState(snap.data());
      else setBattleState(null);
    }, (error: any) => {});
    return () => unsub();
  }, [firestore, roomId]);

  useEffect(() => {
    if (!battleState?.isActive) { leftAnim.setValue(0); rightAnim.setValue(0); return; }
    const total = Math.max((battleState.scoreLeft || 0) + (battleState.scoreRight || 0), 1);
    Animated.parallel([
      Animated.spring(leftAnim, { toValue: ((battleState.scoreLeft || 0) / total) * 100, friction: 6, tension: 20, useNativeDriver: false }),
      Animated.spring(rightAnim, { toValue: ((battleState.scoreRight || 0) / total) * 100, friction: 6, tension: 20, useNativeDriver: false }),
    ]).start();
  }, [battleState?.scoreLeft, battleState?.scoreRight, battleState?.isActive]);

  if (!visible || !battleState?.isActive) return null;

  const leftWidth = leftAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const rightWidth = rightAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const leftName = battleState.leftUser?.name || 'Team A';
  const rightName = battleState.rightUser?.name || 'Team B';

  return (
    <View className="absolute inset-0 z-50 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <View className="flex-1 justify-center px-6">
        <Text className="text-white text-lg font-black text-center mb-6">GIFT BATTLE</Text>
        <View className="flex-row items-end gap-2 h-48">
          <View className="flex-1 items-center">
            <Text className="text-white/70 text-[10px] font-bold mb-1 uppercase">{leftName}</Text>
            <Text className="text-white text-lg font-black mb-1" style={{ color: '#8b5cf6' }}>{battleState.scoreLeft || 0}</Text>
            <Animated.View className="w-full rounded-t-lg" style={{ height: leftWidth, backgroundColor: '#8b5cf6', opacity: 0.7 }} />
          </View>
          <Text className="text-white/40 text-xl font-black mb-8">VS</Text>
          <View className="flex-1 items-center">
            <Text className="text-white/70 text-[10px] font-bold mb-1 uppercase">{rightName}</Text>
            <Text className="text-white text-lg font-black mb-1" style={{ color: '#ec4899' }}>{battleState.scoreRight || 0}</Text>
            <Animated.View className="w-full rounded-t-lg" style={{ height: rightWidth, backgroundColor: '#ec4899', opacity: 0.7 }} />
          </View>
        </View>
        <Text className="text-white/40 text-[10px] text-center mt-4">Battle in progress...</Text>
      </View>
    </View>
  );
}
