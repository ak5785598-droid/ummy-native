import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Clipboard, Platform, Animated, TextInput, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, MessageCircle, MoreHorizontal, Calendar, Star, Sparkles, MapPin, Copy, CheckCircle, Search, X, UserPlus, Unlink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, G, Circle, Polygon, ClipPath, Ellipse, RadialGradient } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { useUser, useFirestore } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, getDoc, limit, deleteDoc, updateDoc, addDoc, orderBy, onSnapshot, increment } from '@/firebase/firestore-compat';
import { AvatarFrame } from './AvatarFrame';
import { toCDN } from '../../lib/cdn';
import {
  SVGA_OfficialTag,
  SVGA_SellerTag,
  SVGA_ServiceTag,
  SVGA_HostTag,
  SVGA_CSLeaderTag,
  SVGA_CustomerServiceTag,
  SVGA_GlossyID,
  SVGA_CpHeart,
} from './NativeSVGs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUDGET_COLORS: Record<string, string[]> = {
  gold:    ['#fbbf24', '#f59e0b', '#b45309'],
  diamond: ['#22d3ee', '#0891b2', '#155e75'],
  silver:  ['#94a3b8', '#475569', '#1e293b'],
  purple:  ['#a855f7', '#7e22ce', '#581c87'],
  emerald: ['#10b981', '#059669', '#064e3b'],
  rose:    ['#f43f5e', '#e11d48', '#881337'],
  rainbow: ['#ff0066', '#a855f7', '#3b82f6'],
  none:    ['#94a3b8', '#64748b', '#475569'],
};

const BUDGET_ICONS: Record<string, string> = {
  gold: String.fromCodePoint(0x1F451), diamond: String.fromCodePoint(0x1F48E), silver: String.fromCodePoint(0x1F6E1, 0xFE0F), purple: String.fromCodePoint(0x2728), emerald: String.fromCodePoint(0x1F48E), rose: String.fromCodePoint(0x1F451), rainbow: String.fromCodePoint(0x2728), none: String.fromCodePoint(0x1FA9E)
};

const COUNTRY_FLAGS: Record<string, string> = {
  'india': String.fromCodePoint(0x1F1EE, 0x1F1F3), 'pakistan': String.fromCodePoint(0x1F1F5, 0x1F1F0), 'bangladesh': String.fromCodePoint(0x1F1E7, 0x1F1E9), 'nepal': String.fromCodePoint(0x1F1F3, 0x1F1F5), 'sri lanka': String.fromCodePoint(0x1F1F1, 0x1F1F0),
  'united states': String.fromCodePoint(0x1F1FA, 0x1F1F8), 'united kingdom': String.fromCodePoint(0x1F1EC, 0x1F1E7), 'canada': String.fromCodePoint(0x1F1E8, 0x1F1E6), 'australia': String.fromCodePoint(0x1F1E6, 0x1F1FA),
  'germany': String.fromCodePoint(0x1F1E9, 0x1F1EA), 'france': String.fromCodePoint(0x1F1EB, 0x1F1F7), 'japan': String.fromCodePoint(0x1F1EF, 0x1F1F5), 'korea': String.fromCodePoint(0x1F1F0, 0x1F1F7), 'china': String.fromCodePoint(0x1F1E8, 0x1F1F3),
  'brazil': String.fromCodePoint(0x1F1E7, 0x1F1F7), 'russia': String.fromCodePoint(0x1F1F7, 0x1F1FA), 'turkey': String.fromCodePoint(0x1F1F9, 0x1F1F7), 'dubai': String.fromCodePoint(0x1F1E6, 0x1F1EA), 'uae': String.fromCodePoint(0x1F1E6, 0x1F1EA),
  'saudi arabia': String.fromCodePoint(0x1F1F8, 0x1F1E6), 'egypt': String.fromCodePoint(0x1F1EA, 0x1F1EC), 'nigeria': String.fromCodePoint(0x1F1F3, 0x1F1EC), 'south africa': String.fromCodePoint(0x1F1FF, 0x1F1E6),
  'indonesia': String.fromCodePoint(0x1F1EE, 0x1F1E9), 'philippines': String.fromCodePoint(0x1F1F5, 0x1F1ED), 'thailand': String.fromCodePoint(0x1F1F9, 0x1F1ED), 'vietnam': String.fromCodePoint(0x1F1FB, 0x1F1F3),
  'mexico': String.fromCodePoint(0x1F1F2, 0x1F1FD), 'italy': String.fromCodePoint(0x1F1EE, 0x1F1F9), 'spain': String.fromCodePoint(0x1F1EA, 0x1F1F8), 'portugal': String.fromCodePoint(0x1F1F5, 0x1F1F9),
  'malaysia': String.fromCodePoint(0x1F1F2, 0x1F1FE), 'singapore': String.fromCodePoint(0x1F1F8, 0x1F1EC), 'kenya': String.fromCodePoint(0x1F1F0, 0x1F1EA), 'ghana': String.fromCodePoint(0x1F1EC, 0x1F1ED),
};

const getCountryFlag = (country?: string | null) => {
  if (!country) return String.fromCodePoint(0x1F30D);
  return COUNTRY_FLAGS[country.toLowerCase()] || String.fromCodePoint(0x1F30D);
};



const calculateAge = (birthday: string) => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

import { UserLevelBadge } from '@/components/user-level-badge';

const LevelBadge = ({ level, type }: { level: number; type: 'rich' | 'charm' }) => {
  if (type === 'rich') {
    return <UserLevelBadge level={level} scale={1.1} />;
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 10, gap: 3,
      backgroundColor: '#EC4899',
    }}>
      <Sparkles size={8} color="#FFF" fill="#FFF" />
      <Text style={{ fontSize: 8, fontWeight: '800', color: '#FFF' }}>{level}</Text>
    </View>
  );
};

const GenderAgeTag = ({ gender, birthday }: any) => {
  const age = calculateAge(birthday || '');
  const isFemale = gender === 'Female';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 10, backgroundColor: isFemale ? '#EC4899' : '#3B82F6',
    }}>
      <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 'bold' }}>{isFemale ? '\u2640' : '\u2642'}</Text>
      {age !== null && <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 'bold', marginLeft: 2 }}>{age}</Text>}
    </View>
  );
};

const getSVIPColor = (level: number): string => {
  if (level >= 1 && level <= 6) return '#0ea5e9';
  if (level >= 7 && level <= 10) return '#9333ea';
  if (level >= 11 && level <= 15) return '#dc2626';
  return '#7c3aed';
};

const SVIPBadge = ({ level }: { level: number }) => {
  const firestore = useFirestore();
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [pillColor, setPillColor] = useState<string>(getSVIPColor(level));

  useEffect(() => {
    if (!level || level < 1 || !firestore) return;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, 'settings', 'svipConfig'));
        if (snap.exists()) {
          const data = snap.data();
          const url = data?.levels?.[String(level)]?.badgeUrl;
          const color = data?.levels?.[String(level)]?.color;
          if (url) setBadgeUrl(url);
          if (color) setPillColor(color);
        }
      } catch (e) {}
    })();
  }, [level, firestore]);

  if (!level || level < 1) return null;

  if (badgeUrl) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: pillColor + 'D9', borderRadius: 10, paddingHorizontal: 3, paddingVertical: 1.5, gap: 2 }}>
        <Image cachePolicy="memory-disk" source={{ uri: toCDN(badgeUrl) }} style={{ width: 16, height: 16 }} contentFit="contain" />
        <Text style={{ fontSize: 7, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2, paddingRight: 3 }}>SVIP{level}</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 2, backgroundColor: pillColor }}>
      <Text style={{ fontSize: 8, color: '#FFF', fontWeight: '800' }}>SVIP {level}</Text>
    </View>
  );
};

function CoverCarousel({ images }: { images: string[] }) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    autoScrollRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % images.length;
        flatListRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 3000);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [images.length]);

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(item) || 'https://picsum.photos/200' }} style={{ width: SCREEN_WIDTH, height: '100%' }} contentFit="cover" />
        )}
      />
      {images.length > 1 && (
        <View style={{ position: 'absolute', bottom: 12, flexDirection: 'row', gap: 5, alignSelf: 'center' }}>
          {images.map((_: any, i: number) => (
            <View key={i} style={{ width: i === activeIndex ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </View>
      )}
    </>
  );
}

export function FullProfileDialog({
  open,
  onOpenChange,
  profile,
  stats,
  isOwnProfile,
  displayId,
  onChat,
  onFollow,
  onMention,
  onGift,
  onChangeFrame,
  onRemoveFrame,
  isProcessingFollow,
  followData,
  onReport,
}: any) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: ownProfile } = useUserProfile(user?.uid);

  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'gift' | 'medal' | 'vehicle' | 'frame'>('gift');
  const [showCpSearch, setShowCpSearch] = useState(false);
  const [cpSearchQuery, setCpSearchQuery] = useState('');
  const [cpSearchResults, setCpSearchResults] = useState<any[]>([]);
  const [cpSearching, setCpSearching] = useState(false);
  const [cpSelectedUser, setCpSelectedUser] = useState<any>(null);
  const [cpSent, setCpSent] = useState(false);
  const [showCpInfo, setShowCpInfo] = useState(false);
  const [searchType, setSearchType] = useState<'CP' | 'Best Friend' | 'Besties'>('CP');

  // Medals list from Firestore
  const [allMedals, setAllMedals] = useState<any[]>([]);

  // Supporter profile dialog state
  const [supporterProfileUid, setSupporterProfileUid] = useState<string | null>(null);
  const { profile: supporterProfile } = useUserProfile(supporterProfileUid || undefined);

  const heartScale = React.useRef(new Animated.Value(1)).current;

  const hasOfficialTag = profile?.tags?.some((t: string) => t.includes('Official') || t.includes('official'));

  // Fetch medals from Firestore
  useEffect(() => {
    if (!open) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('medalsList').onSnapshot((snap: any) => {
        if (snap) {
          setAllMedals(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        }
      }, (error: any) => {});
      return () => unsub();
    } catch (e) {}
  }, [open]);

  const handleCopyId = useCallback(() => {
    if (displayId) { Clipboard.setString(displayId); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
  }, [displayId]);

  const hasRelationship = profile?.relationship && (profile.relationship.type === 'CP') || profile?.bestFriend || profile?.besties;

  const handleHeartPressIn = useCallback(() => {
    Animated.spring(heartScale, { toValue: 1.25, useNativeDriver: true, tension: 150, friction: 4 }).start();
  }, [heartScale]);

  const handleHeartPressOut = useCallback(() => {
    Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 4 }).start();
  }, [heartScale]);

  const handleCpSearch = useCallback(async (text: string) => {
    setCpSearchQuery(text);
    if (text.length < 2) { setCpSearchResults([]); return; }
    setCpSearching(true);
    try {
      const results: any[] = [];
      const seen = new Set<string>();

      // 1. Search by username in root users collection
      try {
        const q = query(collection(firestore, 'users'), where('username', '>=', text), where('username', '<=', text + '\uf8ff'), limit(10));
        const snap = await getDocs(q);
        snap.forEach((d: any) => { if (d.id !== user?.uid && !seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); } });
      } catch (e) {}

      // 2. Search by accountNumber
      if (results.length < 10) {
        try {
          const q2 = query(collection(firestore, 'users'), where('accountNumber', '>=', text), where('accountNumber', '<=', text + '\uf8ff'), limit(10));
          const snap2 = await getDocs(q2);
          snap2.forEach((d: any) => { if (d.id !== user?.uid && !seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); } });
        } catch (e) {}
      }

      // 3. Search by name field in root users
      if (results.length < 10) {
        try {
          const q3 = query(collection(firestore, 'users'), where('name', '>=', text), where('name', '<=', text + '\uf8ff'), limit(10));
          const snap3 = await getDocs(q3);
          snap3.forEach((d: any) => { if (d.id !== user?.uid && !seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); } });
        } catch (e) {}
      }

      setCpSearchResults(results);
    } catch (e) {}
    setCpSearching(false);
  }, [firestore, user?.uid]);

  const handleSendCpProposal = useCallback(async (type: 'CP' | 'Best Friend' | 'Besties') => {
    if (!firestore || !user || !cpSelectedUser) return;
    try {
      const proposalId = `${user.uid}_${cpSelectedUser.id}_${Date.now()}`;
      await setDoc(doc(firestore, 'proposals', proposalId), {
        fromUid: user.uid,
        fromUsername: ownProfile?.username || user.displayName || 'User',
        fromAvatarUrl: ownProfile?.avatarUrl || user.photoURL || null,
        toUid: cpSelectedUser.id,
        toUsername: cpSelectedUser.username,
        toAvatarUrl: cpSelectedUser.avatarUrl || null,
        type,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setCpSent(true);
      Alert.alert('Sent!', `Proposal sent to ${cpSelectedUser.username}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send proposal');
    }
  }, [firestore, user, cpSelectedUser, ownProfile]);

  const [dailySupported, setDailySupported] = useState(false);
  const [supporting, setSupporting] = useState(false);

  const handleDailySupport = useCallback(async () => {
    if (!firestore || !user || !profile?.id || dailySupported || supporting) return;
    // ... daily support logic
  }, [firestore, user, profile?.id, dailySupported, supporting]);


  const isSeller = profile?.tags?.some((t: string) => t.toLowerCase().includes('seller'));
  const [isBreakingCp, setIsBreakingCp] = useState(false);

  const handleBreakCp = useCallback(async () => {
    if (!firestore || !user || !profile?.relationship) return;
    Alert.alert('Break CP?', 'Are you sure you want to break this relationship?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Break', style: 'destructive', onPress: async () => {
        setIsBreakingCp(true);
        try {
          const rel = profile.relationship;
          const otherUid = rel.partnerUid;
          if (otherUid) {
            await updateDoc(doc(firestore, 'users', otherUid, 'profile', otherUid), { relationship: null, updatedAt: serverTimestamp() });
          }
          await updateDoc(doc(firestore, 'users', user.uid, 'profile', user.uid), { relationship: null, updatedAt: serverTimestamp() });
          Alert.alert('Done', 'Relationship ended.');
          onOpenChange(false);
        } catch (e) { Alert.alert('Error', 'Failed to break relationship.'); }
        setIsBreakingCp(false);
      }}
    ]);
  }, [firestore, user, profile?.relationship, onOpenChange]);

  if (!profile) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={[]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 128 }} showsVerticalScrollIndicator={false} bounces={false}>

            {/* Cover Image — auto-scrolling carousel */}
            <View style={{ height: SCREEN_HEIGHT * 0.35, width: '100%', position: 'relative' }}>
              <CoverCarousel images={profile.spaceImages?.length > 0 ? profile.spaceImages : [profile.avatarUrl || 'https://picsum.photos/200']} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }}
              />
              {/* Back button */}
              <TouchableOpacity onPress={() => onOpenChange(false)} style={{ position: 'absolute', top: 40, left: 16, zIndex: 100, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* White Card â€” shifted up to overlap cover */}
            <View style={{ marginTop: -32, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingTop: 10, paddingBottom: 20 }}>

            {/* Avatar â€” straddles cover and card */}
            <View style={{ alignItems: 'center', marginTop: -40, marginBottom: 10, zIndex: 30 }}>
              <View>
                <AvatarFrame frameMediaUrl={profile.inventory?.activeFrameMediaUrl} size={88}>
                  <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile.avatarUrl) || 'https://picsum.photos/200' }} style={{ width: '100%', height: '100%' }} />
                </AvatarFrame>
              </View>
            </View>

            {/* Username + Flag + Gender */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>{profile.username}</Text>
              <Text style={{ fontSize: 18 }}>{getCountryFlag(profile.country)}</Text>
              <GenderAgeTag gender={profile.gender} birthday={profile.birthday} />
            </View>

            {/* Level Badges + ID Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8, overflow: 'visible' }}>
              <TouchableOpacity onPress={handleCopyId} activeOpacity={0.7}>
                {hasOfficialTag ? (
                  <SVGA_GlossyID label={`ID: ${displayId}`} />
                ) : (profile.isAdmin || (profile.isBudgetId && profile.idColor && profile.idColor !== 'none')) ? (
                  <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                    <LinearGradient
                      colors={
                        (profile.isAdmin ? BUDGET_COLORS.gold
                        : (BUDGET_COLORS[profile.idColor] || BUDGET_COLORS.purple)) as any
                      }
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: profile.isAdmin ? '#fbbf2450' : '#94a3b850' }}
                    >
                      <Text style={{ fontSize: 10 }}>
                        {profile.isAdmin ? BUDGET_ICONS.gold
                         : (BUDGET_ICONS[profile.idColor] || BUDGET_ICONS.purple)}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: -0.2, textTransform: 'uppercase' }}>ID: {displayId}</Text>
                      {copiedId ? <CheckCircle size={10} color="#22C55E" /> : <Copy size={10} color="rgba(255,255,255,0.6)" />}
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4.5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                      ID: {(() => {
                        const isValid = (id: any) => {
                          if (!id) return false;
                          const s = String(id).trim();
                          return /^\d{6}$/.test(s) || s === '0000';
                        };
                        if (isValid(displayId)) return displayId;
                        if (isValid(profile?.accountNumber)) return profile.accountNumber;
                        return displayId;
                      })()}
                    </Text>
                    {copiedId ? <CheckCircle size={10} color="#22C55E" /> : <Copy size={10} color="#94a3b8" />}
                  </View>
                )}
              </TouchableOpacity>
              <LevelBadge level={profile.level?.rich || 0} type="rich" />
              <SVIPBadge level={profile.svip || 0} />
            </View>

            {/* Tags + Relationship */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              {hasOfficialTag && <SVGA_OfficialTag />}
              {isSeller && <SVGA_SellerTag />}
              {profile.tags?.includes('CS Leader') && <SVGA_CSLeaderTag />}
              {profile.tags?.includes('Customer Service') && <SVGA_CustomerServiceTag />}
              {profile.tags?.includes('Service') && <SVGA_ServiceTag />}
              {profile.tags?.includes('Host') && <SVGA_HostTag />}
              {hasRelationship && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FDF2F8', borderRadius: 12, borderWidth: 1, borderColor: '#FECDD3' }}>
                  <Heart size={10} color="#EC4899" fill="#EC4899" />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#EC4899', textTransform: 'uppercase' }}>
                    {profile.relationship.type}: {profile.relationship.partnerName}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              {[
                { label: 'Fans', value: stats?.fans ?? profile?.stats?.fans ?? 0 },
                { label: 'Following', value: stats?.following ?? profile?.stats?.following ?? 0 },
                { label: 'Friend', value: stats?.friends ?? profile?.stats?.friends ?? 0 },
                { label: 'Visitors', value: stats?.visitors ?? profile?.stats?.visitors ?? 0 },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{s.value}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* CP Card */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>CP Card</Text>
              <LinearGradient colors={['#F7C49F', '#E99B8E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, height: 146, width: '100%', overflow: 'hidden', position: 'relative' }}>
                <LinearGradient colors={['#8A153E', '#B02352']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 42, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, overflow: 'hidden' }}>
                  {/* Top Golden Ribbon */}
                  <View style={{ position: 'absolute', top: 0, alignSelf: 'center', zIndex: 10 }}>
                    <LinearGradient
                      colors={['#FDE6A8', '#D68A32']}
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      style={{ paddingHorizontal: 20, paddingVertical: 2, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 1, borderColor: '#FFF3D1', borderTopWidth: 0 }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#5A2105', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {profile?.relationship?.type && profile?.relationship?.type !== 'None' ? profile.relationship.type : 'CP'}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Left User */}
                  <View style={{ alignItems: 'center', marginTop: 4 }}>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile.avatarUrl) || 'https://picsum.photos/200' }}
                      style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)' }} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>{profile.username}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={handleHeartPressIn}
                    onPressOut={handleHeartPressOut}
                    onPress={() => {
                      if (isOwnProfile && hasRelationship) {
                        setShowCpInfo(true);
                      }
                    }}
                    style={{ alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                      <Svg width={60} height={55} viewBox="0 0 600 550" style={{ overflow: 'visible' }}>
                        <Defs>
                          <RadialGradient id="rimGold" cx="0.28" cy="0.22" r="0.85">
                            <Stop offset="0%" stopColor="#fde1d2"/>
                            <Stop offset="25%" stopColor="#f8c7b5"/>
                            <Stop offset="55%" stopColor="#d48a78"/>
                            <Stop offset="85%" stopColor="#a05a4a"/>
                            <Stop offset="100%" stopColor="#7a3c2e"/>
                          </RadialGradient>
                          <SvgLinearGradient id="bevelLight" x1="0" y1="0" x2="0.8" y2="0.8">
                            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.85}/>
                            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0}/>
                          </SvgLinearGradient>
                          <SvgLinearGradient id="bevelDark" x1="1" y1="1" x2="0" y2="0">
                            <Stop offset="0%" stopColor="#000000" stopOpacity={0.4}/>
                            <Stop offset="100%" stopColor="#000000" stopOpacity={0}/>
                          </SvgLinearGradient>
                          <SvgLinearGradient id="f1" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#ffffff"/><Stop offset="35%" stopColor="#fde8ee"/><Stop offset="100%" stopColor="#f5c2d0"/></SvgLinearGradient>
                          <SvgLinearGradient id="f2" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#fff5f8"/><Stop offset="100%" stopColor="#e9a6b8"/></SvgLinearGradient>
                          <SvgLinearGradient id="f3" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#fbe0e7"/><Stop offset="100%" stopColor="#d98ca2"/></SvgLinearGradient>
                          <SvgLinearGradient id="f4" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#f0c1ce"/><Stop offset="100%" stopColor="#b96b81"/></SvgLinearGradient>
                          <SvgLinearGradient id="f5" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#e2a9b9"/><Stop offset="100%" stopColor="#9d4f66"/></SvgLinearGradient>
                          <SvgLinearGradient id="f6" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#d18fa3"/><Stop offset="100%" stopColor="#7c2e48"/></SvgLinearGradient>
                          <SvgLinearGradient id="f7" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#bc738a"/><Stop offset="100%" stopColor="#672139"/></SvgLinearGradient>
                          <SvgLinearGradient id="f8" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#a4576f"/><Stop offset="54%" stopColor="#54162a"/></SvgLinearGradient>
                          <SvgLinearGradient id="f9" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#8a2a44"/><Stop offset="100%" stopColor="#3d0a18"/></SvgLinearGradient>
                          <SvgLinearGradient id="f10" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#ffedf2"/><Stop offset="100%" stopColor="#e2a0b2"/></SvgLinearGradient>
                          <SvgLinearGradient id="f11" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#f3cbd6"/><Stop offset="100%" stopColor="#c27a8e"/></SvgLinearGradient>
                          <SvgLinearGradient id="f12" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#e4b0bf"/><Stop offset="100%" stopColor="#9f5a70"/></SvgLinearGradient>
                          <SvgLinearGradient id="f13" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#cc8ca2"/><Stop offset="100%" stopColor="#7e3450"/></SvgLinearGradient>
                          <SvgLinearGradient id="f14" x1="1" y1="1" x2="0" y2="0"><Stop offset="0%" stopColor="#7a2540"/><Stop offset="100%" stopColor="#4b0f24"/></SvgLinearGradient>
                          <SvgLinearGradient id="f15" x1="1" y1="1" x2="0" y2="0"><Stop offset="0%" stopColor="#5c142a"/><Stop offset="100%" stopColor="#2a0712"/></SvgLinearGradient>
                          <RadialGradient id="centerGlow" cx="0.5" cy="0.38" r="0.65">
                            <Stop offset="0%" stopColor="#ffe4ec" stopOpacity={0.9}/>
                            <Stop offset="40%" stopColor="#e291a8" stopOpacity={0.4}/>
                            <Stop offset="100%" stopColor="#7a1e3e" stopOpacity={0}/>
                          </RadialGradient>
                          <ClipPath id="clipHeart"><Path d="M300 457 C160 363 52 258 90 162 C117 93 207 73 280 121 C291 129 297 139 300 150 C303 139 309 129 320 121 C393 73 483 93 510 162 C548 258 440 363 300 457 Z"/></ClipPath>
                        </Defs>

                        <G clipPath="url(#clipHeart)">
                          <Polygon points="185,115 280,121 300,150 220,180" fill="url(#f1)"/>
                          <Polygon points="185,115 120,135 140,210 220,180" fill="url(#f2)"/>
                          <Polygon points="120,135 95,160 140,210" fill="url(#f3)"/>
                          <Polygon points="95,160 86,245 140,210" fill="url(#f4)"/>
                          <Polygon points="86,245 160,280 140,210" fill="url(#f5)"/>
                          <Polygon points="86,245 128,328 160,280" fill="url(#f6)"/>
                          <Polygon points="128,328 198,398 210,330 160,280" fill="url(#f7)"/>
                          <Polygon points="128,328 198,398 300,457 210,330" fill="url(#f8)"/>
                          <Polygon points="198,398 300,457 270,360" fill="url(#f9)"/>
                          <Polygon points="415,115 320,121 300,150 380,180" fill="url(#f10)"/>
                          <Polygon points="415,115 480,135 460,210 380,180" fill="url(#f11)"/>
                          <Polygon points="480,135 505,160 460,210" fill="url(#f12)"/>
                          <Polygon points="505,160 514,245 460,210" fill="url(#f13)"/>
                          <Polygon points="514,245 440,280 460,210" fill="url(#f5)"/>
                          <Polygon points="514,245 472,328 440,280" fill="url(#f6)"/>
                          <Polygon points="472,328 402,398 390,330 440,280" fill="url(#f7)"/>
                          <Polygon points="472,328 402,398 300,457 390,330" fill="url(#f14)"/>
                          <Polygon points="402,398 300,457 330,360" fill="url(#f15)"/>
                          <Polygon points="220,180 300,200 300,150" fill="url(#f2)" opacity={0.95}/>
                          <Polygon points="380,180 300,200 300,150" fill="url(#f10)" opacity={0.9}/>
                          <Polygon points="220,180 240,250 300,200" fill="url(#f3)"/>
                          <Polygon points="380,180 360,250 300,200" fill="url(#f11)"/>
                          <Polygon points="240,250 300,270 300,200" fill="url(#f4)"/>
                          <Polygon points="360,250 300,270 300,200" fill="url(#f12)"/>
                          <Polygon points="220,180 160,280 240,250" fill="url(#f4)"/>
                          <Polygon points="380,180 440,280 360,250" fill="url(#f13)"/>
                          <Polygon points="160,280 210,330 240,250" fill="url(#f6)"/>
                          <Polygon points="440,280 390,330 360,250" fill="url(#f13)"/>
                          <Polygon points="240,250 270,360 300,270" fill="url(#f7)"/>
                          <Polygon points="360,250 330,360 300,270" fill="url(#f14)"/>
                          <Polygon points="210,330 270,360 240,250" fill="url(#f7)"/>
                          <Polygon points="390,330 330,360 360,250" fill="url(#f14)"/>
                          <Polygon points="210,330 270,360 300,457" fill="url(#f8)"/>
                          <Polygon points="390,330 330,360 300,457" fill="url(#f15)"/>
                        </G>

                        <G clipPath="url(#clipHeart)">
                          <Polygon points="185,115 280,121 220,180" fill="#ffffff" opacity={0.58}/>
                          <Polygon points="185,115 120,135 140,210 220,180" fill="#ffffff" opacity={0.35}/>
                          <Polygon points="280,121 300,150 300,200 220,180" fill="#ffffff" opacity={0.22}/>
                          <Polygon points="402,398 472,328 514,245 440,280" fill="#000000" opacity={0.18}/>
                          <Polygon points="330,360 390,330 300,457" fill="#000000" opacity={0.22}/>
                        </G>

                        <Ellipse cx="300" cy="255" rx="95" ry="75" fill="url(#centerGlow)" opacity={0.7} />

                        <Circle cx="196" cy="126" r="5" fill="#ffffff" opacity={0.95}/>
                        <Circle cx="167" cy="152" r="3" fill="#ffffff" opacity={0.85}/>
                        <Circle cx="132" cy="188" r="2" fill="#ffffff" opacity={0.7}/>
                        <Path d="M274 108 l10 -4 2 11 -12 -7z" fill="#ffffff" opacity={0.9}/>
                        <Circle cx="248" cy="142" r="1.8" fill="#ffffff" opacity={0.8}/>

                        <Path d="M300 488 C140 390 20 270 62 150 C92 75 195 48 272 103 C289 115 296 128 300 143 C304 128 311 115 328 103 C405 48 508 75 538 150 C580 270 460 390 300 488 Z M300 457 C160 363 52 258 90 162 C117 93 207 73 280 121 C291 129 297 139 300 150 C303 139 309 129 320 121 C393 73 483 93 510 162 C548 258 440 363 300 457 Z" fill="url(#rimGold)" fillRule="evenodd" stroke="#6e3a2e" strokeWidth={1.2}/>
                        <Path d="M300 457 C160 363 52 258 90 162 C117 93 207 73 280 121 C291 129 297 139 300 150 C303 139 309 129 320 121 C393 73 483 93 510 162 C548 258 440 363 300 457 Z" fill="none" stroke="url(#bevelLight)" strokeWidth={9} strokeLinejoin="round" opacity={0.5}/>
                        <Path d="M300 488 C140 390 20 270 62 150 C92 75 195 48 272 103 C289 115 296 128 300 143 C304 128 311 115 328 103 C405 48 508 75 538 150 C580 270 460 390 300 488 Z" fill="none" stroke="#5a2a20" strokeWidth={2.5} opacity={0.55}/>
                        <Path d="M62 150 C92 75 195 48 272 103 C289 115 296 128 300 143" fill="none" stroke="#ffe0d1" strokeWidth={6} strokeLinecap="round" opacity={0.45} />
                      </Svg>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Right User or Add Partner */}
                  {profile?.relationship && profile?.relationship?.type && profile?.relationship?.type !== 'None' ? (
                    <View style={{ alignItems: 'center' }}>
                      <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile?.relationship?.partnerAvatar) || 'https://picsum.photos/200' }}
                        style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)' }} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>{profile?.relationship?.partnerName}</Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setShowCpSearch(true)} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24, color: '#FFF', fontWeight: '300', marginTop: -2 }}>+</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: 'transparent', marginTop: 8 }}> </Text>
                    </View>
                  )}
                </LinearGradient>
              </LinearGradient>
            </View>

            {/* Best Friend & Besties Slots */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {/* Best Friend Slot */}
              <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' }}>
                <Text style={{ fontSize: 8, fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{String.fromCodePoint(0x1F91D)} Best Friend</Text>
                {profile?.bestFriend ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile.bestFriend.avatarUrl) || 'https://picsum.photos/200' }}
                      style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#22C55E' }} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#166534', marginTop: 6 }} numberOfLines={1}>{profile.bestFriend.name}</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => { setSearchType('Best Friend'); setShowCpSearch(true); }}
                    style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: '#86EFAC', backgroundColor: 'rgba(34,197,94,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: '#22C55E' }}>+</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Besties Slot */}
              <View style={{ flex: 1, backgroundColor: '#FFF7ED', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' }}>
                <Text style={{ fontSize: 8, fontWeight: '800', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>👥 Besties</Text>
                {profile?.besties ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile.besties.avatarUrl) || 'https://picsum.photos/200' }}
                      style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#F97316' }} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#9A3412', marginTop: 6 }} numberOfLines={1}>{profile.besties.name}</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => { setSearchType('Besties'); setShowCpSearch(true); }}
                    style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: '#FDBA74', backgroundColor: 'rgba(249,115,22,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: '#F97316' }}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Signature Bio */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Signature Bio</Text>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                {profile.bio || "Synchronized with the Ummy frequency."}
              </Text>
              {profile.birthday && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <Calendar size={12} color="#94A3B8" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{profile.birthday}</Text>
                </View>
              )}
            </View>

            {/* Top Supporters Section */}
            <TopSupportersSection profileId={profile?.id} isOwnProfile={isOwnProfile} firestore={firestore} user={user} />

            {/* Tab Navigation */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginTop: 20 }}>
              {(['gift', 'medal', 'vehicle', 'frame'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
                    style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: isActive ? 2 : 0, borderBottomColor: '#2563EB' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#2563EB' : '#94A3B8', textTransform: 'uppercase' }}>{tab}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab Content */}
            <View style={{ minHeight: 120, paddingTop: 14 }}>
              {activeTab === 'medal' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {profile.medals && profile.medals.length > 0 ? (
                    profile.medals.map((mId: string, idx: number) => {
                      const medalData = allMedals.find((m: any) => m.id === mId);
                      return (
                        <View key={idx} style={{ padding: 8, borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 3 }}>
                          {medalData?.imageUrl ? (
                            <Image cachePolicy="memory-disk" source={{ uri: toCDN(medalData.imageUrl) }} style={{ width: 80, height: 80 }} contentFit="contain" />
                          ) : (
                            <Text style={{ fontSize: 22 }}>🏅</Text>
                          )}
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{medalData?.name || mId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Medal Earned</Text>
                  )}
                </View>
              )}
              {activeTab === 'vehicle' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {profile.inventory?.ownedItems?.filter((id: string) => id.includes('vehicle') || id.includes('car')).length > 0 ? (
                    profile.inventory.ownedItems.filter((id: string) => id.includes('vehicle') || id.includes('car')).map((id: string, idx: number) => (
                      <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                        <Text style={{ fontSize: 22 }}>🚗</Text>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{id}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Vehicle Owned</Text>
                  )}
                </View>
              )}
              {activeTab === 'frame' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {profile.inventory?.ownedItems?.filter((id: string) => id.includes('frame') || id.includes('ring')).length > 0 ? (
                    profile.inventory.ownedItems.filter((id: string) => id.includes('frame') || id.includes('ring')).map((id: string, idx: number) => (
                      <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                        <Text style={{ fontSize: 22 }}>🖼️</Text>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{id}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Frame Owned</Text>
                  )}
                </View>
              )}
              {activeTab === 'gift' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
                  {profile.stats?.receivedGifts && Object.keys(profile.stats.receivedGifts).length > 0 ? (
                    Object.entries(profile.stats.receivedGifts).map(([giftId, count]: any, idx: number) => {
                      const giftName = profile.stats?.giftDetails?.[`${giftId}_name`] || giftId;
                      const giftImage = profile.stats?.giftDetails?.[`${giftId}_imageUrl`];
                      return (
                        <View key={idx} style={{ padding: 2, borderRadius: 8, alignItems: 'center', width: (SCREEN_WIDTH - 32) / 5 }}>
                          {giftImage ? (
                            <Image source={{ uri: toCDN(giftImage) }} style={{ width: 60, height: 60, borderRadius: 6 }} contentFit="contain" />
                          ) : (
                            <Text style={{ fontSize: 22 }}>&#127873;</Text>
                          )}
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#EC4899', marginTop: 2 }}>x{count}</Text>
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>{giftName}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Gift Received</Text>
                  )}
                </View>
              )}

          </View>
          </View>
        </ScrollView>

        {/* FIXED Bottom Action Bar â€” Other users only */}
        {profile && !isOwnProfile && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 12,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1, borderTopColor: '#F1F5F9',
            shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
          }}>
            <TouchableOpacity onPress={onFollow} disabled={isProcessingFollow}
              style={{ flex: 1, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#EC4899', backgroundColor: followData ? '#FDF2F8' : '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Heart size={14} color="#EC4899" fill={followData ? '#EC4899' : 'transparent'} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#EC4899' }}>{followData ? 'Joined' : 'Follow'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onOpenChange(false); if (onChat) onChat(profile); }}
              style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <MessageCircle size={14} color="#FFF" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CP Search Popup â€” inline overlay */}
        {showCpSearch && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
            <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, width: '85%', padding: 16 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={18} color="#EC4899" />
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Find Partner</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowCpSearch(false); setCpSelectedUser(null); setCpSearchQuery(''); setCpSearchResults([]); setCpSent(false); }}>
                  <X size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              {/* Search Bar */}
              {!cpSelectedUser && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Search size={16} color="rgba(255,255,255,0.4)" />
                  <TextInput value={cpSearchQuery} onChangeText={handleCpSearch} placeholder="Search by name or ID..." placeholderTextColor="rgba(255,255,255,0.3)" style={{ flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600', paddingVertical: 10, paddingHorizontal: 8 }} />
                  {cpSearching && <ActivityIndicator size="small" color="#EC4899" />}
                </View>
              )}
              {/* Selected User */}
              {cpSelectedUser && !cpSent && (
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Image source={{ uri: toCDN(cpSelectedUser.avatarUrl) || 'https://picsum.photos/200' }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#EC4899' }} cachePolicy="memory-disk" />
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 8 }}>{cpSelectedUser.username}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>ID: {cpSelectedUser.accountNumber || cpSelectedUser.id}</Text>
                </View>
              )}
              {/* Sent Success */}
              {cpSent && (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <CheckCircle size={36} color="#22C55E" />
                  <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '800', marginTop: 8 }}>Proposal Sent!</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>Waiting for response</Text>
                </View>
              )}
              {/* Search Results */}
              {!cpSelectedUser && cpSearchResults.length > 0 && (
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {cpSearchResults.map((u: any) => (
                    <TouchableOpacity key={u.id} onPress={() => { setCpSelectedUser(u); setCpSearchResults([]); setCpSearchQuery(''); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6 }}>
                      <Image source={{ uri: toCDN(u.avatarUrl) || 'https://picsum.photos/200' }} style={{ width: 40, height: 40, borderRadius: 20 }} cachePolicy="memory-disk" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{u.username || 'Unknown'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>ID: {u.accountNumber || u.id}</Text>
                      </View>
                      <UserPlus size={16} color="#EC4899" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {/* No Results */}
              {!cpSelectedUser && cpSearchQuery.length >= 2 && !cpSearching && cpSearchResults.length === 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>No users found</Text>
              )}
              {/* Proposal Type Buttons */}
              {cpSelectedUser && !cpSent && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {[
                    { id: 'Best Friend', label: 'Best Friend', icon: '🤝' },
                    { id: 'CP', label: 'CP Partner', icon: '💑' },
                    { id: 'Besties', label: 'Besties', icon: '👥' }
                  ].filter(t => t.id === searchType || t.id === 'CP').map(t => (
                    <TouchableOpacity key={t.id} onPress={() => handleSendCpProposal(t.id as any)}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <Text style={{ fontSize: 20, marginBottom: 3 }}>{t.icon}</Text>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Hint */}
              {!cpSelectedUser && cpSearchQuery.length < 2 && !cpSent && (
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>Search by username or account number</Text>
              )}
            </View>
            </View>
          </View>
        )}

        {/* CP Info Popup â€” tap heart to open */}
        {showCpInfo && hasRelationship && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 99998 }}>
            <TouchableOpacity activeOpacity={1} onPress={() => setShowCpInfo(false)} style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#1a0a1e', borderRadius: 20, width: '80%', padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)' }}>
              {/* Close */}
              <TouchableOpacity onPress={() => setShowCpInfo(false)} style={{ position: 'absolute', top: 10, right: 12 }}>
                <X size={16} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>

              {/* Heart Icon */}
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(244,63,94,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Heart size={28} color="#f43f5e" fill="#f43f5e" />
              </View>

              {/* Partner name */}
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{profile?.relationship?.partnerName}</Text>

              {/* Relationship type */}
              <View style={{ backgroundColor: 'rgba(244,63,94,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 }}>
                <Text style={{ color: '#f43f5e', fontSize: 11, fontWeight: '800' }}>{profile?.relationship?.type} Partner</Text>
              </View>

              {/* Days together */}
              {profile?.relationship?.startDate && (
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>
                  You have been {profile?.relationship?.type} for{' '}
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>
                    {Math.max(1, Math.floor((Date.now() - new Date(profile.relationship.startDate).getTime()) / 86400000))} days
                  </Text>
                </Text>
              )}
              {!profile?.relationship?.startDate && (
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>You are {profile?.relationship?.type} partners</Text>
              )}

              {/* Break button */}
              <TouchableOpacity onPress={handleBreakCp} disabled={isBreakingCp}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                {isBreakingCp ? (
                  <ActivityIndicator size={14} color="#EF4444" />
                ) : (
                  <Text style={{ fontSize: 16 }}>💔</Text>
                )}
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>{isBreakingCp ? 'Breaking...' : 'Want to Break CP?'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
      </View>
    </Modal>
  );
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function TopSupportersSection({ profileId, isOwnProfile, firestore, user }: { profileId: string; isOwnProfile: boolean; firestore: any; user: any }) {
  const [supporters, setSupporters] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState<'total' | 'weekly' | 'monthly'>('total');
  const [dailySupported, setDailySupported] = useState(false);
  const [supporting, setSupporting] = useState(false);
  const [supporterProfileUid, setSupporterProfileUid] = useState<string | null>(null);
  const { profile: supporterProfile } = useUserProfile(supporterProfileUid || undefined);
  const { profile: myProfile } = useUserProfile(user?.uid);

  useEffect(() => {
    if (!firestore || !profileId) return;
    try {
      const q = query(collection(firestore, 'supporters'), where('receiverId', '==', profileId));
      const unsub = onSnapshot(q, (snap: any) => {
        const list: any[] = [];
        if (snap && snap.forEach) {
          snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
        }
        list.sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
        setSupporters(list.slice(0, 10));
        if (user?.uid) {
          const mySupport = list.find((s: any) => s.supporterId === user.uid);
          if (mySupport) {
            const now = new Date();
            const lastDaily = mySupport.lastDailySupport?.toDate?.() || mySupport.lastDailySupport;
            if (lastDaily) {
              const lastDate = new Date(lastDaily);
              setDailySupported(lastDate.toDateString() === now.toDateString());
            }
          }
        }
      }, () => {});
      return unsub;
    } catch (e: any) {}
  }, [firestore, profileId, user?.uid]);

  const handleDailySupport = async () => {
    if (!firestore || !user?.uid || !profileId || dailySupported || supporting) return;
    setSupporting(true);
    try {
      const supportId = `${profileId}_${user.uid}`;
      const supportRef = doc(firestore, 'supporters', supportId);

      // Check if week/month reset needed
      let resetWeekly = false;
      let resetMonthly = false;
      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      try {
        const existing = await getDoc(supportRef);
        if (existing.exists()) {
          const data = existing.data();
          const lastGift = data.lastGiftAt?.toDate?.() || (data.lastGiftAt ? new Date(data.lastGiftAt) : null);
          if (lastGift) {
            if (getISOWeek(lastGift) !== currentWeek) resetWeekly = true;
            if (lastGift.getMonth() !== currentMonth || lastGift.getFullYear() !== currentYear) resetMonthly = true;
          } else {
            resetWeekly = true;
            resetMonthly = true;
          }
        }
      } catch {}

      await setDoc(supportRef, {
        receiverId: profileId,
        supporterId: user.uid,
        supporterName: myProfile?.username || user.displayName || 'User',
        supporterAvatar: myProfile?.avatarUrl || '',
        totalPoints: increment(60),
        ...(resetWeekly ? { weeklyPoints: 60 } : { weeklyPoints: increment(60) }),
        ...(resetMonthly ? { monthlyPoints: 60 } : { monthlyPoints: increment(60) }),
        lastDailySupport: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setDailySupported(true);
    } catch (e: any) {}
    setSupporting(false);
  };

  const getPoints = (s: any) => {
    if (period === 'weekly') return s.weeklyPoints || 0;
    if (period === 'monthly') return s.monthlyPoints || 0;
    return s.totalPoints || 0;
  };

  const sorted = [...supporters].sort((a: any, b: any) => getPoints(b) - getPoints(a));
  const s1 = sorted[0];
  const s2 = sorted[1];
  const s3 = sorted[2];

  const slots = [
    { medal: String.fromCodePoint(0x1F948), supporter: s2, size: 48, color: '#94a3b8', translateY: 10 },
    { medal: String.fromCodePoint(0x1F947), supporter: s1, size: 60, color: '#fbbf24', translateY: 0 },
    { medal: String.fromCodePoint(0x1F949), supporter: s3, size: 44, color: '#d97706', translateY: 12 },
  ];

  return (
    <View style={{ marginTop: 16 }}>
      <TouchableOpacity onPress={() => setShowAll(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Top Supporters</Text>
          {sorted.length > 0 && <Text style={{ fontSize: 10, color: '#CBD5E1' }}>({sorted.length})</Text>}
        </View>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>{'View All ' + String.fromCodePoint(0x2192)}</Text>
      </TouchableOpacity>

      {/* Daily Support Button (other users only) */}
      {!isOwnProfile && (
        <TouchableOpacity onPress={handleDailySupport} disabled={dailySupported || supporting}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 12, marginBottom: 10, backgroundColor: dailySupported ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: dailySupported ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)' }}>
          {supporting ? <ActivityIndicator size={12} color="#EAB308" /> : <Text style={{ fontSize: 14 }}>⭐</Text>}
          <Text style={{ fontSize: 11, fontWeight: '800', color: dailySupported ? '#22C55E' : '#EAB308' }}>
            {dailySupported ? 'Supported Today ✔' : 'Support (+60 Points)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Podium: 2nd(left) â€” 1st(middle, raised) â€” 3rd(right) */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16, paddingBottom: 4 }}>
        {slots.map((slot, i) => (
          <View key={i} style={{ alignItems: 'center', transform: [{ translateY: slot.translateY }] }}>
            <TouchableOpacity
              onPress={() => slot.supporter?.supporterId && setSupporterProfileUid(slot.supporter.supporterId)}
              disabled={!slot.supporter}
              style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2, borderWidth: 2, borderColor: slot.color, backgroundColor: slot.supporter ? 'transparent' : 'rgba(148,163,184,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            >
              {slot.supporter ? (
                <Image cachePolicy="memory-disk" source={{ uri: toCDN(slot.supporter.supporterAvatar) || 'https://picsum.photos/100' }}
                  style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2 }} />
              ) : (
                <Text style={{ fontSize: slot.size * 0.35, color: slot.color, opacity: 0.5 }}>{slot.medal}</Text>
              )}
            </TouchableOpacity>
            <Text style={{ fontSize: 14, marginTop: 4 }}>{slot.medal}</Text>
            {slot.supporter ? (
              <>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#334155', marginTop: 2 }} numberOfLines={1}>{slot.supporter.supporterName}</Text>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#f43f5e' }}>{getPoints(slot.supporter).toLocaleString()} pts</Text>
              </>
            ) : (
              <Text style={{ fontSize: 9, fontWeight: '600', color: '#CBD5E1', marginTop: 2 }}>Empty</Text>
            )}
          </View>
        ))}
      </View>

      {/* Top 10 Full Page Modal */}
      {showAll && (
        <Modal visible={showAll} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            {/* Header */}
            <SafeAreaView style={{ backgroundColor: '#FFF' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <TouchableOpacity onPress={() => setShowAll(false)} style={{ padding: 4 }}>
                  <ChevronLeft size={22} color="#1E293B" />
                </TouchableOpacity>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1E293B' }}>Top Supporters</Text>
                <View style={{ width: 30 }} />
              </View>
            </SafeAreaView>

            {/* Period Tabs */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              {(['total', 'weekly', 'monthly'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)}
                  style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, backgroundColor: period === p ? '#2563EB' : '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: period === p ? '#FFF' : '#64748B', textTransform: 'capitalize' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Podium Top 3 */}
            {sorted.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 20, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                {[
                  { s: sorted[1], medal: String.fromCodePoint(0x1F948), size: 56, color: '#94a3b8', ty: 12 },
                  { s: sorted[0], medal: String.fromCodePoint(0x1F947), size: 72, color: '#fbbf24', ty: 0 },
                  { s: sorted[2], medal: String.fromCodePoint(0x1F949), size: 50, color: '#d97706', ty: 16 },
                ].map((slot, i) => (
                  <View key={i} style={{ alignItems: 'center', transform: [{ translateY: slot.ty }] }}>
                    <TouchableOpacity
                      onPress={() => slot.s?.supporterId && setSupporterProfileUid(slot.s.supporterId)}
                      disabled={!slot.s}
                      style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2, borderWidth: 2.5, borderColor: slot.color, backgroundColor: slot.s ? 'transparent' : 'rgba(148,163,184,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                    >
                      {slot.s ? (
                        <Image cachePolicy="memory-disk" source={{ uri: toCDN(slot.s.supporterAvatar) || 'https://picsum.photos/100' }}
                          style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2 }} />
                      ) : (
                        <Text style={{ fontSize: slot.size * 0.35, color: slot.color, opacity: 0.5 }}>{slot.medal}</Text>
                      )}
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, marginTop: 6 }}>{slot.medal}</Text>
                    {slot.s ? (
                      <>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginTop: 4 }} numberOfLines={1}>{slot.s.supporterName}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#f43f5e', marginTop: 2 }}>{getPoints(slot.s).toLocaleString()} pts</Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#CBD5E1', marginTop: 4 }}>Empty</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Full List */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 8 }}>All Supporters</Text>
              {sorted.map((s: any, i: number) => (
                <TouchableOpacity key={s.id} onPress={() => s.supporterId && setSupporterProfileUid(s.supporterId)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: i < 3 ? '#f43f5e' : '#94A3B8', width: 28, textAlign: 'center' }}>{i + 1}</Text>
                  <Image cachePolicy="memory-disk" source={{ uri: toCDN(s.supporterAvatar) || 'https://picsum.photos/100' }}
                    style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#E2E8F0' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{s.supporterName}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#f43f5e' }}>{getPoints(s).toLocaleString()} pts</Text>
                </TouchableOpacity>
              ))}
              {sorted.length === 0 && (
                <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 40, fontStyle: 'italic' }}>No supporters yet</Text>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Nested supporter FullProfileDialog */}
      {supporterProfileUid && supporterProfile && (
        <FullProfileDialog
          open={!!supporterProfileUid}
          onOpenChange={(open: boolean) => { if (!open) setSupporterProfileUid(null); }}
          profile={supporterProfile}
          isOwnProfile={supporterProfileUid === user?.uid}
          displayId={supporterProfile.accountNumber || '000000'}
        />
      )}
    </View>
  );
}
