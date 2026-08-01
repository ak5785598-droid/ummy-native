import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, StyleSheet, FlatList, Dimensions, BackHandler, TextInput, Animated, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, ShoppingBag, Check, X, Play, Gift,
  Activity, Palette, MessageSquare, Ticket, ImageIcon, User
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '@/firebase/provider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, query, orderBy, onSnapshot, doc, increment, serverTimestamp, arrayUnion, updateDoc, where, getDocs, getDoc, limit as firestoreLimit, writeBatch } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { AvatarFrame } from '@/components/profile/AvatarFrame';
import { GoldenCoin } from '@/components/GoldenCoin';
import { PinkDiamondIDBadgeIcon, SilverBlueIDBadgeIcon, IDBadgeIcon } from '@/components/native-id-badge';
import { ChatMessageBubble } from '@/components/chat-message-bubble';
import { isInventoryItemExpired } from '@/lib/types';
import { ROOM_THEMES } from '@/lib/themes';
import { toCDN } from '@/lib/cdn';

const LOCAL_FRAME_ASSETS: Record<string, any> = {
  'sea_sands': require('../../../assets/images/sea_sands_frame.png'),
  'sea_sands_frame': require('../../../assets/images/sea_sands_frame.png'),
  'basra': require('../../../assets/images/basra_frame.png'),
  'basra_frame': require('../../../assets/images/basra_frame.png'),
  'top3family_topuser': require('../../../assets/images/top3family_topuser.png'),
  'top2family_topuser': require('../../../assets/images/top2family_topuser.png'),
  'b-cosmic-star': require('../../../assets/images/cosmic_star_bubble_v2.png'),
  'b-royal-gold': require('../../../assets/images/royal_gold_bubble_v2.png'),
  'event_rank1_frame': require('../../../assets/animations/frame_event_based_1-ezgif.com-effects.gif'),
  'event_rank2_frame': require('../../../assets/animations/frame_event_based_2-ezgif.com-effects.gif'),
  'event_rank3_frame': require('../../../assets/animations/frame_event_based_3-ezgif.com-effects.gif'),
  'cp_king_frame': require('../../../assets/animations/frame_cp_king_1-ezgif.com-effects.gif'),
  'cp_queen_frame': require('../../../assets/animations/frame_cp_queen-ezgif.com-effects.gif'),
};

const cleanItemName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\b2025\b/g, '').replace(/\b2026\b/g, '').replace(/\s+/g, ' ').trim();
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

// ─── Static Wave Items ─────────────────────────────────────────────────────
const STATIC_WAVE_ITEMS = [
  { id: 'w-lovelyshine', name: 'Lovely Shine', type: 'Wave', price: 59999, durationDays: 7, description: 'Magical blue glow with floating hearts.', color: '#60a5fa' },
  { id: 'w-waveflew', name: 'Waveflew', type: 'Wave', price: 10000, durationDays: 7, description: 'Premium 3D Glossy frequency wave.', color: '#e2e8f0' },
  { id: 'w-tonepink', name: 'Tone Pink', type: 'Wave', price: 30000, durationDays: 7, description: '3D Glossy Pink rhythmic frequency.', color: '#f472b6' },
  { id: 'w-vox', name: 'Vox', type: 'Wave', price: 30500, durationDays: 7, description: 'Crystal blue 3D glossy voice wave.', color: '#3b82f6' },
  { id: 'w-reso', name: 'Reso', type: 'Wave', price: 20000, durationDays: 7, description: 'Neon green resonance 3D glossy wave.', color: '#22c55e' },
  { id: 'w-echo', name: 'Echo', type: 'Wave', price: 25999, durationDays: 7, description: 'Vibrant orange echo 3D glossy frequency.', color: '#f97316' },
];

const STATIC_BUBBLE_ITEMS = [
  { id: 'b-cosmic-star', name: 'Cosmic Star Bubble', type: 'Bubble', price: 150000, durationDays: 30, description: 'Deep cosmic indigo-purple gradient with constellations and shooting stars.' },
  { id: 'b-royal-gold', name: 'Royal Gold Bubble', type: 'Bubble', price: 250000, durationDays: 30, description: 'Rich royal golden gradient theme with detailed vector scrollwork borders.' },
  { id: 'heart-bubble', name: 'Heart Bubble', type: 'Bubble', price: 80000, durationDays: 30, description: 'Lovely pink bubble with falling roses.' },
  { id: 'love-bubble', name: 'Love Letter Bubble', type: 'Bubble', price: 90000, durationDays: 30, description: 'Romantic red love letter theme.' },
  { id: 'evil-bubble', name: 'Evil Devil Bubble', type: 'Bubble', price: 100000, durationDays: 30, description: 'Deep purple devil themed bubble.' },
  { id: 'candy-bubble', name: 'Candy Donut Bubble', type: 'Bubble', price: 85000, durationDays: 30, description: 'Sweet donut candy themed bubble.' },
  { id: 'neon-cyber', name: 'Neon Cyber Bubble', type: 'Bubble', price: 120000, durationDays: 30, description: 'Futuristic glowing cyan cyber bubble.' },
  { id: 'ice-crystal', name: 'Ice Crystal Bubble', type: 'Bubble', price: 75000, durationDays: 30, description: 'Chilly snow-falling ice crystal bubble.' },
  { id: 'halloween-2025', name: 'Halloween Pumpkin Bubble', type: 'Bubble', price: 95000, durationDays: 30, description: 'Spooky orange pumpkin bubble.' },
  { id: 'christmas-2025', name: 'Christmas Tree Bubble', type: 'Bubble', price: 95000, durationDays: 30, description: 'Festive red Christmas theme.' },
  { id: 'coin-seller', name: 'Coin Merchant Bubble', type: 'Bubble', price: 110000, durationDays: 30, description: 'Merchant style green money bubble.' },
  { id: 'zodiac-2026', name: 'Zodiac Star Bubble', type: 'Bubble', price: 130000, durationDays: 30, description: 'Astral space zodiac star bubble.' }
];

const STATIC_ENTRY_ITEMS: any[] = [];

const STATIC_FRAME_ITEMS = [
  { id: 'f-red-fire', name: 'Red Fire Frame', type: 'Frame', price: 500000, durationDays: 30, description: 'Intense red fire avatar frame with blazing flames.', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Fred_fire.png?alt=media' },
  { id: 'f-horror-gold', name: 'Horror Gold Frame', type: 'Frame', price: 500000, durationDays: 30, description: 'Premium horror gold avatar frame with dark elegance.', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Fhorror_gold.png?alt=media' },
  { id: 'f-wings-gold', name: 'Wings Gold Frame', type: 'Frame', price: 500000, durationDays: 30, description: 'Majestic golden wings avatar frame.', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Fwings_gold.png?alt=media' },
  { id: 'sea_sands', name: 'Sea Sands Frame', type: 'Frame', price: 300000, durationDays: 30, description: 'Beautiful summer sea beach sand style frame with rising bubbles.', imageUrl: 'sea_sands' },
  { id: 'basra', name: 'Basra Golden Frame', type: 'Frame', price: 320000, durationDays: 30, description: 'Exclusive tea cup and branches gold frame with star glimmers.', imageUrl: 'basra' },
  { id: 'top3family_topuser', name: 'Top 3 Family User Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 3 Family User Reward Frame.', imageUrl: 'top3family_topuser', notForSale: true, requiredTag: 'Top 3 Family' },
  { id: 'top2family_topuser', name: 'Top 2 Family User Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 2 Family User Reward Frame.', imageUrl: 'top2family_topuser', notForSale: true, requiredTag: 'Top 2 Family' },
  { id: 'official-frame-1', name: 'Official Frame 1', type: 'Frame', price: 0, durationDays: 9999, description: 'Exclusive Official Frame — Only for verified official accounts.', videoUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Fofficial%2Fofficial_1_video.gif?alt=media', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Fofficial%2Fofficial_1_image.png?alt=media', notForSale: true, requiredTag: 'Official' },
  { id: 'official-frame-2', name: 'Official Frame 2', type: 'Frame', price: 0, durationDays: 9999, description: 'Exclusive Official Frame — Only for verified official accounts.', videoUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Fofficial%2Fofficial_2_video.gif?alt=media', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Fofficial%2Fofficial_2_image.png?alt=media', notForSale: true, requiredTag: 'Official' },
  // Event Based Frames — Leaderboard Top 1/2/3 (Not for Sale, earned via ranking)
  { id: 'event_rank1_frame', name: 'Top 1 Leaderboard Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 1 Leaderboard Reward Frame — Event Based.', videoUrl: require('../../../assets/animations/frame_event_based_1-ezgif.com-effects.gif'), imageUrl: require('../../../assets/animations/frame_event_based_1-ezgif.com-effects.gif'), notForSale: true, eventBased: true },
  { id: 'event_rank2_frame', name: 'Top 2 Leaderboard Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 2 Leaderboard Reward Frame — Event Based.', videoUrl: require('../../../assets/animations/frame_event_based_2-ezgif.com-effects.gif'), imageUrl: require('../../../assets/animations/frame_event_based_2-ezgif.com-effects.gif'), notForSale: true, eventBased: true },
  { id: 'event_rank3_frame', name: 'Top 3 Leaderboard Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 3 Leaderboard Reward Frame — Event Based.', videoUrl: require('../../../assets/animations/frame_event_based_3-ezgif.com-effects.gif'), imageUrl: require('../../../assets/animations/frame_event_based_3-ezgif.com-effects.gif'), notForSale: true, eventBased: true },
  // CP King & Queen Frames — Top CP Pair (Not for Sale, earned via CP ranking)
  { id: 'cp_king_frame', name: 'CP King Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive CP King Frame — Awarded to Top 1 CP Pair.', videoUrl: require('../../../assets/animations/frame_cp_king_1-ezgif.com-effects.gif'), imageUrl: require('../../../assets/animations/frame_cp_king_1-ezgif.com-effects.gif'), notForSale: true, eventBased: true },
  { id: 'cp_queen_frame', name: 'CP Queen Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive CP Queen Frame — Awarded to Top 1 CP Pair.', videoUrl: require('../../../assets/animations/frame_cp_queen-ezgif.com-effects.gif'), imageUrl: require('../../../assets/animations/frame_cp_queen-ezgif.com-effects.gif'), notForSale: true, eventBased: true },
  { id: 'super_admin_zoro_frame', name: 'Super Admin Zoro Frame', type: 'Frame', price: 0, durationDays: 9999, description: 'Exclusive Super Admin Zoro Frame.', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Fsuper_admin_zoro.png?alt=media', notForSale: true },
  { id: 'super_admin_arya_frame', name: 'Super Admin Arya Frame', type: 'Frame', price: 0, durationDays: 9999, description: 'Exclusive Super Admin Arya Frame.', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Fsuper_admin_arya_v2.png?alt=media', notForSale: true },
];

const STATIC_ID_ITEMS = [
  { id: 'theme-pink', name: 'Pink Diamond ID', type: 'ID', price: 0, durationDays: 7, description: 'Exclusive Premium Pink ID Diamond Badge theme.', isPinkDiamond: true },
  { id: 'theme-silver', name: 'Silver Blue ID', type: 'ID', price: 0, durationDays: 7, description: 'Exclusive Premium Silver Blue ID Badge theme.', isSilver: true },
  { id: 'theme-gold', name: 'Gold SSS ID', type: 'ID', price: 0, durationDays: 7, description: 'Exclusive VIP Gold SSS ID Badge theme.', variant: 'red' },
];

const STORE_WAVE_COLOR_MAP: Record<string, { color: string; glow: string }> = {
  'w-lovelyshine': { color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.35)' },
  'w-waveflew':    { color: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.35)' },
  'w-tonepink':    { color: '#f472b6', glow: 'rgba(244, 114, 182, 0.35)' },
  'w-vox':         { color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.35)' },
  'w-reso':        { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.35)' },
  'w-echo':        { color: '#f97316', glow: 'rgba(249, 115, 22, 0.35)' },
};

function StoreWaveBreathingBadge({ waveId, itemColor }: { waveId: string; itemColor?: string }) {
  const breatheAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.4)).current;

  const config = STORE_WAVE_COLOR_MAP[waveId || ''] || { color: itemColor || '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' };

  React.useEffect(() => {
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breatheAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(breatheAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    breatheLoop.start();
    return () => breatheLoop.stop();
  }, []);

  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Outer Breathing Glowing Aura */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 72, height: 72,
          borderRadius: 36,
          borderWidth: 2,
          borderColor: config.color,
          backgroundColor: config.glow,
          transform: [{ scale: breatheAnim }],
          opacity: opacityAnim,
        }}
      />

      {/* Inner Ring */}
      <View
        style={{
          position: 'absolute',
          width: 58, height: 58,
          borderRadius: 29,
          borderWidth: 2,
          borderColor: config.color,
          shadowColor: config.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
        }}
      />

      {/* Center Dark Glossy Disc with Equalizer Waves */}
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: '#0f172a',
        borderWidth: 1.5, borderColor: config.color,
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 3, paddingHorizontal: 6,
      }}>
        {/* Equalizer Frequency Bars */}
        <View style={{ width: 3, height: 12, backgroundColor: config.color, borderRadius: 2 }} />
        <View style={{ width: 3, height: 22, backgroundColor: config.color, borderRadius: 2 }} />
        <View style={{ width: 3.5, height: 28, backgroundColor: config.color, borderRadius: 2 }} />
        <View style={{ width: 3, height: 18, backgroundColor: config.color, borderRadius: 2 }} />
        <View style={{ width: 3, height: 10, backgroundColor: config.color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

const STORE_WAVE_PARTICLES_MAP: Record<string, string[]> = {
  'w-lovelyshine': ['✨', '🩵', '✨'],
  'w-tonepink':    ['✨', '🩷', '✨'],
  'w-vox':         ['⚡', '🌐', '⚡'],
  'w-reso':        ['✨', '🍀', '✨'],
  'w-echo':        ['🔥', '💥', '🔥'],
  'w-waveflew':    ['💎', '✨', '💎'],
};

function StoreWaveRingPreview({ waveId }: { waveId: string }) {
  const pulse1 = React.useRef(new Animated.Value(1)).current;
  const pulse2 = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const sparkleAnim = React.useRef(new Animated.Value(0)).current;

  const config = STORE_WAVE_COLOR_MAP[waveId || ''] || { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.25)' };
  const particles = STORE_WAVE_PARTICLES_MAP[waveId || ''] || ['✨', '🎙️', '✨'];

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(sparkleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(sparkleAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    );

    loop.start();
    rotateLoop.start();

    return () => {
      loop.stop();
      rotateLoop.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleTy = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  return (
    <>
      {/* Outer Pulse Glow Ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 84, height: 84,
          borderRadius: 42,
          borderWidth: 2,
          borderColor: config.color,
          backgroundColor: config.glow,
          transform: [{ scale: pulse2 }],
        }}
        pointerEvents="none"
      />

      {/* Rotating Dashed Orbit Ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 76, height: 76,
          borderRadius: 38,
          borderWidth: 1.5,
          borderColor: config.color,
          borderStyle: 'dashed',
          transform: [{ rotate: spin }, { scale: pulse1 }],
        }}
        pointerEvents="none"
      />

      {/* Floating Preview Particles */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -14, left: 0, right: 0,
          alignItems: 'center',
          transform: [{ translateY: sparkleTy }],
        }}
        pointerEvents="none"
      >
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {particles.map((p, i) => (
            <Text key={i} style={{ fontSize: 11 }}>{p}</Text>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

// ─── Tab definition ─────────────────────────────────────────────────────────
const TABS = ['Store', 'My Items'];

export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const [activeTab, setActiveTab] = useState('Store');
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [roomThemes, setRoomThemes] = useState<any[]>([]);
  const [medalsList, setMedalsList] = useState<any[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeType, setActiveType] = useState('Frame');
  const [activatingEntry, setActivatingEntry] = useState<string | null>(null);
  const [activatingItem, setActivatingItem] = useState<string | null>(null);
  const [showRecipientSearch, setShowRecipientSearch] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  // Custom ID Store states & logic
  const [customIdInput, setCustomIdInput] = useState('');
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idAvailability, setIdAvailability] = useState<'none' | 'available' | 'taken' | 'invalid'>('none');
  const [checkedId, setCheckedId] = useState('');

  const getDynamicIDPrice = (idString: string, duration: number) => {
    const len = idString.length;
    let basePrice = 5000; // 8 digits default
    if (len === 1) basePrice = 1000000;
    else if (len === 2) basePrice = 500000;
    else if (len === 3) basePrice = 250000;
    else if (len === 4) basePrice = 100000;
    else if (len === 5) basePrice = 50000;
    else if (len === 6) basePrice = 20000;
    else if (len === 7) basePrice = 10000;

    // Duration multiplier
    if (duration === 3) return Math.floor(basePrice * 0.5);
    if (duration === 7) return basePrice;
    if (duration === 15) return basePrice * 2;
    if (duration === 30) return Math.floor(basePrice * 3.5);
    return basePrice;
  };

  const checkIdAvailability = async () => {
    if (!firestore) return;
    const trimmed = customIdInput.trim();
    if (trimmed.length < 1 || trimmed.length > 8 || !/^\d+$/.test(trimmed)) {
      setIdAvailability('invalid');
      return;
    }
    setIsCheckingId(true);
    try {
      const snap = await getDoc(doc(firestore, 'taken_ids', trimmed));
      
      if (!snap.exists()) {
        setIdAvailability('available');
        setCheckedId(trimmed);
      } else {
        const docData = snap.data();
        const expiryStr = docData?.expiry;
        if (expiryStr) {
          const expiryDate = new Date(expiryStr);
          if (expiryDate.getTime() < Date.now()) {
            // Expired, therefore available
            setIdAvailability('available');
            setCheckedId(trimmed);
          } else {
            setIdAvailability('taken');
          }
        } else {
          setIdAvailability('taken');
        }
      }
    } catch (err) {
      setIdAvailability('taken');
    } finally {
      setIsCheckingId(false);
    }
  };

  // Back handler: preview → category → exit
  useEffect(() => {
    const onBackPress = () => {
      if (previewItem) { setPreviewItem(null); return true; }
      if (activeType !== 'Frame') { setActiveType('Frame'); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [previewItem, activeType]);

  // Load global app config for storeNotForSale flags
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, 'appConfig', 'global'), (snap: any) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
    }, () => {});
    return () => unsub();
  }, [firestore]);

  // Fetch dynamic store items from Firestore
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'storeItems'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setStoreItems(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      setIsLoadingStore(false);
    }, () => {
      setIsLoadingStore(false);
    });
    return () => unsub();
  }, [firestore]);

  // Fetch room themes
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'roomThemes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setRoomThemes(snap.docs.map((d: any) => ({ id: d.id, ...d.data(), type: 'Theme' })));
    }, () => {});
    return () => unsub();
  }, [firestore]);

  // Fetch medals list (for My Items medal display)
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'medalsList'));
    const unsub = onSnapshot(q, (snap: any) => {
      setMedalsList(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [firestore]);

  // Combine all items
  const allItems = useMemo(() => {
    const dynamic = storeItems.map(item => {
      const rawUrl = item.imageUrl || item.url || null;
      const isVideoUrl = rawUrl && (rawUrl.includes('.mp4') || rawUrl.includes('video'));
      const imageUrl = isVideoUrl ? null : rawUrl;
      const videoUrl = isVideoUrl ? rawUrl : (item.videoUrl || null);
      let entryType = item.entryType || null;
      if (item.category === 'Entry' && !entryType) {
        const name = (item.name || '').toLowerCase();
        if (name.includes('dragon')) entryType = 'dragon';
        else if (name.includes('lion')) entryType = 'lion';
        else entryType = 'line';
      }
      return {
        ...item,
        imageUrl,
        videoUrl,
        entryType,
        type: item.category || item.type,
        description: item.description || `Premium ${item.name} asset.`,
      };
    });
    const themes = roomThemes.filter(t => (t.price || 0) > 0).map(t => ({
      ...t,
      description: t.description || `High-fidelity ${t.name} background.`,
    }));
    return [...dynamic, ...themes, ...STATIC_WAVE_ITEMS, ...STATIC_ENTRY_ITEMS, ...STATIC_FRAME_ITEMS, ...STATIC_ID_ITEMS, ...STATIC_BUBBLE_ITEMS];
  }, [storeItems, roomThemes]);

  const storeNotForSale = config?.storeNotForSale || {};

  const allItemsWithFlags = useMemo(() => {
    return allItems
      .map(item => ({ 
        ...item, 
        notForSale: !!storeNotForSale[item.id] || !!item.notForSale 
      }));
  }, [allItems, storeNotForSale]);

  const ORDERED_TYPES = ['Frame', 'Theme', 'Bubble', 'Wave', 'Entry', 'ID'];
  const TYPE_FILTERS = useMemo(() => {
    const typesInItems = new Set(allItemsWithFlags.map(i => i.type).filter(Boolean));
    const ordered = ORDERED_TYPES.filter(t => typesInItems.has(t));
    // Add any remaining types not explicitly listed
    for (const t of typesInItems) {
      if (!ordered.includes(t)) ordered.push(t);
    }
    return ordered;
  }, [allItemsWithFlags]);

  const filteredItems = useMemo(() => {
    const items = allItemsWithFlags.filter(i => i.type === activeType);
    const regularItems = items.filter(i => !i.notForSale);
    const notForSaleItems = items.filter(i => i.notForSale);
    return [...regularItems, ...notForSaleItems];
  }, [allItemsWithFlags, activeType]);

  // My Items: every owned asset (catalog-matched OR fallback) + SVIP privileges + medals
  const purchasedItems = useMemo(() => {
    const inventory = userProfile?.inventory as any;
    const svip = (userProfile as any)?.svipPrivileges || null;
    const expiries = inventory?.expiries || {};
    const now = new Date();
    const isValid = (id: string) => {
      const exp = expiries[id];
      if (!exp) return true;
      const expDate = exp?.toDate ? exp.toDate() : new Date(exp);
      return expDate > now;
    };

    const catalogMap = new Map(allItems.map(i => [i.id, i]));
    const themeCatalog = [...ROOM_THEMES, ...roomThemes];
    const ownedIds: string[] = Array.isArray(inventory?.ownedItems) ? inventory.ownedItems : [];
    const result: any[] = [];

    // Resolve owned IDs that are NOT in the store catalog (reward/event frames etc.)
    const resolveFallback = (id: string): any => {
      const weeklyMatch = id.match(/^(.+)_(honor|charm|room|family|cp)_rank([123])_(weekly|monthly)$/i);
      if (weeklyMatch) {
        const themeId = weeklyMatch[1];
        const category = weeklyMatch[2];
        const rank = weeklyMatch[3];
        const period = weeklyMatch[4];
        const theme = themeCatalog.find(t => t.id === themeId);
        const catNames: Record<string, string> = { honor: 'Honor', charm: 'Charm', room: 'Room', family: 'Family', cp: 'CP' };
        const themeName = theme?.name ? `${theme.name} ` : '';
        return {
          id,
          name: `${themeName}Top ${rank} ${catNames[category.toLowerCase()] || category} ${period === 'weekly' ? 'Weekly' : 'Monthly'} Frame`,
          type: 'Frame',
          mediaUrl: theme && typeof theme.url === 'string' ? theme.url : null,
          notForSale: true,
          eventBased: true,
          rewardInfo: true,
          source: 'inventory',
        };
      }
      const levelMatch = id.match(/^level_(\d+)_frame$/i);
      if (levelMatch) {
        return { id, name: `Level ${levelMatch[1]} Reward Frame`, type: 'Frame', mediaUrl: null, notForSale: true, rewardInfo: true, source: 'inventory' };
      }
      return { id, name: id, type: 'Frame', mediaUrl: null, notForSale: true, rewardInfo: true, source: 'inventory' };
    };

    for (const id of ownedIds) {
      if (!isValid(id)) continue;
      const cat = catalogMap.get(id);
      result.push(cat ? { ...cat, source: 'inventory' } : resolveFallback(id));
    }

    // SVIP privilege pseudo-items (skip if the same asset is already owned via inventory)
    if (svip) {
      if (svip.frameUrl && !ownedIds.includes('__svip_frame__')) {
        result.push({ id: '__svip_frame__', name: 'SVIP Frame', type: 'Frame', mediaUrl: svip.frameUrl, notForSale: true, source: 'svip' });
      }
      if (svip.bubbleId && !ownedIds.includes(svip.bubbleId)) {
        result.push({ id: svip.bubbleId, name: 'SVIP Bubble', type: 'Bubble', mediaUrl: svip.bubbleUrl || null, notForSale: true, source: 'svip' });
      }
      if (svip.waveId && !ownedIds.includes(svip.waveId)) {
        result.push({ id: svip.waveId, name: 'SVIP Wave', type: 'Wave', mediaUrl: null, color: '#c084fc', notForSale: true, source: 'svip' });
      }
      if (svip.entranceType) {
        result.push({ id: '__svip_entry__', name: 'SVIP Entrance', type: 'Entry', entryType: svip.entranceType, mediaUrl: svip.entranceUrl || null, notForSale: true, source: 'svip' });
      }
    }

    // Medals (display-only cards)
    const ownedMedals: string[] = Array.isArray(userProfile?.medals) ? (userProfile?.medals as string[]) : [];
    for (const mid of ownedMedals) {
      const m = medalsList.find(x => x.id === mid);
      result.push({ id: `medal_${mid}`, name: m?.name || mid, type: 'Medal', mediaUrl: m?.imageUrl || null, notForSale: true, source: 'medal' });
    }

    return result;
  }, [userProfile, allItems, roomThemes, medalsList]);

  const isItemOwned = (itemId: string) => {
    const inventory = userProfile?.inventory as any;
    if (!inventory?.ownedItems?.includes(itemId)) return false;
    const exp = inventory.expiries?.[itemId];
    if (!exp) return true;
    const expDate = exp?.toDate ? exp.toDate() : new Date(exp);
    return expDate > new Date();
  };

  const activeEntryEffect = (userProfile?.inventory as any)?.activeEntryEffect || null;
  const activeFrameId = (userProfile?.inventory as any)?.activeFrame || null;
  const activeWaveId = (userProfile?.inventory as any)?.activeWave || null;
  const activeBubble = userProfile?.inventory?.activeBubble || null;
  const isExpired = isInventoryItemExpired(userProfile?.inventory, activeBubble);
  const inventoryBubble = isExpired ? null : activeBubble;
  const bubbleToSend = inventoryBubble || userProfile?.svipPrivileges?.bubbleId || null;
  const bubbleMediaUrl = (userProfile?.inventory as any)?.activeBubbleMediaUrl || null;
  const activeBubbleId = bubbleToSend;
  const getPrice = (item: any, duration: number) => {
    if (!item) return 0;
    if (item.type === 'ID') {
      return getDynamicIDPrice(checkedId || '888888', duration);
    }
    return duration === 7 ? item.price : Math.floor((item.price / 7) * 3);
  };

  const handlePurchase = async () => {
    if (!previewItem || !user || !firestore || isProcessing) return;
    // Not for Sale check — only official/admin users can purchase
    if (previewItem.notForSale || !!previewItem.isNotForSale) {
      const isOfficial = userProfile?.tags?.some((t: string) => 
        ['Official', 'Admin', 'Creator', 'Seller', 'Seller center', 'Coin Seller'].includes(t)
      ) || user?.uid === '901piBzTQ0VzCtAvlyyobwvAaTs1';
      if (!isOfficial) {
        Alert.alert('Not for Sale', 'This item is exclusive and not for sale to general members.');
        return;
      }
    }
    // Required tag check — only authorized users can purchase
    if (previewItem.requiredTag) {
      const hasTag = userProfile?.tags?.some((t: string) => t.includes(previewItem.requiredTag));
      if (!hasTag) {
        Alert.alert('Restricted', `This frame is exclusive to ${previewItem.requiredTag} members only.`);
        return;
      }
    }
    if (previewItem.type === 'ID' && (!checkedId || idAvailability !== 'available')) {
      Alert.alert('Search ID First', 'Please enter a custom ID and check its availability first.');
      return;
    }
    
    const finalPrice = getPrice(previewItem, selectedDuration);
    const coins = userProfile?.wallet?.coins || 0;
    if (coins < finalPrice) {
      Alert.alert('Insufficient Coins', `You need ${finalPrice.toLocaleString()} coins but have ${coins.toLocaleString()}.`);
      return;
    }
    setIsProcessing(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedDuration);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const userRef = doc(firestore, 'users', user.uid);
      const batch = writeBatch(firestore);

      if (previewItem.type === 'ID') {
        const trimmed = checkedId;
        const checkSnap = await getDoc(doc(firestore, 'taken_ids', trimmed));
        
        if (checkSnap.exists()) {
          const docData = checkSnap.data();
          const expiryStr = docData?.expiry;
          if (expiryStr) {
            const expiryDateCheck = new Date(expiryStr);
            if (expiryDateCheck.getTime() >= Date.now()) {
              Alert.alert('ID Already Taken', `ID ${trimmed} was just taken by another user.`);
              setIsProcessing(false);
              return;
            }
          }
        }
        
        // Write the taken ID doc
        const takenIdRef = doc(firestore, 'taken_ids', trimmed);
        batch.set(takenIdRef, {
          displayId: trimmed,
          ownerUid: user.uid,
          expiry: expiryDate.toISOString(),
          badgeTheme: previewItem.id,
          createdAt: serverTimestamp()
        });

        // Set active ID badge in profile
        const activeIdBadge = {
          displayId: trimmed,
          isPinkDiamond: previewItem.isPinkDiamond || false,
          isSilver: previewItem.isSilver || false,
          variant: previewItem.variant || '',
          expiry: expiryDate.toISOString()
        };

        const originalId = userProfile?.originalAccountNumber || userProfile?.accountNumber || '';
        const profileUpdates: any = {
          'wallet.coins': increment(-finalPrice),
          activeIdBadge: activeIdBadge,
          accountNumber: trimmed,
          updatedAt: serverTimestamp()
        };
        if (!userProfile?.originalAccountNumber) {
          profileUpdates.originalAccountNumber = originalId;
        }

        batch.update(profileRef, profileUpdates);
      } else {
        const updateData: any = {
          'wallet.coins': increment(-finalPrice),
          'inventory.ownedItems': arrayUnion(previewItem.id),
          [`inventory.expiries.${previewItem.id}`]: expiryDate.toISOString(),
          updatedAt: serverTimestamp(),
        };
        if (previewItem.type === 'Entry') {
          let entryType = previewItem.entryType;
          if (!entryType) {
            const name = (previewItem.name || '').toLowerCase();
            if (name.includes('dragon')) entryType = 'dragon';
            else if (name.includes('lion')) entryType = 'lion';
            else entryType = 'line';
          }
          const entryVideo = previewItem.videoUrl || previewItem.imageUrl || null;
          updateData['inventory.entryTypes'] = arrayUnion(entryType);
          updateData['inventory.activeEntryEffect'] = entryType;
          updateData['inventory.activeEntryVideoUrl'] = entryVideo;
        }
        batch.update(profileRef, updateData);
        batch.update(userRef, updateData);
      }

      if (previewItem.type === 'ID') {
        const userUpdates: any = { 
          'wallet.coins': increment(-finalPrice), 
          accountNumber: checkedId,
          updatedAt: serverTimestamp() 
        };
        const originalId = userProfile?.originalAccountNumber || userProfile?.accountNumber || '';
        if (!userProfile?.originalAccountNumber) {
          userUpdates.originalAccountNumber = originalId;
        }
        batch.update(userRef, userUpdates);
      }
      await batch.commit();
      Alert.alert('✅ Purchase Successful!', `${previewItem.name} added to your inventory.`);
      setPreviewItem(null);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const searchRecipients = async (q: string) => {
    if (!firestore || q.length < 2) { setRecipientResults([]); return; }
    setIsSearchingRecipient(true);
    try {
      const isNumeric = /^\d+$/.test(q.trim());
      let results: any[] = [];

      if (isNumeric) {
        // accountNumber is stored as STRING in Firestore — must compare as string
        const snap = await getDocs(query(
          collection(firestore, 'users'),
          where('accountNumber', '==', q.trim()),
          firestoreLimit(10)
        ));
        results = snap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));
      } else {
        // Search by username prefix match
        const snap = await getDocs(query(
          collection(firestore, 'users'),
          where('username', '>=', q.toLowerCase()),
          where('username', '<=', q.toLowerCase() + '\uf8ff'),
          firestoreLimit(10)
        ));
        results = snap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));
      }

      setRecipientResults(results.filter((u: any) => u.uid !== user?.uid));
    } catch {}
    setIsSearchingRecipient(false);
  };

  const handleSendAsGift = async () => {
    if (!previewItem || !user || !firestore || !selectedRecipient || isProcessing) return;
    // Not for Sale check — only official/admin users can purchase/gift
    if (previewItem.notForSale || !!previewItem.isNotForSale) {
      const isOfficial = userProfile?.tags?.some((t: string) => 
        ['Official', 'Admin', 'Creator', 'Seller', 'Seller center', 'Coin Seller'].includes(t)
      ) || user?.uid === '901piBzTQ0VzCtAvlyyobwvAaTs1';
      if (!isOfficial) {
        Alert.alert('Not for Sale', 'This item is exclusive and not for sale to general members.');
        return;
      }
    }
    const finalPrice = getPrice(previewItem, selectedDuration);
    const coins = userProfile?.wallet?.coins || 0;
    if (coins < finalPrice) {
      Alert.alert('Insufficient Coins', `You need ${finalPrice.toLocaleString()} coins but have ${coins.toLocaleString()}.`);
      return;
    }
    setIsProcessing(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedDuration);
      const senderProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const senderUserRef = doc(firestore, 'users', user.uid);
      const recipientProfileRef = doc(firestore, 'users', selectedRecipient.uid, 'profile', selectedRecipient.uid);
      const recipientUserRef = doc(firestore, 'users', selectedRecipient.uid);
      const deductData = {
        'wallet.coins': increment(-finalPrice),
        updatedAt: serverTimestamp(),
      };
      const batch = writeBatch(firestore);
      batch.update(senderProfileRef, deductData);
      batch.update(senderUserRef, deductData);
      
      const recipientInventoryUpdate = {
        'inventory.ownedItems': arrayUnion(previewItem.id),
        [`inventory.expiries.${previewItem.id}`]: expiryDate.toISOString(),
        updatedAt: serverTimestamp(),
      };
      batch.update(recipientProfileRef, recipientInventoryUpdate);
      batch.update(recipientUserRef, recipientInventoryUpdate);
      const recipientNotifRef = doc(collection(firestore, 'users', selectedRecipient.uid, 'notifications'));
      batch.set(recipientNotifRef, {
        title: 'Gift Received!',
        content: `${userProfile?.username || 'Someone'} sent you "${previewItem.name}" as a gift!`,
        type: 'gift',
        timestamp: serverTimestamp(),
        isRead: false,
      });
      await batch.commit();
      Alert.alert('✅ Gift Sent!', `${previewItem.name} sent to ${selectedRecipient.username || 'user'}.`);
      setSelectedRecipient(null);
      setShowRecipientSearch(false);
      setPreviewItem(null);
    } catch (err: any) {
      Alert.alert('Send Failed', err.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseEntryEffect = async (item: any) => {
    if (!user || !firestore || activatingEntry) return;
    setActivatingEntry(item.id);
    try {
      let entryType = item.entryType;
      if (!entryType) {
        const name = (item.name || '').toLowerCase();
        if (name.includes('dragon')) entryType = 'dragon';
        else if (name.includes('lion')) entryType = 'lion';
        else entryType = 'line';
      }
      const videoUrl = item.videoUrl || item.imageUrl || item.mediaUrl || null;
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(profileRef, {
        'inventory.activeEntryEffect': entryType,
        'inventory.activeEntryVideoUrl': videoUrl,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(userRef, {
        'inventory.activeEntryEffect': entryType,
        'inventory.activeEntryVideoUrl': videoUrl,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('✅ Activated!', `${item.name} is now your active entry effect.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not activate entry effect.');
    } finally {
      setActivatingEntry(null);
    }
  };

  const handleUseItem = async (item: any) => {
    if (!user || !firestore || activatingItem) return;
    // Required tag check — only authorized users can activate
    if (item.requiredTag) {
      const hasTag = userProfile?.tags?.some((t: string) => t.includes(item.requiredTag));
      if (!hasTag) {
        Alert.alert('Restricted', `This frame is exclusive to ${item.requiredTag} members only.`);
        return;
      }
    }
    setActivatingItem(item.id);
    try {
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const userRef = doc(firestore, 'users', user.uid);
      // For local assets (require'd), use item ID as media URL so AvatarFrame can resolve from LOCAL_FRAME_ASSETS
      const isLocalAsset = item.imageUrl && typeof item.imageUrl === 'number';
      const itemUrl = isLocalAsset ? item.id : (item.videoUrl || item.imageUrl || item.mediaUrl || null);
      let field: string;
      if (item.type === 'Frame') { field = 'inventory.activeFrame'; }
      else if (item.type === 'Wave') { field = 'inventory.activeWave'; }
      else if (item.type === 'Bubble') { field = 'inventory.activeBubble'; }
      else if (item.type === 'ID') { field = 'inventory.activeID'; }
      else { setActivatingItem(null); return; }
      const urlField = field + 'MediaUrl';
      const updateData: any = { [field]: item.id, updatedAt: serverTimestamp() };
      if (itemUrl && item.type !== 'ID') updateData[urlField] = itemUrl;
      if (item.type === 'ID') {
        updateData['inventory.activeIdBadge'] = {
          displayId: item.displayId || null,
          isPinkDiamond: !!item.isPinkDiamond,
          isSilver: !!item.isSilver,
          id: item.id
        };
      }
      if (item.type === 'Wave') updateData['activeWave'] = item.id;
      await updateDoc(profileRef, updateData);
      await updateDoc(userRef, updateData);
      Alert.alert('✅ Activated!', `${item.name} is now your active ${item.type.toLowerCase()}.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not activate item.');
    } finally {
      setActivatingItem(null);
    }
  };

  const handleRemoveItem = async (item: any) => {
    if (!user || !firestore) return;
    Alert.alert('Remove Item', `Remove ${item.name} from active?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
            const userRef = doc(firestore, 'users', user.uid);
            let field: string;
            if (item.type === 'Frame') field = 'inventory.activeFrame';
            else if (item.type === 'Wave') field = 'inventory.activeWave';
            else if (item.type === 'Bubble') field = 'inventory.activeBubble';
            else if (item.type === 'Entry') field = 'inventory.activeEntryEffect';
            else if (item.type === 'ID') field = 'inventory.activeID';
            else return;
            const urlField = field + 'MediaUrl';
            const updateData: any = { [field]: null, updatedAt: serverTimestamp() };
            if (field !== 'inventory.activeEntryEffect' && field !== 'inventory.activeID') updateData[urlField] = null;
            if (field === 'inventory.activeEntryEffect') updateData['inventory.activeEntryVideoUrl'] = null;
            if (field === 'inventory.activeID') updateData['inventory.activeIdBadge'] = null;
            await updateDoc(profileRef, updateData);
            await updateDoc(userRef, updateData);
            Alert.alert('✅ Removed', `${item.name} deactivated.`);
          } catch (err: any) {
            Alert.alert('Failed', err.message || 'Could not remove item.');
          }
        }
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const owned = isItemOwned(item.id) || item.source === 'svip' || item.source === 'medal';
    const rawMediaUrl = item.imageUrl || item.url || item.videoUrl || item.mediaUrl || null;
    const mediaUrl = (typeof rawMediaUrl === 'string' && rawMediaUrl.startsWith('http')) ? rawMediaUrl : null;
    const isVideo = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm') || mediaUrl.includes('video'));
    const isEntryItem = item.type === 'Entry';
    let itemEntryType = item.entryType;
    if (isEntryItem && !itemEntryType) {
      const name = (item.name || '').toLowerCase();
      if (name.includes('dragon')) itemEntryType = 'dragon';
      else if (name.includes('lion')) itemEntryType = 'lion';
      else itemEntryType = 'line';
    }
    const isActiveEntry = isEntryItem && owned && activeEntryEffect === itemEntryType;
    const isFrameItem = item.type === 'Frame';
    const isActiveFrame = isFrameItem && owned && activeFrameId === item.id;
    const isActiveWave = item.type === 'Wave' && owned && activeWaveId === item.id;
    const isActiveBubble = item.type === 'Bubble' && owned && activeBubbleId === item.id;
    const isAnyActive = isActiveEntry || isActiveFrame || isActiveWave || isActiveBubble;
    const isUsableItem = isEntryItem || isFrameItem || item.type === 'Wave' || item.type === 'Bubble';

    const localAsset = LOCAL_FRAME_ASSETS[item.id];

    return (
      <>
        <TouchableOpacity
          style={[styles.itemCard, owned && styles.itemCardOwned, isAnyActive && { borderColor: '#fbbf24', borderWidth: 2 }]}
          onPress={() => { if (item.type === 'Medal') return; setPreviewItem(item); setSelectedDuration(7); }}
          activeOpacity={0.8}
        >
        {/* Media Preview */}
        <View style={styles.itemMedia}>
          {isFrameItem ? (
            <AvatarFrame
              size={54}
              frameMediaUrl={localAsset ? item.id : mediaUrl}
            >
              <View style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} color="rgba(255,255,255,0.25)" />
              </View>
            </AvatarFrame>
          ) : item.type === 'ID' ? (
            <View style={{ transform: [{ scale: 0.65 }] }}>
              {item.isPinkDiamond ? <PinkDiamondIDBadgeIcon number={checkedId || '888888'} /> :
               item.isSilver ? <SilverBlueIDBadgeIcon number={checkedId || '888888'} /> :
               <IDBadgeIcon number={checkedId || '888888'} />}
            </View>
          ) : item.type === 'Wave' ? (
            <StoreWaveBreathingBadge waveId={item.id} itemColor={item.color} />
          ) : item.type === 'Bubble' ? (
            <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', paddingVertical: 6 }}>
              <ChatMessageBubble
                bubbleId={item.id}
                bubbleMediaUrl={mediaUrl}
                isMe={false}
                showTail={false}
                style={{ alignSelf: 'center', minWidth: 130, transform: [{ scale: 1.25 }] }}
              >
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>Hello! 💬</Text>
              </ChatMessageBubble>
            </View>
          ) : item.type === 'Medal' ? (
            mediaUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: toCDN(mediaUrl) }} style={styles.mediaFill} contentFit="contain" />
            ) : (
              <View style={styles.mediaPlaceholder}>
                <Text style={{ fontSize: 40 }}>🏅</Text>
              </View>
            )
          ) : localAsset ? (
            <Image source={localAsset} style={styles.mediaFill} contentFit="contain" />
          ) : mediaUrl ? (
            <Image cachePolicy="memory-disk" source={{ uri: mediaUrl }} style={styles.mediaFill} contentFit="contain" />
          ) : (
            <View style={styles.mediaPlaceholder}>
              {item.type === 'Wave' ? <Activity size={28} color={item.color || '#94a3b8'} /> :
               item.type === 'Frame' ? <ImageIcon size={28} color="#94a3b8" /> :
               item.type === 'Theme' ? <Palette size={28} color="#94a3b8" /> :
               item.type === 'Bubble' ? <MessageSquare size={28} color="#94a3b8" /> :
               item.type === 'Entry' ? <Play size={28} color={item.color || '#fbbf24'} /> :
               <ShoppingBag size={28} color="#94a3b8" />}
            </View>
          )}
          {(isActiveEntry || isActiveFrame || isActiveBubble) && (
            <View style={[styles.ownedBadge, { backgroundColor: '#fbbf24' }]}>
              <Play size={10} color="#000" fill="#000" />
            </View>
          )}
          {owned && !isActiveEntry && !isActiveFrame && !isActiveBubble && (
            <View style={styles.ownedBadge}>
              <Check size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{cleanItemName(item.name)}</Text>
          <Text style={styles.itemType}>{item.type}</Text>
          {owned && (item.type === 'Medal' || item.type === 'Theme') ? (
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>OWNED</Text>
              </View>
              {item.type === 'Theme' && <Text style={{ fontSize: 8, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>Apply in Room Settings</Text>}
            </View>
          ) : owned && isUsableItem ? (
            isAnyActive ? (
              <TouchableOpacity
                onPress={() => handleRemoveItem(item)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fbbf24' }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fbbf24' }}>ACTIVE</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: '#ef4444', marginLeft: 2 }}>REMOVE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => isEntryItem ? handleUseEntryEffect(item) : handleUseItem(item)}
                disabled={activatingEntry === item.id || activatingItem === item.id}
                style={{ backgroundColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#000' }}>
                  {(activatingEntry === item.id || activatingItem === item.id) ? '...' : 'USE'}
                </Text>
              </TouchableOpacity>
            )
          ) : item.notForSale ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Not for Sale</Text>
              {item.eventBased && <Text style={{ fontSize: 9, fontWeight: '600', color: '#a855f7', marginTop: 2 }}>Event Based</Text>}
            </View>
          ) : (
            <View style={styles.priceRow}>
              <GoldenCoin size={20} />
              <Text style={styles.priceText}>{item.price?.toLocaleString()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Store</Text>
          <View style={[styles.coinBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <GoldenCoin size={24} />
            <Text style={styles.coinBadgeText}>{(userProfile?.wallet?.coins || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Store' ? (
          <>
            {/* Type Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              {TYPE_FILTERS.map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveType(type)}
                  style={[styles.filterChip, activeType === type && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, activeType === type && styles.filterChipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activeType === 'ID' && (
              <View style={{ marginHorizontal: 16, marginTop: 8, padding: 16, backgroundColor: 'white', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>Search & Reserve Custom ID</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, color: '#0f172a', fontSize: 15 }}
                    placeholder="Enter ID (1-8 digits only)"
                    placeholderTextColor="#94a3b8"
                    value={customIdInput}
                    onChangeText={(val) => {
                      setCustomIdInput(val.replace(/[^0-9]/g, ''));
                      setIdAvailability('none');
                    }}
                    keyboardType="number-pad"
                    maxLength={8}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={checkIdAvailability}
                    disabled={isCheckingId || !customIdInput.trim()}
                    style={{ height: 44, paddingHorizontal: 16, backgroundColor: '#7c3aed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', opacity: (!customIdInput.trim() || isCheckingId) ? 0.6 : 1 }}
                  >
                    {isCheckingId ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Check</Text>}
                  </TouchableOpacity>
                </View>

                {idAvailability === 'available' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                    <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '600' }}>ID "{checkedId}" is available!</Text>
                  </View>
                )}

                {idAvailability === 'taken' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                    <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '600' }}>ID is already taken or active.</Text>
                  </View>
                )}

                {idAvailability === 'invalid' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                    <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: '600' }}>ID must be between 1 and 8 characters.</Text>
                  </View>
                )}
              </View>
            )}

            {isLoadingStore ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#7c3aed" size="large" />
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={item => item.id}
                numColumns={2}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 12, paddingBottom: 80 + insets.bottom }}
                columnWrapperStyle={{ gap: 12 }}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                showsVerticalScrollIndicator={false}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews
                bounces={false}
              />
            )}
          </>
        ) : (
          /* My Items tab */
          purchasedItems.length === 0 ? (
            <View style={styles.centerBox}>
              <ShoppingBag size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Items Yet</Text>
              <Text style={styles.emptyDesc}>Items you own from purchases, gifts, rewards or VIP will appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={purchasedItems}
              keyExtractor={item => item.id}
              numColumns={2}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 12, paddingBottom: 80 + insets.bottom }}
              columnWrapperStyle={{ gap: 12 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              showsVerticalScrollIndicator={false}
              initialNumToRender={6}
              maxToRenderPerBatch={4}
              windowSize={3}
              removeClippedSubviews
            />
          )
        )}
      </SafeAreaView>

      {/* Item Preview Modal */}
      <Modal visible={!!previewItem} transparent animationType="slide" onRequestClose={() => setPreviewItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {previewItem && (
              <>
                {/* Close */}
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewItem(null)}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>

                {/* Preview Media */}
                <View style={[styles.modalMedia, { alignItems: 'center', justifyContent: 'center' }]}>
                  {previewItem.type === 'Frame' ? (
                    <AvatarFrame
                      size={120}
                      frameMediaUrl={LOCAL_FRAME_ASSETS[previewItem.id] ? previewItem.id : (((typeof previewItem.videoUrl === 'string' && previewItem.videoUrl.startsWith('http')) ? previewItem.videoUrl : null) || ((typeof previewItem.imageUrl === 'string' && previewItem.imageUrl.startsWith('http')) ? previewItem.imageUrl : null) || ((typeof previewItem.mediaUrl === 'string' && previewItem.mediaUrl.startsWith('http')) ? previewItem.mediaUrl : null))}
                    >
                      {userProfile?.avatarUrl && typeof userProfile.avatarUrl === 'string' && userProfile.avatarUrl.startsWith('http') ? (
                        <Image cachePolicy="memory-disk" source={{ uri: userProfile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                            {userProfile?.username ? userProfile.username[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                      )}
                    </AvatarFrame>
                  ) : previewItem.type === 'ID' ? (
                    <View style={{ transform: [{ scale: 1.2 }] }}>
                      {previewItem.isPinkDiamond ? <PinkDiamondIDBadgeIcon number={checkedId || '888888'} /> :
                       previewItem.isSilver ? <SilverBlueIDBadgeIcon number={checkedId || '888888'} /> :
                       <IDBadgeIcon number={checkedId || '888888'} />}
                    </View>
                  ) : previewItem.type === 'Bubble' ? (
                    <View style={{ width: '100%', padding: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <ChatMessageBubble
                        bubbleId={previewItem.id}
                        bubbleMediaUrl={((typeof previewItem.videoUrl === 'string' && previewItem.videoUrl.startsWith('http')) ? previewItem.videoUrl : null) || ((typeof previewItem.imageUrl === 'string' && previewItem.imageUrl.startsWith('http')) ? previewItem.imageUrl : null) || ((typeof previewItem.mediaUrl === 'string' && previewItem.mediaUrl.startsWith('http')) ? previewItem.mediaUrl : null)}
                        isMe={false}
                        showTail={false}
                        style={{ alignSelf: 'center', transform: [{ scale: 1.4 }] }}
                      >
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                          This is how your chat bubble looks! 💬🔥
                        </Text>
                      </ChatMessageBubble>
                    </View>
                  ) : previewItem.type === 'Wave' ? (
                    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <StoreWaveRingPreview waveId={previewItem.id} />
                      <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 2, borderColor: 'white', backgroundColor: '#3b82f6', elevation: 4 }}>
                        {userProfile?.avatarUrl && typeof userProfile.avatarUrl === 'string' && userProfile.avatarUrl.startsWith('http') ? (
                          <Image cachePolicy="memory-disk" source={{ uri: userProfile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <View style={{ width: '100%', height: '100%', backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                              {userProfile?.username ? userProfile.username[0].toUpperCase() : 'U'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ position: 'absolute', bottom: 4, backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#4ade80' }}>🎙️ Mic Speaking Live</Text>
                      </View>
                    </View>
                  ) : (
                    (() => {
                      const rawUrl = previewItem.videoUrl || previewItem.imageUrl;
                      const validUrl = typeof rawUrl === 'string' && rawUrl.startsWith('http') ? rawUrl : null;
                      if (validUrl) return (
                        <Image cachePolicy="memory-disk" source={{ uri: validUrl }} style={styles.modalMediaFill} contentFit="contain" />
                      );
                      return (
                        <View style={styles.modalMediaPlaceholder}>
                          <ShoppingBag size={48} color="#cbd5e1" />
                        </View>
                      );
                    })()
                  )}
                </View>

                <Text style={styles.modalItemName}>{cleanItemName(previewItem.name)}</Text>
                <Text style={styles.modalItemType}>{previewItem.type}</Text>
                <Text style={styles.modalItemDesc}>{previewItem.description}</Text>

                {/* Duration selector */}
                <View style={styles.durationRow}>
                  {(previewItem.type === 'ID' ? [3, 7, 15, 30] : [7, 3]).map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setSelectedDuration(d)}
                      style={[styles.durationChip, selectedDuration === d && styles.durationChipActive]}
                    >
                      <Text style={[styles.durationText, selectedDuration === d && styles.durationTextActive]}>{d} Days</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <GoldenCoin size={18} />
                        <Text style={[styles.durationPrice, { marginTop: 0 }, selectedDuration === d && styles.durationTextActive]}>
                          {getPrice(previewItem, d).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {previewItem.type !== 'ID' && (isItemOwned(previewItem.id) || previewItem.source === 'svip') ? (
                  <View style={{ gap: 10 }}>
                    {(previewItem.type === 'Frame' && activeFrameId === previewItem.id) ||
                     (previewItem.type === 'Wave' && activeWaveId === previewItem.id) ||
                     (previewItem.type === 'Bubble' && activeBubbleId === previewItem.id) ||
                     (previewItem.type === 'ID' && (userProfile?.inventory as any)?.activeID === previewItem.id) ||
                     (previewItem.type === 'Entry' && activeEntryEffect === (previewItem.entryType || 'line')) ? (
                      <View style={styles.ownedBox}>
                        <Check size={16} color="#10b981" />
                        <Text style={styles.ownedText}>Active</Text>
                      </View>
                    ) : previewItem.type === 'Theme' ? (
                      <View style={styles.ownedBox}>
                        <Check size={16} color="#10b981" />
                        <Text style={styles.ownedText}>Owned</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.buyBtn, { backgroundColor: '#f59e0b' }, isProcessing && { opacity: 0.6 }]}
                        onPress={() => {
                          setPreviewItem(null);
                          if (previewItem.type === 'Entry') handleUseEntryEffect(previewItem);
                          else handleUseItem(previewItem);
                        }}
                        disabled={isProcessing}
                      >
                        <Text style={styles.buyBtnText}>USE</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.buyBtn, { flex: 1 }, isProcessing && { opacity: 0.6 }]}
                      onPress={handlePurchase}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Text style={styles.buyBtnText}>Buy</Text>
                          <GoldenCoin size={24} />
                          <Text style={styles.buyBtnText}>{getPrice(previewItem, selectedDuration).toLocaleString()}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {previewItem.type !== 'ID' && (
                      <TouchableOpacity
                        style={[styles.sendBtn, { flex: 1 }, isProcessing && { opacity: 0.6 }]}
                        onPress={() => setShowRecipientSearch(true)}
                        disabled={isProcessing}
                      >
                        <Text style={styles.sendBtnText}>Send as Gift</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Recipient Search Modal */}
      <Modal visible={showRecipientSearch} transparent animationType="slide" onRequestClose={() => { setShowRecipientSearch(false); setSelectedRecipient(null); setRecipientQuery(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowRecipientSearch(false); setSelectedRecipient(null); setRecipientQuery(''); }}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
            <Text style={[styles.modalItemName, { marginBottom: 12 }]}>Send as Gift</Text>
            <Text style={[styles.modalItemDesc, { marginBottom: 12 }]}>Search by username or Ummy ID</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14, height: 44, justifyContent: 'center' }}>
                <TextInput
                  placeholder="Search by username or ID..."
                  placeholderTextColor="#94a3b8"
                  value={recipientQuery}
                  onChangeText={(t) => { setRecipientQuery(t); searchRecipients(t); }}
                  style={{ fontSize: 14, color: '#0f172a', padding: 0 }}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {isSearchingRecipient && <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 12 }} />}

            <FlatList
              data={recipientResults}
              keyExtractor={(item: any) => item.uid}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={!isSearchingRecipient && recipientQuery.length >= 2 ? (
                <Text style={{ textAlign: 'center', color: '#94a3b8', paddingVertical: 20, fontSize: 13 }}>No users found</Text>
              ) : null}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: selectedRecipient?.uid === item.uid ? '#f0fdf4' : '#f8fafc', marginBottom: 6, borderWidth: 1.5, borderColor: selectedRecipient?.uid === item.uid ? '#10b981' : 'transparent' }}
                  onPress={() => setSelectedRecipient(item)}
                >
                  {item.avatarUrl && typeof item.avatarUrl === 'string' && item.avatarUrl.startsWith('http') ? (
                    <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} cachePolicy="memory-disk" contentFit="cover" />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748b' }}>{(item.username || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{item.username || 'Unknown'}</Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>ID: {item.accountNumber || item.uid}</Text>
                  </View>
                  {selectedRecipient?.uid === item.uid && <Check size={18} color="#10b981" />}
                </TouchableOpacity>
              )}
            />

            {selectedRecipient && (
              <TouchableOpacity
                style={[styles.sendBtn, { marginTop: 12 }, isProcessing && { opacity: 0.6 }]}
                onPress={handleSendAsGift}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Text style={styles.sendBtnText}>Send to {selectedRecipient.username}</Text>
                    <GoldenCoin size={24} />
                    <Text style={styles.sendBtnText}>{getPrice(previewItem, selectedDuration).toLocaleString()}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  coinBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#fde68a' },
  coinBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#7c3aed', fontWeight: '700' },
  filterScroll: { flexGrow: 0, flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  itemCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemCardOwned: { borderColor: '#a78bfa' },
  itemMedia: { width: '100%', height: 120, backgroundColor: 'transparent', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  mediaFill: { width: '100%', height: '100%' },
  mediaPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  ownedBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#10b981', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { padding: 10 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  itemType: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coinEmoji: { fontSize: 12 },
  priceText: { fontSize: 13, fontWeight: '700', color: '#d97706' },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 16, textTransform: 'uppercase' },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20, zIndex: 100 },
  modalMedia: { width: '100%', height: 220, backgroundColor: 'transparent', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  modalMediaFill: { width: '100%', height: '100%' },
  modalMediaPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalItemName: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  modalItemType: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginVertical: 4 },
  modalItemDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  durationChip: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, alignItems: 'center' },
  durationChipActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  durationText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  durationTextActive: { color: '#7c3aed' },
  durationPrice: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  ownedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, paddingVertical: 14 },
  ownedText: { fontSize: 14, fontWeight: '700', color: '#059669' },
  buyBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  buyBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  sendBtn: { backgroundColor: '#059669', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#059669', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  sendBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
