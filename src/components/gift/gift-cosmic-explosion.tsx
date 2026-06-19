import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

interface CosmicExplosionProps {
  visible: boolean;
  giftName: string;
  senderName: string;
  giftImage?: string | null;
  onComplete?: () => void;
}

export function CosmicExplosion({ visible, giftName, senderName, giftImage, onComplete }: CosmicExplosionProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShow(true);
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    ringAnim.setValue(0);
    textSlide.setValue(50);
    glowAnim.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(500),
      Animated.timing(textSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.delay(3000),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.5, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setShow(false);
      onComplete?.();
    });
  }, [visible]);

  if (!show) return null;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      width, height, alignItems: 'center', justifyContent: 'center',
      zIndex: 999, pointerEvents: 'none',
    }}>
      {/* Radial glow background */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(124,58,237,0.3)',
        opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
      }} />

      {/* Expanding rings */}
      {[0, 1, 2].map(i => (
        <Animated.View key={i} style={{
          position: 'absolute',
          width: 300 + i * 80,
          height: 300 + i * 80,
          borderRadius: (300 + i * 80) / 2,
          borderWidth: 2,
          borderColor: ['#a855f7', '#ec4899', '#fbbf24'][i],
          opacity: ringAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.8, 0.3, 0],
          }),
          transform: [{
            scale: ringAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1.5],
            }),
          }],
        }} />
      ))}

      {/* Center gift icon */}
      <Animated.View style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        alignItems: 'center',
      }}>
        {giftImage ? (
          <Animated.Image
            source={{ uri: giftImage }}
            style={{
              width: 150, height: 150,
              transform: [{ scale: scaleAnim }],
            }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 100 }}>🎁</Text>
        )}
      </Animated.View>

      {/* Sender + Gift name text */}
      <Animated.View style={{
        position: 'absolute',
        bottom: height * 0.25,
        alignItems: 'center',
        opacity: opacityAnim,
        transform: [{ translateY: textSlide }],
      }}>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 20,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.5)',
        }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
            🎉 {senderName}
          </Text>
          <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
            sent {giftName}
          </Text>
        </View>
      </Animated.View>

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <CosmicParticle key={i} index={i} />
      ))}
    </View>
  );
}

function CosmicParticle({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = (index / 12) * Math.PI * 2;
  const distance = 120 + Math.random() * 80;
  const colors = ['#a855f7', '#ec4899', '#fbbf24', '#06b6d4', '#f43f5e', '#8b5cf6'];
  const color = colors[index % colors.length];
  const size = 4 + Math.random() * 6;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600 + index * 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 600 + index * 80,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * distance],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * distance],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });
  const particleScale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.5, 0],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      transform: [{ translateX }, { translateY }, { scale: particleScale }],
      opacity,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 4,
    }} />
  );
}
