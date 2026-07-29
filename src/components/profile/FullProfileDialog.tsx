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
import { isInventoryItemExpired } from '../../lib/types';
import { ActiveIDBadge, SovereignIDBadge } from '@/components/native-id-badge';

const ARISTOCRACY_FRAME_URLS: Record<string, string> = {
  aristocracy_knight_frame: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_knight_frame_v2.png?alt=media',
  aristocracy_duke_frame: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_duke_frame_v2.png?alt=media',
  aristocracy_king_frame: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_king_frame_v2.png?alt=media',
  aristocracy_emperor_frame: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_emperor_frame_v2.png?alt=media',
};
import { getLevelFromSpent } from '../../hooks/use-user-level';
import {
  SVGA_OfficialTag,
  SVGA_SellerTag,
  SVGA_ServiceTag,
  SVGA_HostTag,
  SVGA_CSLeaderTag,
  SVGA_CustomerServiceTag,
  SVGA_GlossyID,
  SVGA_CpHeart,
  SVGA_SuperAdminTag,
  SVGA_ManagerTag,
  SVGA_AuditorTag,
  SVGA_AdminTag
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

  useEffect(() => {
    if (!level || level < 1 || !firestore) return;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, 'settings', 'svipConfig'));
        if (snap.exists()) {
          const data = snap.data();
          const url = data?.levels?.[String(level)]?.badgeUrl;
          if (url) setBadgeUrl(url);
        }
      } catch (e) {}
    })();
  }, [level, firestore]);

  if (!level || level < 1) return null;

  return (
    <View style={{ width: 70, height: 20, justifyContent: 'center' }}>
      <Image 
        source={
          level === 1 ? require('../../../assets/images/themes/svip_strip_1.png') :
          level === 2 ? require('../../../assets/images/themes/svip_strip_2.png') :
          level === 3 ? require('../../../assets/images/themes/svip_strip_3.png') :
          level === 4 ? require('../../../assets/images/themes/svip_strip_4.png') :
          level === 5 ? require('../../../assets/images/themes/svip_strip_5.png') :
          level === 6 ? require('../../../assets/images/themes/svip_strip_6.png') :
          level === 7 ? require('../../../assets/images/themes/svip_strip_7.png') :
          level === 8 ? require('../../../assets/images/themes/svip_strip_8.png') :
          level === 9 ? require('../../../assets/images/themes/svip_strip_9.png') :
          level === 10 ? require('../../../assets/images/themes/svip_strip_10.png') :
          level === 11 ? require('../../../assets/images/themes/svip_strip_11.png') :
          level === 12 ? require('../../../assets/images/themes/svip_strip_12.png') :
          level === 13 ? require('../../../assets/images/themes/svip_strip_13.png') :
          level === 14 ? require('../../../assets/images/themes/svip_strip_14.png') :
          level === 15 ? require('../../../assets/images/themes/svip_strip_15.png') :
          level === 16 ? require('../../../assets/images/themes/svip_strip_16.png') :
          level === 17 ? require('../../../assets/images/themes/svip_strip_17.png') :
          require('../../../assets/images/themes/svip_strip_18.png')
        }
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="fill"
      />
      {badgeUrl ? (
        <Image 
          source={{ uri: toCDN(badgeUrl) }} 
          style={{ 
            position: 'absolute', 
            left: (level >= 16 && level <= 18) ? -2 : -5, 
            top: (level >= 16 && level <= 18) ? -2 : -5, 
            width: (level >= 16 && level <= 18) ? 24 : 30, 
            height: (level >= 16 && level <= 18) ? 24 : 30 
          }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
};

function CoverCarousel({ images }: { images: string[] }) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollRef = useRef<any>(null);

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

const LivePartnerItem = React.memo(function LivePartnerItem({ partner }: { partner: any }) {
  const { profile: pProfile } = useUserProfile(partner.uid);
  const name = pProfile?.username || pProfile?.name || partner.name || 'User';
  const avatarUrl = pProfile?.avatarUrl || partner.avatarUrl;

  return (
    <View style={{ alignItems: 'center', width: 58, marginHorizontal: 2 }}>
      <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) || 'https://picsum.photos/200' }}
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' }} />
      <Text style={{ fontSize: 7, fontWeight: '700', color: '#FFFFFF', marginTop: 3, textAlign: 'center' }} numberOfLines={1}>{name}</Text>
    </View>
  );
});

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
  onViewProfile,
}: any) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: ownProfile } = useUserProfile(user?.uid);

  // Query cpPairs to resolve active CP pair from Firestore if profile.relationship is incomplete
  const [activeCpPair, setActiveCpPair] = useState<any>(null);
  const targetUid = profile?.id || profile?.uid;

  useEffect(() => {
    if (!open || !targetUid) return;
    let unsub: (() => void) | undefined;
    try {
      const db = require('@react-native-firebase/firestore').default;
      unsub = db()
        .collection('cpPairs')
        .where('participantIds', 'array-contains', targetUid)
        .limit(1)
        .onSnapshot((snap: any) => {
          if (snap && !snap.empty) {
            setActiveCpPair({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setActiveCpPair(null);
          }
        }, (err: any) => {});
    } catch (e) {}
    return () => { if (unsub) unsub(); };
  }, [open, targetUid]);

  const { profile: targetLiveProfile } = useUserProfile(targetUid);

  const resolvedPartnerUid = useMemo(() => {
    if (profile?.relationship?.partnerUid) return profile.relationship.partnerUid;
    if (profile?.relationship?.uid) return profile.relationship.uid;
    if (activeCpPair?.participantIds) {
      return activeCpPair.participantIds.find((id: string) => id !== targetUid);
    }
    return null;
  }, [profile?.relationship, activeCpPair, targetUid]);

  const { profile: fetchedPartnerProfile } = useUserProfile(resolvedPartnerUid || undefined);

  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'gift' | 'medal' | 'entry' | 'frame'>('gift');
  const [activeRelationTab, setActiveRelationTab] = useState(0);
  const relationScrollRef = useRef<ScrollView>(null);
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
  // Store items for frame images
  const [storeItemsMap, setStoreItemsMap] = useState<Record<string, any>>({});

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

  // Fetch storeItems for frame/bubble/entry images
  useEffect(() => {
    if (!open) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('storeItems').onSnapshot((snap: any) => {
        if (snap) {
          const map: Record<string, any> = {};
          snap.docs.forEach((d: any) => { map[d.id] = d.data(); });
          map['f-red-fire'] = map['f-red-fire'] || { name: 'Red Fire Frame', category: 'Frame', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Fred_fire.png?alt=media' };
          map['f-horror-gold'] = map['f-horror-gold'] || { name: 'Horror Gold Frame', category: 'Frame', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Fhorror_gold.png?alt=media' };
          map['f-wings-gold'] = map['f-wings-gold'] || { name: 'Wings Gold Frame', category: 'Frame', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Fwings_gold.png?alt=media' };
          map['sea_sands'] = map['sea_sands'] || { name: 'Sea Sands Frame', category: 'Frame' };
          map['basra'] = map['basra'] || { name: 'Basra Golden Frame', category: 'Frame' };
          map['top3family_topuser'] = map['top3family_topuser'] || { name: 'Top 3 Family Frame', category: 'Frame' };
          map['top2family_topuser'] = map['top2family_topuser'] || { name: 'Top 2 Family Frame', category: 'Frame' };
          map['official-frame-1'] = map['official-frame-1'] || { name: 'Official Frame 1', category: 'Frame' };
          map['official-frame-2'] = map['official-frame-2'] || { name: 'Official Frame 2', category: 'Frame' };
          setStoreItemsMap(map);
        }
      }, (error: any) => {});
      return () => unsub();
    } catch (e) {}
  }, [open]);

  const handleCopyId = useCallback(() => {
    if (displayId) {
      Clipboard.setString(displayId);
      setCopiedId(true);
      Alert.alert('ID Copied', `ID: ${displayId} copied to clipboard`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }, [displayId]);

  const hasRelationship = Boolean(
    activeCpPair ||
    (profile?.relationship && profile.relationship.type && profile.relationship.type !== 'None') ||
    profile?.bestFriend ||
    profile?.besties
  );

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
      // CP restriction: check if either user already has a CP
      if (type === 'CP') {
        const { getDocs, query: fQuery, collection: fCollection, where: fWhere } = await import('@/firebase/firestore-compat');
        const myExistingCp = await getDocs(fQuery(fCollection(firestore, 'cpPairs'), fWhere('type', '==', 'CP'), fWhere('participantIds', 'array-contains', user.uid)));
        if (!myExistingCp.empty) {
          Alert.alert('Already have CP 💔', 'You already have an active CP. Break your current CP first.');
          return;
        }
        const targetExistingCp = await getDocs(fQuery(fCollection(firestore, 'cpPairs'), fWhere('type', '==', 'CP'), fWhere('participantIds', 'array-contains', cpSelectedUser.id)));
        if (!targetExistingCp.empty) {
          Alert.alert('Already has CP 💔', `${cpSelectedUser.username || 'This user'} already has an active CP.`);
          return;
        }
      }

      const proposalId = `${user.uid}_${cpSelectedUser.id}_${Date.now()}`;
      await setDoc(doc(firestore, 'proposals', proposalId), {
        fromUid: user.uid,
        fromUsername: ownProfile?.username || 'User',
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

  const ownedVehicles = useMemo(() => {
    const owned = profile?.inventory?.ownedItems || [];
    return owned.filter((id: string) => {
      const item = storeItemsMap[id];
      if (item && (item.category === 'Entry' || item.type === 'Entry')) return true;
      return id.includes('entry') || id.includes('Entry');
    });
  }, [profile?.inventory?.ownedItems, storeItemsMap]);
  const ownedFrames = useMemo(() => {
    const owned = profile?.inventory?.ownedItems || [];
    const frames = owned.filter((id: string) => {
      const item = storeItemsMap[id];
      if (item && (item.category === 'Frame' || item.type === 'Frame')) return true;
      return id.includes('frame') || id.includes('ring');
    });
    if ((profile as any)?.svipPrivileges?.frameUrl && !frames.includes('__svip_frame__')) {
      frames.unshift('__svip_frame__');
    }
    return frames;
  }, [profile?.inventory?.ownedItems, storeItemsMap, (profile as any)?.svipPrivileges?.frameUrl]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {!profile ? (
          <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </SafeAreaView>
        ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={[]}>
          <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} bounces={false}>

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
              {/* 3-dot menu — Report */}
              {!isOwnProfile && (
                <TouchableOpacity onPress={() => {
                  Alert.alert('Report User', `What would you like to report about ${profile.username}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Spam', onPress: () => onReport && onReport('spam') },
                    { text: 'Inappropriate Content', onPress: () => onReport && onReport('inappropriate') },
                    { text: 'Fake Profile', onPress: () => onReport && onReport('fake') },
                    { text: 'Harassment', onPress: () => onReport && onReport('harassment') },
                    { text: 'Other', onPress: () => onReport && onReport('other') },
                  ]);
                }} style={{ position: 'absolute', top: 40, right: 16, zIndex: 100, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                  <MoreHorizontal size={18} color="white" />
                </TouchableOpacity>
              )}
            </View>

            {/* White Card â€” shifted up to overlap cover */}
            <View style={{ marginTop: -32, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingTop: 10, paddingBottom: 20 }}>

            {/* Avatar â€” straddles cover and card */}
            <View style={{ alignItems: 'center', marginTop: -40, marginBottom: 10, zIndex: 30 }}>
              <View>
                <AvatarFrame frameMediaUrl={(() => {
                  const af = profile.inventory?.activeFrame;
                  if (af === '__svip_frame__') return (profile as any)?.svipPrivileges?.frameUrl || null;
                  if (isInventoryItemExpired(profile.inventory || {}, af)) return null;
                  return profile.inventory?.activeFrameMediaUrl || null;
                })()} size={88}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 2, marginTop: 8, overflow: 'visible' }}>
              <TouchableOpacity onPress={handleCopyId}>
                {hasOfficialTag ? (
                  <SVGA_GlossyID label={`ID: ${displayId}`} />
                ) : profile.activeIdBadge ? (
                  <ActiveIDBadge badgeData={profile.activeIdBadge} fallbackNumber={displayId} />
                ) : (profile.isAdmin || (profile.isBudgetId && profile.idColor && profile.idColor !== 'none')) ? (
                  <SovereignIDBadge
                    color={profile.isAdmin ? 'gold' : profile.idColor}
                    number={displayId}
                  />
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
              <LevelBadge level={getLevelFromSpent(profile.wallet?.totalSpent || 0)} type="rich" />
              <SVIPBadge level={profile.svip || 0} />
            </View>

            {/* Tags + Relationship */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              {hasOfficialTag && <SVGA_OfficialTag />}
              {profile.tags?.includes('Super Admin') && <SVGA_SuperAdminTag />}
              {profile.tags?.includes('Manager') && <SVGA_ManagerTag />}
              {profile.tags?.includes('Auditor') && <SVGA_AuditorTag />}
              {profile.tags?.includes('Admin') && <SVGA_AdminTag />}
              {isSeller && <SVGA_SellerTag />}
              {profile.tags?.includes('CS Leader') && <SVGA_CSLeaderTag />}
              {profile.tags?.includes('Customer Service') && <SVGA_CustomerServiceTag />}
              {profile.tags?.includes('Service') && <SVGA_ServiceTag />}
              {profile.tags?.includes('Host') && <SVGA_HostTag />}
              {/* Banned user tag — shown if globally banned */}
              {(profile?.isBanned === true || 
                profile?.banStatus?.isBanned === true ||
                (profile?.bannedUntil && (profile.bannedUntil.toMillis?.() || profile.bannedUntil) > Date.now()) ||
                (profile?.banStatus?.bannedUntil && (profile.banStatus.bannedUntil.toMillis?.() || profile.banStatus.bannedUntil) > Date.now())) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: '#DC2626', borderRadius: 12, borderWidth: 1, borderColor: '#FF6B6B' }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>🚫 Banned</Text>
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

            {/* Rich & Charm Level Cards */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'stretch' }}>
              {/* Rich Level Card */}
              <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={['#4338CA', '#6366F1', '#818CF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 8, paddingBottom: 0, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9 }}>💎</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Rich</Text>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>Lv {getLevelFromSpent(profile.wallet?.totalSpent || 0)}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>
                      Monthly sent: {((profile.wallet?.monthlySpent || 0) >= 1000000 ? `${((profile.wallet?.monthlySpent || 0) / 1000000).toFixed(1)}M` : (profile.wallet?.monthlySpent || 0).toLocaleString())}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Charm Level Card */}
              <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={['#BE185D', '#DB2777', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 8, paddingBottom: 0, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9 }}>💖</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Charm</Text>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>Lv {getLevelFromSpent(profile.wallet?.totalReceived || 0)}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>
                      Monthly received: {((profile.wallet?.monthlyReceived || 0) >= 1000000 ? `${((profile.wallet?.monthlyReceived || 0) / 1000000).toFixed(1)}M` : (profile.wallet?.monthlyReceived || 0).toLocaleString())}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Relationship Card - CP / Best Friend / Besties */}
            <View style={{ marginTop: 10 }}>
              <ScrollView
                ref={relationScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                  setActiveRelationTab(idx);
                }}
                scrollEventThrottle={16}
              >
                {([
                  { type: 'CP' as const, outerColors: ['#F7C49F', '#E99B8E'] as string[], innerColors: ['#8A153E', '#B02352'] as string[], icon: '\u2764\uFE0F', label: 'CP' },
                  { type: 'Best Friend' as const, outerColors: ['#BBF7D0', '#86EFAC'] as string[], innerColors: ['#166534', '#16A34A'] as string[], icon: '\uD83E\uDD1D', label: 'Best Friend' },
                  { type: 'Besties' as const, outerColors: ['#FED7AA', '#FDBA74'] as string[], innerColors: ['#9A3412', '#EA580C'] as string[], icon: '\uD83D\uDC65', label: 'Besties' },
                ] as const).map((item) => {
                  const isCP = item.type === 'CP';
                  const isBF = item.type === 'Best Friend';

                  let partners: any[] = [];
                  if (isCP) {
                    const relData = profile?.relationship;
                    const partnerName = fetchedPartnerProfile?.username || fetchedPartnerProfile?.name || relData?.partnerName || relData?.name || (activeCpPair?.user1Uid === targetUid ? activeCpPair?.user2Name : activeCpPair?.user1Name) || '';
                    const partnerAvatar = fetchedPartnerProfile?.avatarUrl || relData?.partnerAvatar || relData?.avatarUrl || (activeCpPair?.user1Uid === targetUid ? activeCpPair?.user2Avatar : activeCpPair?.user1Avatar) || '';
                    const pUid = relData?.partnerUid || relData?.uid || resolvedPartnerUid || '';

                    if (pUid || partnerName || partnerAvatar) {
                      partners = [{ name: partnerName || 'Partner', avatarUrl: partnerAvatar, uid: pUid }];
                    }
                  } else if (isBF) {
                    const bfData = profile?.bestFriends || (profile?.bestFriend ? [profile.bestFriend] : []);
                    partners = bfData.map((bf: any) => ({ name: bf.name || bf.username, avatarUrl: bf.avatarUrl || bf.avatar, uid: bf.uid || bf.id }));
                  } else {
                    const bestiesData = profile?.bestiesList || (profile?.besties ? [profile.besties] : []);
                    partners = bestiesData.map((b: any) => ({ name: b.name || b.username, avatarUrl: b.avatarUrl || b.avatar, uid: b.uid || b.id }));
                  }

                  const hasData = partners.length > 0;

                  return (
                    <View key={item.type} style={{ width: SCREEN_WIDTH - 40 }}>
                      <LinearGradient colors={item.outerColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 20, height: 130, overflow: 'hidden', position: 'relative' }}>
                        <LinearGradient colors={item.innerColors as any} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 26, paddingHorizontal: 14, paddingTop: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: isCP ? 20 : 10, overflow: 'hidden' }}>
                          {/* Top Ribbon */}
                          <View style={{ position: 'absolute', top: 0, alignSelf: 'center', zIndex: 10 }}>
                            <LinearGradient colors={['#FDE6A8', '#D68A32']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                              style={{ paddingHorizontal: 16, paddingVertical: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderColor: '#FFF3D1', borderTopWidth: 0 }}>
                              <Text style={{ fontSize: 8, fontWeight: '900', color: '#5A2105', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label} {!isCP && partners.length > 0 ? `(${partners.length})` : ''}</Text>
                            </LinearGradient>
                          </View>

                          {/* Left: Self */}
                          <View style={{ alignItems: 'center', marginTop: 2 }}>
                            <Image cachePolicy="memory-disk" source={{ uri: toCDN(targetLiveProfile?.avatarUrl || profile.avatarUrl) || 'https://picsum.photos/200' }}
                              style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' }} />
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF', marginTop: 6, textAlign: 'center' }} numberOfLines={1}>
                              {targetLiveProfile?.username || targetLiveProfile?.name || profile.username || profile.name || 'User'}
                            </Text>
                          </View>

                          {/* Center: Heart or Icon */}
                          {isCP ? (
                            <TouchableOpacity activeOpacity={0.9} onPressIn={handleHeartPressIn} onPressOut={handleHeartPressOut}
                              onPress={() => { if (isOwnProfile && hasData) setShowCpInfo(true); }}
                              style={{ alignItems: 'center', justifyContent: 'center' }}>
                              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                                <Image source={require('../../../assets/images/cp_heart.png')} style={{ width: 48, height: 44 }} contentFit="contain" />
                              </Animated.View>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ alignItems: 'center', justifyContent: 'center', width: 48, height: 44 }}>
                              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                            </View>
                          )}

                          {/* Right: Partners */}
                          {hasData ? (
                            isCP ? (
                              <View style={{ alignItems: 'center' }}>
                                <Image cachePolicy="memory-disk" source={{ uri: toCDN(partners[0].avatarUrl) || 'https://picsum.photos/200' }}
                                  style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' }} />
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF', marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{partners[0].name}</Text>
                              </View>
                            ) : (
                              <View style={{ flex: 1, maxWidth: 130 }}>
                                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16}>
                                  {partners.map((p: any, idx: number) => (
                                    <LivePartnerItem key={p.uid || idx} partner={p} />
                                  ))}
                                  {isOwnProfile && (
                                    <TouchableOpacity onPress={() => { setSearchType(item.type); setShowCpSearch(true); }}
                                      style={{ alignItems: 'center', width: 58, marginHorizontal: 2, justifyContent: 'center' }}>
                                      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 18, color: '#FFF', fontWeight: '300' }}>+</Text>
                                      </View>
                                    </TouchableOpacity>
                                  )}
                                </ScrollView>
                              </View>
                            )
                          ) : (
                            <View style={{ alignItems: 'center' }}>
                              <TouchableOpacity onPress={() => { setSearchType(item.type); setShowCpSearch(true); }}
                                style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 20, color: '#FFF', fontWeight: '300', marginTop: -1 }}>+</Text>
                              </TouchableOpacity>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: 'transparent', marginTop: 6 }}>{' '}</Text>
                            </View>
                          )}
                        </LinearGradient>
                      </LinearGradient>
                    </View>
                  );
                })}
              </ScrollView>
              {/* Dot Indicators */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 }}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={{ width: activeRelationTab === i ? 14 : 5, height: 5, borderRadius: 2.5, backgroundColor: activeRelationTab === i ? '#EC4899' : '#E2E8F0' }} />
                ))}
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
            <TopSupportersSection profileId={profile?.id} isOwnProfile={isOwnProfile} firestore={firestore} user={user} onViewProfile={onViewProfile} />

            {/* Tab Navigation */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginTop: 20 }}>
              {(['gift', 'medal', 'entry', 'frame'] as const).map((tab) => {
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
              {activeTab === 'entry' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {ownedVehicles.length > 0 ? (
                    ownedVehicles.map((id: string, idx: number) => {
                      const itemData = storeItemsMap[id];
                      const img = itemData?.imageUrl || itemData?.videoUrl || null;
                      return (
                        <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                          {img ? (
                            <Image cachePolicy="memory-disk" source={{ uri: toCDN(img) }} style={{ width: 48, height: 48, borderRadius: 8 }} contentFit="contain" />
                          ) : (
                            <Text style={{ fontSize: 22 }}>🚗</Text>
                          )}
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{itemData?.name || id}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Vehicle Owned</Text>
                  )}
                </View>
              )}
              {activeTab === 'frame' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ownedFrames.length > 0 ? (
                    ownedFrames.map((id: string, idx: number) => {
                      const isSvip = id === '__svip_frame__';
                      const itemData = isSvip ? null : storeItemsMap[id];
                      const aristocracyUrl = ARISTOCRACY_FRAME_URLS[id] || null;
                      const img = isSvip ? ((profile as any)?.svipPrivileges?.frameUrl || null) : (aristocracyUrl || itemData?.imageUrl || itemData?.videoUrl || null);
                      const name = isSvip ? 'SVIP Frame' : (itemData?.name || (aristocracyUrl ? id.replace('aristocracy_', '').replace('_frame', '').replace('_', ' ') : id));
                      const isActive = isSvip
                        ? (profile.inventory?.activeFrame === '__svip_frame__' || (!profile.inventory?.activeFrame || profile.inventory.activeFrame === 'None') && profile.inventory?.activeFrameMediaUrl === (profile as any)?.svipPrivileges?.frameUrl)
                        : profile.inventory?.activeFrame === id;
                      const frameWidth = (SCREEN_WIDTH - 56) / 4;
                      return (
                        <View key={idx} style={{ width: frameWidth, alignItems: 'center' }}>
                          {/* Frame image */}
                          <View style={{ padding: 6, backgroundColor: isActive ? 'rgba(16,185,129,0.1)' : '#F8FAFC', borderRadius: 10, width: '100%', alignItems: 'center', borderWidth: isActive ? 1.5 : 1, borderColor: isActive ? '#10B981' : '#E2E8F0' }}>
                            {img ? (
                              <Image cachePolicy="memory-disk" source={{ uri: toCDN(img) }} style={{ width: 44, height: 44, borderRadius: 6 }} contentFit="contain" />
                            ) : (
                              <Text style={{ fontSize: 18 }}>🖼️</Text>
                            )}
                            <Text style={{ fontSize: 7, fontWeight: '800', color: isActive ? '#10B981' : '#64748B', marginTop: 3, textAlign: 'center' }} numberOfLines={1}>{name}</Text>
                          </View>
                          {/* Use / Remove toggle */}
                          {isOwnProfile && (
                            <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                              {isActive ? (
                                <TouchableOpacity onPress={() => onRemoveFrame?.()}
                                  style={{ flex: 1, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 7, fontWeight: '800', color: '#EF4444' }}>Remove</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity onPress={() => onChangeFrame?.(id, img)}
                                  style={{ flex: 1, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 7, fontWeight: '800', color: '#10B981' }}>Use</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
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
                            <Image source={{ uri: toCDN(giftImage) }} style={{ width: 60, height: 60, borderRadius: 6 }} contentFit="contain" cachePolicy="memory-disk" />
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
            
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 12, paddingTop: 10,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1, borderTopColor: '#F1F5F9',
            elevation: 20,
          }}>
            <TouchableOpacity onPress={onFollow} disabled={isProcessingFollow}
              style={{ flex: 1, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#EC4899', backgroundColor: followData ? '#FDF2F8' : '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Heart size={14} color="#EC4899" fill={followData ? '#EC4899' : 'transparent'} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#EC4899' }}>{followData ? 'Joined' : 'Follow'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (onChat) onChat(profile); }}
              style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <MessageCircle size={14} color="#FFF" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}

          </View>
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
                  ].filter(t => t.id === searchType).map(t => (
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
                    {Math.max(1, Math.floor((Date.now() - new Date(profile?.relationship?.startDate).getTime()) / 86400000))} days
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
        )}
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


const LiveSupporterSlot = React.memo(function LiveSupporterSlot({
  supporter,
  render
}: {
  supporter: any;
  render: (data: { name: string; avatarUrl: string }) => React.ReactNode;
}) {
  const { profile: liveP } = useUserProfile(supporter?.supporterId);
  const name = liveP?.username || liveP?.name || supporter?.supporterName || 'User';
  const avatarUrl = liveP?.avatarUrl || supporter?.supporterAvatar || '';
  return <>{render({ name, avatarUrl })}</>;
});

function TopSupportersSection({ profileId, isOwnProfile, firestore, user, onViewProfile }: { profileId: string; isOwnProfile: boolean; firestore: any; user: any; onViewProfile?: (uid: string) => void }) {

  const [supporters, setSupporters] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState<'total' | 'weekly' | 'monthly'>('total');
  const [dailySupported, setDailySupported] = useState(false);
  const [supporting, setSupporting] = useState(false);
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
        supporterName: myProfile?.username || 'User',
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
            {slot.supporter ? (
              <LiveSupporterSlot supporter={slot.supporter} render={({ name, avatarUrl }) => (
                <>
                  <TouchableOpacity
                    onPress={() => { if (slot.supporter?.supporterId) { setShowAll(false); onViewProfile?.(slot.supporter.supporterId); } }}
                    style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2, borderWidth: 2, borderColor: slot.color, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                  >
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) || 'https://picsum.photos/100' }}
                      style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2 }} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 14, marginTop: 4 }}>{slot.medal}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#334155', marginTop: 2 }} numberOfLines={1}>{name}</Text>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#f43f5e' }}>{getPoints(slot.supporter).toLocaleString()} pts</Text>
                </>
              )} />
            ) : (
              <>
                <TouchableOpacity disabled style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2, borderWidth: 2, borderColor: slot.color, backgroundColor: 'rgba(148,163,184,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <Text style={{ fontSize: slot.size * 0.35, color: slot.color, opacity: 0.5 }}>{slot.medal}</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, marginTop: 4 }}>{slot.medal}</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: '#CBD5E1', marginTop: 2 }}>Empty</Text>
              </>
            )}
          </View>
        ))}
      </View>

      {/* Top 10 Full Page Modal */}
      {showAll && (
        <Modal visible={showAll} animationType="slide" onRequestClose={() => setShowAll(false)}>
          <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Top Supporters</Text>
              <TouchableOpacity onPress={() => setShowAll(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs: total / weekly / monthly */}
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
                    {slot.s ? (
                      <LiveSupporterSlot supporter={slot.s} render={({ name, avatarUrl }) => (
                        <>
                          <TouchableOpacity
                            onPress={() => { if (slot.s?.supporterId) { setShowAll(false); onViewProfile?.(slot.s.supporterId); } }}
                            style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2, borderWidth: 2.5, borderColor: slot.color, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                          >
                            <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) || 'https://picsum.photos/100' }}
                              style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2 }} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 20, marginTop: 6 }}>{slot.medal}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginTop: 4 }} numberOfLines={1}>{name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#f43f5e', marginTop: 2 }}>{getPoints(slot.s).toLocaleString()} pts</Text>
                        </>
                      )} />
                    ) : (
                      <>
                        <TouchableOpacity disabled style={{ width: slot.size, height: slot.size, borderRadius: slot.size / 2, borderWidth: 2.5, borderColor: slot.color, backgroundColor: 'rgba(148,163,184,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <Text style={{ fontSize: slot.size * 0.35, color: slot.color, opacity: 0.5 }}>{slot.medal}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 20, marginTop: 6 }}>{slot.medal}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#CBD5E1', marginTop: 4 }}>Empty</Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Full List */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 8 }}>All Supporters</Text>
              {sorted.map((s: any, i: number) => (
                <LiveSupporterSlot key={s.id} supporter={s} render={({ name, avatarUrl }) => (
                  <TouchableOpacity onPress={() => { if (s.supporterId) { setShowAll(false); onViewProfile?.(s.supporterId); } }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: i < 3 ? '#f43f5e' : '#94A3B8', width: 28, textAlign: 'center' }}>{i + 1}</Text>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(avatarUrl) || 'https://picsum.photos/100' }}
                      style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#E2E8F0' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{name}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#f43f5e' }}>{getPoints(s).toLocaleString()} pts</Text>
                  </TouchableOpacity>
                )} />
              ))}
              {sorted.length === 0 && (
                <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 40, fontStyle: 'italic' }}>No supporters yet</Text>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

    </View>
  );
}
