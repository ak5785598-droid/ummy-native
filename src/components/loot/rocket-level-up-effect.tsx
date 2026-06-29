import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { Svg, Path, Defs, LinearGradient as SvgGrad, Stop, Circle } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

interface RocketLevelUpEffectProps {
  visible: boolean;
  level: number;
  levelName: string;
  accent: string;
  accent2: string;
  icon: string;
  reward: number;
  onComplete: () => void;
}

export function RocketLevelUpEffect({
  visible,
  level,
  levelName,
  accent,
  accent2,
  icon,
  reward,
  onComplete,
}: RocketLevelUpEffectProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    anim.setValue(0);

    Animated.sequence([
      Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(2000),
    ]).start(() => {
      onComplete();
    });
  }, [visible]);

  if (!visible) return null;

  const bgOpacity = anim.interpolate({
    inputRange: [0, 0.05, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  const flashOpacity = anim.interpolate({
    inputRange: [0, 0.05, 0.12],
    outputRange: [0, 0.95, 0],
  });

  const rocketY = anim.interpolate({
    inputRange: [0, 0.3, 0.6, 0.85],
    outputRange: [H * 0.6, H * 0.3, H * 0.3, -80],
  });

  const rocketScale = anim.interpolate({
    inputRange: [0, 0.1, 0.3, 0.85],
    outputRange: [0.3, 1.2, 1, 0.6],
  });

  const rocketOpacity = anim.interpolate({
    inputRange: [0, 0.05, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const flameH = anim.interpolate({
    inputRange: [0, 0.3, 0.6, 0.85],
    outputRange: [5, 35, 28, 5],
  });

  const shockScale = anim.interpolate({
    inputRange: [0.3, 0.6],
    outputRange: [0.1, 1],
  });

  const shockOpacity = anim.interpolate({
    inputRange: [0.3, 0.35, 0.6],
    outputRange: [0.8, 0.5, 0],
  });

  const burstOpacity = anim.interpolate({
    inputRange: [0.3, 0.35, 0.6, 0.7],
    outputRange: [0, 1, 0.8, 0],
  });

  const starOpacity = anim.interpolate({
    inputRange: [0.2, 0.3, 0.6, 0.75],
    outputRange: [0, 1, 1, 0],
  });

  const toastY = anim.interpolate({
    inputRange: [0.65, 0.75],
    outputRange: [60, 0],
  });

  const toastOpacity = anim.interpolate({
    inputRange: [0.65, 0.75, 0.95, 1],
    outputRange: [0, 1, 1, 0],
  });

  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 60 + Math.random() * 100;
      return { angle, dist, size: 3 + Math.random() * 4, isAlt: i % 3 === 0 };
    });
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 10 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.5,
      size: 10 + Math.random() * 14,
    }));
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity, zIndex: 999 }]} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} />

      {/* Flash */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashOpacity, zIndex: 100 }]} />

      {/* Stars */}
      {stars.map((s, i) => (
        <Animated.Text key={`s${i}`} style={{
          position: 'absolute', left: s.x, top: s.y, fontSize: s.size,
          opacity: starOpacity, transform: [{ scale: starOpacity }],
        }}>✨</Animated.Text>
      ))}

      {/* Shockwave */}
      <Animated.View style={{
        position: 'absolute', top: H * 0.32 - 100, left: W / 2 - 100,
        width: 200, height: 200,
        borderRadius: 100, borderWidth: 3,
        borderColor: accent, opacity: shockOpacity, zIndex: 10,
        transform: [{ scale: shockScale }],
      }} />

      {/* Burst particles */}
      {particles.map((p, i) => {
        const tx = anim.interpolate({
          inputRange: [0.3, 0.6],
          outputRange: [0, Math.cos(p.angle) * p.dist],
        });
        const ty = anim.interpolate({
          inputRange: [0.3, 0.6],
          outputRange: [0, Math.sin(p.angle) * p.dist],
        });
        return (
          <Animated.View key={`p${i}`} style={{
            position: 'absolute',
            left: W / 2 - p.size / 2,
            top: H * 0.32 - p.size / 2,
            width: p.size, height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.isAlt ? accent2 : accent,
            opacity: burstOpacity,
            transform: [{ translateX: tx }, { translateY: ty }],
          }} />
        );
      })}

      {/* Rocket */}
      <Animated.View style={{
        position: 'absolute', left: W / 2 - 40, top: rocketY,
        width: 80, height: 100,
        transform: [{ scale: rocketScale }], opacity: rocketOpacity, zIndex: 15,
      }}>
        <Svg width={80} height={100} viewBox="0 0 60 72">
          <Defs>
            <SvgGrad id="rlRu" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#eaffff" />
              <Stop offset="0.4" stopColor={accent} />
              <Stop offset="1" stopColor={accent2} />
            </SvgGrad>
          </Defs>
          <Path d="M30 4 C38 20 44 36 46 48 L52 52 L52 58 L42 56 C38 62 34 66 30 70 C26 66 22 62 18 56 L8 58 L8 52 L14 48 C16 36 22 20 30 4Z" fill={accent} />
          <Circle cx="30" cy="38" r="5" fill="#123353" opacity="0.6" />
          <Circle cx="30" cy="37" r="2.5" fill="#fff" />
          <Path d="M18 48 L8 55 L8 60 L22 54Z" fill={accent2} opacity="0.8" />
          <Path d="M42 48 L52 55 L52 60 L38 54Z" fill={accent2} opacity="0.8" />
        </Svg>
        <Animated.View style={{
          position: 'absolute', bottom: -8, left: 30,
          width: 20, height: flameH, borderRadius: 10,
          backgroundColor: accent, opacity: 0.8,
        }} />
      </Animated.View>

      {/* Toast */}
      <Animated.View style={[styles.toast, {
        opacity: toastOpacity,
        transform: [{ translateY: toastY }],
      }]}>
        <Text style={styles.toastIcon}>{icon}</Text>
        <Text style={[styles.toastTitle, { color: accent }]}>Lv.{level + 1}</Text>
        <Text style={styles.toastName}>{levelName} Unlocked!</Text>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Reward</Text>
          <Text style={[styles.rewardValue, { color: accent }]}>{reward.toLocaleString('en-IN')} Coins</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: H * 0.15,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,20,60,0.95)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    width: W * 0.7,
    elevation: 16,
    zIndex: 50,
  },
  toastIcon: { fontSize: 48, marginBottom: 8 },
  toastTitle: { fontSize: 28, fontWeight: '900' },
  toastName: { color: '#e2e8f0', fontSize: 14, fontWeight: '700', marginTop: 4 },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  rewardLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  rewardValue: { fontSize: 16, fontWeight: '900' },
});
