import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, G, Defs, RadialGradient as SvgRadialGradient, Stop, Circle, LinearGradient as SvgLinearGradient, Polygon } from 'react-native-svg';

export interface UserLevelBadgeProps {
  level: number;
  scale?: number;
}

export function UserLevelBadge({ level = 0, scale = 1.0 }: UserLevelBadgeProps) {
  // Animations setup
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation Loop for wing rotation / glowing effects
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fast spin for stars/glow in Level 11-20 / Level 22-30 / Level 31-40
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();

    // Shine sweep loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.delay(1000)
      ])
    ).start();

    // Sparkles float loops
    const animParticle = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    };

    animParticle(particle1, 0);
    animParticle(particle2, 1000);
  }, [rotateAnim, pulseAnim, shineAnim, spinAnim, particle1, particle2]);

  const shieldSize = 26 * scale;
  const pillHeight = 15 * scale;
  const pillWidth = 36 * scale;

  const isLevel11To20 = level >= 11 && level <= 20;
  const isLevel21To30 = level >= 21 && level <= 30;
  const isLevel31To40 = level >= 31 && level <= 40;
  const isLevel41To50 = level >= 41 && level <= 50;
  const isLevel51To60 = level >= 51 && level <= 60;
  const isLevel61To70 = level >= 61 && level <= 70;
  const isLevel71To80 = level >= 71 && level <= 80;
  const isLevel81To90 = level >= 81 && level <= 90;
  const isLevel91To100 = level >= 91 && level <= 100;
  const showShadow = level >= 31;
  const showBevel = level >= 61;
  const showGlossy = level >= 61;

  // Determine dynamic configurations based on level
  let shieldColors = ['#a3f7bf', '#2e7d32', '#1b5e20']; // Default 0-10 (Green)
  let wreathColor = '#c4f4d2';
  let starColor = '#ffffff';
  let pillGradient = ['#0a2e10', '#031406']; // Dark green
  let pillBorder = '#1b5e20';
  let textColor = '#a3f7bf';
  let particleColor = '#a3f7bf';

  if (isLevel11To20) {
    shieldColors = ['#e0f2fe', '#0284c7', '#0c4a6e'];
    wreathColor = '#bae6fd';
    starColor = '#fbbf24'; 
    pillGradient = ['#00264d', '#000f24']; // Deep dark blue
    pillBorder = '#0284c7'; 
    textColor = '#e0f2fe'; 
    particleColor = '#00f0ff'; 
  } else if (isLevel21To30) {
    shieldColors = ['#f5e0ff', '#8b5cf6', '#4c1d95'];
    wreathColor = '#e9d5ff';
    pillGradient = ['#2e0c59', '#14002c']; // Deep dark purple
    pillBorder = '#8b5cf6';
    textColor = '#f5e0ff';
    particleColor = '#dfa3ff';
  } else if (isLevel31To40) {
    // 31-40 Orange Red Gem + Pink flower frame & golden horns (From User Mockup)
    shieldColors = ['#ffecd9', '#ff6b3b', '#b31400']; // Orange/Red radial gradient for the center gem
    wreathColor = '#fbcfe8'; // Pink outer frame
    pillGradient = ['#4d0505', '#240000']; // Deep thick maroon/blackish red
    pillBorder = '#f43f5e'; // Pinkish-rose border for capsule
    textColor = '#ffffff'; // White text
    particleColor = '#ffd6e8';
  } else if (isLevel41To50) {
    // 41-50 Golden/Amber Wings + Heart Diamond theme (From User Mockup - Static)
    shieldColors = ['#fffbeb', '#d97706', '#78350f']; // Gold/amber radial gradient for center
    wreathColor = '#fbbf24'; // Gold wings frame
    pillGradient = ['#4d2600', '#241100']; // Deep thick gold/bronze
    pillBorder = '#fbbf24'; // Gold border
    textColor = '#fffbeb'; // Soft golden white text
    particleColor = '#fcd34d';
  } else if (isLevel51To60) {
    // 51-60 Emerald Gem + Forest/Gold wing frame (From User Mockup - Static)
    shieldColors = ['#e2fcf0', '#10b981', '#064e3b']; // Emerald green radial gradient for center
    wreathColor = '#fbbf24'; // Gold outer wing frame
    pillGradient = ['#023826', '#011b12']; // Deep thick forest/emerald green
    pillBorder = '#10b981'; // Green border
    textColor = '#e2fcf0'; // Light emerald text
    particleColor = '#34d399';
  } else if (isLevel61To70) {
    // 61-70 Ice-Blue Gem + Platinum Silver Wings + Ice-Blue Pill (Static)
    shieldColors = ['#e0f7fa', '#0097a7', '#00363a']; // Ice-blue radial gradient for gem
    wreathColor = '#e2e8f0'; // Platinum Silver wings frame
    pillGradient = ['#004d5a', '#00252c']; // Deep dark Ice-Blue/Teal gradient to match circle gem
    pillBorder = '#00acc1'; // Ice-blue/Teal border for capsule
    textColor = '#e0f7fa'; // Ice-blue text
    particleColor = '#22d3ee'; // Cyan sparkles
  } else if (isLevel71To80) {
    // 71-80 Bronze Heavy Shield + Steampunk Rings + Deep Magenta Pill (From User Mockup - Static)
    shieldColors = ['#ffd54f', '#b78700', '#5e4300']; // Glowing bronze/gold center gradient
    wreathColor = '#b59049'; // Heavy bronze/gold outline
    pillGradient = ['#5e0f35', '#2b0215']; // Rich deep magenta pill capsule to match mockup
    pillBorder = '#9d174d'; // Shiny magenta border
    textColor = '#fbcfe8'; // Soft pinkish white text
    particleColor = '#f472b6'; // Magenta sparkles
  } else if (isLevel81To90) {
    // 81-90 Silver spread wings + Light Blue faceted core + Deep Teal Pill (From User Mockup - Static)
    shieldColors = ['#f0fdfa', '#a5f3fc', '#0891b2']; // Ice-blue/silver center radial gradient
    wreathColor = '#cbd5e1'; // Platinum/Silver wing frame
    pillGradient = ['#044237', '#01241e']; // Deep thick dark teal-green pill capsule to match mockup
    pillBorder = '#14b8a6'; // Cyan/Teal border
    textColor = '#e0fdfa'; // Light teal-white text
    particleColor = '#38bdf8'; // Light blue sparkles
  } else if (isLevel91To100) {
    // 91-100 Purple and Gold Celestial Crown Shield (from image)
    shieldColors = ['#8b5cf6', '#4c1d95', '#1e1b4b']; // Deep Purple radial gradient for center
    wreathColor = '#fbbf24'; // Gold crown/wings frame
    pillGradient = ['#2e0c59', '#14002c']; // Deep dark purple pill capsule to match
    pillBorder = '#fbbf24'; // Gold border for premium 3D contrast
    textColor = '#fffbeb'; // Soft golden white text
    particleColor = '#fbbf24'; // Golden sparkles
  } else if (level > 100) {
    // 100+ (Phoenix Rainbow Theme)
    shieldColors = ['#fbcfe8', '#f43f5e', '#881337'];
    wreathColor = '#fce7f3';
    pillGradient = ['#500724', '#24000d'];
    pillBorder = '#f43f5e';
    textColor = '#fbcfe8';
    particleColor = '#f43f5e';
  }

  // Particle path animations
  const p1X = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLevel31To40 || isLevel41To50 || isLevel51To60 || isLevel61To70 || isLevel71To80 || isLevel81To90 || isLevel91To100 ? -20 * scale : (isLevel21To30 ? -18 * scale : -14 * scale)],
  });
  const p1Y = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLevel31To40 || isLevel41To50 || isLevel51To60 || isLevel61To70 || isLevel71To80 || isLevel81To90 || isLevel91To100 ? -24 * scale : (isLevel21To30 ? -22 * scale : -18 * scale)],
  });
  const p1Opacity = particle1.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });

  const p2X = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLevel31To40 || isLevel41To50 || isLevel51To60 || isLevel61To70 || isLevel71To80 || isLevel81To90 || isLevel91To100 ? 24 * scale : (isLevel21To30 ? 22 * scale : 18 * scale)],
  });
  const p2Y = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLevel31To40 || isLevel41To50 || isLevel51To60 || isLevel61To70 || isLevel71To80 || isLevel81To90 || isLevel91To100 ? -26 * scale : (isLevel21To30 ? -24 * scale : -20 * scale)],
  });
  const p2Opacity = particle2.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });

  const rotateValue = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { height: shieldSize, width: shieldSize + pillWidth - 6 }]}>
      {/* Animated Glow Aura behind the shield */}
      <Animated.View style={{
        position: 'absolute',
        left: 4 * scale,
        top: 4 * scale,
        width: shieldSize - 8 * scale,
        height: shieldSize - 8 * scale,
        borderRadius: (shieldSize - 8 * scale) / 2,
        backgroundColor: shieldColors[0],
        opacity: isLevel31To40 ? 0.6 : 0.4,
        transform: [{ scale: pulseAnim }],
        zIndex: 8,
      }} />

      {/* Floating Sparkle Particle 1 */}
      <Animated.View style={{
        position: 'absolute',
        left: shieldSize / 2,
        top: shieldSize / 2,
        opacity: p1Opacity,
        transform: [
          { translateX: p1X },
          { translateY: p1Y }
        ],
        zIndex: 20,
      }}>
        <Text style={{ fontSize: isLevel31To40 ? 8.5 * scale : 6 * scale, color: particleColor, fontWeight: 'bold' }}>✦</Text>
      </Animated.View>

      {/* Floating Sparkle Particle 2 */}
      <Animated.View style={{
        position: 'absolute',
        left: shieldSize / 2,
        top: shieldSize / 2,
        opacity: p2Opacity,
        transform: [
          { translateX: p2X },
          { translateY: p2Y }
        ],
        zIndex: 20,
      }}>
        <Text style={{ fontSize: isLevel31To40 ? 7.5 * scale : 5 * scale, color: particleColor, fontWeight: 'bold' }}>✦</Text>
      </Animated.View>

      {/* Emblem / Laurel Wreath Shield on the left */}
      <Animated.View style={{
        width: shieldSize,
        height: shieldSize,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        left: 0,
        zIndex: 10,
        transform: [{ scale: pulseAnim }],
      }}>
        <EntriesRotationComponent active={false} rotateVal={rotateValue}>
          <Svg width={shieldSize} height={shieldSize} viewBox="0 0 100 100">
            <Defs>
              <SvgRadialGradient id={`shieldGlow-${level}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={shieldColors[0]} stopOpacity="1" />
                <Stop offset="65%" stopColor={shieldColors[1]} stopOpacity="1" />
                <Stop offset="100%" stopColor={shieldColors[2]} stopOpacity="1" />
              </SvgRadialGradient>
              <SvgLinearGradient id={`wreathGlow-${level}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="100%" stopColor={wreathColor} />
              </SvgLinearGradient>
              <SvgLinearGradient id="goldStarGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#ffe082" />
                <Stop offset="50%" stopColor="#ffb300" />
                <Stop offset="100%" stopColor="#ff6f00" />
              </SvgLinearGradient>
              <SvgLinearGradient id="moonGoldGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#ffe5a3" />
                <Stop offset="40%" stopColor="#f5b041" />
                <Stop offset="100%" stopColor="#9a5f00" />
              </SvgLinearGradient>
            </Defs>

            {isLevel11To20 ? (
              /* Level 11-20: Cyber-sword wings (shrunk) */
              <G fill="none">
                <Path d="M 32,50 L 14,41 L 28,38 L 10,26 L 28,24 C 18,37 18,45 32,50 Z" fill="#e0f2fe" stroke="#00d2ff" strokeWidth="4.5" strokeLinejoin="miter" />
                <Path d="M 28,32 L 16,35 L 24,23" stroke="#ffffff" strokeWidth="2.5" />
                <Path d="M 68,50 L 86,41 L 72,38 L 90,26 L 72,24 C 82,37 82,45 68,50 Z" fill="#e0f2fe" stroke="#00d2ff" strokeWidth="4.5" strokeLinejoin="miter" />
                <Path d="M 72,32 L 84,35 L 76,23" stroke="#ffffff" strokeWidth="2.5" />
                <Path d="M 36,68 L 50,84 L 64,68 L 50,76 Z" fill="#00d2ff" stroke="#e0f2fe" strokeWidth="3" />
              </G>
            ) : isLevel21To30 ? (
              /* Level 21-30 Upgrade: Crescent hooks (shrunk) */
              <G fill="none">
                <Path d="M 32,48 C 18,48 10,36 22,20 C 15,30 20,38 32,40 L 14,30 L 28,32 Z" fill="#f5e0ff" stroke="#a855f7" strokeWidth="4.5" strokeLinejoin="round" />
                <Path d="M 20,32 L 26,24" stroke="#ffffff" strokeWidth="2.5" />
                <Path d="M 68,48 C 82,48 90,36 78,20 C 85,30 80,38 68,40 L 86,30 L 72,32 Z" fill="#f5e0ff" stroke="#a855f7" strokeWidth="4.5" strokeLinejoin="round" />
                <Path d="M 80,32 L 74,24" stroke="#ffffff" strokeWidth="2.5" />
                <Path d="M 32,64 L 50,84 L 68,64 L 50,74 L 42,70 L 58,70 Z" fill="#a855f7" stroke="#f5e0ff" strokeWidth="3" />
              </G>
            ) : isLevel31To40 ? (
              /* Level 31-40: Pink Rose Flower + Orange Gem with Tiny Golden Wings/Horns */
              <G fill="none">
                {/* Tiny golden ear/wing tips on top left & right */}
                <Path d="M 24,24 C 23,23 22,22 23,21 C 23,22 24,22 24,23 Z" fill="#ffd54f" stroke="#ffb300" strokeWidth="1" strokeLinejoin="round" />
                <Path d="M 76,24 C 77,23 78,22 77,21 C 77,22 76,22 76,23 Z" fill="#ffd54f" stroke="#ffb300" strokeWidth="1" strokeLinejoin="round" />

                {/* Outer pink flower shield base with 8 petal points */}
                <Path 
                  d="M 50,12 
                     C 41,10 34,18 30,22 
                     C 22,18 16,24 18,32 
                     C 10,34 8,42 14,48 
                     C 8,54 10,62 18,64 
                     C 16,72 22,78 30,74 
                     C 34,78 41,86 50,84 
                     C 59,86 66,78 70,74 
                     C 78,78 84,72 82,64 
                     C 90,62 92,54 86,48 
                     C 92,42 90,34 82,32 
                     C 84,24 78,18 70,22 
                     C 66,18 59,10 50,12 Z" 
                  fill="#fbcfe8" 
                  stroke="#f43f5e" 
                  strokeWidth="4" 
                  strokeLinejoin="round" 
                />

                {/* Highlight inside pink petals */}
                <Path 
                  d="M 50,18 
                     C 43,16 38,22 34,26 
                     C 27,22 22,27 24,34 
                     C 17,36 15,42 20,47 
                     C 15,52 17,58 24,60 
                     C 22,67 27,71 34,68 
                     C 38,72 43,78 50,77 
                     C 57,77 62,72 66,68 
                     C 73,71 78,67 76,60 
                     C 83,58 85,52 80,47 
                     C 85,42 83,36 76,34 
                     C 78,27 73,22 66,26 
                     C 62,22 57,16 50,18 Z" 
                  stroke="#ffe4e6" 
                  strokeWidth="1.8" 
                  strokeLinejoin="round"
                />
              </G>
            ) : isLevel41To50 ? (
              /* Level 41-50: Heavy Golden Wings + Bottom Crown Details from user mockup */
              <G fill="none">
                {/* Left wing feathers (shrunk top tips/horns) */}
                <Path d="M 28,52 C 16,48 12,42 15,32 C 18,36 14,40 28,44" fill="none" stroke="#d97706" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M 24,40 C 16,38 14,32 19,28 C 21,32 16,34 26,34" fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 26,62 C 16,60 12,50 16,38" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />

                {/* Right wing feathers (shrunk top tips/horns) */}
                <Path d="M 72,52 C 84,48 88,42 85,32 C 82,36 86,40 72,44" fill="none" stroke="#d97706" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M 76,40 C 84,38 86,32 81,28 C 79,32 84,34 74,34" fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 74,62 C 84,60 88,50 84,38" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />

                {/* Bottom and top crown details */}
                <Path d="M 32,70 C 50,84 50,84 68,70" fill="none" stroke="#fbbf24" strokeWidth="5.5" strokeLinecap="round" />
                <Path d="M 40,78 L 50,92 L 60,78 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" />
              </G>
            ) : isLevel51To60 ? (
              /* Level 51-60: Dangerous Gold Wings + Embedded Green Leaf Blades from user mockup */
              <G fill="none">
                {/* Left wing heavy golden plates (shrunk) */}
                <Path d="M 28,52 C 16,48 12,40 15,30 C 18,34 14,38 28,42" fill="none" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
                <Path d="M 24,38 C 16,34 14,28 19,24 C 21,28 16,30 26,32" fill="none" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
                {/* Embedded green leaf tips (shrunk) */}
                <Path d="M 20,44 L 16,34 L 22,32 C 18,38 18,40 20,44 Z" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
                <Path d="M 26,62 C 14,60 10,48 14,34" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />

                {/* Right wing heavy golden plates (shrunk) */}
                <Path d="M 72,52 C 84,48 88,40 85,30 C 82,34 86,38 72,42" fill="none" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
                <Path d="M 76,38 C 84,34 86,28 81,24 C 79,28 84,30 74,32" fill="none" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
                {/* Embedded green leaf tips (shrunk) */}
                <Path d="M 80,44 L 84,34 L 78,32 C 82,38 82,40 80,44 Z" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
                <Path d="M 74,62 C 86,60 90,48 86,34" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />

                {/* Crown bottom anchors */}
                <Path d="M 32,70 C 50,84 50,84 68,70" fill="none" stroke="#fbbf24" strokeWidth="5.5" strokeLinecap="round" />
                <Path d="M 40,78 L 50,92 L 60,78 Z" fill="#10b981" stroke="#d97706" strokeWidth="2.5" />
              </G>
            ) : isLevel61To70 ? (
              /* Level 61-70: Aggressive Platinum Silver Wings + Cyan Accent Tip Highlights (shrunk) */
              <G fill="none">
                {/* Left wing aggressive silver spikes (shrunk) */}
                <Path d="M 28,52 C 16,48 12,38 15,28 C 18,32 14,36 28,40" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                <Path d="M 24,36 C 16,32 14,26 19,20 C 21,24 16,26 26,28" fill="none" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
                {/* Embedded cyan/teal leaf gems (shrunk) */}
                <Path d="M 18,40 L 15,30 L 22,28 C 18,34 18,36 18,40 Z" fill="#22d3ee" stroke="#0891b2" strokeWidth="1.5" />
                <Path d="M 26,62 C 12,60 8,46 12,32" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />

                {/* Right wing aggressive silver spikes (shrunk) */}
                <Path d="M 72,52 C 84,48 88,38 85,28 C 82,32 86,36 72,40" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                <Path d="M 76,36 C 84,32 86,26 81,20 C 79,24 84,26 74,28" fill="none" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
                {/* Embedded cyan/teal leaf gems (shrunk) */}
                <Path d="M 82,40 L 85,30 L 78,28 C 82,34 82,36 82,40 Z" fill="#22d3ee" stroke="#0891b2" strokeWidth="1.5" />
                <Path d="M 74,62 C 88,60 92,46 88,32" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />

                {/* Crown bottom anchors */}
                <Path d="M 32,70 C 50,84 50,84 68,70" fill="none" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                <Path d="M 40,78 L 50,92 L 60,78 Z" fill="#22d3ee" stroke="#94a3b8" strokeWidth="2.5" />
              </G>
            ) : isLevel71To80 ? (
              /* Level 71-80: Heavy V-Shaped / Heart Shield from user mockup */
              <G fill="none">
                {/* Heavy shield base boarder */}
                <Path 
                  d="M 50,15 L 85,25 C 80,55 70,75 50,92 C 30,75 20,55 15,25 Z" 
                  fill="#5c441c" 
                  stroke="#b59049" 
                  strokeWidth="4" 
                  strokeLinejoin="round" 
                />
                {/* Gold inner outline */}
                <Path 
                  d="M 50,22 L 78,30 C 74,54 66,72 50,86 C 34,72 26,54 22,30 Z" 
                  stroke="#ffe082" 
                  strokeWidth="1.8" 
                  strokeLinejoin="round" 
                />
                {/* Golden rivets/studs along the shield border */}
                <Circle cx="26" cy="32" r="2.5" fill="#ffd700" />
                <Circle cx="74" cy="32" r="2.5" fill="#ffd700" />
                <Circle cx="32" cy="50" r="2.5" fill="#ffd700" />
                <Circle cx="68" cy="50" r="2.5" fill="#ffd700" />
                <Circle cx="40" cy="68" r="2.5" fill="#ffd700" />
                <Circle cx="60" cy="68" r="2.5" fill="#ffd700" />
                {/* Bottom tip anchor point */}
                <Circle cx="50" cy="84" r="3.5" fill="#ffd700" stroke="#b59049" strokeWidth="1" />
              </G>
            ) : isLevel81To90 ? (
              /* Level 81-90: Heavy Silver Spread Eagle Wings (shrunk) */
              <G fill="none">
                {/* Left wing feather blades (shrunk) */}
                <Path d="M 28,52 C 16,48 12,40 15,30 C 18,34 14,38 28,40" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                <Path d="M 24,38 C 16,34 14,28 19,22 C 21,26 16,28 26,30" fill="none" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M 20,24 C 16,24 14,20 19,16 C 21,18 18,20 24,20" fill="none" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />

                {/* Right wing feather blades (shrunk) */}
                <Path d="M 72,52 C 84,48 88,40 85,30 C 82,34 86,38 72,40" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                <Path d="M 76,38 C 84,34 86,28 81,22 C 79,26 84,28 74,30" fill="none" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M 80,24 C 84,24 86,20 81,16 C 79,18 82,20 76,20" fill="none" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />

                {/* Bottom silver crown stabilizers */}
                <Path d="M 32,70 C 50,84 50,84 68,70" fill="none" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                <Path d="M 40,78 L 50,92 L 60,78 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2.5" />
              </G>
            ) : isLevel91To100 ? (
              /* Level 91-100: Heavy Golden Crown & Scepters Shield from user image */
              <G fill="none">
                {/* Crossed Golden Scepters behind the shield */}
                {/* Scepter 1: Top-Left to Bottom-Right */}
                <Path d="M 15,13 L 80,78" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                {/* Scepter 1 Head (Ornate Loops) */}
                <Circle cx="12" cy="10" r="3.8" stroke="#fbbf24" strokeWidth="1.8" />
                <Path d="M 12,6 L 12,14 M 8,10 L 16,10" stroke="#fbbf24" strokeWidth="1" />
                <Circle cx="12" cy="10" r="1.5" fill="#a78bfa" />
                {/* Scepter 1 Hilt Guard & Pommel */}
                <Path d="M 66,64 L 74,58" stroke="#fbbf24" strokeWidth="3" />
                <Circle cx="80" cy="78" r="2.5" fill="#ffd700" stroke="#d97706" strokeWidth="0.8" />

                {/* Scepter 2: Top-Right to Bottom-Left */}
                <Path d="M 85,13 L 20,78" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                {/* Scepter 2 Head (Ornate Loops) */}
                <Circle cx="88" cy="10" r="3.8" stroke="#fbbf24" strokeWidth="1.8" />
                <Path d="M 88,6 L 88,14 M 84,10 L 92,10" stroke="#fbbf24" strokeWidth="1" />
                <Circle cx="88" cy="10" r="1.5" fill="#a78bfa" />
                {/* Scepter 2 Hilt Guard & Pommel */}
                <Path d="M 34,64 L 26,58" stroke="#fbbf24" strokeWidth="3" />
                <Circle cx="20" cy="78" r="2.5" fill="#ffd700" stroke="#d97706" strokeWidth="0.8" />

                {/* Layered Golden Wings flanking the sides (from image, pointing down) */}
                {/* Left Wings */}
                <Path d="M 28,52 C 10,48 2,36 4,24 C 6,36 12,44 28,42" fill="none" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M 26,60 C 8,56 4,46 6,34 C 10,44 14,50 26,48" fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 26,68 C 10,64 8,56 12,44" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                {/* Right Wings */}
                <Path d="M 72,52 C 90,48 98,36 96,24 C 94,36 88,44 72,42" fill="none" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M 74,60 C 92,56 96,46 94,34 C 90,44 86,50 74,48" fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 74,68 C 90,64 92,56 88,44" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />

                {/* Top Golden Crown with Purple Gem Details */}
                <Path d="M 32,18 C 50,22 50,22 68,18 L 66,14 C 50,18 50,18 34,14 Z" fill="#d97706" />
                <Path d="M 34,14 L 30,2 L 42,9 L 50,-4 L 58,9 L 70,2 L 66,14 Z" fill="url(#goldStarGrad)" stroke="#d97706" strokeWidth="1" />
                {/* Crown Gems */}
                <Circle cx="50" cy="-4" r="1.8" fill="#a78bfa" stroke="#fbbf24" strokeWidth="0.8" />
                <Circle cx="30" cy="2" r="1.2" fill="#a78bfa" stroke="#fbbf24" strokeWidth="0.5" />
                <Circle cx="70" cy="2" r="1.2" fill="#a78bfa" stroke="#fbbf24" strokeWidth="0.5" />

                {/* Outer concentric glowing fire halos */}
                <Circle cx="50" cy="48" r="37" stroke="#ffd700" strokeWidth="1.5" strokeDasharray="3, 4" opacity="0.65" />
                <Circle cx="50" cy="48" r="41" stroke="#ff6f00" strokeWidth="1.2" strokeDasharray="5, 3" opacity="0.45" />

                {/* Bottom Phoenix Fire Tails (3 majestic flame feathers) */}
                <Path d="M 30,76 Q 50,88 70,76" fill="none" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
                {/* Left Tail */}
                <Path d="M 40,76 Q 33,93 36,95 Q 42,87 45,76 Z" fill="url(#goldStarGrad)" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
                {/* Right Tail */}
                <Path d="M 60,76 Q 67,93 64,95 Q 58,87 55,76 Z" fill="url(#goldStarGrad)" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
                {/* Center Tail */}
                <Path d="M 46,78 Q 50,99 50,99 Q 54,78 54,78 Z" fill="url(#goldStarGrad)" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
              </G>
            ) : (
              /* Default Laurel Wreath wing leaves for Level 0-10 (Shifted outwards for larger circle) */
              <G stroke={`url(#wreathGlow-${level})`} strokeWidth="6" fill="none" strokeLinecap="round">
                <Path d="M 13,65 C -2,50 3,25 24,20 C 19,35 21,50 31,58" />
                <Path d="M 0,45 C 2,40 10,42 14,48" />
                <Path d="M 4,30 C 8,28 14,34 16,40" />
                <Path d="M 87,65 C 102,50 97,25 76,20 C 81,35 79,50 69,58" />
                <Path d="M 100,45 C 98,40 90,42 86,48" />
                <Path d="M 96,30 C 92,28 86,34 84,40" />
                <Path d="M 28,76 C 50,88 50,88 72,76" strokeWidth="4" />
              </G>
            )}

            {/* Central circular badge background with shiny radial gradient */}
            <Circle cx="50" cy="48" r={level <= 11 ? 35 : (isLevel91To100 ? 33 : 23)} fill={`url(#shieldGlow-${level})`} stroke={isLevel91To100 ? "#fbbf24" : (isLevel81To90 ? "#cbd5e1" : (isLevel71To80 ? "#b59049" : (isLevel61To70 ? "#cbd5e1" : (isLevel51To60 ? "#10b981" : (isLevel41To50 ? "#d97706" : (isLevel31To40 ? "#f43f5e" : (isLevel21To30 ? "#c084fc" : (isLevel11To20 ? "#00d2ff" : wreathColor))))))))} strokeWidth={isLevel91To100 ? 5.5 : 4.5} />

            {/* Sunburst Beaming Rays and inner dotted frame (Only for Level 91-100) */}
            {isLevel91To100 && (
              <G>
                {/* Concentric inner gold framing ring */}
                <Circle cx="50" cy="48" r="28" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2, 2.5" opacity="0.45" fill="none" />
                
                {/* Long Ray lines */}
                <Path d="M 50,48 L 50,18 M 50,48 L 50,78 M 50,48 L 20,48 M 50,48 L 80,48 M 50,48 L 29,27 M 50,48 L 71,69 M 50,48 L 29,69 M 50,48 L 71,27" stroke="#fbbf24" strokeWidth="1.2" opacity="0.35" fill="none" />
                {/* Short intermediate rays */}
                <Path d="M 50,48 L 61,31 M 50,48 L 39,65 M 50,48 L 39,31 M 50,48 L 61,65 M 50,48 L 68,39 M 50,48 L 32,57 M 50,48 L 32,39 M 50,48 L 68,57" stroke="#fbbf24" strokeWidth="0.8" opacity="0.25" fill="none" />
                
                {/* Golden beads at the ends of rays */}
                <Circle cx="50" cy="18" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="50" cy="78" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="20" cy="48" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="80" cy="48" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="29" cy="27" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="71" cy="69" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="29" cy="69" r="1.2" fill="#ffd700" opacity="0.75" />
                <Circle cx="71" cy="27" r="1.2" fill="#ffd700" opacity="0.75" />
              </G>
            )}

            {/* 3D Glass Dome Reflection inside the circle (Only for Level 91-100) */}
            {isLevel91To100 && (
              <Path d="M 22,35 C 32,22 68,22 78,35 C 70,25 30,25 22,35 Z" fill="#ffffff" opacity="0.35" />
            )}

            {/* Inner Emblem representation */}
            {isLevel21To30 ? (
              /* Moon gold logo */
              <Path
                d="M 64,48 C 64,57 56,64 47,64 C 42,64 38,61 35,56 C 45,56 52,48 52,38 C 52,33 49,29 45,26 C 56,27 64,36 64,48 Z"
                fill="url(#moonGoldGrad)"
              />
            ) : isLevel31To40 ? (
              /* Level 31-40: Glossy shine bubble inside central orange/red gem */
              <G>
                <Path
                  d="M 36,38 C 36,32 42,28 48,28 C 45,28 40,32 38,36 C 36,40 39,43 39,43 C 39,43 36,42 36,38 Z"
                  fill="#ffffff"
                  opacity="0.65"
                />
                <Circle cx="60" cy="56" r="3" fill="#ffffff" opacity="0.5" />
              </G>
            ) : isLevel41To50 ? (
              /* Level 41-50: Fauceted Golden Diamond/Heart Gem in the center */
              <G>
                <Polygon points="50,23 68,36 50,71 32,36" fill="#78350f" />
                <Polygon points="50,23 62,36 38,36" fill="#fef08a" />
                <Polygon points="50,23 38,36 32,36" fill="#fbbf24" />
                <Polygon points="50,23 62,36 68,36" fill="#f59e0b" />
                <Polygon points="38,36 62,36 50,71" fill="#fbbf24" />
                <Polygon points="32,36 38,36 50,71" fill="#d97706" />
                <Polygon points="68,36 62,36 50,71" fill="#b45309" />
                <Circle cx="44" cy="30" r="2.2" fill="#ffffff" opacity="0.8" />
              </G>
            ) : isLevel51To60 ? (
              /* Level 51-60: Faceted spiky 8-pointed Emerald Star Gem */
              <G>
                {/* 3D facets of 8-pointed star */}
                <Polygon points="50,22 50,48 34,32" fill="#a7f3d0" />
                <Polygon points="50,22 50,48 66,32" fill="#34d399" />
                <Polygon points="74,48 50,48 66,32" fill="#059669" />
                <Polygon points="74,48 50,48 66,64" fill="#047857" />
                <Polygon points="50,74 50,48 66,64" fill="#064e3b" />
                <Polygon points="50,74 50,48 34,64" fill="#047857" />
                <Polygon points="26,48 50,48 34,64" fill="#059669" />
                <Polygon points="26,48 50,48 34,32" fill="#34d399" />
                {/* Center glint */}
                <Circle cx="50" cy="48" r="3.5" fill="#ffffff" opacity="0.8" />
                <Circle cx="46" cy="44" r="1.5" fill="#ffffff" />
              </G>
            ) : isLevel61To70 ? (
              /* Level 61-70: Faceted 4-pointed Ice-Blue compass star in center */
              <G>
                <Polygon points="50,23 50,48 38,38" fill="#e0f7fa" />
                <Polygon points="50,23 50,48 62,38" fill="#4dd0e1" />
                <Polygon points="75,48 50,48 62,38" fill="#00acc1" />
                <Polygon points="75,48 50,48 62,58" fill="#00838f" />
                <Polygon points="50,73 50,48 62,58" fill="#006064" />
                <Polygon points="50,73 50,48 38,58" fill="#00838f" />
                <Polygon points="25,48 50,48 38,58" fill="#00acc1" />
                <Polygon points="25,48 50,48 38,38" fill="#4dd0e1" />
                {/* Central glint spark */}
                <Circle cx="50" cy="48" r="2.8" fill="#ffffff" opacity="0.8" />
              </G>
            ) : isLevel71To80 ? (
              /* Level 71-80: Concentric overlapping mechanical rings (Steampunk Gear mockup) */
              <G>
                {/* Center wheel core */}
                <Circle cx="50" cy="48" r="11" fill="none" stroke="#ffe082" strokeWidth="3" />
                {/* Steampunk overlapping loops */}
                <Circle cx="42" cy="42" r="7" fill="none" stroke="#b59049" strokeWidth="2" opacity="0.8" />
                <Circle cx="58" cy="42" r="7" fill="none" stroke="#b59049" strokeWidth="2" opacity="0.8" />
                <Circle cx="50" cy="56" r="7" fill="none" stroke="#b59049" strokeWidth="2" opacity="0.8" />
                {/* Center bright core bead */}
                <Circle cx="50" cy="48" r="3.5" fill="#ffffff" />
              </G>
            ) : isLevel81To90 ? (
              /* Level 81-90: Faceted Ice-Blue/Sapphire core gem in the center */
              <G>
                <Polygon points="50,25 65,38 50,71 35,38" fill="#0891b2" />
                <Polygon points="50,25 50,48 35,38" fill="#e0fdfa" />
                <Polygon points="50,25 50,48 65,38" fill="#a5f3fc" />
                <Polygon points="65,38 50,48 50,71" fill="#06b6d4" />
                <Polygon points="35,38 50,48 50,71" fill="#0891b2" />
                {/* Facet highlights */}
                <Circle cx="44" cy="34" r="2" fill="#ffffff" opacity="0.85" />
              </G>
            ) : isLevel91To100 ? (
              /* Level 91-100: Majestic Golden Bird (Eagle) with head facing left & wings spread inside the deep blue gem */
              <G fill="#fbbf24" transform="translate(50, 48) scale(1.3) translate(-50, -48)">
                {/* Bird body/chest */}
                <Path d="M 50,38 L 56,54 L 50,66 L 44,54 Z" fill="url(#goldStarGrad)" stroke="#d97706" strokeWidth="1.2" />
                {/* Chest feather texture lines */}
                <Path d="M 47,44 Q 50,47 53,44 M 46,49 Q 50,53 54,49 M 48,54 Q 50,57 52,54" stroke="#8a4f00" strokeWidth="1" fill="none" strokeLinecap="round" />
                
                {/* 4-pointed Diamond Star Medal on chest */}
                <Path d="M 50,44 L 52,49 L 57,51 L 52,53 L 50,58 L 48,53 L 43,51 L 48,49 Z" fill="#ffffff" stroke="#d97706" strokeWidth="0.5" />
                <Circle cx="50" cy="51" r="1.1" fill="#ff2222" />
                
                {/* Bird neck rising up */}
                <Path d="M 47,38 C 47,32 53,32 53,27 L 50,27 C 48,27 47,29 47,38 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                {/* Bird head facing left */}
                <Path d="M 50,26 C 53,26 55,29 53,32 L 50,38 C 48,34 48,30 50,26 Z" fill="#ffd700" stroke="#d97706" strokeWidth="0.8" />
                {/* Beak pointing left */}
                <Path d="M 48,28 L 42,31 L 47,33 Z" fill="#ffd700" stroke="#d97706" strokeWidth="0.8" />
                {/* Bird spreads wings inside circle */}
                <Path d="M 46,35 C 38,30 32,36 34,45 C 41,41 43,44 46,39 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
                <Path d="M 54,35 C 62,30 68,36 66,45 C 59,41 57,44 54,39 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
                {/* Wing feather texture lines */}
                <Path d="M 37,42 Q 41,39 44,41 M 63,42 Q 59,39 56,41" stroke="#8a4f00" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                
                {/* Bird glowing ruby eye */}
                <Circle cx="49" cy="30" r="0.9" fill="#ff2222" stroke="#ffcccc" strokeWidth="0.3" />
                {/* Shiny spark reflection */}
                <Circle cx="50" cy="46" r="2.2" fill="#ffffff" opacity="0.8" />
              </G>
            ) : (
              /* Inner Golden Star for 11-20 or white star fallback */
              <Path
                d="M 50,30 L 55,41 L 67,43 L 58,51 L 60,63 L 50,57 L 40,63 L 42,51 L 33,43 L 45,41 Z"
                fill={isLevel11To20 ? "url(#goldStarGrad)" : starColor}
              />
            )}
          </Svg>
        </EntriesRotationComponent>
      </Animated.View>

      {/* Pill Capsule attached behind the shield */}
      <View style={{
        marginLeft: shieldSize / 2,
        paddingLeft: (shieldSize / 2) + 1 * scale,
        paddingRight: 4 * scale,
        height: pillHeight,
        minWidth: pillWidth,
        borderRadius: pillHeight / 2,
        borderWidth: 1.8,
        borderColor: pillBorder,
        borderTopColor: showBevel ? 'rgba(255, 255, 255, 0.5)' : pillBorder, // bevel only for 61+
        borderBottomColor: showBevel ? 'rgba(0, 0, 0, 0.65)' : pillBorder,  // bevel only for 61+
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: pillGradient[1],
        position: 'relative',
        zIndex: 5,
        overflow: 'hidden',
        // Drop shadow for 3D depth starting from level 31
        ...(showShadow ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1.2 * scale },
          shadowOpacity: 0.35,
          shadowRadius: 1.8 * scale,
          elevation: 2.5,
        } : {}),
      }}>
        <LinearGradient
          colors={pillGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: pillHeight / 2 }]}
        />
        
        {/* 3D Glossy reflection on top half only for 61+ */}
        {showGlossy && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '48%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderBottomWidth: 0.5,
            borderBottomColor: 'rgba(255, 255, 255, 0.15)',
          }} />
        )}
        
        {/* Shiny sweep animation overlay effect inside pill */}
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.25,
          transform: [
            {
              translateX: shineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-pillWidth, pillWidth * 2.2],
              }),
            },
          ],
        }}>
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.45)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <Text style={{ color: textColor, fontSize: 7.5 * scale, fontWeight: '900', letterSpacing: 0.1, includeFontPadding: false, textAlignVertical: 'center', zIndex: 10 }}>
          Lv.{level}
        </Text>
      </View>
    </View>
  );
}

// Support rotation animation inside Svg wing container
function EntriesRotationComponent({ active, rotateVal, children }: { active: boolean; rotateVal: any; children: any }) {
  if (!active) return <View>{children}</View>;
  return (
    <Animated.View style={{ transform: [{ rotate: rotateVal }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
});
