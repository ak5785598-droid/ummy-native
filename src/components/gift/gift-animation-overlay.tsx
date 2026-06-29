import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, Dimensions, Easing } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Image } from 'expo-image';
import { getCachedFile } from '../../lib/cache-manager';

const { width, height } = Dimensions.get('window');

interface GiftAnimationEvent {
  id: string;
  giftName: string;
  senderName: string;
  recipientName: string;
  imageUrl?: string | null;
  animationUrl?: string | null;
  videoUrl?: string | null;
  tier: 'normal' | 'epic' | 'legendary';
  quantity: number;
  multiplier?: number;
}

interface GiftAnimationOverlayProps {
  events: GiftAnimationEvent[];
}

const NON_VIDEO_DELAY = 4000;

export function GiftAnimationOverlay({ events }: GiftAnimationOverlayProps) {
  const latestEvent = events[events.length - 1];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<Video>(null);
  const [visible, setVisible] = useState(false);
  const [cachedVideoUrl, setCachedVideoUrl] = useState<string | null>(null);
  const fadeTriggered = useRef(false);

  const startFadeOut = useCallback(() => {
    if (fadeTriggered.current) return;
    fadeTriggered.current = true;

    Animated.sequence([
      Animated.delay(500),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacityAnim]);

  useEffect(() => {
    if (!latestEvent) return;

    const vUrl = latestEvent.videoUrl || '';
    if (vUrl) {
      let active = true;
      getCachedFile(vUrl).then(localPath => {
        if (active) setCachedVideoUrl(localPath);
      }).catch(() => {
        if (active) setCachedVideoUrl(vUrl);
      });
      return () => {
        active = false;
      };
    } else {
      setCachedVideoUrl(null);
    }
  }, [latestEvent?.id]);

  useEffect(() => {
    if (!latestEvent) return;

    fadeTriggered.current = false;
    setVisible(true);
    scaleAnim.setValue(0);
    opacityAnim.setValue(1);

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const vUrl = latestEvent.videoUrl || '';
    const isVideo = vUrl.length > 0 && !vUrl.toLowerCase().includes('.svga');

    if (!isVideo) {
      const timer = setTimeout(() => {
        startFadeOut();
      }, NON_VIDEO_DELAY);

      return () => clearTimeout(timer);
    }
  }, [latestEvent?.id]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      startFadeOut();
    }
  }, [startFadeOut]);

  if (!visible || !latestEvent) return null;

  const vUrl = latestEvent.videoUrl || '';
  const isVideo = vUrl.length > 0 && !vUrl.toLowerCase().includes('.svga');
  const isLegendary = latestEvent.tier === 'legendary';
  const resolvedVideoUrl = cachedVideoUrl || vUrl;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width, height, backgroundColor: 'transparent', zIndex: 50, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        {isVideo && resolvedVideoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: resolvedVideoUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />
        ) : latestEvent.imageUrl ? (
          <Image
            source={{ uri: latestEvent.imageUrl }}
            style={{ width: 250, height: 250 }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={{ fontSize: 64 }}>🎁</Text>
        )}

        {isLegendary && (
          <View style={{ position: 'absolute', top: -16, left: -16, right: -16, bottom: -16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Particle key={i} index={i} />
            ))}
          </View>
        )}

        <View style={{ position: 'absolute', bottom: 160, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
            {latestEvent.senderName} sent {latestEvent.giftName} {latestEvent.quantity > 1 ? `x${latestEvent.quantity}` : ''}
          </Text>
          {latestEvent.multiplier && latestEvent.multiplier > 1 && (
            <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
              x{latestEvent.multiplier} Combo!
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function Particle({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = (index / 8) * Math.PI * 2;
  const distance = 60;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800 + index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 800 + index * 100,
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
    outputRange: [1, 0.3, 1],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fbbf24',
        transform: [{ translateX }, { translateY }],
        opacity,
      }}
    />
  );
}
