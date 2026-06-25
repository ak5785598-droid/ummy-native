import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface AnimatedRunEmojiProps {
  size?: number;
  visible: boolean;
  noAnimation?: boolean;
}

export function AnimatedRunEmoji({ size = 64, visible, noAnimation }: AnimatedRunEmojiProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const legSwap = useRef(new Animated.Value(0)).current;
  const armSwap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { scaleAnim.setValue(0); return; }
    if (noAnimation) { scaleAnim.setValue(1); return; }

    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();

    const run = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bounceY, { toValue: -1, duration: 200, useNativeDriver: true }),
          Animated.timing(bounceY, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(legSwap, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(legSwap, { toValue: -1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(armSwap, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(armSwap, { toValue: -1, duration: 200, useNativeDriver: true }),
        ]),
      ])
    );

    run.start();
    return () => { run.stop(); };
  }, [visible]);

  if (!visible) return null;

  const by = bounceY.interpolate({ inputRange: [-1, 0], outputRange: [-size * 0.03, 0] });
  const ll = legSwap.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.08, size * 0.08] });
  const rl = legSwap.interpolate({ inputRange: [-1, 1], outputRange: [size * 0.08, -size * 0.08] });
  const la = armSwap.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.08, size * 0.08] });
  const ra = armSwap.interpolate({ inputRange: [-1, 1], outputRange: [size * 0.08, -size * 0.08] });

  return (
    <Animated.View style={[styles.container, { width: size, height: size, transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: by }] }}>
        {/* Full size face - covers DP like angry */}
        <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Eyes */}
          <View style={[styles.eye, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09, top: size * 0.28, left: size * 0.16 }]}>
            <View style={{ width: size * 0.09, height: size * 0.09, borderRadius: size * 0.045, backgroundColor: '#3E2723' }} />
          </View>
          <View style={[styles.eye, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09, top: size * 0.28, right: size * 0.16 }]}>
            <View style={{ width: size * 0.09, height: size * 0.09, borderRadius: size * 0.045, backgroundColor: '#3E2723' }} />
          </View>
          {/* Determined mouth */}
          <View style={{ position: 'absolute', bottom: size * 0.2, width: size * 0.18, height: size * 0.04, backgroundColor: '#5D4037', borderRadius: size * 0.02 }} />
          {/* Sweat drop */}
          <View style={{ position: 'absolute', top: size * 0.12, left: size * 0.12, width: size * 0.06, height: size * 0.08, backgroundColor: '#64B5F6', borderRadius: size * 0.03 }} />
          {/* Body - blue shirt on face */}
          <View style={{ position: 'absolute', bottom: size * 0.05, width: size * 0.3, height: size * 0.2, backgroundColor: '#42A5F5', borderRadius: size * 0.06 }} />
          {/* Left arm */}
          <Animated.View style={{ position: 'absolute', top: size * 0.52, left: size * 0.06, width: size * 0.08, height: size * 0.18, backgroundColor: '#FFD54F', borderRadius: size * 0.04, transform: [{ translateY: la }] }} />
          {/* Right arm */}
          <Animated.View style={{ position: 'absolute', top: size * 0.52, right: size * 0.06, width: size * 0.08, height: size * 0.18, backgroundColor: '#FFD54F', borderRadius: size * 0.04, transform: [{ translateY: ra }] }} />
          {/* Left leg */}
          <Animated.View style={{ position: 'absolute', bottom: -size * 0.02, left: size * 0.15, width: size * 0.09, height: size * 0.2, backgroundColor: '#1565C0', borderRadius: size * 0.045, transform: [{ translateX: ll }] }} />
          {/* Right leg */}
          <Animated.View style={{ position: 'absolute', bottom: -size * 0.02, right: size * 0.15, width: size * 0.09, height: size * 0.2, backgroundColor: '#1565C0', borderRadius: size * 0.045, transform: [{ translateX: rl }] }} />
          {/* Speed lines */}
          <View style={{ position: 'absolute', left: -size * 0.02, top: size * 0.4, width: size * 0.1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
          <View style={{ position: 'absolute', left: 0, top: size * 0.5, width: size * 0.07, height: 1.5, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  face: { backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 2, borderColor: '#E6A800' },
  eye: { backgroundColor: '#fff', position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#3E2723' },
});
