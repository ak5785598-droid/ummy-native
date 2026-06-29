import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Vibration, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { getCachedFile } from '../../lib/cache-manager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EntryEffectPlayerProps {
  visible: boolean;
  username?: string;
  avatarUrl?: string;
  mediaUrl?: string | null;
  videoUrl?: string | null;
  effect?: 'slide' | 'fade' | 'bounce' | 'lion' | 'line' | 'dragon';
  onComplete?: () => void;
}

export function EntryEffectPlayer({ visible, username, avatarUrl, mediaUrl, videoUrl, effect = 'slide', onComplete }: EntryEffectPlayerProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);

  const isVideoEffect = effect === 'line' || effect === 'lion' || effect === 'dragon';
  const [cachedVideoUrl, setCachedVideoUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) {
      setCachedVideoUrl(null);
      return;
    }
    let active = true;
    getCachedFile(videoUrl).then(localPath => {
      if (active) setCachedVideoUrl(localPath);
    }).catch(() => {
      if (active) setCachedVideoUrl(videoUrl);
    });
    return () => {
      active = false;
    };
  }, [videoUrl]);

  const resolvedVideoUrl = cachedVideoUrl || videoUrl;
  const videoSource = resolvedVideoUrl ? { uri: resolvedVideoUrl } : require('../../../assets/animations/entry_line.mp4');

  useEffect(() => {
    if (!visible) { slideAnim.setValue(-100); opacity.setValue(0); return; }
    Vibration.vibrate(100);

    if (isVideoEffect) {
      const playTimer = setTimeout(() => { if (videoRef.current) videoRef.current.playAsync(); }, 100);
      const safetyTimer = setTimeout(() => { if (onComplete) onComplete(); }, 10000);
      return () => { clearTimeout(playTimer); clearTimeout(safetyTimer); };
    }

    Animated.sequence([
      Animated.parallel([
        effect === 'bounce'
          ? Animated.spring(slideAnim, { toValue: 0, friction: 3, tension: 60, useNativeDriver: true })
          : Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(2500),
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 100, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => { if (onComplete) onComplete(); });
  }, [visible]);

  if (!visible) return null;

  if (isVideoEffect) {
    return (
      <View style={{
        position: 'absolute',
        top: 100, left: 0, right: 0, bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 999,
        overflow: 'hidden',
      }} pointerEvents="none">
        <Video
          ref={videoRef}
          source={videoSource}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              if (onComplete) onComplete();
            }
          }}
        />
        <View style={{
          position: 'absolute',
          bottom: 40,
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.75)',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,215,0,0.4)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          {avatarUrl ? (
            <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) }}
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#FFD700' }} />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#B8860B', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16 }}>{'\u2B50'}</Text>
            </View>
          )}
          <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>
            {username || 'VIP'} entered!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={{ position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', zIndex: 50, transform: [{ translateX: slideAnim }], opacity }}
      pointerEvents="none"
    >
      <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        {mediaUrl ? (
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(mediaUrl) }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,211,238,0.5)' }} />
        ) : avatarUrl ? (
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>U</Text></View>
        )}
        <View><Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{username || 'Someone'} entered</Text>{mediaUrl ? <Text style={{ color: 'rgba(34,211,238,1)', fontSize: 8 }}>Entry effect</Text> : null}</View>
      </View>
    </Animated.View>
  );
}
