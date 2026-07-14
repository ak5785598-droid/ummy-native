import React, { memo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native';
import { MicOff, Armchair, Lock } from 'lucide-react-native';
import { RoomParticipant } from '../../lib/types';
import { EmojiReactionOverlay } from './emoji-reaction-overlay';
import { AnimatedAngryEmoji } from './animated-angry-emoji';
import { AnimatedLoveHandShake } from './animated-love-handshake';
import { AnimatedLoveShow } from './animated-love-show';
import { AnimatedThinkingEmoji } from './animated-thinking-emoji';
import { AnimatedCryEmoji } from './animated-cry-emoji';
import { AnimatedWritingEmoji } from './animated-writing-emoji';
import { AnimatedRunEmoji } from './animated-run-emoji';
import { AnimatedFrustrationEmoji } from './animated-frustration-emoji';
import { AnimatedIrritationEmoji } from './animated-irritation-emoji';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';
import { Video } from 'expo-av';
import { AvatarFrame } from '../profile/AvatarFrame';
function CpSeatParticles() {
  const animRight = useRef(new Animated.Value(0)).current;
  const animLeft = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rightLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(animRight, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(animRight, { toValue: 0, duration: 10, useNativeDriver: true }),
      ])
    );
    const leftLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(animLeft, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(animLeft, { toValue: 0, duration: 10, useNativeDriver: true }),
      ])
    );
    rightLoop.start();
    leftLoop.start();
    return () => { rightLoop.stop(); leftLoop.stop(); };
  }, []);

  // Right particles: red hearts & roses flying toward partner
  const rightParticles = [
    { emoji: '♥', ty: -10, size: 8, color: '#F43F5E' },
    { emoji: '♥', ty: -2, size: 9, color: '#F43F5E' },
    { emoji: '♥', ty: 5, size: 7, color: '#EC4899' },
  ];

  // Left particles: blue hearts coming from partner
  const leftParticles = [
    { emoji: '♥', ty: -8, size: 8, color: '#3B82F6' },
    { emoji: '♥', ty: 0, size: 9, color: '#3B82F6' },
    { emoji: '♥', ty: 8, size: 7, color: '#60A5FA' },
  ];

  return (
    <>
      {rightParticles.map((p, i) => {
        const tx = animRight.interpolate({ inputRange: [0, 1], outputRange: [0, 48] });
        const ty = animRight.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] });
        const op = animRight.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 1, 0] });
        const sc = animRight.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1, 0.3] });
        return (
          <Animated.Text key={`r${i}`} style={{
            position: 'absolute', fontSize: p.size, opacity: op, zIndex: 20,
            color: p.color, fontWeight: '900',
            transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
          }}>
            {'\u2665'}
          </Animated.Text>
        );
      })}
      {leftParticles.map((p, i) => {
        const tx = animLeft.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });
        const ty = animLeft.interpolate({ inputRange: [0, 1], outputRange: [p.ty, 0] });
        const op = animLeft.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 1, 0] });
        const sc = animLeft.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1, 0.3] });
        return (
          <Animated.View key={`l${i}`} style={{
            position: 'absolute', width: p.size, height: p.size, borderRadius: p.size / 2,
            backgroundColor: p.color, opacity: op, zIndex: 20,
            transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
          }} />
        );
      })}
    </>
  );
}

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
  connectRight?: 'CP' | 'BFF' | null;
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
  connectRight = null,
}: SeatProps) {

  const displayName = occupant
    ? ((occupant as any).username || occupant.name || 'User')
    : `NO.${index}`;

  const isMicMuted = occupant ? (isMuted || !!isSeatMuted) : !!isSeatMuted;

  const bgColor = isLocked ? 'rgba(239,68,68,0.35)' : 'rgba(14,165,233,0.45)';
  const borderColor = isLocked
    ? 'rgba(239,68,68,0.75)'
    : isSpeaking && occupant
    ? '#22c55e'
    : 'rgba(255,255,255,0.45)';

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={onClick} activeOpacity={0.75} style={styles.touchable}>
        {/* Connection line extending to the right seat */}
        {connectRight && (
          <View
            style={{
              position: 'absolute',
              left: 42,
              width: 58,
              height: 4,
              top: 28,
              zIndex: -10,
              backgroundColor: connectRight === 'CP' ? '#ec4899' : '#8b5cf6',
              borderRadius: 2,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: connectRight === 'CP' ? '#f472b6' : '#a78bfa',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            {/* Heart or Handshake Badge */}
            <View style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: connectRight === 'CP' ? '#ec4899' : '#8b5cf6',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'white',
              position: 'absolute',
              top: -5,
            }}>
              <Text style={{ fontSize: 7, color: 'white', fontWeight: 'bold' }}>
                {connectRight === 'CP' ? '❤️' : '🤝'}
              </Text>
            </View>
            {/* CP Particles flying along connection line */}
            {connectRight === 'CP' && <CpSeatParticles />}
          </View>
        )}

        {/* Voice wave ring */}
        <VoiceWaveRing isSpeaking={!!occupant && isSpeaking} intensity={speakingIntensity} accentColor="#22c55e" />

        {/* Seat circle — matches real app: bg-sky-500/20, border border-white/30 */}
        {occupant ? (
          <AvatarFrame
            frameMediaUrl={avatarFrameUrl}
            size={60}
          >
            <Image cachePolicy="memory-disk" source={{ uri: toCDN(occupant.avatarUrl) || 'https://picsum.photos/100' }}
              style={styles.avatar}
            />
          </AvatarFrame>
        ) : (
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
            {isLocked ? (
              <Lock size={18} color="rgba(239,68,68,0.7)" />
            ) : (
              <Armchair size={22} color="rgba(255,255,255,0.85)" />
            )}
          </View>
        )}

        {/* Mute badge */}
        {isMicMuted && (
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
        ) : activeEmoji === '__thinking__' ? (
          <AnimatedThinkingEmoji size={60} visible={true} />
        ) : activeEmoji === '__cry__' ? (
          <AnimatedCryEmoji size={60} visible={true} />
        ) : activeEmoji === '__writing__' ? (
          <AnimatedWritingEmoji size={60} visible={true} />
        ) : activeEmoji === '__run__' ? (
          <AnimatedRunEmoji size={60} visible={true} />
        ) : activeEmoji === '__frustration__' ? (
          <AnimatedFrustrationEmoji size={60} visible={true} />
        ) : activeEmoji === '__irritation__' ? (
          <AnimatedIrritationEmoji size={60} visible={true} />
        ) : activeEmoji ? (
          <EmojiReactionOverlay
            emoji={activeEmoji}
            customEmojiUrl={customEmojiMap?.[activeEmoji] ? ((customEmojiMap[activeEmoji] as any)?.animationUrl || (customEmojiMap[activeEmoji] as any)?.imageUrl) : undefined}
            size={60}
            visible={true}
            noAnimation
            zoom={customEmojiMap?.[activeEmoji] ? ((customEmojiMap[activeEmoji] as any)?.zoom || 1.2) : 1.2}
            offsetX={customEmojiMap?.[activeEmoji] ? ((customEmojiMap[activeEmoji] as any)?.offsetX || 0) : 0}
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
