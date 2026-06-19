import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

interface AnimatedLoveShowProps {
  size?: number;
  visible: boolean;
}

export function AnimatedLoveShow({ size = 64, visible }: AnimatedLoveShowProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const h1 = useRef(new Animated.Value(0)).current;
  const h2 = useRef(new Animated.Value(0)).current;
  const h3 = useRef(new Animated.Value(0)).current;
  const h4 = useRef(new Animated.Value(0)).current;
  const h5 = useRef(new Animated.Value(0)).current;
  const h6 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0); pulseAnim.setValue(1);
      h1.setValue(0); h2.setValue(0); h3.setValue(0); h4.setValue(0); h5.setValue(0); h6.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );

    const makeHeart = (hv: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(hv, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(hv, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );

    const hearts = [
      makeHeart(h1, 0), makeHeart(h2, 200), makeHeart(h3, 400),
      makeHeart(h4, 600), makeHeart(h5, 800), makeHeart(h6, 1000),
    ];

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
    ]).start(() => { pulseLoop.start(); hearts.forEach(h => h.start()); });

    return () => { pulseLoop.stop(); hearts.forEach(h => h.stop()); };
  }, [visible]);

  if (!visible) return null;

  const positions = [
    { hv: h1, dx: -0.25, dy: -0.3, s: 0.2, color: '#ef4444' },
    { hv: h2, dx: 0.2, dy: -0.35, s: 0.17, color: '#f472b6' },
    { hv: h3, dx: 0.35, dy: -0.1, s: 0.19, color: '#ef4444' },
    { hv: h4, dx: -0.3, dy: -0.12, s: 0.15, color: '#fb7185' },
    { hv: h5, dx: 0.0, dy: -0.4, s: 0.22, color: '#e11d48' },
    { hv: h6, dx: -0.15, dy: -0.38, s: 0.14, color: '#f472b6' },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Big heart in center */}
      <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
        <Text style={{ fontSize: size * 0.7 }}>❤️</Text>
      </Animated.View>
      {/* Floating hearts */}
      {positions.map((p, i) => {
        const y = p.hv.interpolate({ inputRange: [0, 1], outputRange: [0, size * p.dy] });
        const x = p.hv.interpolate({ inputRange: [0, 1], outputRange: [0, size * p.dx] });
        const op = p.hv.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
        const sc = p.hv.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] });
        return (
          <Animated.Text key={i} style={{ position: 'absolute', fontSize: size * p.s, color: p.color, fontWeight: '900', top: size * 0.45, left: size * 0.45, opacity: op, transform: [{ translateX: x }, { translateY: y }, { scale: sc }] }}>♥</Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
