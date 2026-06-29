import React, { memo, useRef, useEffect, useState } from 'react';
import { View, ViewStyle, StyleSheet, Animated, Text } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import LottieView from 'lottie-react-native';
import { getCachedFile } from '../../lib/cache-manager';
import { Sparkles } from 'lucide-react-native';
import { toCDN } from '../../lib/cdn';

interface AvatarFrameProps {
  frameMediaUrl?: string | null;
  size: number;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

const LOCAL_FRAME_ASSETS: Record<string, any> = {
  'sea_sands': require('../../../assets/images/sea_sands_frame.png'),
  'sea_sands_frame': require('../../../assets/images/sea_sands_frame.png'),
  'basra': require('../../../assets/images/basra_frame.png'),
  'basra_frame': require('../../../assets/images/basra_frame.png'),
  'top3family_topuser': require('../../../assets/images/top3family_topuser.png'),
  'top2family_topuser': require('../../../assets/images/top2family_topuser.png'),
};

function FrameDecorationAnimation({ type, frameSize }: { type: string; frameSize: number }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animVal, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, [type]);

  const cleanType = (type || '').toLowerCase();

  if (cleanType.includes('fuffy')) {
    const rotate = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
        {/* Rotating gradient-like pastel light halo behind paws */}
        <Animated.View style={{
          position: 'absolute',
          top: 10, left: 10, right: 10, bottom: 10,
          borderRadius: frameSize / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(236,72,153,0.35)', // Pastel pink neon glow
          transform: [{ rotate }],
        }} />
      </View>
    );
  }

  if (cleanType.includes('butterflies')) {
    // 3 butterflies fluttering around the frame
    const scale = animVal.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.2, 0.8],
    });
    const rotate = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          transform: [{ rotate }],
        }}>
          {/* Butterfly 1 */}
          <Animated.View style={{
            position: 'absolute',
            top: 10,
            left: 10,
            transform: [{ scale }],
          }}>
            <Text style={{ fontSize: 10 }}>🦋</Text>
          </Animated.View>
          {/* Butterfly 2 */}
          <Animated.View style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            transform: [{ scale }],
          }}>
            <Text style={{ fontSize: 8 }}>🦋</Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  if (cleanType.includes('sea') || cleanType.includes('sands')) {
    // Floating bubbles
    const bubbleY = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: [frameSize - 20, 10],
    });
    const bubbleX = animVal.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 8, 0],
    });
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
        <Animated.View style={{
          position: 'absolute',
          bottom: 20,
          left: '30%',
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: 'rgba(255,255,255,0.7)',
          transform: [{ translateY: bubbleY }, { translateX: bubbleX }],
        }} />
        <Animated.View style={{
          position: 'absolute',
          bottom: 10,
          right: '30%',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.6)',
          transform: [{ translateY: bubbleY }, { translateX: bubbleX }],
        }} />
      </View>
    );
  }

  if (cleanType.includes('basra')) {
    // Teapot steam
    const steamY = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -25],
    });
    const steamOpacity = animVal.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [0, 0.7, 0],
    });
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
        <Animated.View style={{
          position: 'absolute',
          bottom: 24,
          left: 14,
          opacity: steamOpacity,
          transform: [{ translateY: steamY }],
        }}>
          <Text style={{ fontSize: 6, color: 'rgba(255,255,255,0.8)' }}>💨</Text>
        </Animated.View>
      </View>
    );
  }

  if (cleanType.includes('family_topuser') || cleanType.includes('top3family') || cleanType.includes('top2family')) {
    // Sparkles on bottom crystal wings
    const sparkOpacity = animVal.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 1, 0.2],
    });
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
        <Animated.View style={{
          position: 'absolute',
          bottom: 6,
          left: frameSize / 2 - 6,
          opacity: sparkOpacity,
        }}>
          <Sparkles size={12} color="#f472b6" fill="#f472b6" />
        </Animated.View>
      </View>
    );
  }

  return null;
}

export const AvatarFrame = memo(function AvatarFrame({
  frameMediaUrl,
  size,
  children,
  containerStyle,
}: AvatarFrameProps) {
  const videoRef = useRef<Video>(null);
  const lottieRef = useRef<LottieView>(null);
  const [cachedFrameUrl, setCachedFrameUrl] = useState<string | null>(null);

  const hasFrame = frameMediaUrl && frameMediaUrl !== 'None' && frameMediaUrl !== '' && typeof frameMediaUrl === 'string';

  const frameSize = size * 1.55;
  const frameOffset = (size - frameSize) / 2;

  const isLocalAsset = hasFrame && !!(LOCAL_FRAME_ASSETS as any)[frameMediaUrl!];
  const isHttpUrl = hasFrame && !isLocalAsset && (frameMediaUrl!.startsWith('http://') || frameMediaUrl!.startsWith('https://'));

  const isVideo = isHttpUrl && (
    frameMediaUrl!.includes('.mp4') ||
    frameMediaUrl!.includes('.mov') ||
    frameMediaUrl!.includes('.webm') ||
    frameMediaUrl!.includes('video/')
  );

  const isLottie = isHttpUrl && (
    frameMediaUrl!.includes('.json') ||
    frameMediaUrl!.includes('lottie')
  );

  useEffect(() => {
    if (!frameMediaUrl || frameMediaUrl === 'None' || isLocalAsset || !isHttpUrl) {
      setCachedFrameUrl(null);
      return;
    }

    let active = true;
    const proxiedUrl = toCDN(frameMediaUrl);
    getCachedFile(proxiedUrl)
      .then(localPath => {
        if (active) setCachedFrameUrl(localPath);
      })
      .catch(() => {
        if (active) setCachedFrameUrl(proxiedUrl);
      });

    return () => {
      active = false;
    };
  }, [frameMediaUrl]);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      const timer = setTimeout(() => {
        videoRef.current?.playAsync?.().catch(() => {});
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isVideo, cachedFrameUrl]);

  useEffect(() => {
    if (isLottie && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play?.();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLottie, cachedFrameUrl]);

  const resolvedSource = isLocalAsset
    ? (LOCAL_FRAME_ASSETS as any)[frameMediaUrl!]
    : (cachedFrameUrl || (isHttpUrl ? frameMediaUrl : null));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }, containerStyle]}>
      {/* Avatar Image container (rendered below frame) */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: size / 2, overflow: 'hidden', zIndex: 1 }}>
        {children}
      </View>

      {/* Frame overlay (rendered on top with zIndex: 2) */}
      {hasFrame && resolvedSource && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: frameSize,
            height: frameSize,
            left: frameOffset,
            top: frameOffset,
            zIndex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
          }}
        >
          {isLottie ? (
            <LottieView
              key={resolvedSource}
              ref={lottieRef}
              source={typeof resolvedSource === 'string' && resolvedSource.startsWith('http') ? { uri: resolvedSource } : resolvedSource}
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              loop
              autoPlay
            />
          ) : isVideo ? (
            <Video
              ref={videoRef}
              source={typeof resolvedSource === 'string' ? { uri: resolvedSource } : resolvedSource}
              style={{ width: '100%', height: '100%' }}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
              useNativeControls={false}
            />
          ) : (
            <Image
              cachePolicy="memory-disk"
              source={typeof resolvedSource === 'string' ? { uri: resolvedSource } : resolvedSource}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          )}
          {<FrameDecorationAnimation type={frameMediaUrl!} frameSize={frameSize} />}
        </View>
      )}
    </View>
  );
});
