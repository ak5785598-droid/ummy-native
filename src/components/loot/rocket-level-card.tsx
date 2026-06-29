import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Svg, Path, Defs, LinearGradient as SvgGrad, Stop, Circle, Ellipse } from 'react-native-svg';
import { Image } from 'expo-image';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.22;
const CARD_H = CARD_W * 1.6;
const ROCKET_SVG_SIZE = CARD_W * 0.7;

interface RocketLevelCardProps {
  level: number;
  name: string;
  icon: string;
  threshold: number;
  accent: string;
  accent2: string;
  progress: number;
  isUnlocked: boolean;
  isCurrent: boolean;
  isHighest: boolean;
  localImage?: any;
  onPress?: () => void;
}

export function RocketLevelCard({
  level,
  name,
  icon,
  threshold,
  accent,
  accent2,
  progress,
  isUnlocked,
  isCurrent,
  isHighest,
  localImage,
  onPress,
}: RocketLevelCardProps) {
  const flameAnim = useRef(new Animated.Value(0)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isCurrent && !isHighest) return;

    const flameLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(flameAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    );
    const hoverLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(hoverAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );

    flameLoop.start();
    hoverLoop.start();
    glowLoop.start();

    return () => {
      flameLoop.stop();
      hoverLoop.stop();
      glowLoop.stop();
    };
  }, [isCurrent, isHighest]);

  const rocketY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const flameScaleY = flameAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1.3, 0.7],
  });

  const flameScaleX = flameAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.1, 0.85, 1.1],
  });

  const flameOpacity = flameAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  const displayProgress = isUnlocked ? 100 : isCurrent ? Math.min(progress, 99) : 0;
  const shouldAnimate = isCurrent || isHighest;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      {shouldAnimate && (
        <Animated.View style={[styles.glow, { backgroundColor: accent, opacity: glowOpacity }]} />
      )}

      <Animated.View style={[styles.rocketContainer, {
        transform: [{ translateY: shouldAnimate ? rocketY : 0 }],
      }]}>
        {localImage ? (
          <Image source={localImage} style={styles.levelImage} contentFit="contain" cachePolicy="memory-disk" />
        ) : (
          <Svg width={ROCKET_SVG_SIZE} height={ROCKET_SVG_SIZE * 1.2} viewBox="0 0 60 72">
            <Defs>
              <SvgGrad id={`rbody${level}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#eaffff" />
                <Stop offset="0.4" stopColor={accent} />
                <Stop offset="1" stopColor={accent2} />
              </SvgGrad>
            </Defs>
            <Path d="M30 4 C38 20 44 36 46 48 L52 52 L52 58 L42 56 C38 62 34 66 30 70 C26 66 22 62 18 56 L8 58 L8 52 L14 48 C16 36 22 20 30 4Z" fill={accent} />
            <Ellipse cx="30" cy="38" rx="6" ry="7" fill="#123353" opacity="0.6" />
            <Circle cx="30" cy="37" r="3" fill={isUnlocked ? '#fff' : '#666'} />
            <Path d="M18 48 L8 55 L8 60 L22 54Z" fill={accent2} opacity="0.8" />
            <Path d="M42 48 L52 55 L52 60 L38 54Z" fill={accent2} opacity="0.8" />
            <Path d="M30 5 C34 22 36 38 35 48" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        )}

        {shouldAnimate && (
          <Animated.View style={{
            position: 'absolute', bottom: -12, left: '50%', marginLeft: -8,
            width: 16, height: 24,
            transform: [{ scaleY: flameScaleY }, { scaleX: flameScaleX }],
            opacity: flameOpacity,
          }}>
            <Svg width={16} height={24} viewBox="0 0 16 24">
              <Defs>
                <SvgGrad id={`flame${level}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#fff" />
                  <Stop offset="0.3" stopColor={accent} />
                  <Stop offset="1" stopColor="transparent" />
                </SvgGrad>
              </Defs>
              <Path d="M8 0 C12 8 14 14 14 18 C14 22 10 24 8 24 C6 24 2 22 2 18 C2 14 4 8 8 0Z" fill={`url(#flame${level})`} />
            </Svg>
          </Animated.View>
        )}
      </Animated.View>

      <View style={styles.infoContainer}>
        <Text style={[styles.levelIcon, { color: isUnlocked ? accent : '#64748b' }]}>{icon}</Text>
        <Text style={[styles.levelName, { color: isUnlocked ? accent : '#64748b' }]} numberOfLines={1}>{name}</Text>

        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, {
            width: `${displayProgress}%`,
            backgroundColor: isUnlocked ? accent : isCurrent ? accent2 : '#334155',
          }]} />
        </View>

        <Text style={[styles.progressText, { color: isUnlocked ? accent : '#64748b' }]}>
          {isUnlocked ? '✓' : `${Math.round(displayProgress)}%`}
        </Text>
      </View>

      {isUnlocked && (
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={styles.badgeText}>Lv.{level + 1}</Text>
        </View>
      )}
      {isCurrent && !isUnlocked && (
        <View style={[styles.badge, { backgroundColor: accent2 }]}>
          <Text style={styles.badgeText}>NOW</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_W, height: CARD_H,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 4, position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: CARD_W + 12, height: CARD_H + 12,
    borderRadius: 20,
  },
  rocketContainer: {
    width: ROCKET_SVG_SIZE, height: ROCKET_SVG_SIZE * 1.2,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  levelImage: { width: ROCKET_SVG_SIZE, height: ROCKET_SVG_SIZE },
  infoContainer: { alignItems: 'center', marginTop: 4, width: '100%' },
  levelIcon: { fontSize: 16, fontWeight: '900' },
  levelName: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  progressOuter: {
    width: '80%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden', marginTop: 4,
  },
  progressInner: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 8, fontWeight: '800', marginTop: 2 },
  badge: {
    position: 'absolute', top: 2, right: 0,
    borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1,
  },
  badgeText: { color: 'white', fontSize: 7, fontWeight: '900' },
});
