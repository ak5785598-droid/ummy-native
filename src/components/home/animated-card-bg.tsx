import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  colors: [string, string, string];
  sparkleCount?: number;
  children?: React.ReactNode;
}

function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'white',
        opacity,
        shadowColor: 'white',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
      }}
    />
  );
}

export function AnimatedCardBackground({ colors, sparkleCount = 5, children }: Props) {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(wave1, { toValue: 1, duration: 2500, useNativeDriver: false }),
          Animated.timing(wave1, { toValue: 0, duration: 2500, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(wave2, { toValue: 1, duration: 2500, useNativeDriver: false }),
          Animated.timing(wave2, { toValue: 0, duration: 2500, useNativeDriver: false }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Wave 1: translate X + rotate
  const tx1 = wave1.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const r1 = wave1.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] });

  // Wave 2: translate Y + rotate opposite
  const ty2 = wave2.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
  const r2 = wave2.interpolate({ inputRange: [0, 1], outputRange: ['2deg', '-2deg'] });

  const sparkles = [
    { x: 12, y: 15, delay: 0 },
    { x: 78, y: 20, delay: 400 },
    { x: 45, y: 60, delay: 800 },
    { x: 20, y: 80, delay: 1200 },
    { x: 85, y: 70, delay: 600 },
    { x: 55, y: 10, delay: 1000 },
    { x: 35, y: 45, delay: 200 },
  ].slice(0, sparkleCount);

  return (
    <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
      {/* Base gradient */}
      <LinearGradient
        colors={[colors[0], colors[1], colors[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated wave layer 1 — shifts horizontally */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: 0.4, transform: [{ translateX: tx1 }, { rotate: r1 }] },
        ]}
      >
        <LinearGradient
          colors={[colors[2], 'transparent', colors[0]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { width: '130%', marginLeft: '-15%' }]}
        />
      </Animated.View>

      {/* Animated wave layer 2 — shifts vertically */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: 0.35, transform: [{ translateY: ty2 }, { rotate: r2 }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', colors[1], colors[2]]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { height: '130%', marginTop: '-15%' }]}
        />
      </Animated.View>

      {/* Center glow pulse */}
      <Animated.View
        style={{
          position: 'absolute',
          top: '25%',
          left: '15%',
          width: '70%',
          height: '50%',
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.12)',
          opacity: glow,
        }}
      />

      {/* Sparkle particles */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} x={s.x} y={s.y} delay={s.delay} />
      ))}

      {/* Content */}
      {children}
    </View>
  );
}
