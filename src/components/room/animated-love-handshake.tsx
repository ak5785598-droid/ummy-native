import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedLoveHandShakeProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedLoveHandShake({ size = 64, visible, noAnimation }: AnimatedLoveHandShakeProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const handClap = useRef(new Animated.Value(0)).current;
  const h1 = useRef(new Animated.Value(0)).current;
  const h2 = useRef(new Animated.Value(0)).current;
  const h3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { scaleAnim.setValue(0); return; }
    if (noAnimation) { scaleAnim.setValue(1); return; }

    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.delay(200),
      ])
    );

    const clap = Animated.loop(
      Animated.sequence([
        Animated.timing(handClap, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(handClap, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    );

    const makeHeart = (hv: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(hv, { toValue: 1, duration: 500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(hv, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );

    shake.start();
    clap.start();
    makeHeart(h1, 0).start();
    makeHeart(h2, 350).start();
    makeHeart(h3, 700).start();

    return () => { shake.stop(); clap.stop(); };
  }, [visible]);

  if (!visible) return null;

  const shakeX = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-3, 0, 3] });
  const clapX = handClap.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.05, size * 0.02] });

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
      <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFC107', borderWidth: 2, borderColor: '#E6A800', alignItems: 'center', justifyContent: 'center', transform: [{ scale: scaleAnim }, { translateX: shakeX }] }}>
        {/* Left hand */}
        <Animated.View style={{ position: 'absolute', left: size * 0.12, bottom: size * 0.25, transform: [{ translateX: clapX }] }}>
          <View style={{ width: size * 0.22, height: size * 0.18, backgroundColor: '#FFD54F', borderRadius: size * 0.06, borderWidth: 1.5, borderColor: '#E6A800', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: size * 0.06, height: size * 0.1, backgroundColor: '#FFD54F', borderRadius: size * 0.03, position: 'absolute', top: -size * 0.07, left: size * 0.03, borderWidth: 1, borderColor: '#E6A800' }} />
            <View style={{ width: size * 0.06, height: size * 0.11, backgroundColor: '#FFD54F', borderRadius: size * 0.03, position: 'absolute', top: -size * 0.08, left: size * 0.08, borderWidth: 1, borderColor: '#E6A800' }} />
            <View style={{ width: size * 0.06, height: size * 0.09, backgroundColor: '#FFD54F', borderRadius: size * 0.03, position: 'absolute', top: -size * 0.06, left: size * 0.13, borderWidth: 1, borderColor: '#E6A800' }} />
          </View>
        </Animated.View>
        {/* Right hand */}
        <Animated.View style={{ position: 'absolute', right: size * 0.12, bottom: size * 0.25, transform: [{ translateX: clapX.interpolate({ inputRange: [0, 1], outputRange: [size * 0.05, -size * 0.02] }) }] }}>
          <View style={{ width: size * 0.22, height: size * 0.18, backgroundColor: '#FFD54F', borderRadius: size * 0.06, borderWidth: 1.5, borderColor: '#E6A800', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: size * 0.06, height: size * 0.1, backgroundColor: '#FFD54F', borderRadius: size * 0.03, position: 'absolute', top: -size * 0.07, right: size * 0.03, borderWidth: 1, borderColor: '#E6A800' }} />
            <View style={{ width: size * 0.06, height: size * 0.11, backgroundColor: '#FFD54F', borderRadius: size * 0.03, position: 'absolute', top: -size * 0.08, right: size * 0.08, borderWidth: 1, borderColor: '#E6A800' }} />
            <View style={{ width: size * 0.06, height: size * 0.09, backgroundColor: '#FFD54F', borderRadius: size * 0.03, position: 'absolute', top: -size * 0.06, right: size * 0.13, borderWidth: 1, borderColor: '#E6A800' }} />
          </View>
        </Animated.View>
        {/* Heart between hands */}
        <View style={{ position: 'absolute', top: size * 0.3, width: size * 0.16, height: size * 0.14, backgroundColor: '#E53935', borderRadius: size * 0.08, transform: [{ rotate: '-45deg' }] }}>
          <View style={{ position: 'absolute', top: -size * 0.07, left: 0, width: size * 0.14, height: size * 0.14, backgroundColor: '#E53935', borderRadius: size * 0.07 }} />
          <View style={{ position: 'absolute', top: 0, right: -size * 0.07, width: size * 0.14, height: size * 0.14, backgroundColor: '#E53935', borderRadius: size * 0.07 }} />
        </View>
        {/* Smile */}
        <View style={{ position: 'absolute', bottom: size * 0.18, width: size * 0.2, height: size * 0.04, borderBottomWidth: 2, borderBottomColor: '#5D4037', borderRadius: size * 0.1 }} />
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
