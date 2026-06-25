import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedFrustrationEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedFrustrationEmoji({ size = 64, visible, noAnimation }: AnimatedFrustrationEmojiProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const veinPulse = useRef(new Animated.Value(0)).current;
  const mouthOpen = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { scaleAnim.setValue(0); return; }
    if (noAnimation) { scaleAnim.setValue(1); return; }

    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
        Animated.delay(500),
      ])
    );

    const vein = Animated.loop(
      Animated.sequence([
        Animated.timing(veinPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(veinPulse, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );

    const mouth = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthOpen, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(mouthOpen, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );

    shake.start();
    vein.start();
    mouth.start();
    return () => { shake.stop(); vein.stop(); mouth.stop(); };
  }, [visible]);

  if (!visible) return null;

  const veinOp = veinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const mouthScaleY = mouthOpen.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View style={[styles.container, { width: size, height: size, transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: shakeX }] }}>
        <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Angry eyebrows - V shape */}
          <View style={[styles.eyebrow, { width: size * 0.22, height: size * 0.05, top: size * 0.2, left: size * 0.1, transform: [{ rotate: '25deg' }] }]} />
          <View style={[styles.eyebrow, { width: size * 0.22, height: size * 0.05, top: size * 0.2, right: size * 0.1, transform: [{ rotate: '-25deg' }] }]} />
          {/* Eyes - angry squint */}
          <View style={[styles.eye, { width: size * 0.16, height: size * 0.06, borderRadius: size * 0.03, top: size * 0.3, left: size * 0.16 }]}>
            <View style={{ width: size * 0.08, height: size * 0.04, borderRadius: size * 0.02, backgroundColor: '#3E2723' }} />
          </View>
          <View style={[styles.eye, { width: size * 0.16, height: size * 0.06, borderRadius: size * 0.03, top: size * 0.3, right: size * 0.16 }]}>
            <View style={{ width: size * 0.08, height: size * 0.04, borderRadius: size * 0.02, backgroundColor: '#3E2723' }} />
          </View>
          {/* Frustrated mouth - open gritting teeth */}
          <Animated.View style={[styles.mouth, { width: size * 0.24, height: size * 0.1, bottom: size * 0.2, borderRadius: size * 0.05, transform: [{ scaleY: mouthScaleY }] }]} />
          {/* Teeth */}
          <View style={{ position: 'absolute', bottom: size * 0.25, width: size * 0.2, height: size * 0.025, backgroundColor: '#fff', borderRadius: 1, borderWidth: 0.5, borderColor: '#BDBDBD' }} />
          {/* Vein mark */}
          <Animated.View style={{ position: 'absolute', top: size * 0.08, right: size * 0.08, opacity: veinOp }}>
            <View style={{ width: size * 0.08, height: size * 0.03, backgroundColor: '#E53935', borderRadius: size * 0.015, transform: [{ rotate: '15deg' }] }} />
            <View style={{ position: 'absolute', top: -size * 0.02, left: size * 0.02, width: size * 0.03, height: size * 0.04, backgroundColor: '#E53935', borderRadius: size * 0.01 }} />
            <View style={{ position: 'absolute', top: -size * 0.01, right: size * 0.01, width: size * 0.025, height: size * 0.035, backgroundColor: '#E53935', borderRadius: size * 0.01 }} />
          </Animated.View>
          {/* Red face tint */}
          <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(229,57,53,0.15)' }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  face: { backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 2, borderColor: '#E6A800' },
  eye: { backgroundColor: '#fff', position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#3E2723' },
  eyebrow: { backgroundColor: '#3E2723', position: 'absolute', borderRadius: 2 },
  mouth: { backgroundColor: '#5D4037', position: 'absolute', borderWidth: 1.5, borderColor: '#3E2723' },
});
