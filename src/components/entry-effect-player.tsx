import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Dimensions, Easing } from 'react-native';
import { Image } from 'expo-image';
import { toCDN } from '../lib/cdn';

const { width, height } = Dimensions.get('window');

interface EntryEffectEvent {
  id: string;
  username: string;
  avatarUrl: string;
  frameUrl?: string | null;
  waveUrl?: string | null;
}

interface EntryEffectPlayerProps {
  events: EntryEffectEvent[];
}

export function EntryEffectPlayer({ events }: EntryEffectPlayerProps) {
  const latest = events[events.length - 1];
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!latest) return;
    setVisible(true);
    slideAnim.setValue(width);
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2000),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [latest?.id]);

  if (!visible || !latest) return null;

  return (
    <View className="absolute top-32 left-4 z-50 pointer-events-none">
      <Animated.View
        style={{
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
          opacity: opacityAnim,
        }}
        className="flex-row items-center bg-black/60 rounded-full px-4 py-2 border border-white/20"
      >
        {latest.waveUrl ? (
          <Image
            source={{ uri: toCDN(latest.waveUrl) }}
            className="w-10 h-10"
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : latest.frameUrl ? (
          <Image
            source={{ uri: toCDN(latest.frameUrl) }}
            className="w-10 h-10 absolute"
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : null}
        <Image
          source={{ uri: toCDN(latest.avatarUrl) || 'https://picsum.photos/100' }}
          className="w-8 h-8 rounded-full mr-2"
          cachePolicy="memory-disk"
        />
        <Text className="text-white text-sm font-bold">{latest.username}</Text>
        <Text className="text-white/60 text-xs ml-1">entered</Text>
      </Animated.View>
    </View>
  );
}
