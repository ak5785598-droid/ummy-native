import React, { useEffect, useRef, useCallback } from 'react';
import { Text, Animated, View } from 'react-native';
import { Image } from 'expo-image';

interface EmojiReactionOverlayProps {
  emoji?: string | null;
  customEmojiUrl?: string | null;
  size?: number;
  visible: boolean;
  onComplete?: () => void;
}

export function EmojiReactionOverlay({ emoji, customEmojiUrl, size = 28, visible, onComplete }: EmojiReactionOverlayProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const resetValues = useCallback(() => {
    scale.setValue(0);
    opacity.setValue(0);
    floatY.setValue(0);
    rotate.setValue(0);
    shakeX.setValue(0);
  }, [scale, opacity, floatY, rotate, shakeX]);

  useEffect(() => {
    if (!visible || !emoji) {
      resetValues();
      return;
    }

    resetValues();

    const floatRotate = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(floatY, { toValue: -6, duration: 600, useNativeDriver: true }),
          Animated.timing(floatY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(rotate, { toValue: 8, duration: 400, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: -8, duration: 400, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ])
    );

    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ])
    );

    const enterAnim = Animated.parallel([
      Animated.spring(scale, { toValue: 1.3, friction: 3, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]);

    const exitAnim = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.3, duration: 350, useNativeDriver: true }),
    ]);

    const mainAnim = Animated.sequence([
      enterAnim,
      Animated.delay(2200),
      exitAnim,
    ]);

    animRef.current = mainAnim;

    mainAnim.start(({ finished }) => {
      floatRotate.stop();
      shake.stop();
      if (finished) onComplete?.();
    });

    setTimeout(() => {
      floatRotate.start();
      shake.start();
    }, 120);

    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      floatRotate.stop();
      shake.stop();
    };
  }, [visible, emoji]);

  if (!visible || !emoji) return null;

  const rotateInterp = rotate.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        transform: [{ scale }, { translateY: floatY }, { rotate: rotateInterp }, { translateX: shakeX }],
        opacity,
        zIndex: 100,
      }}
      pointerEvents="none"
    >
      {customEmojiUrl ? (
        <Image
          source={{ uri: customEmojiUrl }}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : (
        <Text style={{ fontSize: size }}>{emoji}</Text>
      )}
    </Animated.View>
  );
}
