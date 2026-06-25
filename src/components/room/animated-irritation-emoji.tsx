import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedIrritationEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedIrritationEmoji({ size = 64, visible, noAnimation }: AnimatedIrritationEmojiProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const eyeRoll = useRef(new Animated.Value(0)).current;
  const sighY = useRef(new Animated.Value(0)).current;
  const sighOp = useRef(new Animated.Value(0)).current;
  const browFurrow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { scaleAnim.setValue(0); return; }
    if (noAnimation) { scaleAnim.setValue(1); return; }

    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

    const roll = Animated.loop(
      Animated.sequence([
        Animated.timing(eyeRoll, { toValue: -1, duration: 600, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(eyeRoll, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );

    const sigh = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.parallel([
          Animated.timing(sighY, { toValue: -1, duration: 500, useNativeDriver: true }),
          Animated.timing(sighOp, { toValue: 0.7, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(sighY, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(sighOp, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ])
    );

    const furrow = Animated.loop(
      Animated.sequence([
        Animated.timing(browFurrow, { toValue: 3, duration: 500, useNativeDriver: true }),
        Animated.timing(browFurrow, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );

    roll.start();
    sigh.start();
    furrow.start();
    return () => { roll.stop(); sigh.stop(); furrow.stop(); };
  }, [visible]);

  if (!visible) return null;

  const pupilY = eyeRoll.interpolate({ inputRange: [-1, 0], outputRange: [-size * 0.03, 0] });
  const browFurrowVal = browFurrow.interpolate({ inputRange: [0, 3], outputRange: [0, size * 0.015] });

  return (
    <Animated.View style={[styles.container, { width: size, height: size, transform: [{ scale: scaleAnim }] }]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Left eyebrow - furrowed */}
          <Animated.View style={[styles.eyebrow, { width: size * 0.2, height: size * 0.045, top: size * 0.22, left: size * 0.12, borderRadius: size * 0.02, transform: [{ rotate: '12deg' }, { translateY: browFurrowVal }] }]} />
          {/* Right eyebrow */}
          <Animated.View style={[styles.eyebrow, { width: size * 0.2, height: size * 0.045, top: size * 0.22, right: size * 0.12, borderRadius: size * 0.02, transform: [{ rotate: '-12deg' }, { translateY: browFurrowVal }] }]} />
          {/* Left eye - rolling */}
          <View style={[styles.eye, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09, top: size * 0.3, left: size * 0.18 }]}>
            <Animated.View style={[styles.pupil, { width: size * 0.09, height: size * 0.09, borderRadius: size * 0.045, transform: [{ translateY: pupilY }] }]} />
          </View>
          {/* Right eye */}
          <View style={[styles.eye, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09, top: size * 0.3, right: size * 0.18 }]}>
            <Animated.View style={[styles.pupil, { width: size * 0.09, height: size * 0.09, borderRadius: size * 0.045, transform: [{ translateY: pupilY }] }]} />
          </View>
          {/* Annoyed mouth - flat line */}
          <View style={[styles.mouth, { width: size * 0.2, height: size * 0.03, bottom: size * 0.22, borderRadius: size * 0.015 }]} />
          {/* Sigh puffs */}
          <Animated.View style={{ position: 'absolute', bottom: size * 0.1, right: size * 0.1, opacity: sighOp, transform: [{ translateY: sighY }] }}>
            <View style={{ width: size * 0.06, height: size * 0.06, borderRadius: size * 0.03, backgroundColor: 'rgba(189,189,189,0.5)' }} />
          </Animated.View>
          <Animated.View style={{ position: 'absolute', bottom: size * 0.06, right: size * 0.04, opacity: sighOp, transform: [{ translateY: sighY }] }}>
            <View style={{ width: size * 0.04, height: size * 0.04, borderRadius: size * 0.02, backgroundColor: 'rgba(189,189,189,0.3)' }} />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  face: { backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 2, borderColor: '#E6A800' },
  eye: { backgroundColor: '#fff', position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#3E2723' },
  pupil: { backgroundColor: '#3E2723' },
  eyebrow: { backgroundColor: '#3E2723', position: 'absolute' },
  mouth: { backgroundColor: '#5D4037', position: 'absolute', borderWidth: 1, borderColor: '#3E2723' },
});
