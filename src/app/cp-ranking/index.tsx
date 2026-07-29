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
  Castle,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit, where, doc, updateDoc, onSnapshot, arrayUnion } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { toCDN } from '@/lib/cdn';

const { width, height } = Dimensions.get('window');

const PARTICLE_COUNT = 8;
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
// PodiumCard removed since it is replaced by Ferris Wheel map

/* ─────────────────────────────────────────────────
   Row item for ranks 4+
───────────────────────────────────────────────── */
const RankRow = React.memo(function RankRow({ cp, rank, isMe, onPress }: { cp: any; rank: number; isMe?: boolean; onPress: () => void }) {
  const { profile: u1P } = useUserProfile(cp.participantIds?.[0]);
  const { profile: u2P } = useUserProfile(cp.participantIds?.[1]);
  const u1Name = u1P?.username || u1P?.name || cp.user1Name || 'User';
  const u2Name = u2P?.username || u2P?.name || cp.user2Name || 'User';
  const u1Avatar = u1P?.avatarUrl || cp.user1Avatar;
  const u2Avatar = u2P?.avatarUrl || cp.user2Avatar;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.rankRow, isMe && styles.rankRowMe]}>
      {/* Rank number */}
      <Text style={[styles.rankNum, isMe && { color: '#f43f5e' }]}>#{rank}</Text>

      {/* Double avatars */}
      <View style={styles.rankAvatarPair}>
        <Image
          source={{ uri: toCDN(u1Avatar) || 'https://picsum.photos/60' }}
          style={[styles.rankAvatar, { zIndex: 2, marginRight: -8 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <Image
          source={{ uri: toCDN(u2Avatar) || 'https://picsum.photos/61' }}
          style={[styles.rankAvatar, { zIndex: 1 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      {/* Names & level */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rankNames} numberOfLines={1}>
          {u1Name} & {u2Name}
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

const FerrisSeat = React.memo(function FerrisSeat({ cp }: { cp: any }) {
  const { profile: u1P } = useUserProfile(cp.participantIds?.[0]);
  const { profile: u2P } = useUserProfile(cp.participantIds?.[1]);
  return (
    <>
      <Image source={{ uri: toCDN(u1P?.avatarUrl || cp.user1Avatar) || 'https://picsum.photos/60' }} style={styles.seatAvatarLarge} contentFit="cover" cachePolicy="memory-disk" />
      <Image source={{ uri: toCDN(u2P?.avatarUrl || cp.user2Avatar) || 'https://picsum.photos/61' }} style={[styles.seatAvatarLarge, { marginLeft: -12 }]} contentFit="cover" cachePolicy="memory-disk" />
    </>
  );
});

const FerrisCenter = React.memo(function FerrisCenter({ cp }: { cp: any }) {
  const { profile: u1P } = useUserProfile(cp.participantIds?.[0]);
  const { profile: u2P } = useUserProfile(cp.participantIds?.[1]);
  return (
    <>
      <Image source={{ uri: toCDN(u1P?.avatarUrl || cp.user1Avatar) || 'https://picsum.photos/80' }} style={styles.centerAvatarLarge} contentFit="cover" cachePolicy="memory-disk" />
      <Heart size={14} color="#f43f5e" fill="#f43f5e" style={{ marginHorizontal: -4, zIndex: 10 }} />
      <Image source={{ uri: toCDN(u2P?.avatarUrl || cp.user2Avatar) || 'https://picsum.photos/81' }} style={styles.centerAvatarLarge} contentFit="cover" cachePolicy="memory-disk" />
    </>
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
  const [showInfo, setShowInfo] = useState(false);

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
    return query(collection(firestore, 'cpPairs'), orderBy('cpValue', 'desc'), limit(60));
  }, [firestore, isHydrated]);
  const { data: topCpRaw } = useCollection(topCpQuery);
  // Client-side filter: exclude Best Friend & Besties, keep CP and legacy (no type / lowercase)
  const topCp = useMemo(() => (topCpRaw || []).filter((cp: any) => cp.type !== 'Best Friend' && cp.type !== 'Besties').slice(0, 50), [topCpRaw]);

  // Fetch my CP
  const myCpQuery = useMemo(() => {
    if (!firestore || !isHydrated || !user?.uid) return null;
    return query(
      collection(firestore, 'cpPairs'),
      where('participantIds', 'array-contains', user.uid),
      limit(5)
    );
  }, [firestore, isHydrated, user?.uid]);
  const { data: myCpDataRaw } = useCollection(myCpQuery);
  // Client-side: pick first CP-type pair (exclude BF/Besties)
  const activeCp = useMemo(() => (myCpDataRaw || []).find((cp: any) => cp.type !== 'Best Friend' && cp.type !== 'Besties'), [myCpDataRaw]);

  // ── Animation refs ──────────────────────────────
  const glowPulse = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const heartBeat = useRef(new Animated.Value(1)).current;
  const headerSlide = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const meteor1 = useRef(new Animated.Value(0)).current;
  const meteor2 = useRef(new Animated.Value(0)).current;
  const meteor3 = useRef(new Animated.Value(0)).current;
  const particles = useRef(buildParticles()).current;

  useEffect(() => {
    // Shooting stars
    const animateMeteor = (anim: Animated.Value, delay: number) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    };
    const m1Loop = animateMeteor(meteor1, 0);
    const m2Loop = animateMeteor(meteor2, 1400);
    const m3Loop = animateMeteor(meteor3, 2800);

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

    // Rotate rings (8000ms speed for Ferris Wheel)
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true, easing: Easing.linear })
    );
    rotateLoop.start();

    // Particles (optimized to 8 items to prevent CPU/GPU lags)
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
      m1Loop.stop();
      m2Loop.stop();
      m3Loop.stop();
      particleLoops.forEach((l) => l.stop());
    };
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinInverse = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });

  const top7 = topCp?.slice(0, 7) || [];
  const rest = topCp?.slice(7) || [];

  // Find my rank
  const myRank = topCp?.findIndex((c: any) => c.participantIds?.includes(user?.uid)) ?? -1;

  // Fetch active leaderboard theme to get store event-based top 1/2/3 frames
  const [cpActiveTheme, setCpActiveTheme] = useState<any>(null);
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'leaderboardThemes'), where('isActive', '==', true), limit(1));
    const unsub = onSnapshot(q, (snap: any) => {
      if (snap.docs?.length > 0) setCpActiveTheme({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setCpActiveTheme(null);
    }, () => {});
    return () => unsub();
  }, [firestore]);

  // CP ranking frames are assigned by backend daily cron — no real-time assignment

  return (
    <View style={{ flex: 1, backgroundColor: '#080014' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── ANIMATED BACKGROUND ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Original Base gradient */}
        <LinearGradient
          colors={['#080014', '#120020', '#1e0038', '#120020', '#080014']}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Original Pink-purple mid overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(244,63,94,0.1)', 'rgba(168,85,247,0.12)', 'transparent']}
          start={{ x: 0.1, y: 0.2 }}
          end={{ x: 0.9, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Starry Galaxy background image (only behind the wheel) */}
        <Image
          source={require('../../../assets/images/haza_bg.png')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 450, opacity: 0.9 }}
          contentFit="fill"
        />
        {/* Overlay gradient to fade it to dark at the bottom of the image area */}
        <LinearGradient
          colors={['transparent', 'rgba(13,0,25,0.2)', '#120020']}
          locations={[0, 0.6, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 450 }}
        />

        {/* Glow orb – top centre (opacity lowered to prevent washing out the starry image) */}
        <Animated.View style={[styles.glowOrb, { top: -80, left: width / 2 - 110, transform: [{ scale: glowScale }], opacity: 0.15 }]}>
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

        {/* Shooting Stars (Meteors) in Top Part */}
        {[
          { anim: meteor1, top: 30, left: -20 },
          { anim: meteor2, top: 110, left: 60 },
          { anim: meteor3, top: 70, left: width * 0.35 },
        ].map((m, i) => {
          const translateX = m.anim.interpolate({ inputRange: [0, 1], outputRange: [-80, width * 0.7] });
          const translateY = m.anim.interpolate({ inputRange: [0, 1], outputRange: [-80, height * 0.35] });
          const opacity = m.anim.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
          return (
            <Animated.View
              key={i}
              style={[
                styles.meteorLine,
                {
                  top: m.top,
                  left: m.left,
                  opacity,
                  transform: [{ translateX }, { translateY }],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(236,72,153,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          );
        })}

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

      <SafeAreaView style={{ flex: 1, zIndex: 10, elevation: 5 }} edges={['top', 'left', 'right']}>
        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerSlide }], opacity: headerOpacity }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={16} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>TOP CP</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/cp-house')} style={styles.houseBtn}>
            <LinearGradient colors={['#f43f5e', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.houseBtnGrad}>
              <Text style={styles.houseBtnText}>My House</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowInfo(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(244,63,94,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={16} color="#f43f5e" />
          </TouchableOpacity>
        </Animated.View>

        {/* ── SCROLLABLE BODY ── */}
        <ScrollView
          style={{ overflow: 'visible' }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >


          {/* ── ROTATING FERRIS WHEEL MAP ── */}
          {top7.length > 0 && (
            <View style={styles.wheelMapContainer}>
              {/* Soft cosmic background glow */}
              <LinearGradient
                colors={['transparent', 'rgba(236,72,153,0.06)', 'rgba(244,63,94,0.08)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />

              {/* Physical Ferris Wheel stand behind the rim */}
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                style={styles.wheelSupportStand}
              />
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                style={styles.wheelSupportStandRight}
              />

              {/* 3D Metallic Stand Base (Platform) at the bottom */}
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.standBasePlatform}
              />

              {/* Rotating Outer Wheel */}
              <Animated.View style={[styles.wheelRim, { transform: [{ rotate: spin }] }]}>
                {/* Concentric inner circle for double ring effect */}
                <View style={styles.wheelRimInner} />

                {/* 12 Rotating Spokes with 2.8px thickness radiating from center (perfectly aligns with 6 seats) */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.wheelSpokeThick,
                      { transform: [{ rotate: `${i * 30}deg` }] },
                    ]}
                  >
                    {/* Solid Gold Spoke (top half of the parent height 240) */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 2.8,
                        height: 120,
                        backgroundColor: '#fbbf24',
                      }}
                    />
                  </View>
                ))}
                
                 {/* 6 Rotating outer seats (Ranks #2 to #7) */}
                 {top7.slice(1).map((cp: any, index: number) => {
                   const rank = index + 2;
                   const angle = (index * 60 * Math.PI) / 180;
                   const x = 115 * Math.cos(angle);
                   const y = 115 * Math.sin(angle);
 
                   return (
                     <Animated.View
                       key={cp.id || index}
                       style={[
                         styles.wheelSeat,
                         {
                           left: 140 + x - 33, // 140 is center of 280px wheel, minus half of seat width (33px)
                           top: 140 + y - 28,
                           transform: [{ rotate: spinInverse }],
                         },
                       ]}
                     >
                      <TouchableOpacity
                        onPress={() => setSelectedCp(cp)}
                        activeOpacity={0.85}
                        style={styles.seatClickTarget}
                      >
                        {/* Clean Circular CP Pair Container */}
                        <View style={styles.seatCircleSimple}>
                          <FerrisSeat cp={cp} />
                        </View>

                        <View style={styles.seatBadge}>
                          <Text style={styles.seatBadgeText}>TOP{rank}</Text>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </Animated.View>

              {/* Central Stationary Rank 1 Couple Card */}
              {top7[0] && (
                <TouchableOpacity 
                  onPress={() => setSelectedCp(top7[0])}
                  activeOpacity={0.9}
                  style={styles.wheelCenterCard}
                >
                  {/* Floating Crown on TOP1 */}
                  <View style={{ marginBottom: -6, zIndex: 12 }}>
                    <Crown size={22} color="#FFD700" fill="#FFD700" />
                  </View>

                  {/* Clean Circular Center Container */}
                  <View style={styles.centerCircleSimple}>
                    <FerrisCenter cp={top7[0]} />
                  </View>

                  <View style={styles.centerBadge}>
                    <Text style={styles.centerBadgeText}>TOP1</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Pink cloud puff layers at the bottom of the stand */}
              <View style={[styles.cloudPuff, { bottom: -10, left: -20, width: 140, height: 80, backgroundColor: 'rgba(236,72,153,0.32)' }]} />
              <View style={[styles.cloudPuff, { bottom: -15, right: -20, width: 140, height: 80, backgroundColor: 'rgba(236,72,153,0.32)' }]} />
              <View style={[styles.cloudPuff, { bottom: -20, width: 200, height: 85, backgroundColor: 'rgba(244,63,94,0.36)' }]} />
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

          {/* ── RANKS 8+ LIST ── */}
          <View style={styles.listContainer}>
            {rest.length > 0 ? (
              rest.map((cp: any, i: number) => {
                const rank = i + 8;
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

          {/* Bottom padding spacer to allow scroll past floating banner */}
          <View style={{ height: 130 }} />
        </ScrollView>

        {/* ── FLOATING BOTTOM OVERLAY ── */}
        {activeCp && user?.uid ? (
          <View style={styles.floatingBottomContainer}>
            <View style={styles.parallelYellowLine} />
            <MyCpBanner cp={activeCp} myUid={user.uid} onPress={() => setSelectedCp(activeCp)} />
            {myRank >= 0 && (
              <Text style={styles.myRankHint}>You are ranked #{myRank + 1} globally 🎉</Text>
            )}
          </View>
        ) : (
          <View style={styles.floatingBottomContainer}>
            <View style={styles.parallelYellowLine} />
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.inviteBannerGrad}
            >
              <Text style={styles.inviteBannerText}>You don't have a CP yet</Text>
              <TouchableOpacity onPress={() => router.push('/search')} style={styles.inviteButton}>
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
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

            {/* Top 10 Couple Rewards Card */}
            {(() => {
              const selectedCpRank = topCp?.findIndex((c: any) => c.id === selectedCp?.id) ?? -1;
              if (selectedCpRank >= 0 && selectedCpRank < 10) {
                return (
                  <View style={{ width: '100%', marginTop: 12, padding: 12, backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', alignItems: 'center' }}>
                    <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 }}>
                      🏆 Top {selectedCpRank + 1} Couple Reward
                    </Text>
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 14 }}>
                      {selectedCpRank < 3 ? 'Exclusive Frame + Coins' : 'Coins'}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, width: '90%', maxWidth: 400, padding: 24, position: 'relative' }}>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f1f5f9' }}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 16 }}>CP Ranking Info</Text>
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', color: '#e11d48', marginBottom: 4 }}>💖 CP Ranking</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>Ranking is determined by your <Text style={{ fontWeight: '700', color: '#e11d48' }}>CP Value</Text> — the total gifts exchanged between partners.</Text>
            </View>
            <View style={{ backgroundColor: '#fff1f2', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fda4af' }}>
              <Text style={{ fontWeight: '700', color: '#be123c', marginBottom: 6 }}>🎁 Ranking Rewards</Text>
              <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 18 }}>
                <Text style={{ fontWeight: '700' }}>Top 3:</Text> Exclusive Frames + Coins{'\n'}
                <Text style={{ fontWeight: '700' }}>Rank 4 - 7:</Text> Coins{'\n'}
                <Text style={{ fontWeight: '700' }}>Rank 8 - 10:</Text> Coins{'\n\n'}
                Weekly and Monthly rewards are 3x of Daily.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ marginTop: 20, paddingVertical: 12, backgroundColor: '#0f172a', borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingVertical: 4,
    paddingTop: 0,
    marginTop: -8,
    zIndex: 100,
    elevation: 10,
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 18,
  },
  houseBtnText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,
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

  wheelMapContainer: {
    height: 370,
    borderRadius: 24,
    marginTop: -55,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelRim: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3.5,
    borderColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 8,
  },
  wheelRimInner: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.6,
    borderColor: 'rgba(251,191,36,0.55)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  wheelSpokeThick: {
    position: 'absolute',
    width: 2.8,
    height: 240,
  },
  wheelSupportStand: {
    position: 'absolute',
    bottom: 20,
    left: width / 2 - 38,
    width: 12,
    height: 175,
    transform: [{ rotate: '16deg' }],
    opacity: 0.9,
  },
  wheelSupportStandRight: {
    position: 'absolute',
    bottom: 20,
    left: width / 2 + 26,
    width: 12,
    height: 175,
    transform: [{ rotate: '-16deg' }],
    opacity: 0.9,
  },
  standBasePlatform: {
    position: 'absolute',
    bottom: 12,
    left: width / 2 - 80,
    width: 160,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  wheelSeat: {
    position: 'absolute',
    width: 66,
    alignItems: 'center',
  },
  seatClickTarget: {
    alignItems: 'center',
  },
  seatCircleSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  seatAvatarLarge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  seatBadge: {
    backgroundColor: '#f43f5e',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 3,
    borderWidth: 0.8,
    borderColor: '#fbbf24',
  },
  seatBadgeText: {
    color: '#fff',
    fontSize: 7.5,
    fontWeight: '900',
  },
  wheelCenterCard: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  centerCircleSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  centerAvatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  centerBadge: {
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#0d0019',
  },
  centerBadgeText: {
    color: '#0d0019',
    fontSize: 8,
    fontWeight: 'bold',
  },
  cloudPuff: {
    position: 'absolute',
    height: 70,
    borderRadius: 45,
    opacity: 0.85,
  },
  meteorLine: {
    position: 'absolute',
    width: 90,
    height: 1.8,
    transform: [{ rotate: '35deg' }],
  },
  floatingBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(13,0,25,0.96)',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  parallelYellowLine: {
    height: 1.8,
    backgroundColor: '#fbbf24',
    borderRadius: 1,
    marginBottom: 6,
  },
  inviteBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  inviteBannerText: {
    color: '#0d0019',
    fontSize: 12,
    fontWeight: '900',
  },
  inviteButton: {
    backgroundColor: '#db2777', // hot pink/magenta button
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 12,
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
    marginTop: -10,
    marginBottom: 2,
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
    marginTop: -4,
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
    paddingTop: 4,
    paddingBottom: 16,
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

