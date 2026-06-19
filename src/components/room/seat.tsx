import React, { memo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MicOff, Armchair, Lock } from 'lucide-react-native';
import { RoomParticipant } from '../../lib/types';
import { EmojiReactionOverlay } from './emoji-reaction-overlay';
import { AnimatedAngryEmoji } from './animated-angry-emoji';
import { AnimatedLoveHandShake } from './animated-love-handshake';
import { AnimatedLoveShow } from './animated-love-show';
import { Image } from 'expo-image';
import { Video } from 'expo-av';

const SeatVideoFrame = memo(({ url }: { url: string }) => {
  const ref = useRef<Video>(null);
  useEffect(() => {
    const timer = setTimeout(() => { ref.current?.playAsync?.(); }, 150);
    return () => clearTimeout(timer);
  }, []);
  return <Video ref={ref} source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" shouldPlay isLooping isMuted useNativeControls={false} />;
});

interface SeatProps {
  index: number;
  occupant: RoomParticipant | null;
  isMuted: boolean;
  isLocked: boolean;
  isSeatMuted?: boolean;
  onClick: () => void;
  isSpeaking: boolean;
  speakingIntensity?: number;
  activeEmoji?: string | null;
  customEmojiMap?: Record<string, { imageUrl?: string; animationUrl?: string } | string>;
  avatarFrameUrl?: string | null;
}

function VoiceWaveRing({ isSpeaking, intensity, accentColor = '#22c55e' }: { isSpeaking: boolean; intensity: number; accentColor?: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSpeaking || intensity === 0) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      const dynScale = 1 + (intensity / 100) * 0.15;
      const dynOpacity = 0.35 + (intensity / 100) * 0.65;
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: dynScale, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: dynOpacity, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [isSpeaking, intensity]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: accentColor,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
      pointerEvents="none"
    />
  );
}

export const Seat = memo(function Seat({
  index,
  occupant,
  isMuted,
  isLocked,
  isSeatMuted,
  onClick,
  isSpeaking,
  speakingIntensity = 0,
  activeEmoji,
  customEmojiMap,
  avatarFrameUrl,
}: SeatProps) {

  const displayName = occupant
    ? ((occupant as any).username || occupant.name || 'User')
    : `NO.${index}`;

  const isMicMuted = occupant ? (isMuted || !!isSeatMuted) : false;

  // Real app: bg-sky-500/20 — in native we make it slightly more solid to avoid too much transparency
  const bgColor = isLocked ? 'rgba(239,68,68,0.35)' : 'rgba(14,165,233,0.45)';
  const borderColor = isLocked
    ? 'rgba(239,68,68,0.75)'
    : isSpeaking && occupant
    ? '#22c55e'
    : 'rgba(255,255,255,0.45)';

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={onClick} activeOpacity={0.75} style={styles.touchable}>
        {/* Voice wave ring */}
        <VoiceWaveRing isSpeaking={!!occupant && isSpeaking} intensity={speakingIntensity} accentColor="#22c55e" />

        {/* Seat circle — matches real app: bg-sky-500/20, border border-white/30 */}
        <View
          style={[
            styles.circle,
            {
              backgroundColor: bgColor,
              borderColor: borderColor,
              borderWidth: 2,
            },
          ]}
        >
          {occupant ? (
            <>
              {avatarFrameUrl && (
                <View style={[StyleSheet.absoluteFillObject, { borderRadius: 999, overflow: 'hidden' }]}>
                  {(avatarFrameUrl.includes('.mp4') || avatarFrameUrl.includes('.mov') || avatarFrameUrl.includes('.webm') || avatarFrameUrl.includes('video/')) ? (
                    <SeatVideoFrame url={avatarFrameUrl} />
                  ) : (
                    <Image cachePolicy="memory-disk" source={{ uri: avatarFrameUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  )}
                </View>
              )}
              <Image cachePolicy="memory-disk" source={{ uri: occupant.avatarUrl || 'https://picsum.photos/100' }}
                style={[styles.avatar, { opacity: activeEmoji ? 0 : 1 }]}
              />
            </>
          ) : isLocked ? (
            <Lock size={18} color="rgba(239,68,68,0.7)" />
          ) : (
            // Real app uses Armchair for empty seat
            <Armchair size={22} color="rgba(255,255,255,0.85)" />
          )}
        </View>

        {/* Mute badge */}
        {occupant && isMicMuted && (
          <View style={styles.muteBadge}>
            <MicOff color="white" size={9} />
          </View>
        )}

        {/* Emoji overlay */}
        {activeEmoji === '__angry__' ? (
          <AnimatedAngryEmoji size={60} visible={true} />
        ) : activeEmoji === '__love_handshake__' ? (
          <AnimatedLoveHandShake size={60} visible={true} />
        ) : activeEmoji === '__love_show__' ? (
          <AnimatedLoveShow size={60} visible={true} />
        ) : activeEmoji ? (
          <EmojiReactionOverlay
            emoji={activeEmoji}
            customEmojiUrl={customEmojiMap?.[activeEmoji] ? (customEmojiMap[activeEmoji].imageUrl || customEmojiMap[activeEmoji].animationUrl) : undefined}
            size={44}
            visible={true}
          />
        ) : null}
      </TouchableOpacity>

      {/* Label: name if occupied, NO.X if empty */}
      <Text numberOfLines={1} style={[styles.label, { color: occupant ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }]}>
        {displayName}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 12,
    width: '25%',
    overflow: 'visible',
  },
  touchable: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  muteBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    zIndex: 20,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    maxWidth: 52,
  },
});
