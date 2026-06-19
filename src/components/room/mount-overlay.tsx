import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, Dimensions } from 'react-native';

interface MountOverlayProps {
  visible: boolean;
  type?: 'car' | 'bike' | 'rocket' | 'horse';
  username?: string;
  onComplete?: () => void;
}

const EMOJIS: Record<string, string> = { car: '🏎️', bike: '🏍️', rocket: '🚀', horse: '🐎' };

const { width } = Dimensions.get('window');

export function MountOverlay({ visible, type = 'car', username, onComplete }: MountOverlayProps) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { slideAnim.setValue(width); opacity.setValue(0); return; }
    Animated.sequence([
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 5, tension: 30, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(1500),
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete?.());
  }, [visible]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <Animated.View className="absolute bottom-32 left-0 right-0 items-center" style={{ transform: [{ translateX: slideAnim }], opacity }}>
        <Text className="text-6xl mb-2">{EMOJIS[type] || '🏎️'}</Text>
        <Text className="text-white text-base font-bold bg-black/40 px-4 py-1 rounded-full">{username || 'Someone'} arrived in style</Text>
      </Animated.View>
    </View>
  );
}
