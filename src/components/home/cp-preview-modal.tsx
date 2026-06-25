import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Heart, X, Crown, Sparkles, Star } from 'lucide-react-native';
import { useUser, useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit, where } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';

const { width, height } = Dimensions.get('window');

// Floating particle config
const PARTICLE_COUNT = 16;
const HEART_EMOJIS = ['💖', '💕', '💗', '❤️', '💓', '💝', '🌹', '✨'];

interface FloatingParticle {
  anim: Animated.Value;
  xPos: number;
  emoji: string;
  size: number;
  delay: number;
  duration: number;
}

interface CpPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

function useAnimatedValue(val: number) {
  return useRef(new Animated.Value(val)).current;
}

export function CpPreviewModal({ visible, onClose, onNavigate }: CpPreviewModalProps) {
  const { firestore, isHydrated } = useFirebase();
  const { user } = useUser();

  // My CP pair query
  const myCpQuery = useMemo(() => {
    if (!firestore || !isHydrated || !user?.uid) return null;
    return query(
      collection(firestore, 'cpPairs'),
      where('participantIds', 'array-contains', user.uid),
      limit(1)
    );
  }, [firestore, isHydrated, user?.uid]);

  const { data: myCpData } = useCollection(myCpQuery);
  const activeCp = myCpData?.[0];
  const partnerUid = activeCp?.participantIds?.find((id: string) => id !== user?.uid);
  const { profile: myProfile } = useUserProfile(user?.uid);
  const { profile: partnerProfile } = useUserProfile(partnerUid);

  // Top CP pairs (leaderboard preview)
  const topCpQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'cpPairs'), orderBy('cpValue', 'desc'), limit(3));
  }, [firestore, isHydrated]);
  const { data: topCp } = useCollection(topCpQuery);

  // --- Animation values ---
  const modalScale = useAnimatedValue(0.85);
  const modalOpacity = useAnimatedValue(0);
  const glowPulse = useAnimatedValue(0);
  const rotateAnim = useAnimatedValue(0);
  const shimmerAnim = useAnimatedValue(0);
  const heartBeat = useAnimatedValue(1);

  // Particles
  const particles = useRef<FloatingParticle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      anim: new Animated.Value(0),
      xPos: Math.random() * (width * 0.85 - 20) + 10,
      emoji: HEART_EMOJIS[i % HEART_EMOJIS.length],
      size: 10 + Math.random() * 14,
      delay: Math.random() * 3000,
      duration: 3500 + Math.random() * 2500,
    }))
  ).current;

  const particleAnims = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (visible) {
      // Entry animation
      Animated.parallel([
        Animated.spring(modalScale, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
        Animated.timing(modalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(glowPulse, { toValue: 0, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();

      // Rotate loop for decorative ring
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true, easing: Easing.linear })
      ).start();

      // Shimmer loop
      Animated.loop(
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) })
      ).start();

      // Heart beat
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartBeat, { toValue: 1.25, duration: 400, useNativeDriver: true }),
          Animated.timing(heartBeat, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

      // Float particles
      particles.forEach((p) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(p.delay),
            Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
            Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
        loop.start();
        particleAnims.current.push(loop);
      });
    } else {
      // Reset
      Animated.parallel([
        Animated.timing(modalScale, { toValue: 0.85, duration: 200, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      glowPulse.stopAnimation();
      rotateAnim.stopAnimation();
      shimmerAnim.stopAnimation();
      heartBeat.stopAnimation();
      particleAnims.current.forEach((a) => a.stop());
      particleAnims.current = [];
      particles.forEach((p) => p.anim.setValue(0));
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.85, width * 0.85] });

  const hasCp = !!activeCp;
  const cpDays = activeCp?.createdAt
    ? Math.floor((Date.now() - (activeCp.createdAt?.toMillis?.() || Date.now())) / 86400000)
    : 0;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: modalOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        {/* Modal Card */}
        <Animated.View style={[styles.modalCard, { transform: [{ scale: modalScale }], opacity: modalOpacity }]}>
          
          {/* ===== ANIMATED BACKGROUND LAYER ===== */}
          {/* Base gradient */}
          <LinearGradient
            colors={['#0d0019', '#1a0030', '#2d0040', '#1a0030', '#0d0019']}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Secondary rose-pink glow overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(244,63,94,0.15)', 'rgba(168,85,247,0.12)', 'transparent']}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 1, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Animated glow orb - top left */}
          <Animated.View style={[styles.glowOrb, styles.glowOrbTL, { transform: [{ scale: glowScale }] }]}>
            <LinearGradient
              colors={['rgba(244,63,94,0.6)', 'rgba(244,63,94,0)']}
              style={{ flex: 1, borderRadius: 100 }}
            />
          </Animated.View>

          {/* Animated glow orb - bottom right */}
          <Animated.View style={[styles.glowOrb, styles.glowOrbBR, { transform: [{ scale: glowScale }] }]}>
            <LinearGradient
              colors={['rgba(139,92,246,0.65)', 'rgba(139,92,246,0)']}
              style={{ flex: 1, borderRadius: 100 }}
            />
          </Animated.View>

          {/* Animated glow orb - center */}
          <Animated.View style={[styles.glowOrb, styles.glowOrbCenter]}>
            <LinearGradient
              colors={['rgba(236,72,153,0.2)', 'rgba(236,72,153,0)']}
              style={{ flex: 1, borderRadius: 100 }}
            />
          </Animated.View>

          {/* Rotating decorative ring */}
          <Animated.View
            pointerEvents="none"
            style={[styles.rotatingRing, { transform: [{ rotate: spin }] }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.rotatingRingInner, { transform: [{ rotate: spin }] }]}
          />

          {/* Shimmer sweep */}
          <Animated.View
            pointerEvents="none"
            style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}
          />

          {/* Grid dot pattern */}
          <View pointerEvents="none" style={styles.gridPattern} />

          {/* Floating particle emojis */}
          {particles.map((p, i) => {
            const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -180] });
            const opacity = p.anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.6, 0] });
            return (
              <Animated.Text
                key={i}
                pointerEvents="none"
                style={[
                  styles.particle,
                  { left: p.xPos, fontSize: p.size, opacity, transform: [{ translateY }] },
                ]}
              >
                {p.emoji}
              </Animated.Text>
            );
          })}

          {/* ===== CONTENT ===== */}

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <View style={styles.closeBtnInner}>
              <X size={14} color="rgba(255,255,255,0.8)" />
            </View>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Animated.View style={{ transform: [{ scale: heartBeat }] }}>
              <Heart size={20} color="#f43f5e" fill="#f43f5e" />
            </Animated.View>
            <Text style={styles.titleText}>CP Couple</Text>
            <Sparkles size={16} color="#fbbf24" />
          </View>

          {/* Decorative divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>

          {/* CP Status Section */}
          {hasCp ? (
            <View style={styles.cpSection}>
              {/* Couple avatars */}
              <View style={styles.coupleAvatarRow}>
                {/* My avatar */}
                <View style={styles.avatarWrapper}>
                  <LinearGradient
                    colors={['#f43f5e', '#ec4899', '#8b5cf6']}
                    style={styles.avatarRing}
                  />
                  <Image
                    source={{ uri: myProfile?.avatarUrl || 'https://picsum.photos/80' }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.avatarBadge}>
                    <Crown size={8} color="#fbbf24" />
                  </View>
                </View>

                {/* Heart connector */}
                <Animated.View style={[styles.heartConnector, { transform: [{ scale: heartBeat }] }]}>
                  <LinearGradient
                    colors={['rgba(244,63,94,0.2)', 'rgba(244,63,94,0.4)', 'rgba(244,63,94,0.2)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.connectorLine}
                  />
                  <View style={styles.heartCenter}>
                    <Heart size={18} color="#f43f5e" fill="#f43f5e" />
                  </View>
                </Animated.View>

                {/* Partner avatar */}
                <View style={styles.avatarWrapper}>
                  <LinearGradient
                    colors={['#8b5cf6', '#ec4899', '#f43f5e']}
                    style={styles.avatarRing}
                  />
                  <Image
                    source={{ uri: partnerProfile?.avatarUrl || 'https://picsum.photos/81' }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.avatarBadge}>
                    <Star size={8} color="#fbbf24" fill="#fbbf24" />
                  </View>
                </View>
              </View>

              {/* Names */}
              <Text style={styles.coupleNames} numberOfLines={1}>
                {myProfile?.username || 'You'}{' '}
                <Text style={styles.coupleAnd}>&</Text>{' '}
                {partnerProfile?.username || 'Partner'}
              </Text>

              {/* CP Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <LinearGradient colors={['rgba(244,63,94,0.25)', 'rgba(244,63,94,0.1)']} style={styles.statChipGrad}>
                    <Text style={styles.statValue}>{activeCp?.cpValue?.toLocaleString() || 0}</Text>
                    <Text style={styles.statLabel}>CP Score</Text>
                  </LinearGradient>
                </View>
                <View style={styles.statChip}>
                  <LinearGradient colors={['rgba(139,92,246,0.25)', 'rgba(139,92,246,0.1)']} style={styles.statChipGrad}>
                    <Text style={styles.statValue}>Lv.{activeCp?.level || 1}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                  </LinearGradient>
                </View>
                <View style={styles.statChip}>
                  <LinearGradient colors={['rgba(251,191,36,0.25)', 'rgba(251,191,36,0.1)']} style={styles.statChipGrad}>
                    <Text style={styles.statValue}>{cpDays}d</Text>
                    <Text style={styles.statLabel}>Together</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>
          ) : (
            /* No CP — show top 3 leaderboard */
            <View style={styles.noCpSection}>
              <Text style={styles.noCpEmoji}>💔</Text>
              <Text style={styles.noCpTitle}>No CP Yet</Text>
              <Text style={styles.noCpSubtitle}>Find your perfect match!</Text>

              {/* Top 3 preview */}
              {topCp && topCp.length > 0 && (
                <View style={styles.topCpPreview}>
                  <Text style={styles.topCpLabel}>🏆 Top Couples</Text>
                  {topCp.slice(0, 3).map((cp: any, idx: number) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                    return (
                      <View key={cp.id || idx} style={styles.topCpRow}>
                        <Text style={styles.topCpMedal}>{medal}</Text>
                        <Text style={styles.topCpNames} numberOfLines={1}>
                          {cp.user1Name || '?'} & {cp.user2Name || '?'}
                        </Text>
                        <Text style={styles.topCpValue}>💖 {cp.cpValue?.toLocaleString() || 0}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => { onClose(); onNavigate(); }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#f43f5e', '#ec4899', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Heart size={14} color="white" fill="white" />
              <Text style={styles.ctaText}>{hasCp ? 'Visit CP House' : 'Find a CP'}</Text>
              <Sparkles size={12} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom glow accent */}
          <LinearGradient
            colors={['transparent', 'rgba(244,63,94,0.12)', 'rgba(139,92,246,0.08)']}
            style={styles.bottomAccent}
            pointerEvents="none"
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const MODAL_WIDTH = width * 0.85;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: MODAL_WIDTH,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.35)',
    backgroundColor: '#0d0019',
    // Shadow
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },

  // --- Background elements ---
  glowOrb: {
    position: 'absolute',
    borderRadius: 100,
  },
  glowOrbTL: {
    width: 160,
    height: 160,
    top: -50,
    left: -50,
  },
  glowOrbBR: {
    width: 180,
    height: 180,
    bottom: -60,
    right: -60,
  },
  glowOrbCenter: {
    width: 220,
    height: 120,
    top: '35%',
    left: '50%',
    marginLeft: -110,
    marginTop: -60,
  },
  rotatingRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '50%',
    left: '50%',
    marginTop: -140,
    marginLeft: -140,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.12)',
    borderStyle: 'dashed',
  },
  rotatingRingInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '50%',
    left: '50%',
    marginTop: -100,
    marginLeft: -100,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.1)',
    borderStyle: 'dashed',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ skewX: '-20deg' }],
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Subtle dot grid via opacity and background pattern
    opacity: 0.06,
    backgroundColor: 'transparent',
    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
    backgroundSize: '18px 18px',
  },
  particle: {
    position: 'absolute',
    bottom: 16,
  },

  // --- Close ---
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 100,
  },
  closeBtnInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Header ---
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 24,
    paddingBottom: 8,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(244,63,94,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  // --- Divider ---
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(244,63,94,0.3)',
  },
  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f43f5e',
    marginHorizontal: 6,
  },

  // --- Has CP ---
  cpSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  coupleAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 0,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  avatarRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1e1b4b',
    borderWidth: 1.5,
    borderColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartConnector: {
    width: 60,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1.5,
    marginTop: -0.75,
  },
  heartCenter: {
    backgroundColor: 'rgba(13,0,25,0.8)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.4)',
  },
  coupleNames: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(244,63,94,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  coupleAnd: {
    color: '#f43f5e',
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  statChip: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statChipGrad: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  // --- No CP ---
  noCpSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  noCpEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  noCpTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  noCpSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
  },
  topCpPreview: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.15)',
    gap: 8,
  },
  topCpLabel: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  topCpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topCpMedal: {
    fontSize: 14,
  },
  topCpNames: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  topCpValue: {
    color: '#f43f5e',
    fontSize: 10,
    fontWeight: '800',
  },

  // --- CTA Button ---
  ctaButton: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    pointerEvents: 'none',
  },
});
