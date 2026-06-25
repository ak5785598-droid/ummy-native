import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface LuckyRainEvent {
  id: string;
  senderName: string;
  totalAmount: number;
  rainCount: number;
}

interface LuckyRainOverlayProps {
  events: LuckyRainEvent[];
}

function RainDrop({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(-50)).current;
  const x = useRef(new Animated.Value(Math.random() * width)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, {
          toValue: height + 50,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        ),
      ]),
    ]).start();
  }, []);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        top: anim,
        left: x,
        fontSize: 20 + Math.random() * 16,
        transform: [{ rotate: rotation }],
      }}
    >
      🪙
    </Animated.Text>
  );
}

export function LuckyRainOverlay({ events }: LuckyRainOverlayProps) {
  const latest = events[events.length - 1];
  const [visible, setVisible] = useState(false);
  const [rainDrops] = useState(() => Array.from({ length: 20 }, (_, i) => i));
  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!latest) return;
    setVisible(true);

    Animated.sequence([
      Animated.spring(bannerAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [latest?.id]);

  if (!visible || !latest) return null;

  return (
    <View className="absolute inset-0 z-50 pointer-events-none">
      {rainDrops.map((i) => (
        <RainDrop key={i} delay={i * 100} />
      ))}

      <Animated.View
        style={{
          opacity: bannerAnim,
          transform: [{ scale: bannerAnim }],
        }}
        className="absolute top-1/4 left-8 right-8 items-center"
      >
        <LinearGradient colors={['#facc15', '#d97706']} className="rounded-2xl px-6 py-4 shadow-lg">
          <Text className="text-white text-lg font-black text-center">🎉 Lucky Rain!</Text>
          <Text className="text-white/90 text-sm text-center mt-1">
            {latest.senderName} dropped {latest.totalAmount.toLocaleString()} coins!
          </Text>
          </LinearGradient>
        </Animated.View>
    </View>
  );
}
