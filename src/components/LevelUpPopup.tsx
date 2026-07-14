import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserLevelBadge } from '@/components/user-level-badge';

const { width } = Dimensions.get('window');

interface LevelUpPopupProps {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  coinsReward: number;
  framesAwarded: string[];
  onClose: () => void;
}

export function LevelUpPopup({ visible, oldLevel, newLevel, coinsReward, framesAwarded, onClose }: LevelUpPopupProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const coinCountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();

      // Animate coin count
      if (coinsReward > 0) {
        Animated.timing(coinCountAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
      }
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      coinCountAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, opacity: opacityAnim }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: width * 0.8, maxWidth: 320 }}>
        <LinearGradient colors={['#1e1b4b', '#312e81', '#4338ca']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' }}>
          {/* Sparkle Header */}
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>Level Up!</Text>
          
          {/* Level Badge */}
          <View style={{ marginVertical: 12 }}>
            <UserLevelBadge level={newLevel} scale={1.8} />
          </View>
          
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 }}>
            Level {oldLevel} → Level {newLevel}
          </Text>

          {/* Rewards */}
          <View style={{ width: '100%', marginTop: 16, gap: 8 }}>
            {coinsReward > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 18 }}>🪙</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fbbf24' }}>
                  +{coinsReward.toLocaleString()} Coins
                </Text>
              </View>
            )}
            
            {framesAwarded.map((frame, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 18 }}>🖼️</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#a855f7' }}>
                  {frame}
                </Text>
              </View>
            ))}
          </View>

          {/* OK Button */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ marginTop: 20, width: '100%' }}>
            <LinearGradient colors={['#fbbf24', '#f59e0b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e1b4b' }}>Awesome!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}
