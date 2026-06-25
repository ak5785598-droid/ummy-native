import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedWritingEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedWritingEmoji({ size = 64, visible, noAnimation }: AnimatedWritingEmojiProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const penX = useRef(new Animated.Value(0)).current;
  const penY = useRef(new Animated.Value(0)).current;
  const lineGrow = useRef(new Animated.Value(0)).current;
  const headTilt = useRef(new Animated.Value(0)).current;
  const eyeFocus = useRef(new Animated.Value(0)).current;

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
        Animated.timing(headTilt, { toValue: -0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(headTilt, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(headTilt, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );

    const focus = Animated.loop(
      Animated.sequence([
        Animated.timing(eyeFocus, { toValue: -2, duration: 800, useNativeDriver: true }),
        Animated.timing(eyeFocus, { toValue: 2, duration: 800, useNativeDriver: true }),
        Animated.timing(eyeFocus, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );

    const writing = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(penX, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(penY, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(penX, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(penY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(penX, { toValue: 0.8, duration: 250, useNativeDriver: true }),
          Animated.timing(penY, { toValue: 0.5, duration: 250, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(penX, { toValue: 0.2, duration: 250, useNativeDriver: true }),
          Animated.timing(penY, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.delay(200),
      ])
    );

    const line = Animated.loop(
      Animated.sequence([
        Animated.timing(lineGrow, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(lineGrow, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(200),
      ])
    );

    tilt.start();
    focus.start();
    writing.start();
    line.start();

    return () => { tilt.stop(); focus.stop(); writing.stop(); line.stop(); };
  }, [visible]);

  if (!visible) return null;

  const tiltDeg = headTilt.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-5deg', '0deg', '5deg'] });
  const penTranslateX = penX.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.08] });
  const penTranslateY = penY.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.04] });
  const lineScale = lineGrow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

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
          {/* Left eye - focused */}
          <View style={[styles.eye, { width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, top: size * 0.3, left: size * 0.2 }]}>
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: size * 0.08,
                  height: size * 0.08,
                  borderRadius: size * 0.04,
                  transform: [{ translateY: eyeFocus }],
                },
              ]}
            />
          </View>
          {/* Right eye */}
          <View style={[styles.eye, { width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, top: size * 0.3, right: size * 0.2 }]}>
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: size * 0.08,
                  height: size * 0.08,
                  borderRadius: size * 0.04,
                  transform: [{ translateY: eyeFocus }],
                },
              ]}
            />
          </View>
          {/* Eyebrows - concentrated */}
          <View style={[styles.eyebrow, { width: size * 0.18, height: size * 0.035, top: size * 0.22, left: size * 0.16, borderRadius: size * 0.015 }]} />
          <View style={[styles.eyebrow, { width: size * 0.18, height: size * 0.035, top: size * 0.22, right: size * 0.16, borderRadius: size * 0.015 }]} />
          {/* Focused mouth - small pursed */}
          <View style={[styles.mouth, { width: size * 0.1, height: size * 0.06, bottom: size * 0.22, borderRadius: size * 0.03 }]} />
          {/* Notepad / paper */}
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.12,
              left: size * 0.1,
              width: size * 0.35,
              height: size * 0.25,
              backgroundColor: '#FFFFFF',
              borderRadius: size * 0.02,
              borderWidth: 1,
              borderColor: '#BDBDBD',
            }}
          >
            {/* Lines on paper */}
            <View style={{ position: 'absolute', top: '20%', left: '8%', right: '8%', height: 1, backgroundColor: '#E0E0E0' }} />
            <View style={{ position: 'absolute', top: '40%', left: '8%', right: '8%', height: 1, backgroundColor: '#E0E0E0' }} />
            <View style={{ position: 'absolute', top: '60%', left: '8%', right: '8%', height: 1, backgroundColor: '#E0E0E0' }} />
            {/* Written text line */}
            <Animated.View
              style={{
                position: 'absolute',
                top: '28%',
                left: '8%',
                height: 1.5,
                backgroundColor: '#1976D2',
                borderRadius: 1,
                width: size * 0.25,
                transform: [{ scaleX: lineScale }],
              }}
            />
          </View>
          {/* Pen */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: size * 0.1,
              right: size * 0.08,
              transform: [{ translateX: penTranslateX }, { translateY: penTranslateY }],
            }}
          >
            {/* Pen body */}
            <View
              style={{
                width: size * 0.05,
                height: size * 0.22,
                backgroundColor: '#1565C0',
                borderRadius: size * 0.01,
                borderWidth: 1,
                borderColor: '#0D47A1',
              }}
            />
            {/* Pen tip */}
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: size * 0.025,
                borderRightWidth: size * 0.025,
                borderTopWidth: size * 0.06,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#FDD835',
                marginLeft: size * 0.0,
              }}
            />
            {/* Pen clip */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: -size * 0.015,
                width: size * 0.015,
                height: size * 0.1,
                backgroundColor: '#90CAF9',
                borderRadius: size * 0.005,
              }}
            />
            {/* Ink dot at tip */}
            <View
              style={{
                position: 'absolute',
                bottom: -size * 0.02,
                left: size * 0.015,
                width: size * 0.02,
                height: size * 0.02,
                backgroundColor: '#1565C0',
                borderRadius: size * 0.01,
              }}
            />
          </Animated.View>
        </View>
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
});
