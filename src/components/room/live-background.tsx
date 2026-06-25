import React, { useMemo } from 'react';
import { View, Animated } from 'react-native';

interface LiveBackgroundProps {
  themeId: 'galaxy' | 'stars' | 'love' | 'rain' | 'none';
}

export function LiveBackground({ themeId }: LiveBackgroundProps) {
  if (themeId === 'none') return null;

  const stars = useMemo(() => {
    const count = themeId === 'galaxy' ? 20 : themeId === 'stars' ? 25 : 0;
    return Array.from({ length: count }, (_, i) => ({
      top: `${(i * 13) % 100}%`,
      left: `${(i * 7) % 100}%`,
      delay: `${i * 0.2}s`,
      duration: `${2 + (i % 3)}s`,
      size: themeId === 'stars' ? 1 : 1.5,
    }));
  }, [themeId]);

  const hearts = useMemo(() => {
    if (themeId !== 'love') return [];
    return Array.from({ length: 8 }, (_, i) => ({
      left: `${(i * 25) % 100}%`,
      delay: `${i * 1.5}s`,
      duration: `${12 + (i % 5)}s`,
    }));
  }, [themeId]);

  const raindrops = useMemo(() => {
    if (themeId !== 'rain') return [];
    return Array.from({ length: 20 }, (_, i) => ({
      left: `${(i * 7) % 100}%`,
      delay: `${i * 0.1}s`,
    }));
  }, [themeId]);

  return (
    <View className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {themeId === 'galaxy' && (
        <View className="flex-1" style={{ backgroundColor: '#030014' }}>
          <View className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full" style={{ backgroundColor: 'rgba(147,51,234,0.2)', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 100 }} />
          {stars.map((s, i) => (
            <Animated.View key={i} className="absolute bg-white rounded-full" style={{ top: s.top as any, left: s.left as any, width: s.size, height: s.size, opacity: 0.4 }} />
          ))}
        </View>
      )}
      {themeId === 'stars' && (
        <View className="flex-1" style={{ backgroundColor: '#000' }}>
          <View className="absolute inset-0" style={{ backgroundColor: 'transparent' }} />
          {stars.map((s, i) => (
            <Animated.View key={i} className="absolute bg-blue-100 rounded-full" style={{ top: s.top as any, left: s.left as any, width: s.size, height: s.size, opacity: 0.6 }} />
          ))}
        </View>
      )}
      {themeId === 'love' && (
        <View className="flex-1" style={{ backgroundColor: 'rgba(190,24,93,0.05)' }}>
          {hearts.map((h, i) => (
            <Animated.Text key={i} className="absolute text-pink-500/10" style={{ left: h.left as any, fontSize: 40, top: `${(i * 15) % 100}%` as any }}>♥</Animated.Text>
          ))}
        </View>
      )}
      {themeId === 'rain' && (
        <View className="flex-1" style={{ backgroundColor: 'rgba(15,23,42,0.4)' }}>
          {raindrops.map((r, i) => (
            <Animated.View key={i} className="absolute bg-blue-300/20" style={{ left: r.left as any, width: 1, height: 24, top: '-10%' }} />
          ))}
        </View>
      )}
    </View>
  );
}
