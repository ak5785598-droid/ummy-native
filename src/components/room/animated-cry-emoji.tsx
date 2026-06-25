import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedCryEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedCryEmoji({ size = 64, visible, noAnimation }: AnimatedCryEmojiProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const tremble = useRef(new Animated.Value(0)).current;
  const tear1Y = useRef(new Animated.Value(0)).current;
  const tear1Op = useRef(new Animated.Value(0)).current;
  const tear2Y = useRef(new Animated.Value(0)).current;
  const tear2Op = useRef(new Animated.Value(0)).current;
  const tear3Y = useRef(new Animated.Value(0)).current;
  const tear3Op = useRef(new Animated.Value(0)).current;
  const tear4Y = useRef(new Animated.Value(0)).current;
  const tear4Op = useRef(new Animated.Value(0)).current;
  const mouthShake = useRef(new Animated.Value(0)).current;
  const browSad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0);
      return;
    }
    if (noAnimation) {
      scaleAnim.setValue(1);
      return;
    }

    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(tremble, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(tremble, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(tremble, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(tremble, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );

    const mouthAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthShake, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(mouthShake, { toValue: -1, duration: 200, useNativeDriver: true }),
        Animated.timing(mouthShake, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );

    const brow = Animated.loop(
      Animated.sequence([
        Animated.timing(browSad, { toValue: 3, duration: 600, useNativeDriver: true }),
        Animated.timing(browSad, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );

    const makeTear = (y: Animated.Value, op: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(op, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(y, { toValue: 0, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(op, { toValue: 0.6, duration: 400, useNativeDriver: true }),
            Animated.timing(y, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(y, { toValue: 1.5, duration: 200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );

    shake.start();
    mouthAnim.start();
    brow.start();
    makeTear(tear1Y, tear1Op, 0).start();
    makeTear(tear2Y, tear2Op, 400).start();
    makeTear(tear3Y, tear3Op, 200).start();
    makeTear(tear4Y, tear4Op, 600).start();

    return () => { shake.stop(); mouthAnim.stop(); brow.stop(); };
  }, [visible]);

  if (!visible) return null;

  const trembleX = tremble.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, 2] });
  const mouthX = mouthShake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-1.5, 0, 1.5] });

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: trembleX }],
        }}
      >
        <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Left closed eye (squeezed from crying) */}
          <View
            style={[
              styles.closedEye,
              {
                width: size * 0.2,
                height: size * 0.04,
                borderRadius: size * 0.02,
                top: size * 0.32,
                left: size * 0.16,
              },
            ]}
          />
          {/* Right closed eye */}
          <View
            style={[
              styles.closedEye,
              {
                width: size * 0.2,
                height: size * 0.04,
                borderRadius: size * 0.02,
                top: size * 0.32,
                right: size * 0.16,
              },
            ]}
          />
          {/* Left eyebrow - sad angle */}
          <Animated.View
            style={[
              styles.eyebrow,
              {
                width: size * 0.2,
                height: size * 0.04,
                top: size * 0.24,
                left: size * 0.12,
                transform: [{ rotate: '20deg' }, { translateY: browSad }],
              },
            ]}
          />
          {/* Right eyebrow - sad angle */}
          <Animated.View
            style={[
              styles.eyebrow,
              {
                width: size * 0.2,
                height: size * 0.04,
                top: size * 0.24,
                right: size * 0.12,
                transform: [{ rotate: '-20deg' }, { translateY: browSad }],
              },
            ]}
          />
          {/* Sad mouth - open wailing */}
          <Animated.View
            style={[
              styles.mouth,
              {
                width: size * 0.22,
                height: size * 0.14,
                bottom: size * 0.18,
                borderRadius: size * 0.11,
                transform: [{ translateX: mouthX }],
              },
            ]}
          />
          {/* Inside mouth - darker */}
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.2,
              width: size * 0.16,
              height: size * 0.08,
              backgroundColor: '#3E2723',
              borderRadius: size * 0.08,
            }}
          />
          {/* Tongue */}
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.17,
              width: size * 0.1,
              height: size * 0.06,
              backgroundColor: '#E57373',
              borderRadius: size * 0.05,
            }}
          />
          {/* Left tear track */}
          <View
            style={{
              position: 'absolute',
              top: size * 0.38,
              left: size * 0.2,
              width: size * 0.03,
              height: size * 0.15,
              backgroundColor: 'rgba(100,181,246,0.15)',
              borderRadius: size * 0.015,
            }}
          />
          {/* Right tear track */}
          <View
            style={{
              position: 'absolute',
              top: size * 0.38,
              right: size * 0.2,
              width: size * 0.03,
              height: size * 0.15,
              backgroundColor: 'rgba(100,181,246,0.15)',
              borderRadius: size * 0.015,
            }}
          />
        </View>

        {/* Left tear drops */}
        <Animated.View
          style={[
            styles.tear,
            {
              width: size * 0.06,
              height: size * 0.09,
              borderRadius: size * 0.03,
              top: size * 0.42,
              left: size * 0.15,
              opacity: tear1Op,
              transform: [{ translateY: tear1Y }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.tear,
            {
              width: size * 0.05,
              height: size * 0.07,
              borderRadius: size * 0.025,
              top: size * 0.48,
              left: size * 0.2,
              opacity: tear2Op,
              transform: [{ translateY: tear2Y }],
            },
          ]}
        />

        {/* Right tear drops */}
        <Animated.View
          style={[
            styles.tear,
            {
              width: size * 0.06,
              height: size * 0.09,
              borderRadius: size * 0.03,
              top: size * 0.42,
              right: size * 0.15,
              opacity: tear3Op,
              transform: [{ translateY: tear3Y }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.tear,
            {
              width: size * 0.05,
              height: size * 0.07,
              borderRadius: size * 0.025,
              top: size * 0.48,
              right: size * 0.2,
              opacity: tear4Op,
              transform: [{ translateY: tear4Y }],
            },
          ]}
        />
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
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E6A800',
  },
  closedEye: {
    backgroundColor: '#3E2723',
    position: 'absolute',
  },
  eyebrow: {
    backgroundColor: '#3E2723',
    position: 'absolute',
    borderRadius: 2,
  },
  mouth: {
    backgroundColor: '#5D4037',
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#3E2723',
  },
  tear: {
    backgroundColor: '#64B5F6',
    position: 'absolute',
  },
});
