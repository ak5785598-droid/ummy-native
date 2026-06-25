import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedLoveShowProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedLoveShow({ size = 64, visible, noAnimation }: AnimatedLoveShowProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const h1 = useRef(new Animated.Value(0)).current;
  const h2 = useRef(new Animated.Value(0)).current;
  const h3 = useRef(new Animated.Value(0)).current;
  const h4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { scaleAnim.setValue(0); return; }
    if (noAnimation) { scaleAnim.setValue(1); return; }

    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );

    const shine = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(shineAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );

    const makeHeart = (hv: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(hv, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(hv, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );

    pulse.start();
    shine.start();
    makeHeart(h1, 0).start();
    makeHeart(h2, 300).start();
    makeHeart(h3, 600).start();
    makeHeart(h4, 900).start();

    return () => { pulse.stop(); shine.stop(); };
  }, [visible]);

  if (!visible) return null;

  const heartScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const shineOp = shineAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  const positions = [
    { hv: h1, dx: -0.3, dy: -0.4, s: 0.2, color: '#ef4444' },
    { hv: h2, dx: 0.25, dy: -0.45, s: 0.16, color: '#f472b6' },
    { hv: h3, dx: -0.35, dy: -0.15, s: 0.18, color: '#fb7185' },
    { hv: h4, dx: 0.3, dy: -0.2, s: 0.15, color: '#e11d48' },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Full circle face */}
      <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFC107', borderWidth: 2, borderColor: '#E6A800', alignItems: 'center', justifyContent: 'center', transform: [{ scale: scaleAnim }] }}>
        {/* Big heart in center */}
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          {/* Heart shape using views */}
          <View style={{ position: 'relative', width: size * 0.35, height: size * 0.3 }}>
            <View style={{ position: 'absolute', top: 0, left: 0, width: size * 0.35, height: size * 0.3, backgroundColor: '#E53935', borderRadius: size * 0.175, transform: [{ rotate: '-45deg' }] }} />
            <View style={{ position: 'absolute', top: -size * 0.1, left: size * 0.02, width: size * 0.2, height: size * 0.2, backgroundColor: '#E53935', borderRadius: size * 0.1 }} />
            <View style={{ position: 'absolute', top: size * 0.02, right: -size * 0.1, width: size * 0.2, height: size * 0.2, backgroundColor: '#E53935', borderRadius: size * 0.1 }} />
            {/* Shine on heart */}
            <Animated.View style={{ position: 'absolute', top: size * 0.05, left: size * 0.05, width: size * 0.08, height: size * 0.06, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: size * 0.04, opacity: shineOp }} />
          </View>
        </Animated.View>
        {/* Happy eyes */}
        <View style={{ position: 'absolute', top: size * 0.22, left: size * 0.2, width: size * 0.06, height: size * 0.04, backgroundColor: '#3E2723', borderRadius: size * 0.03 }} />
        <View style={{ position: 'absolute', top: size * 0.22, right: size * 0.2, width: size * 0.06, height: size * 0.04, backgroundColor: '#3E2723', borderRadius: size * 0.03 }} />
        {/* Smile */}
        <View style={{ position: 'absolute', bottom: size * 0.15, width: size * 0.18, height: size * 0.04, borderBottomWidth: 2, borderBottomColor: '#5D4037', borderRadius: size * 0.1 }} />
        {/* Rosy cheeks */}
        <View style={{ position: 'absolute', top: size * 0.42, left: size * 0.1, width: size * 0.1, height: size * 0.06, backgroundColor: 'rgba(244,114,182,0.5)', borderRadius: size * 0.05 }} />
        <View style={{ position: 'absolute', top: size * 0.42, right: size * 0.1, width: size * 0.1, height: size * 0.06, backgroundColor: 'rgba(244,114,182,0.5)', borderRadius: size * 0.05 }} />
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
