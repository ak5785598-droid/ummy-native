import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Easing,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  Heart,
  ChevronLeft,
  Crown,
  Sparkles,
  Star,
  Trophy,
  Flame,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit, where } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { toCDN } from '@/lib/cdn';

const { width, height } = Dimensions.get('window');

const PARTICLE_COUNT = 22;
const HEART_EMOJIS = ['💖', '💕', '💗', '❤️', '💓', '💝', '🌹', '✨', '🫶', '💞'];

/* ─────────────────────────────────────────────────
   Floating particle setup (stable ref)
───────────────────────────────────────────────── */
function buildParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    anim: new Animated.Value(0),
    x: Math.random() * (width - 24) + 12,
    emoji: HEART_EMOJIS[i % HEART_EMOJIS.length],
    size: 10 + Math.random() * 16,
    delay: Math.random() * 4000,
    duration: 4000 + Math.random() * 3000,
  }));
}

/* ─────────────────────────────────────────────────
   Medal color helper
───────────────────────────────────────────────── */
function getMedalStyle(rank: number) {
  if (rank === 1) return { ring: ['#FFD700', '#FFA500', '#FFD700'] as const, label: '🥇', glow: 'rgba(255,215,0,0.4)' };
  if (rank === 2) return { ring: ['#C0C0C0', '#A8A8A8', '#C0C0C0'] as const, label: '🥈', glow: 'rgba(192,192,192,0.35)' };
  return { ring: ['#CD7F32', '#A0522D', '#CD7F32'] as const, label: '🥉', glow: 'rgba(205,127,50,0.3)' };
}

/* ─────────────────────────────────────────────────
   Podium avatar for top 3
───────────────────────────────────────────────── */
const PodiumCard = React.memo(function PodiumCard({ cp, rank, onPress }: { cp: any; rank: number; onPress: () => void }) {
  const medal = getMedalStyle(rank);
  const isCenter = rank === 1;
  const cardH = isCenter ? 140 : 115;
  const avatarSz = isCenter ? 54 : 42;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.podiumCol, isCenter && styles.podiumColCenter]}>
      {/* Glow halo */}
      <View style={[styles.podiumGlow, { shadowColor: medal.glow, width: avatarSz + 24, height: avatarSz + 24, borderRadius: (avatarSz + 24) / 2 }]} />

      {/* Crown for #1 */}
      {isCenter && (
        <View style={styles.podiumCrown}>
          <Crown size={18} color="#FFD700" fill="#FFD700" />
        </View>
      )}

      {/* Couple avatars */}
      <View style={[styles.podiumAvatarRow, { marginBottom: 6 }]}>
        <LinearGradient colors={medal.ring} style={[styles.podiumRingWrap, { width: avatarSz + 4, height: avatarSz + 4, borderRadius: (avatarSz + 4) / 2 }]}>
          <Image
            source={{ uri: toCDN(cp.user1Avatar) || 'https://picsum.photos/80' }}
            style={{ width: avatarSz, height: avatarSz, borderRadius: avatarSz / 2, borderWidth: 2, borderColor: '#0d0019' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </LinearGradient>
        <LinearGradient colors={medal.ring} style={[styles.podiumRingWrap, { width: avatarSz + 4, height: avatarSz + 4, borderRadius: (avatarSz + 4) / 2, marginLeft: -(avatarSz * 0.22) }]}>
          <Image
            source={{ uri: toCDN(cp.user2Avatar) || 'https://picsum.photos/81' }}
            style={{ width: avatarSz, height: avatarSz, borderRadius: avatarSz / 2, borderWidth: 2, borderColor: '#0d0019' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </LinearGradient>
      </View>

      {/* Medal badge */}
      <Text style={styles.podiumMedalEmoji}>{medal.label}</Text>

      {/* Names */}
      <Text style={[styles.podiumNames, isCenter && { fontSize: 11, color: '#fff' }]} numberOfLines={1}>
        {cp.user1Name || '?'} & {cp.user2Name || '?'}
      </Text>

      {/* Score */}
      <View style={styles.podiumScorePill}>
        <LinearGradient colors={['rgba(244,63,94,0.35)', 'rgba(139,92,246,0.25)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.podiumScoreGrad}>
          <Heart size={8} color="#f43f5e" fill="#f43f5e" />
          <Text style={styles.podiumScore}>{cp.cpValue?.toLocaleString() || 0}</Text>
        </LinearGradient>
      </View>

      {/* Podium base */}
      <LinearGradient
        colors={medal.ring}
        style={[styles.podiumBase, { height: isCenter ? 36 : 24 }]}
      >
        <Text style={styles.podiumRankText}>#{rank}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
});

/* ─────────────────────────────────────────────────
   Row item for ranks 4+
───────────────────────────────────────────────── */
const RankRow = React.memo(function RankRow({ cp, rank, isMe, onPress }: { cp: any; rank: number; isMe?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.rankRow, isMe && styles.rankRowMe]}>
      {/* Rank number */}
      <Text style={[styles.rankNum, isMe && { color: '#f43f5e' }]}>#{rank}</Text>

      {/* Double avatars */}
      <View style={styles.rankAvatarPair}>
        <Image
          source={{ uri: toCDN(cp.user1Avatar) || 'https://picsum.photos/60' }}
          style={[styles.rankAvatar, { zIndex: 2, marginRight: -8 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <Image
          source={{ uri: toCDN(cp.user2Avatar) || 'https://picsum.photos/61' }}
          style={[styles.rankAvatar, { zIndex: 1 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      {/* Names & level */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rankNames} numberOfLines={1}>
          {cp.user1Name || 'User'} & {cp.user2Name || 'User'}
        </Text>
        <Text style={styles.rankLevel}>Lv.{cp.level || 1} CP</Text>
      </View>

      {/* CP score */}
      <View style={styles.rankScore}>
        <Heart size={9} color="#f43f5e" fill="#f43f5e" />
        <Text style={styles.rankScoreText}>{cp.cpValue?.toLocaleString() || 0}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ─────────────────────────────────────────────────
   My CP card at top
───────────────────────────────────────────────── */
const MyCpBanner = React.memo(function MyCpBanner({ cp, myUid, onPress }: { cp: any; myUid: string; onPress: () => void }) {
  const partnerUid = cp.participantIds?.find((id: string) => id !== myUid);
  const { profile: myP } = useUserProfile(myUid);
  const { profile: partnerP } = useUserProfile(partnerUid);
  const days = cp.createdAt
    ? Math.floor((Date.now() - (cp.createdAt?.toMillis?.() || Date.now())) / 86400000)
    : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.myCpBanner}>
      <LinearGradient
        colors={['rgba(244,63,94,0.18)', 'rgba(139,92,246,0.14)', 'rgba(244,63,94,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.myCpAvatarRow}>
        <Image source={{ uri: toCDN(myP?.avatarUrl) || 'https://picsum.photos/80' }} style={styles.myCpAvatar} contentFit="cover" cachePolicy="memory-disk" />
        <Animated.View>
          <Heart size={18} color="#f43f5e" fill="#f43f5e" />
        </Animated.View>
        <Image source={{ uri: toCDN(partnerP?.avatarUrl) || 'https://picsum.photos/81' }} style={styles.myCpAvatar} contentFit="cover" cachePolicy="memory-disk" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.myCpNames} numberOfLines={1}>
          {myP?.username || 'You'} & {partnerP?.username || 'Partner'}
        </Text>
        <View style={styles.myCpStats}>
          <Text style={styles.myCpStat}>💖 {cp.cpValue?.toLocaleString() || 0}</Text>
          <Text style={styles.myCpDot}>·</Text>
          <Text style={styles.myCpStat}>Lv.{cp.level || 1}</Text>
          <Text style={styles.myCpDot}>·</Text>
          <Text style={styles.myCpStat}>{days}d together</Text>
        </View>
      </View>
      <View style={styles.myCpBadge}>
        <Text style={styles.myCpBadgeText}>MY CP</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ─────────────────────────────────────────────────
   Main Screen
───────────────────────────────────────────────── */
export default function CpRankingScreen() {
  const router = useRouter();
  const { firestore, isHydrated } = useFirebase();
  const { user } = useUser();
  const [selectedCp, setSelectedCp] = useState<any>(null);

  const handleUserPress = (userId?: string) => {
    if (!userId) return;
    setSelectedCp(null);
    if (userId === user?.uid) {
      router.replace('/profile');
    } else {
      router.push(`/profile/${userId}`);
    }
  };

  // Fetch top 50 CP pairs
  const topCpQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'cpPairs'), orderBy('cpValue', 'desc'), limit(50));
  }, [firestore, isHydrated]);
  const { data: topCp } = useCollection(topCpQuery);

  // Fetch my CP
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

  // ── Animation refs ──────────────────────────────
  const glowPulse = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const heartBeat = useRef(new Animated.Value(1)).current;
  const headerSlide = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const particles = useRef(buildParticles()).current;

  useEffect(() => {
    // Header entrance
    Animated.parallel([
      Animated.spring(headerSlide, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Glow pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    glowLoop.start();

    // Rotate rings
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 12000, useNativeDriver: true, easing: Easing.linear })
    );
    rotateLoop.start();

    // Shimmer
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.delay(600),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    shimmerLoop.start();

    // Heartbeat
    const heartLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeat, { toValue: 1.3, duration: 350, useNativeDriver: true }),
        Animated.timing(heartBeat, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );
    heartLoop.start();

    // Particles
    const particleLoops = particles.map((p) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });

    return () => {
      glowLoop.stop();
      rotateLoop.stop();
      shimmerLoop.stop();
      heartLoop.stop();
      particleLoops.forEach((l) => l.stop());
    };
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, width + 100] });

  const top3 = topCp?.slice(0, 3) || [];
  const rest = topCp?.slice(3) || [];

  // Find my rank
  const myRank = topCp?.findIndex((c: any) => c.participantIds?.includes(user?.uid)) ?? -1;

  return (
    <View style={{ flex: 1, backgroundColor: '#080014' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── ANIMATED BACKGROUND ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Base gradient */}
        <LinearGradient
          colors={['#080014', '#120020', '#1e0038', '#120020', '#080014']}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Pink-purple mid overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(244,63,94,0.1)', 'rgba(168,85,247,0.12)', 'transparent']}
          start={{ x: 0.1, y: 0.2 }}
          end={{ x: 0.9, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Glow orb – top centre */}
        <Animated.View style={[styles.glowOrb, { top: -80, left: width / 2 - 110, transform: [{ scale: glowScale }] }]}>
          <LinearGradient colors={['rgba(244,63,94,0.55)', 'transparent']} style={{ flex: 1, borderRadius: 110 }} />
        </Animated.View>

        {/* Glow orb – bottom right */}
        <Animated.View style={[styles.glowOrb, { bottom: -100, right: -80, width: 240, height: 240, transform: [{ scale: glowScale }] }]}>
          <LinearGradient colors={['rgba(139,92,246,0.55)', 'transparent']} style={{ flex: 1, borderRadius: 120 }} />
        </Animated.View>

        {/* Glow orb – left */}
        <Animated.View style={[styles.glowOrb, { top: height * 0.35, left: -60, width: 160, height: 160, transform: [{ scale: glowScale }] }]}>
          <LinearGradient colors={['rgba(236,72,153,0.4)', 'transparent']} style={{ flex: 1, borderRadius: 80 }} />
        </Animated.View>

        {/* Rotating rings */}
        <Animated.View style={[styles.bigRing, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.midRing, { transform: [{ rotate: spinReverse }] }]} />
        <Animated.View style={[styles.smallRing, { transform: [{ rotate: spin }] }]} />

        {/* Shimmer sweep */}
        <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />

        {/* Floating particles */}
        {particles.map((p, i) => {
          const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(height * 0.65)] });
          const op = p.anim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 0.5, 0] });
          return (
            <Animated.Text
              key={i}
              style={[styles.particle, { left: p.x, fontSize: p.size, opacity: op, transform: [{ translateY: ty }] }]}
            >
              {p.emoji}
            </Animated.Text>
          );
        })}
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerSlide }], opacity: headerOpacity }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Animated.View style={{ transform: [{ scale: heartBeat }] }}>
              <Heart size={16} color="#f43f5e" fill="#f43f5e" />
            </Animated.View>
            <Text style={styles.headerTitle}>CP Ranking</Text>
            <Sparkles size={14} color="#fbbf24" />
          </View>

          <TouchableOpacity onPress={() => router.push('/cp-house')} style={styles.houseBtn}>
            <LinearGradient colors={['#f43f5e', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.houseBtnGrad}>
              <Text style={styles.houseBtnText}>My House</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── SCROLLABLE BODY ── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* My CP Banner */}
          {activeCp && user?.uid && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionLabel}>
                <Flame size={12} color="#f43f5e" /> {'  '}Your CP
              </Text>
              <MyCpBanner cp={activeCp} myUid={user.uid} onPress={() => setSelectedCp(activeCp)} />
              {myRank >= 0 && (
                <Text style={styles.myRankHint}>You are ranked #{myRank + 1} globally 🎉</Text>
              )}
            </View>
          )}

          {/* ── TOP 3 PODIUM ── */}
          {top3.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={styles.sectionLabel}>
                <Trophy size={12} color="#fbbf24" /> {'  '}Hall of Love
              </Text>

              {/* Decorative podium stage */}
              <View style={styles.podiumStage}>
                {/* Stage glow */}
                <LinearGradient
                  colors={['transparent', 'rgba(244,63,94,0.08)', 'rgba(139,92,246,0.06)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.podiumRow}>
                  {/* 2nd place (left) */}
                  {top3[1] && <PodiumCard cp={top3[1]} rank={2} onPress={() => setSelectedCp(top3[1])} />}
                  {/* 1st place (center, raised) */}
                  {top3[0] && <PodiumCard cp={top3[0]} rank={1} onPress={() => setSelectedCp(top3[0])} />}
                  {/* 3rd place (right) */}
                  {top3[2] && <PodiumCard cp={top3[2]} rank={3} onPress={() => setSelectedCp(top3[2])} />}
                </View>

                {/* Podium platform bar */}
                <LinearGradient
                  colors={['rgba(244,63,94,0.25)', 'rgba(139,92,246,0.25)', 'rgba(244,63,94,0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.podiumPlatform}
                />
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerChip}>
              <Star size={10} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.dividerText}>Top Couples</Text>
              <Star size={10} color="#fbbf24" fill="#fbbf24" />
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* ── RANKS 4+ LIST ── */}
          <View style={styles.listContainer}>
            {rest.length > 0 ? (
              rest.map((cp: any, i: number) => {
                const rank = i + 4;
                const isMe = cp.participantIds?.includes(user?.uid);
                return <RankRow key={cp.id || i} cp={cp} rank={rank} isMe={isMe} onPress={() => setSelectedCp(cp)} />;
              })
            ) : (
              topCp === undefined ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💞</Text>
                  <Text style={styles.emptyText}>Loading rankings...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💔</Text>
                  <Text style={styles.emptyText}>No more couples yet</Text>
                  <Text style={styles.emptySubText}>Be among the first to find your CP!</Text>
                </View>
              )
            )}
          </View>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── CP PREVIEW MODAL ── */}
      <Modal
        visible={selectedCp !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCp(null)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(8,0,20,0.85)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setSelectedCp(null)}
        >
          <Pressable 
            style={{
              width: width * 0.85,
              backgroundColor: '#160b24',
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: 'rgba(244,63,94,0.3)',
              padding: 24,
              alignItems: 'center',
              shadowColor: '#f43f5e',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 15,
            }}
            onPress={(e: any) => e.stopPropagation()}
          >
            {/* Close Button */}
            <TouchableOpacity 
              onPress={() => setSelectedCp(null)}
              style={{ position: 'absolute', top: 12, right: 12, padding: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}
            >
              <X size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              <Sparkles size={14} color="#fbbf24" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>CP Profile</Text>
              <Sparkles size={14} color="#fbbf24" />
            </View>

            {/* Layout: Left DP | Middle Score | Right DP */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              {/* User 1 Column */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => handleUserPress(selectedCp?.participantIds?.[0])}
                  activeOpacity={0.8}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    borderWidth: 2,
                    borderColor: '#f43f5e',
                    padding: 2,
                    backgroundColor: 'rgba(244,63,94,0.1)',
                    marginBottom: 8,
                    shadowColor: '#f43f5e',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                  }}
                >
                  <Image
                    source={{ uri: toCDN(selectedCp?.user1Avatar) || 'https://picsum.photos/100' }}
                    style={{ width: '100%', height: '100%', borderRadius: 32 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center', width: '90%' }} numberOfLines={1}>
                  {selectedCp?.user1Name || 'User'}
                </Text>
              </View>

              {/* Center score pillar */}
              <View style={{ alignItems: 'center', paddingHorizontal: 10, minWidth: 80 }}>
                <LinearGradient
                  colors={['rgba(244,63,94,0.45)', 'rgba(139,92,246,0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Heart size={14} color="#f43f5e" fill="#f43f5e" style={{ marginBottom: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>
                    {selectedCp?.cpValue?.toLocaleString() || 0}
                  </Text>
                </LinearGradient>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginTop: 6 }}>CP Points</Text>
              </View>

              {/* User 2 Column */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => handleUserPress(selectedCp?.participantIds?.[1])}
                  activeOpacity={0.8}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    borderWidth: 2,
                    borderColor: '#8b5cf6',
                    padding: 2,
                    backgroundColor: 'rgba(139,92,246,0.1)',
                    marginBottom: 8,
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                  }}
                >
                  <Image
                    source={{ uri: toCDN(selectedCp?.user2Avatar) || 'https://picsum.photos/101' }}
                    style={{ width: '100%', height: '100%', borderRadius: 32 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center', width: '90%' }} numberOfLines={1}>
                  {selectedCp?.user2Name || 'User'}
                </Text>
              </View>
            </View>

            {/* Sub-details */}
            <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' }}>
                CP Relationship Level: <Text style={{ color: '#f43f5e' }}>Lv.{selectedCp?.level || 1}</Text>
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // BG
  glowOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  bigRing: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: (width * 1.1) / 2,
    top: '30%',
    left: -(width * 0.05),
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.07)',
    borderStyle: 'dashed',
  },
  midRing: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    top: '20%',
    left: width * 0.15,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.09)',
    borderStyle: 'dashed',
  },
  smallRing: {
    position: 'absolute',
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: (width * 0.45) / 2,
    top: '55%',
    left: width * 0.275,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.08)',
    borderStyle: 'dashed',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ skewX: '-18deg' }],
  },
  particle: {
    position: 'absolute',
    bottom: 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(244,63,94,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  houseBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  houseBtnGrad: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  houseBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Section label
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  // My CP Banner
  myCpBanner: {
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  myCpAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myCpAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(244,63,94,0.5)',
  },
  myCpNames: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  myCpStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myCpStat: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700',
  },
  myCpDot: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
  },
  myCpBadge: {
    backgroundColor: 'rgba(244,63,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  myCpBadgeText: {
    color: '#f43f5e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  myRankHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  // Podium
  podiumStage: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.15)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  podiumCol: {
    alignItems: 'center',
    width: (width - 64) / 3,
    paddingBottom: 0,
  },
  podiumColCenter: {
    marginBottom: 18,
  },
  podiumGlow: {
    position: 'absolute',
    top: 0,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  podiumCrown: {
    marginBottom: 4,
  },
  podiumAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  podiumMedalEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  podiumNames: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  podiumScorePill: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  podiumScoreGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 3,
  },
  podiumScore: {
    color: '#f43f5e',
    fontSize: 9,
    fontWeight: '900',
  },
  podiumBase: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  podiumRankText: {
    color: 'rgba(0,0,0,0.65)',
    fontSize: 11,
    fontWeight: '900',
  },
  podiumPlatform: {
    height: 3,
    marginTop: 0,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(244,63,94,0.2)',
  },
  dividerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dividerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Rank rows
  listContainer: {
    gap: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rankRowMe: {
    borderColor: 'rgba(244,63,94,0.35)',
    backgroundColor: 'rgba(244,63,94,0.07)',
  },
  rankNum: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '900',
    width: 30,
  },
  rankAvatarPair: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 48,
  },
  rankAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(244,63,94,0.4)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  rankNames: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  rankLevel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rankScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
  },
  rankScoreText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '900',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
  },
});
