import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedAngryEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedAngryEmoji({ size = 64, visible, noAnimation }: AnimatedAngryEmojiProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const browAnim = useRef(new Animated.Value(0)).current;
  const steamAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      shakeAnim.setValue(0);
      browAnim.setValue(0);
      steamAnim.setValue(0);
      scaleAnim.setValue(0);
      return;
    }

    if (noAnimation) {
      scaleAnim.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -1, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(browAnim, { toValue: -3, duration: 300, useNativeDriver: true }),
            Animated.timing(browAnim, { toValue: 3, duration: 300, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(steamAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(steamAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
          ])
        ),
      ]),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  const shakeX = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-3, 0, 3],
  });

  const steamY = steamAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const steamOpacity = steamAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: scaleAnim }, { translateX: shakeX }],
        },
      ]}
    >
      {/* Red face circle */}
      <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* Left eyebrow */}
        <Animated.View
          style={[
            styles.eyebrow,
            styles.leftEyebrow,
            {
              width: size * 0.28,
              height: size * 0.06,
              top: size * 0.22,
              left: size * 0.12,
              transform: [{ rotate: '15deg' }, { translateY: browAnim }],
            },
          ]}
        />
        {/* Right eyebrow */}
        <Animated.View
          style={[
            styles.eyebrow,
            styles.rightEyebrow,
            {
              width: size * 0.28,
              height: size * 0.06,
              top: size * 0.22,
              right: size * 0.12,
              transform: [{ rotate: '-15deg' }, { translateY: browAnim }],
            },
          ]}
        />
        {/* Left eye */}
        <View
          style={[
            styles.eye,
            {
              width: size * 0.16,
              height: size * 0.16,
              borderRadius: size * 0.08,
              top: size * 0.34,
              left: size * 0.22,
            },
          ]}
        />
        {/* Right eye */}
        <View
          style={[
            styles.eye,
            {
              width: size * 0.16,
              height: size * 0.16,
              borderRadius: size * 0.08,
              top: size * 0.34,
              right: size * 0.22,
            },
          ]}
        />
        {/* Frown mouth */}
        <View
          style={[
            styles.mouth,
            {
              width: size * 0.35,
              height: size * 0.12,
              bottom: size * 0.18,
              borderTopLeftRadius: size * 0.15,
              borderTopRightRadius: size * 0.15,
            },
          ]}
        />
      </View>
      {/* Steam particles */}
      <Animated.View
        style={[
          styles.steam,
          {
            opacity: steamOpacity,
            transform: [{ translateY: steamY }],
            top: -size * 0.15,
            left: size * 0.1,
          },
        ]}
      >
        <View style={[styles.steamDot, { width: size * 0.08, height: size * 0.08 }]} />
      </Animated.View>
      <Animated.View
        style={[
          styles.steam,
          {
            opacity: steamOpacity,
            transform: [{ translateY: steamY }],
            top: -size * 0.2,
            right: size * 0.1,
          },
        ]}
      >
        <View style={[styles.steamDot, { width: size * 0.06, height: size * 0.06 }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  face: {
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eyebrow: {
    backgroundColor: '#1e1e1e',
    borderRadius: 2,
    position: 'absolute',
  },
  leftEyebrow: {},
  rightEyebrow: {},
  eye: {
    backgroundColor: '#fff',
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  mouth: {
    backgroundColor: '#1e1e1e',
    position: 'absolute',
    transform: [{ rotate: '180deg' }],
  },
  steam: {
    position: 'absolute',
  },
  steamDot: {
    backgroundColor: '#f97316',
    borderRadius: 99,
    opacity: 0.7,
  },
});
