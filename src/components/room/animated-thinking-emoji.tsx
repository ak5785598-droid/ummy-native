import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedThinkingEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedThinkingEmoji({ size = 64, visible, noAnimation }: AnimatedThinkingEmojiProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const headTilt = useRef(new Animated.Value(0)).current;
  const eyeY = useRef(new Animated.Value(0)).current;
  const eyeX = useRef(new Animated.Value(0)).current;
  const browRaise = useRef(new Animated.Value(0)).current;
  const dot1Y = useRef(new Animated.Value(0)).current;
  const dot1Op = useRef(new Animated.Value(0)).current;
  const dot2Y = useRef(new Animated.Value(0)).current;
  const dot2Op = useRef(new Animated.Value(0)).current;
  const dot3Y = useRef(new Animated.Value(0)).current;
  const dot3Op = useRef(new Animated.Value(0)).current;
  const handTap = useRef(new Animated.Value(0)).current;

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

    const tilt = Animated.loop(
      Animated.sequence([
        Animated.timing(headTilt, { toValue: -1, duration: 1200, useNativeDriver: true }),
        Animated.timing(headTilt, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(headTilt, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );

    const gaze = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(eyeX, { toValue: 5, duration: 1000, useNativeDriver: true }),
          Animated.timing(eyeY, { toValue: -3, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(eyeX, { toValue: -3, duration: 800, useNativeDriver: true }),
          Animated.timing(eyeY, { toValue: 2, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(eyeX, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(eyeY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );

    const brow = Animated.loop(
      Animated.sequence([
        Animated.timing(browRaise, { toValue: 6, duration: 800, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(browRaise, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );

    const fingerTap = Animated.loop(
      Animated.sequence([
        Animated.timing(handTap, { toValue: -2, duration: 300, useNativeDriver: true }),
        Animated.timing(handTap, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );

    const makeDot = (y: Animated.Value, op: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(y, { toValue: -1, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(op, { toValue: 0.3, duration: 400, useNativeDriver: true }),
            Animated.timing(y, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );

    tilt.start();
    gaze.start();
    brow.start();
    fingerTap.start();
    makeDot(dot1Y, dot1Op, 0).start();
    makeDot(dot2Y, dot2Op, 300).start();
    makeDot(dot3Y, dot3Op, 600).start();

    return () => { tilt.stop(); gaze.stop(); brow.stop(); fingerTap.stop(); };
  }, [visible]);

  if (!visible) return null;

  const tiltDeg = headTilt.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] });

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
          transform: [{ rotate: tiltDeg }],
        }}
      >
        <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Left eye - looks up */}
          <View style={[styles.eye, { width: size * 0.2, height: size * 0.22, borderRadius: size * 0.1, top: size * 0.28, left: size * 0.18 }]}>
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: size * 0.1,
                  height: size * 0.1,
                  borderRadius: size * 0.05,
                  transform: [{ translateX: eyeX }, { translateY: eyeY }],
                },
              ]}
            />
          </View>
          {/* Right eye */}
          <View style={[styles.eye, { width: size * 0.2, height: size * 0.22, borderRadius: size * 0.1, top: size * 0.28, right: size * 0.18 }]}>
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: size * 0.1,
                  height: size * 0.1,
                  borderRadius: size * 0.05,
                  transform: [{ translateX: eyeX }, { translateY: eyeY }],
                },
              ]}
            />
          </View>
          {/* Left eyebrow - flat */}
          <View style={[styles.eyebrow, { width: size * 0.22, height: size * 0.045, top: size * 0.2, left: size * 0.14, borderRadius: size * 0.02 }]} />
          {/* Right eyebrow - raised */}
          <Animated.View
            style={[
              styles.eyebrow,
              {
                width: size * 0.22,
                height: size * 0.045,
                right: size * 0.14,
                borderRadius: size * 0.02,
                transform: [{ translateY: browRaise }],
              },
            ]}
          />
          {/* Mouth - small O shape thinking */}
          <View
            style={[
              styles.mouth,
              {
                width: size * 0.14,
                height: size * 0.1,
                bottom: size * 0.22,
                borderRadius: size * 0.07,
              },
            ]}
          />
          {/* Hand on chin - fingers */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: size * 0.15,
              right: size * 0.12,
              transform: [{ translateY: handTap }],
            }}
          >
            {/* Palm */}
            <View
              style={{
                width: size * 0.18,
                height: size * 0.14,
                backgroundColor: '#FFD54F',
                borderRadius: size * 0.06,
                borderWidth: 1.5,
                borderColor: '#E6A800',
              }}
            />
            {/* Index finger */}
            <View
              style={{
                position: 'absolute',
                top: -size * 0.06,
                left: size * 0.02,
                width: size * 0.07,
                height: size * 0.09,
                backgroundColor: '#FFD54F',
                borderRadius: size * 0.035,
                borderWidth: 1.2,
                borderColor: '#E6A800',
              }}
            />
            {/* Middle finger */}
            <View
              style={{
                position: 'absolute',
                top: -size * 0.07,
                left: size * 0.08,
                width: size * 0.07,
                height: size * 0.1,
                backgroundColor: '#FFD54F',
                borderRadius: size * 0.035,
                borderWidth: 1.2,
                borderColor: '#E6A800',
              }}
            />
          </Animated.View>
        </View>
      </Animated.View>
      {/* Thinking dots */}
      <View style={[styles.dotsContainer, { top: size * 0.02, right: size * 0.02 }]}>
        <Animated.View
          style={[
            styles.dot,
            {
              width: size * 0.07,
              height: size * 0.07,
              borderRadius: size * 0.035,
              opacity: dot1Op,
              transform: [{ translateY: dot1Y }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: size * 0.055,
              height: size * 0.055,
              borderRadius: size * 0.0275,
              opacity: dot2Op,
              transform: [{ translateY: dot2Y }],
              marginTop: size * 0.025,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: size * 0.04,
              height: size * 0.04,
              borderRadius: size * 0.02,
              opacity: dot3Op,
              transform: [{ translateY: dot3Y }],
              marginTop: size * 0.02,
            },
          ]}
        />
      </View>
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
  eye: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3E2723',
  },
  pupil: {
    backgroundColor: '#3E2723',
  },
  eyebrow: {
    backgroundColor: '#3E2723',
    position: 'absolute',
  },
  mouth: {
    backgroundColor: '#5D4037',
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#3E2723',
  },
  dotsContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  dot: {
    backgroundColor: '#FFC107',
  },
});
