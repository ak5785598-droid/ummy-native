/**
 * FamilyBackground.tsx
 * Premium animated background for the Families / Clan screen.
 * Vibe: Royal Dynasty · Power · Legacy · Brotherhood
 * Palette: Deep Navy → Indigo → Royal Gold → Emerald accents
 * Layers: deep gradient → aurora flames → glow orbs → rotating rings
 *          → constellation stars → golden sparks → shield shimmer → vignette
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

/* ─── Family clan emoji symbols ────────────────────────────────────────── */
const CLAN_SYMBOLS = ['⚔️', '🛡️', '👑', '🏆', '⭐', '🔥', '💎', '🦅', '✦', '❋'];
const STAR_COUNT = 45;
const SYMBOL_COUNT = 18;
const SPARK_COUNT = 20;

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface StarDot {
  anim: Animated.Value;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface SymbolParticle {
  anim: Animated.Value;
  drift: Animated.Value;
  x: number;
  char: string;
  size: number;
  delay: number;
  duration: number;
}

interface GoldSpark {
  anim: Animated.Value;
  x: number;
  y: number;
  size: number;
  delay: number;
}

/* ─── Builder functions ──────────────────────────────────────────────────── */
function buildStars(): StarDot[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    anim: new Animated.Value(0),
    x: Math.random() * width,
    y: Math.random() * height * 0.9,
    size: 1 + Math.random() * 2.5,
    delay: Math.random() * 4000,
  }));
}

function buildSymbols(): SymbolParticle[] {
  return Array.from({ length: SYMBOL_COUNT }, (_, i) => ({
    anim: new Animated.Value(0),
    drift: new Animated.Value(0),
    x: Math.random() * (width - 30) + 10,
    char: CLAN_SYMBOLS[i % CLAN_SYMBOLS.length],
    size: 12 + Math.random() * 14,
    delay: Math.random() * 5000,
    duration: 6000 + Math.random() * 4000,
  }));
}

function buildSparks(): GoldSpark[] {
  return Array.from({ length: SPARK_COUNT }, () => ({
    anim: new Animated.Value(0),
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 3000,
  }));
}

/* ─── Aurora flame strip ──────────────────────────────────────────────── */
function AuroraFlame({
  colors,
  top,
  anim,
  scaleRange,
  opacityRange = [0.25, 0.5],
}: {
  colors: readonly [string, string, ...string[]];
  top: number;
  anim: Animated.Value;
  scaleRange: [number, number];
  opacityRange?: [number, number];
}) {
  const scaleY = anim.interpolate({ inputRange: [0, 1], outputRange: scaleRange });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [opacityRange[0], opacityRange[1], opacityRange[0]] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top, left: -30, right: -30, height: 100, transform: [{ scaleY }], opacity }}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 50 }} />
    </Animated.View>
  );
}

/* ─── Rotating ring ──────────────────────────────────────────────────── */
function Ring({
  size, color, anim, reverse, cx, cy,
}: { size: number; color: string; anim: Animated.Value; reverse?: boolean; cx: number; cy: number }) {
  const spin = anim.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        top: cy - size / 2, left: cx - size / 2,
        borderWidth: 1, borderColor: color, borderStyle: 'dashed',
        transform: [{ rotate: spin }],
      }}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function FamilyBackground() {
  const glowA = useRef(new Animated.Value(0)).current;
  const glowB = useRef(new Animated.Value(0)).current;
  const glowC = useRef(new Animated.Value(0)).current;
  const rotateMain = useRef(new Animated.Value(0)).current;
  const aurora1 = useRef(new Animated.Value(0)).current;
  const aurora2 = useRef(new Animated.Value(0)).current;
  const aurora3 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const crownPulse = useRef(new Animated.Value(1)).current;

  const stars = useRef(buildStars()).current;
  const symbols = useRef(buildSymbols()).current;
  const sparks = useRef(buildSparks()).current;

  useEffect(() => {
    // Glow orbs
    Animated.loop(Animated.sequence([
      Animated.timing(glowA, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(glowA, { toValue: 0, duration: 3000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(1500),
      Animated.timing(glowB, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(glowB, { toValue: 0, duration: 3000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(900),
      Animated.timing(glowC, { toValue: 1, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(glowC, { toValue: 0, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();

    // Rings
    Animated.loop(Animated.timing(rotateMain, { toValue: 1, duration: 16000, useNativeDriver: true, easing: Easing.linear })).start();

    // Auroras
    Animated.loop(Animated.sequence([
      Animated.timing(aurora1, { toValue: 1, duration: 3800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      Animated.timing(aurora1, { toValue: 0, duration: 3800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(1900),
      Animated.timing(aurora2, { toValue: 1, duration: 4200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      Animated.timing(aurora2, { toValue: 0, duration: 4200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(3000),
      Animated.timing(aurora3, { toValue: 1, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(aurora3, { toValue: 0, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();

    // Shimmer sweep
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      Animated.delay(600),
      Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();

    // Crown pulse
    Animated.loop(Animated.sequence([
      Animated.timing(crownPulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
      Animated.timing(crownPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(1200),
    ])).start();

    // Twinkling stars
    stars.forEach((s) => {
      Animated.loop(Animated.sequence([
        Animated.delay(s.delay),
        Animated.timing(s.anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(s.anim, { toValue: 0.15, duration: 800, useNativeDriver: true }),
      ])).start();
    });

    // Floating clan symbols
    symbols.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        p.drift.setValue(0);
        Animated.parallel([
          Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(p.drift, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
              Animated.timing(p.drift, { toValue: -1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            ]),
            { iterations: Math.ceil(p.duration / 2800) }
          ),
        ]).start(loop);
      };
      setTimeout(loop, p.delay);
    });

    // Gold sparks
    sparks.forEach((s) => {
      Animated.loop(Animated.sequence([
        Animated.delay(s.delay),
        Animated.timing(s.anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(s.anim, { toValue: 0, duration: 900, useNativeDriver: true }),
        Animated.delay(1000 + Math.random() * 2000),
      ])).start();
    });

    return () => {
      [glowA, glowB, glowC, rotateMain, aurora1, aurora2, aurora3, shimmer, crownPulse]
        .forEach(a => a.stopAnimation());
    };
  }, []);

  const glowScaleA = glowA.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const glowScaleB = glowB.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.1] });
  const glowScaleC = glowC.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, width + 120] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* 1. Deep navy-indigo-purple base */}
      <LinearGradient
        colors={['#03000f', '#080118', '#0f0228', '#080118', '#03000f']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Indigo-royal overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(99,102,241,0.1)', 'rgba(168,85,247,0.12)', 'rgba(251,191,36,0.06)', 'transparent']}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 3. Aurora flames — royal gold & indigo & emerald */}
      <AuroraFlame
        colors={['rgba(99,102,241,0)', 'rgba(99,102,241,0.28)', 'rgba(168,85,247,0.22)', 'rgba(99,102,241,0)']}
        top={height * 0.15}
        anim={aurora1}
        scaleRange={[0.7, 1.25]}
      />
      <AuroraFlame
        colors={['rgba(251,191,36,0)', 'rgba(251,191,36,0.18)', 'rgba(245,158,11,0.22)', 'rgba(251,191,36,0)']}
        top={height * 0.42}
        anim={aurora2}
        scaleRange={[0.65, 1.2]}
        opacityRange={[0.2, 0.45]}
      />
      <AuroraFlame
        colors={['rgba(16,185,129,0)', 'rgba(16,185,129,0.18)', 'rgba(52,211,153,0.14)', 'rgba(16,185,129,0)']}
        top={height * 0.68}
        anim={aurora3}
        scaleRange={[0.8, 1.15]}
        opacityRange={[0.2, 0.4]}
      />
      <AuroraFlame
        colors={['rgba(168,85,247,0)', 'rgba(168,85,247,0.2)', 'rgba(99,102,241,0.16)', 'rgba(168,85,247,0)']}
        top={height * 0.83}
        anim={aurora1}
        scaleRange={[0.7, 1.1]}
      />

      {/* 4. Glow orbs */}
      {/* Top centre — indigo/purple */}
      <Animated.View style={[s.orb, { top: -100, left: width / 2 - 130, width: 260, height: 260, borderRadius: 130, transform: [{ scale: glowScaleA }] }]}>
        <LinearGradient colors={['rgba(99,102,241,0.55)', 'transparent']} style={{ flex: 1, borderRadius: 130 }} />
      </Animated.View>

      {/* Bottom right — gold */}
      <Animated.View style={[s.orb, { bottom: -80, right: -80, width: 250, height: 250, borderRadius: 125, transform: [{ scale: glowScaleB }] }]}>
        <LinearGradient colors={['rgba(251,191,36,0.45)', 'transparent']} style={{ flex: 1, borderRadius: 125 }} />
      </Animated.View>

      {/* Left mid — emerald */}
      <Animated.View style={[s.orb, { top: height * 0.4, left: -70, width: 180, height: 180, borderRadius: 90, transform: [{ scale: glowScaleC }] }]}>
        <LinearGradient colors={['rgba(16,185,129,0.4)', 'transparent']} style={{ flex: 1, borderRadius: 90 }} />
      </Animated.View>

      {/* Right upper — purple */}
      <Animated.View style={[s.orb, { top: height * 0.1, right: -50, width: 160, height: 160, borderRadius: 80, transform: [{ scale: glowScaleA }] }]}>
        <LinearGradient colors={['rgba(168,85,247,0.42)', 'transparent']} style={{ flex: 1, borderRadius: 80 }} />
      </Animated.View>

      {/* Bottom left — gold accent */}
      <Animated.View style={[s.orb, { bottom: height * 0.2, left: -40, width: 140, height: 140, borderRadius: 70, transform: [{ scale: glowScaleB }] }]}>
        <LinearGradient colors={['rgba(245,158,11,0.35)', 'transparent']} style={{ flex: 1, borderRadius: 70 }} />
      </Animated.View>

      {/* 5. Rotating rings — dynasty circles */}
      <Ring size={width * 1.3} color="rgba(99,102,241,0.07)" anim={rotateMain} cx={width / 2} cy={height * 0.45} />
      <Ring size={width * 0.9} color="rgba(251,191,36,0.09)" anim={rotateMain} reverse cx={width / 2} cy={height * 0.38} />
      <Ring size={width * 0.55} color="rgba(168,85,247,0.1)" anim={rotateMain} cx={width / 2} cy={height * 0.55} />
      <Ring size={width * 0.32} color="rgba(16,185,129,0.1)" anim={rotateMain} reverse cx={width / 2} cy={height * 0.48} />

      {/* 6. Twinkling constellation stars */}
      {stars.map((s2, i) => {
        const op = s2.anim;
        const sc = s2.anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] });
        const starColor = i % 5 === 0 ? '#fbbf24' : i % 3 === 0 ? '#a78bfa' : 'rgba(255,255,255,0.7)';
        return (
          <Animated.View
            key={`star-${i}`}
            style={{
              position: 'absolute',
              left: s2.x, top: s2.y,
              width: s2.size, height: s2.size,
              borderRadius: s2.size / 2,
              backgroundColor: starColor,
              opacity: op,
              transform: [{ scale: sc }],
              shadowColor: starColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }}
          />
        );
      })}

      {/* 7. Gold spark dots */}
      {sparks.map((sp, i) => {
        const op = sp.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
        const sc = sp.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.4, 0.3] });
        const sparkColor = i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#6366f1' : '#10b981';
        return (
          <Animated.View
            key={`spark-${i}`}
            style={{
              position: 'absolute',
              left: sp.x, top: sp.y,
              width: sp.size, height: sp.size,
              borderRadius: sp.size / 2,
              backgroundColor: sparkColor,
              opacity: op,
              transform: [{ scale: sc }],
              shadowColor: sparkColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 8,
            }}
          />
        );
      })}

      {/* 8. Floating clan symbols */}
      {symbols.map((p, i) => {
        const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(height * 0.8)] });
        const op = p.anim.interpolate({ inputRange: [0, 0.06, 0.85, 1], outputRange: [0, 0.8, 0.45, 0] });
        const dx = p.drift.interpolate({ inputRange: [-1, 1], outputRange: [-16, 16] });
        const rot = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 === 0 ? 1 : -1) * 180}deg`] });
        return (
          <Animated.Text
            key={`sym-${i}`}
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

      {/* 9. Shimmer diagonal sweep */}
      <Animated.View style={[s.shimmer, { transform: [{ translateX: shimmerX }, { skewX: '-22deg' }] }]} />

      {/* 10. Royal crest glow — centre top decorative element */}
      <Animated.View
        style={{
          position: 'absolute',
          top: height * 0.06,
          left: width / 2 - 24,
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: crownPulse }],
        }}
      >
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: 'rgba(251,191,36,0.12)',
          borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16,
        }}>
          <Text style={{ fontSize: 22 }}>👑</Text>
        </View>
      </Animated.View>

      {/* 11. Bottom vignette */}
      <LinearGradient
        colors={['transparent', 'rgba(3,0,15,0.6)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: height * 0.5 }]}
      />

      {/* 12. Top vignette */}
      <LinearGradient
        colors={['rgba(3,0,15,0.5)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { bottom: height * 0.88 }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  orb: { position: 'absolute' },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
});
