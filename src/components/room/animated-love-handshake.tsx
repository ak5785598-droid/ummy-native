import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

interface AnimatedLoveHandShakeProps {
  size?: number;
  visible: boolean;
}

export function AnimatedLoveHandShake({ size = 64, visible }: AnimatedLoveHandShakeProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const h1 = useRef(new Animated.Value(0)).current;
  const h2 = useRef(new Animated.Value(0)).current;
  const h3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { scaleAnim.setValue(0); shakeAnim.setValue(0); h1.setValue(0); h2.setValue(0); h3.setValue(0); return; }

    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ])
    );

    const heartsLoop = Animated.loop(
      Animated.stagger(350, [
        Animated.sequence([Animated.timing(h1, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(h1, { toValue: 0, duration: 300, useNativeDriver: true })]),
        Animated.sequence([Animated.timing(h2, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(h2, { toValue: 0, duration: 300, useNativeDriver: true })]),
        Animated.sequence([Animated.timing(h3, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(h3, { toValue: 0, duration: 300, useNativeDriver: true })]),
      ])
    );

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
    ]).start(() => { shakeLoop.start(); heartsLoop.start(); });

    return () => { shakeLoop.stop(); heartsLoop.stop(); };
  }, [visible]);

  if (!visible) return null;

  const shakeX = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-3, 0, 3] });
  const h1Y = h1.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.5] });
  const h1Op = h1.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  const h1S = h1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] });
  const h2Y = h2.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.55] });
  const h2Op = h2.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  const h2S = h2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] });
  const h3Y = h3.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.48] });
  const h3Op = h3.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  const h3S = h3.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateX: shakeX }], alignItems: 'center', justifyContent: 'center' }}>
        {/* Two hands emoji */}
        <Text style={{ fontSize: size * 0.75 }}>🤝</Text>
      </Animated.View>
      {/* Floating hearts */}
      <Animated.Text style={{ position: 'absolute', fontSize: size * 0.22, color: '#ef4444', fontWeight: '900', top: size * 0.05, left: size * 0.1, opacity: h1Op, transform: [{ translateY: h1Y }, { scale: h1S }] }}>♥</Animated.Text>
      <Animated.Text style={{ position: 'absolute', fontSize: size * 0.18, color: '#f472b6', fontWeight: '900', top: size * 0.02, left: size * 0.45, opacity: h2Op, transform: [{ translateY: h2Y }, { scale: h2S }] }}>♥</Animated.Text>
      <Animated.Text style={{ position: 'absolute', fontSize: size * 0.2, color: '#ef4444', fontWeight: '900', top: size * 0.08, right: size * 0.05, opacity: h3Op, transform: [{ translateY: h3Y }, { scale: h3S }] }}>♥</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
