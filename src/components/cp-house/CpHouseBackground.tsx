/**
 * CpHouseBackground.tsx
 * Premium animated couple background for the CP House screen.
 * Layers: deep gradient → aurora waves → glow orbs → rotating rings
 *          → petal particles → shimmer sweep → star sparks
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ── Petal / particle pool ──────────────────────────────────────────────
const PETALS = 28;
const PETAL_CHARS = ['🌸', '🌹', '💮', '🌺', '❀', '✿', '💖', '✨', '💫', '⭐'];
const SPARKS = 14;

interface Particle {
  anim: Animated.Value;
  x: number;
  char: string;
  size: number;
  delay: number;
  duration: number;
  drift: Animated.Value; // lateral sway
}

function buildPetals(): Particle[] {
  return Array.from({ length: PETALS }, (_, i) => ({
    anim: new Animated.Value(0),
    drift: new Animated.Value(0),
    x: Math.random() * (width - 20) + 10,
    char: PETAL_CHARS[i % PETAL_CHARS.length],
    size: 10 + Math.random() * 14,
    delay: Math.random() * 5000,
    duration: 5000 + Math.random() * 4000,
  }));
}

interface SparkDot {
  anim: Animated.Value;
  x: number;
  y: number;
  size: number;
  delay: number;
}

function buildSparks(): SparkDot[] {
  return Array.from({ length: SPARKS }, () => ({
    anim: new Animated.Value(0),
    x: Math.random() * width,
    y: Math.random() * height * 0.8,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 3000,
  }));
}

// ── Aurora wave (animated SVG-style gradient strip) ────────────────────
function AuroraWave({
  colors,
  top,
  anim,
  scaleRange,
}: {
  colors: readonly [string, string, ...string[]];
  top: number;
  anim: Animated.Value;
  scaleRange: [number, number];
}) {
  const scaleY = anim.interpolate({ inputRange: [0, 1], outputRange: scaleRange });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.6, 0.35] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: -20,
        right: -20,
        height: 120,
        transform: [{ scaleY }],
        opacity,
      }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1, borderRadius: 60 }}
      />
    </Animated.View>
  );
}

// ── Rotating ring ──────────────────────────────────────────────────────
function Ring({
  size,
  color,
  anim,
  reverse,
  top,
  left,
}: {
  size: number;
  color: string;
  anim: Animated.Value;
  reverse?: boolean;
  top: number;
  left: number;
}) {
  const spin = anim.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        top: top - size / 2,
        left: left - size / 2,
        borderWidth: 1,
        borderColor: color,
        borderStyle: 'dashed',
        transform: [{ rotate: spin }],
      }}
    />
  );
}

// ── Main exported component ────────────────────────────────────────────
interface CpHouseBackgroundProps {
  /** Pass false when user has a remote bg URL (keeps remote image, no overlay clash) */
  showRemoteImage?: boolean;
  /** Tint mode: cp = rose/purple, friend = blue/cyan */
  mode?: 'cp' | 'friend';
}

export function CpHouseBackground({ mode = 'cp' }: CpHouseBackgroundProps) {
  // ── Shared animation values ──────────────────────────────────────────
  const glowA = useRef(new Animated.Value(0)).current;
  const glowB = useRef(new Animated.Value(0)).current;
  const rotateMain = useRef(new Animated.Value(0)).current;
  const aurora1 = useRef(new Animated.Value(0)).current;
  const aurora2 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const petals = useRef(buildPetals()).current;
  const sparks = useRef(buildSparks()).current;

  const isCp = mode === 'cp';

  useEffect(() => {
    // Glow orb A
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowA, { toValue: 1, duration: 2600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(glowA, { toValue: 0, duration: 2600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();

    // Glow orb B (offset phase)
    Animated.loop(
      Animated.sequence([
        Animated.delay(1300),
        Animated.timing(glowB, { toValue: 1, duration: 2600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(glowB, { toValue: 0, duration: 2600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();

    // Rotating rings
    Animated.loop(
      Animated.timing(rotateMain, { toValue: 1, duration: 14000, useNativeDriver: true, easing: Easing.linear })
    ).start();

    // Aurora wave 1
    Animated.loop(
      Animated.sequence([
        Animated.timing(aurora1, { toValue: 1, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(aurora1, { toValue: 0, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    ).start();

    // Aurora wave 2 (offset)
    Animated.loop(
      Animated.sequence([
        Animated.delay(1750),
        Animated.timing(aurora2, { toValue: 1, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(aurora2, { toValue: 0, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    ).start();

    // Shimmer
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.delay(800),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    // Petals
    petals.forEach((p) => {
      const loopPetal = () => {
        p.anim.setValue(0);
        p.drift.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.delay(p.delay),
            Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          ]),
          Animated.sequence([
            Animated.delay(p.delay),
            Animated.loop(
              Animated.sequence([
                Animated.timing(p.drift, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(p.drift, { toValue: -1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
              ]),
              { iterations: Math.ceil(p.duration / 2400) }
            ),
          ]),
        ]).start(loopPetal);
      };
      loopPetal();
    });

    // Spark dots
    sparks.forEach((s) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay),
          Animated.timing(s.anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(s.anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.delay(1500 + Math.random() * 2000),
        ])
      ).start();
    });

    return () => {
      glowA.stopAnimation();
      glowB.stopAnimation();
      rotateMain.stopAnimation();
      aurora1.stopAnimation();
      aurora2.stopAnimation();
      shimmer.stopAnimation();
    };
  }, [mode]);

  const glowScaleA = glowA.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const glowScaleB = glowB.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.1] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, width + 120] });

  const cpColors = {
    base: ['#0a0018', '#18002e', '#280040', '#18002e', '#0a0018'] as const,
    mid: ['transparent', 'rgba(244,63,94,0.12)', 'rgba(168,85,247,0.14)', 'transparent'] as const,
    orbA: ['rgba(244,63,94,0.5)', 'transparent'] as const,
    orbB: ['rgba(139,92,246,0.55)', 'transparent'] as const,
    orbC: ['rgba(236,72,153,0.4)', 'transparent'] as const,
    aurora1: ['rgba(244,63,94,0.0)', 'rgba(244,63,94,0.22)', 'rgba(168,85,247,0.18)', 'rgba(244,63,94,0.0)'] as const,
    aurora2: ['rgba(168,85,247,0.0)', 'rgba(236,72,153,0.2)', 'rgba(251,191,36,0.12)', 'rgba(168,85,247,0.0)'] as const,
  };

  const friendColors = {
    base: ['#000d1a', '#001a33', '#001f3f', '#001a33', '#000d1a'] as const,
    mid: ['transparent', 'rgba(14,165,233,0.12)', 'rgba(34,211,238,0.14)', 'transparent'] as const,
    orbA: ['rgba(14,165,233,0.5)', 'transparent'] as const,
    orbB: ['rgba(34,211,238,0.5)', 'transparent'] as const,
    orbC: ['rgba(99,102,241,0.4)', 'transparent'] as const,
    aurora1: ['rgba(14,165,233,0.0)', 'rgba(14,165,233,0.22)', 'rgba(34,211,238,0.18)', 'rgba(14,165,233,0.0)'] as const,
    aurora2: ['rgba(34,211,238,0.0)', 'rgba(99,102,241,0.2)', 'rgba(14,165,233,0.12)', 'rgba(34,211,238,0.0)'] as const,
  };

  const pal = isCp ? cpColors : friendColors;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Base gradient */}
      <LinearGradient
        colors={pal.base}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Chromatic mid overlay */}
      <LinearGradient
        colors={pal.mid}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 3. Aurora waves */}
      <AuroraWave colors={pal.aurora1} top={height * 0.25} anim={aurora1} scaleRange={[0.7, 1.2]} />
      <AuroraWave colors={pal.aurora2} top={height * 0.55} anim={aurora2} scaleRange={[0.8, 1.15]} />
      <AuroraWave colors={pal.aurora1} top={height * 0.75} anim={aurora1} scaleRange={[0.6, 1.0]} />

      {/* 4a. Glow orb — top centre (main) */}
      <Animated.View style={[s.orb, { top: -90, left: width / 2 - 120, width: 240, height: 240, borderRadius: 120, transform: [{ scale: glowScaleA }] }]}>
        <LinearGradient colors={pal.orbA} style={{ flex: 1, borderRadius: 120 }} />
      </Animated.View>

      {/* 4b. Glow orb — bottom right */}
      <Animated.View style={[s.orb, { bottom: -80, right: -80, width: 260, height: 260, borderRadius: 130, transform: [{ scale: glowScaleB }] }]}>
        <LinearGradient colors={pal.orbB} style={{ flex: 1, borderRadius: 130 }} />
      </Animated.View>

      {/* 4c. Glow orb — left mid */}
      <Animated.View style={[s.orb, { top: height * 0.38, left: -70, width: 180, height: 180, borderRadius: 90, transform: [{ scale: glowScaleA }] }]}>
        <LinearGradient colors={pal.orbC} style={{ flex: 1, borderRadius: 90 }} />
      </Animated.View>

      {/* 4d. Glow orb — right upper */}
      <Animated.View style={[s.orb, { top: height * 0.12, right: -60, width: 160, height: 160, borderRadius: 80, transform: [{ scale: glowScaleB }] }]}>
        <LinearGradient colors={pal.orbA} style={{ flex: 1, borderRadius: 80 }} />
      </Animated.View>

      {/* 5. Rotating decorative rings */}
      <Ring size={width * 1.2} color={isCp ? 'rgba(244,63,94,0.08)' : 'rgba(14,165,233,0.08)'} anim={rotateMain} top={height * 0.45} left={width / 2} />
      <Ring size={width * 0.8} color={isCp ? 'rgba(139,92,246,0.1)' : 'rgba(34,211,238,0.1)'} anim={rotateMain} reverse top={height * 0.35} left={width / 2} />
      <Ring size={width * 0.5} color={isCp ? 'rgba(236,72,153,0.09)' : 'rgba(99,102,241,0.09)'} anim={rotateMain} top={height * 0.55} left={width / 2} />

      {/* 6. Shimmer diagonal sweep */}
      <Animated.View style={[s.shimmer, { transform: [{ translateX: shimmerX }, { skewX: '-20deg' }] }]} />

      {/* 7. Spark dots */}
      {sparks.map((sp, i) => {
        const op = sp.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
        const sc = sp.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.2, 0.4] });
        return (
          <Animated.View
            key={`spark-${i}`}
            style={{
              position: 'absolute',
              left: sp.x,
              top: sp.y,
              width: sp.size,
              height: sp.size,
              borderRadius: sp.size / 2,
              backgroundColor: isCp ? '#f43f5e' : '#0ea5e9',
              opacity: op,
              transform: [{ scale: sc }],
              shadowColor: isCp ? '#f43f5e' : '#0ea5e9',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 6,
            }}
          />
        );
      })}

      {/* 8. Floating petals */}
      {petals.map((p, i) => {
        const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(height * 0.85)] });
        const op = p.anim.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 0.9, 0.6, 0] });
        const dx = p.drift.interpolate({ inputRange: [-1, 1], outputRange: [-18, 18] });
        const rot = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 === 0 ? 1 : -1) * 360}deg`] });
        return (
          <Animated.Text
            key={`petal-${i}`}
            style={{
              position: 'absolute',
              bottom: -(p.size + 10),
              left: p.x,
              fontSize: p.size,
              opacity: op,
              transform: [{ translateY: ty }, { translateX: dx }, { rotate: rot }],
            }}
          >
            {p.char}
          </Animated.Text>
        );
      })}

      {/* 9. Bottom vignette */}
      <LinearGradient
        colors={['transparent', isCp ? 'rgba(10,0,24,0.55)' : 'rgba(0,13,26,0.55)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: height * 0.55 }]}
      />

      {/* 10. Top vignette */}
      <LinearGradient
        colors={[isCp ? 'rgba(10,0,24,0.4)' : 'rgba(0,13,26,0.4)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { bottom: height * 0.85 }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
});
