import React, { useMemo } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// ============================================================
// ⚡ PARTICLE TYPES (Web ke exact match) ⚡
// ============================================================
type ParticleType = 'music-note' | 'heart' | 'star';

interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  rotation: number;
}

const generateParticles = (count: number): Particle[] => {
  const types: ParticleType[] = ['music-note', 'heart', 'star'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    type: types[i % 3],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 40,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 4,
    opacity: 0.3 + Math.random() * 0.5,
    rotation: Math.random() * 360,
  }));
};

// ============================================================
// ⚡ SVG PARTICLE ICONS ⚡
// ============================================================
const MusicNoteIcon = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#d946ef">
    <Path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </Svg>
);

const HeartIcon = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#f472b6">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Svg>
);

const StarIcon = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#fbbf24">
    <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </Svg>
);

const ParticleIcon = ({ type, size }: { type: ParticleType; size: number }) => {
  switch (type) {
    case 'music-note': return <MusicNoteIcon size={size} />;
    case 'heart': return <HeartIcon size={size} />;
    case 'star': return <StarIcon size={size} />;
  }
};

// ============================================================
// ⚡ MAIN LOGIN BACKGROUND COMPONENT ⚡
// ============================================================
interface LoginBackgroundProps {
  floatAnim: Animated.Value;
}

export default function LoginBackground({ floatAnim }: LoginBackgroundProps) {
  const particles = useMemo(() => generateParticles(25), []);

  return (
    <>
      {/* 1. Radial Glossy Overlay (Web's animate-pulse-glow) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(176, 39, 255, 0.2)',
          opacity: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
        }}
      />

      {/* 2. Floating Particles */}
      {particles.map((particle) => (
        <Animated.View
          key={particle.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            transform: [
              { rotate: `${particle.rotation}deg` },
              { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }
            ],
          }}
        >
          <ParticleIcon type={particle.type} size={particle.size} />
        </Animated.View>
      ))}
    </>
  );
}