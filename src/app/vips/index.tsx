import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Crown, 
  Star, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Settings, 
  HelpCircle, 
  EyeOff, 
  UserCheck, 
  Volume2, 
  MessageSquare, 
  Gift, 
  Compass, 
  Users, 
  ShieldAlert, 
  Award,
  Heart,
  Flame,
  Key,
  CheckCircle,
  Gem,
  Radio
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { doc, onSnapshot, updateDoc, increment, writeBatch, serverTimestamp, getDoc } from '@/firebase/firestore-compat';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { toCDN } from '@/lib/cdn';

const { width } = Dimensions.get('window');

// --- DATA STRUCTURES ---
// SVIP Levels — 10 Coins = 1 SVIP Point
// threshold: coins to reach level (SVIP Points × 10)
// pointsBack: coins refunded monthly (Points Back × 10)
const SVIP_LEVELS_DATA = [
  { level: 1,  name: 'SVIP 1',  points: '8.0M',  exp: 80000000,       pointsBack: '2.4M',  pointsBackExp: 24000000,    monthlyCoins: 400000,       theme: 'owl' },
  { level: 2,  name: 'SVIP 2',  points: '24.0M',  exp: 240000000,     pointsBack: '8.0M',  pointsBackExp: 80000000,    monthlyCoins: 1600000,      theme: 'owl' },
  { level: 3,  name: 'SVIP 3',  points: '80.0M',  exp: 800000000,     pointsBack: '32.0M', pointsBackExp: 320000000,   monthlyCoins: 5600000,      theme: 'owl' },
  { level: 4,  name: 'SVIP 4',  points: '200.0M', exp: 2000000000,     pointsBack: '80.0M', pointsBackExp: 800000000,   monthlyCoins: 16000000,     theme: 'wolf' },
  { level: 5,  name: 'SVIP 5',  points: '400.0M', exp: 4000000000,     pointsBack: '200.0M', pointsBackExp: 2000000000,  monthlyCoins: 36000000,     theme: 'wolf' },
  { level: 6,  name: 'SVIP 6',  points: '800.0M', exp: 8000000000,     pointsBack: '400.0M', pointsBackExp: 4000000000,  monthlyCoins: 80000000,     theme: 'wolf' },
  { level: 7,  name: 'SVIP 7',  points: '1.36B',  exp: 13600000000,    pointsBack: '800.0M', pointsBackExp: 8000000000,  monthlyCoins: 136000000,    theme: 'scorpion' },
  { level: 8,  name: 'SVIP 8',  points: '2.16B',  exp: 21600000000,    pointsBack: '1.36B', pointsBackExp: 13600000000,  monthlyCoins: 216000000,    theme: 'scorpion' },
  { level: 9,  name: 'SVIP 9',  points: '3.6B',   exp: 36000000000,    pointsBack: '2.16B', pointsBackExp: 21600000000,  monthlyCoins: 360000000,    theme: 'scorpion' },
  { level: 10, name: 'SVIP 10', points: '5.6B',   exp: 56000000000,    pointsBack: '3.6B',  pointsBackExp: 36000000000,  monthlyCoins: 400000000,    theme: 'lion' },
  { level: 11, name: 'SVIP 11', points: '8.4B',   exp: 84000000000,    pointsBack: '5.6B',  pointsBackExp: 56000000000,  monthlyCoins: 484000000,    theme: 'lion' },
  { level: 12, name: 'SVIP 12', points: '12.0B',  exp: 120000000000,   pointsBack: '8.4B',  pointsBackExp: 84000000000,  monthlyCoins: 576000000,    theme: 'lion' },
  { level: 13, name: 'SVIP 13', points: '16.8B',  exp: 168000000000,   pointsBack: '12.0B', pointsBackExp: 120000000000, monthlyCoins: 676000000,    theme: 'tiger' },
  { level: 14, name: 'SVIP 14', points: '22.4B',  exp: 224000000000,   pointsBack: '16.8B', pointsBackExp: 168000000000, monthlyCoins: 784000000,    theme: 'tiger' },
  { level: 15, name: 'SVIP 15', points: '30.0B',  exp: 300000000000,   pointsBack: '22.4B', pointsBackExp: 224000000000, monthlyCoins: 900000000,    theme: 'tiger' },
  { level: 16, name: 'SVIP 16', points: '40.0B',  exp: 400000000000,   pointsBack: '30.0B', pointsBackExp: 300000000000, monthlyCoins: 1024000000,   theme: 'dragon' },
  { level: 17, name: 'SVIP 17', points: '52.0B',  exp: 520000000000,   pointsBack: '40.0B', pointsBackExp: 400000000000, monthlyCoins: 1156000000,   theme: 'dragon' },
  { level: 18, name: 'SVIP 18', points: '68.0B',  exp: 680000000000,   pointsBack: '52.0B', pointsBackExp: 520000000000, monthlyCoins: 1296000000,   theme: 'dragon' },
];

const SVIP_PRIVILEGES_DATA = [
  { id: 4, name: 'Entering Sound', desc: 'Audio sound wave chime on room entry', level: 2, icon: Volume2, category: 'VFX' },
  { id: 6, name: 'Silver Greeting Card', desc: 'Gleaming Owl entry greeting card', level: 4, icon: ShieldAlert, category: 'VFX' },
  { id: 8, name: 'Mysterious Visitor', desc: 'Visit profiles with 100% stealth', level: 5, icon: EyeOff, category: 'Stealth' },
  { id: 9, name: 'Exclusive Gift', desc: 'Unlock core token gifting item', level: 5, icon: Gift, category: 'Gifts' },
  { id: 10, name: 'Weekly Coin Rebate', desc: 'Daily claimable coin multiplier bonuses', level: 6, icon: Zap, category: 'Rebates' },
  { id: 12, name: 'Hide Gift Record', desc: 'Stealthily receive/send without record', level: 8, icon: Lock, category: 'Stealth' },
  { id: 14, name: 'Rank Hiding', desc: 'Become completely invisible on charts', level: 9, icon: UserCheck, category: 'Stealth' },
  { id: 16, name: 'Private Space Album', desc: 'Hidden album with access key control', level: 10, icon: Key, category: 'Interaction' },
  { id: 18, name: 'Crimson Nameplate', desc: 'Stand out with bold red nameplate text', level: 11, icon: Flame, category: 'Identity' },
  { id: 19, name: 'Room Stealth Entry', desc: 'Enter any chatroom in absolute silence', level: 12, icon: EyeOff, category: 'Stealth' },
  { id: 21, name: 'Absolute Kick Immunity', desc: 'Immunity against all kicks & bans', level: 13, icon: ShieldCheck, category: 'Stealth' },
  { id: 23, name: 'CP Room Decoration', desc: 'Custom themed luxury CP room design', level: 14, icon: Heart, category: 'Interaction' },
  { id: 24, name: 'Custom Micro-Badge', desc: 'Personalized mini icon next to name', level: 15, icon: Award, category: 'Identity' },
  { id: 27, name: 'Diamond Conversion Buff', desc: 'Higher limit for coin-to-diamond swaps', level: 17, icon: Gem, category: 'Rebates' },
  { id: 28, name: 'VIP Liaison Officer', desc: '24/7 dedicated support representative', level: 17, icon: Users, category: 'Interaction' },
  { id: 30, name: 'Global Server Broadcast', desc: 'Announce presence to all rooms globally', level: 18, icon: Radio, category: 'VFX' },
  { id: 31, name: 'Infinite Validity Lock', desc: 'Never downgrade; level locked forever', level: 18, icon: Crown, category: 'Rebates' },
];

// ─────────────────────────────────────────────────────────────
// BackgroundMascot — Full-screen top backdrop mascot per theme
// Same animation quality as the original Owl backdrop
// ─────────────────────────────────────────────────────────────
// Coded mascots removed (we now use premium custom backgrounds)
// ────────────────────────────────────────────────────────────

const getThemePrivilegeConfig = (lvl: number) => {
  if (lvl >= 16) { // Dragon
    return {
      themeName: 'Dragon',
      primary: '#f43f5e',
      secondary: '#dc2626',
      accent: '#fbbf24',
      gradient: ['#dc2626', '#e11d48', '#f59e0b'],
      frameName: 'Dragon scale Crown Frame',
      bubbleName: 'Lava Scale Bubble',
      entryEffect: 'Crimson Dragon Ride',
      waveColor: 'rgba(225, 29, 72, 0.4)',
      desc: 'Mythical Dragon Overlord powers unlocked'
    };
  }
  if (lvl >= 13) { // Tiger
    return {
      themeName: 'Tiger',
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fbbf24',
      gradient: ['#ea580c', '#f97316', '#fbbf24'],
      frameName: 'Electric Tigerstripe Frame',
      bubbleName: 'Jungle Ember Bubble',
      entryEffect: 'Golden Tiger Ride',
      waveColor: 'rgba(234, 88, 12, 0.4)',
      desc: 'Aggressive Jungle Tiger force unlocked'
    };
  }
  if (lvl >= 10) { // Lion
    return {
      themeName: 'Lion',
      primary: '#fbbf24',
      secondary: '#d97706',
      accent: '#f43f5e',
      gradient: ['#d97706', '#f59e0b', '#dc2626'],
      frameName: 'Volcanic Sun Crown Frame',
      bubbleName: 'Solar Flare Bubble',
      entryEffect: 'Magma Lion Ride',
      waveColor: 'rgba(217, 119, 6, 0.4)',
      desc: 'Sovereign Volcanic Lion aura unlocked'
    };
  }
  if (lvl >= 7) { // Scorpion
    return {
      themeName: 'Scorpion',
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#3b82f6',
      gradient: ['#0891b2', '#06b6d4', '#2563eb'],
      frameName: 'Toxic Stinger Frame',
      bubbleName: 'Electric Venom Bubble',
      entryEffect: 'Cyber Scorpion Ride',
      waveColor: 'rgba(8, 145, 178, 0.4)',
      desc: 'Cybernetic Poison Stinger unlocked'
    };
  }
  if (lvl >= 4) { // Wolf
    return {
      themeName: 'Wolf',
      primary: '#a855f7',
      secondary: '#d946ef',
      accent: '#0ea5e9',
      gradient: ['#a855f7', '#d946ef', '#ec4899'],
      frameName: 'Celestial Moonlight Frame',
      bubbleName: 'Moonlit Wolf Bubble',
      entryEffect: 'Silver Wolf Ride',
      waveColor: 'rgba(168, 85, 247, 0.4)',
      desc: 'Ethereal Moonlight Wolf pack unlocked'
    };
  }
  // Owl (lvl >= 1)
  return {
    themeName: 'Owl',
    primary: '#0ea5e9',
    secondary: '#2563eb',
    accent: '#f59e0b',
    gradient: ['#0ea5e9', '#3b82f6', '#1d4ed8'],
    frameName: 'Stardust Feather Frame',
    bubbleName: 'Celestial Void Bubble',
    entryEffect: 'Cosmic Owl Carriage',
    waveColor: 'rgba(79, 70, 229, 0.4)',
    desc: 'Celestial Stardust Owl vision unlocked'
  };
};

const getBackdropAsset = (lvl: number) => {
  if (lvl >= 16) return require('../../../assets/images/themes/dangerous_dragon_bg.png');
  if (lvl >= 13) return require('../../../assets/images/themes/dangerous_tiger_bg.png');
  if (lvl >= 10) return require('../../../assets/images/themes/dangerous_lion_bg.png');
  if (lvl >= 7)  return require('../../../assets/images/themes/dangerous_scorpion_bg.png');
  if (lvl >= 4)  return require('../../../assets/images/themes/dangerous_wolf_bg.png');
  return require('../../../assets/images/themes/dangerous_owl_bg.png');
};

export default function VipsClubScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  // States
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [vipConfig, setVipConfig] = useState<any>({
    bgType: 'dynamic',
    bgUrl: '',
    levels: {}
  });

  // Animated values for Mystical Owl animations
  const owlBreatheAnim = React.useRef(new Animated.Value(0)).current;
  const owlBlinkAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const owlBreatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(owlBreatheAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(owlBreatheAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    );
    owlBreatheLoop.start();

    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(owlBlinkAnim, {
          toValue: 0.1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(owlBlinkAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        })
      ]).start();
    }, 4500);

    return () => { owlBreatheLoop.stop(); clearInterval(blinkInterval); };
  }, []);

  // Stealth toggles state
  const [stealthSettings, setStealthSettings] = useState({
    mysteriousVisitor: false,
    hideGiftRecord: false,
    rankInvisible: false,
    roomInvisible: false,
    avoidBeingKicked: false,
  });

  // Monthly coins claim state
  const [monthlyClaimed, setMonthlyClaimed] = useState(false);
  const [claimingCoins, setClaimingCoins] = useState(false);
  const [showMonthlyInfo, setShowMonthlyInfo] = useState(false);

  // Sync real-time VIP config from Firestore
  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, 'settings', 'svipConfig');
    const unsubscribe = onSnapshot(docRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setVipConfig({
          bgType: data.bgType || 'dynamic',
          bgUrl: data.bgUrl || '',
          levels: data.levels || {}
        });
      }
    }, () => {});

    return () => unsubscribe();
  }, [firestore]);

  // Sync profile toggles
  useEffect(() => {
    if (userProfile) {
      setStealthSettings({
        mysteriousVisitor: !!userProfile.mysteriousVisitor,
        hideGiftRecord: !!userProfile.hideGiftRecord,
        rankInvisible: !!userProfile.rankInvisible,
        roomInvisible: !!userProfile.roomInvisible,
        avoidBeingKicked: !!userProfile.avoidBeingKicked,
      });
    }
  }, [userProfile]);

  const userSvipLevel = userProfile?.svip || 0;
  const activeLevelData = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel) || SVIP_LEVELS_DATA[0];
  const activeTheme = activeLevelData.theme;

  const levelBgUrl = vipConfig?.levels?.[selectedLevel]?.bgUrl;
  const showCustomBg = !!levelBgUrl;
  const isVideoBg = showCustomBg && (levelBgUrl.includes('.mp4') || levelBgUrl.includes('video'));

  const unlockedCount = SVIP_PRIVILEGES_DATA.filter(p => p.level <= userSvipLevel).length;

  // Check if monthly coins already claimed this month
  useEffect(() => {
    if (!user?.uid || !firestore || userSvipLevel <= 0) return;
    const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    const unsub = onSnapshot(profileRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        const lastClaim = data?.svipMonthlyClaimedAt;
        if (lastClaim) {
          const claimDate = lastClaim?.toDate ? lastClaim.toDate() : new Date(lastClaim);
          const now = new Date();
          const sameMonth = claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear();
          setMonthlyClaimed(sameMonth);
        } else {
          setMonthlyClaimed(false);
        }
      }
    }, () => {});
    return () => unsub();
  }, [user?.uid, firestore, userSvipLevel]);

  const handleClaimMonthlyCoins = async () => {
    if (!user?.uid || !firestore || userSvipLevel <= 0) return;
    if (monthlyClaimed) {
      Alert.alert('Already Claimed', 'You have already claimed your monthly SVIP coins this month!');
      return;
    }
    const levelData = SVIP_LEVELS_DATA.find(l => l.level === userSvipLevel);
    if (!levelData) return;

    setClaimingCoins(true);
    try {
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const userRef = doc(firestore, 'users', user.uid);

      await Promise.all([
        updateDoc(profileRef, {
          'wallet.coins': increment(levelData.monthlyCoins),
          svipMonthlyClaimedAt: serverTimestamp(),
        }),
        updateDoc(userRef, {
          'wallet.coins': increment(levelData.monthlyCoins),
        }),
      ]);

      setMonthlyClaimed(true);
      Alert.alert('Claimed!', `${levelData.monthlyCoins.toLocaleString('en-IN')} coins added to your wallet!`);
    } catch (e: any) {
      Alert.alert('Claim Failed', e.message || 'Something went wrong.');
    } finally {
      setClaimingCoins(false);
    }
  };

  const handleToggleChange = async (key: keyof typeof stealthSettings, requiredLevel: number) => {
    if (userSvipLevel < requiredLevel) {
      Alert.alert('Privilege Locked', `This toggle requires SVIP ${requiredLevel} or higher!`);
      return;
    }
    if (!user?.uid || !firestore) return;

    const newStatus = !stealthSettings[key];
    setStealthSettings(prev => ({ ...prev, [key]: newStatus }));

    try {
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      await updateDoc(profileRef, { [key]: newStatus });
      // Also write to root users doc for leaderboard/kick checks
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { [key]: newStatus });
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message || 'Could not update settings.');
      setStealthSettings(prev => ({ ...prev, [key]: !newStatus }));
    }
  };

  // ── SVIP Purchase Handler ──────────────────────────────────────────────
  const handlePurchaseSvip = async () => {
    if (!user?.uid || !firestore) return;

    const targetLevel = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel);
    if (!targetLevel) return;

    const monthlySpent = userProfile?.wallet?.monthlySpent || 0;
    const targetExp = targetLevel.exp;

    if (monthlySpent >= targetExp) {
      Alert.alert('Already Reached', `You are already at or above SVIP ${selectedLevel}!`);
      return;
    }

    const expNeeded = targetExp - monthlySpent;
    const cost = expNeeded; // 1 coin = 1 EXP toward monthly target

    const currentCoins = userProfile?.wallet?.coins || 0;
    if (currentCoins < cost) {
      Alert.alert('Insufficient Coins', `You need ${cost.toLocaleString('en-IN')} coins but have ${currentCoins.toLocaleString('en-IN')}. Please recharge first.`);
      return;
    }

    Alert.alert(
      'Confirm SVIP Purchase',
      `Upgrade to SVIP ${selectedLevel}?\n\nCost: ${cost.toLocaleString('en-IN')} coins\nMonthly Spent: ${monthlySpent.toLocaleString('en-IN')}\nTarget: ${targetExp.toLocaleString('en-IN')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy Now', onPress: () => executeSvipPurchase(targetLevel, cost) },
      ]
    );
  };

  const executeSvipPurchase = async (targetLevel: typeof SVIP_LEVELS_DATA[number], cost: number) => {
    if (!user?.uid || !firestore) return;
    setIsPurchasing(true);

    try {
      // Fresh balance check
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const snap = await getDoc(profileRef);
      const freshCoins = snap.exists()
        ? ((snap.data() as any)?.wallet?.coins ?? (userProfile?.wallet?.coins ?? 0))
        : (userProfile?.wallet?.coins ?? 0);

      if (freshCoins < cost) {
        Alert.alert('Insufficient Coins', `Balance changed. You now have ${freshCoins.toLocaleString('en-IN')} coins.`);
        setIsPurchasing(false);
        return;
      }

      const userRef = doc(firestore, 'users', user.uid);
      const batch = writeBatch(firestore);

      // Deduct coins + increment monthlySpent (triggers autoPromoteSvip CF)
      const purchaseUpdate = {
        'wallet.coins': increment(-cost),
        'wallet.monthlySpent': increment(cost),
        updatedAt: serverTimestamp(),
      };

      batch.update(profileRef, purchaseUpdate);
      batch.update(userRef, purchaseUpdate);

      await batch.commit();

      setIsPurchaseOpen(false);
      Alert.alert('Success!', `You are now SVIP ${targetLevel.level}! 🎉\n\n${cost.toLocaleString('en-IN')} coins deducted.`);
    } catch (e: any) {
      Alert.alert('Purchase Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderSvipStrip = (lvl: number) => {
    if (lvl < 1 || lvl > 18) return null;
    const badgeUrl = vipConfig?.levels?.[lvl]?.badgeUrl;
    return (
      <View style={{ width: 70, height: 20, justifyContent: 'center', position: 'relative' }}>
        <Image 
          source={
            lvl === 1 ? require('../../../assets/images/themes/svip_strip_1.png') :
            lvl === 2 ? require('../../../assets/images/themes/svip_strip_2.png') :
            lvl === 3 ? require('../../../assets/images/themes/svip_strip_3.png') :
            lvl === 4 ? require('../../../assets/images/themes/svip_strip_4.png') :
            lvl === 5 ? require('../../../assets/images/themes/svip_strip_5.png') :
            lvl === 6 ? require('../../../assets/images/themes/svip_strip_6.png') :
            lvl === 7 ? require('../../../assets/images/themes/svip_strip_7.png') :
            lvl === 8 ? require('../../../assets/images/themes/svip_strip_8.png') :
            lvl === 9 ? require('../../../assets/images/themes/svip_strip_9.png') :
            lvl === 10 ? require('../../../assets/images/themes/svip_strip_10.png') :
            lvl === 11 ? require('../../../assets/images/themes/svip_strip_11.png') :
            lvl === 12 ? require('../../../assets/images/themes/svip_strip_12.png') :
            lvl === 13 ? require('../../../assets/images/themes/svip_strip_13.png') :
            lvl === 14 ? require('../../../assets/images/themes/svip_strip_14.png') :
            lvl === 15 ? require('../../../assets/images/themes/svip_strip_15.png') :
            lvl === 16 ? require('../../../assets/images/themes/svip_strip_16.png') :
            lvl === 17 ? require('../../../assets/images/themes/svip_strip_17.png') :
            require('../../../assets/images/themes/svip_strip_18.png')
          }
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="fill"
        />
        {badgeUrl ? (
          <Image 
            cachePolicy="memory-disk"
            source={{ uri: toCDN(badgeUrl) }}
            style={{ 
              position: 'absolute', 
              left: (lvl >= 16 && lvl <= 18) ? -2 : -5, 
              top: (lvl >= 16 && lvl <= 18) ? -2 : -5, 
              width: (lvl >= 16 && lvl <= 18) ? 24 : 30, 
              height: (lvl >= 16 && lvl <= 18) ? 24 : 30,
              zIndex: 1
            }}
            contentFit="contain"
          />
        ) : null}
      </View>
    );
  };

const SVIP_WAVE_LEVEL_CONFIG: Record<number, { color: string; glow: string; accent: string; beast: string; particles: string[]; gradient: string[] }> = {
  1:  { color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.4)',  accent: '#38bdf8', beast: '🦉', particles: ['✨', '🩵', '✨'], gradient: ['#1e3a8a', '#3b82f6'] },
  2:  { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)', accent: '#7dd3fc', beast: '🦉', particles: ['✨', '💙', '✨'], gradient: ['#0284c7', '#38bdf8'] },
  3:  { color: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.5)',  accent: '#a5f3fc', beast: '🦉', particles: ['⚡', '💎', '⚡'], gradient: ['#0369a1', '#0ea5e9'] },
  4:  { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.4)', accent: '#e879f9', beast: '🐺', particles: ['🔮', '💜', '🔮'], gradient: ['#581c87', '#a855f7'] },
  5:  { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.45)', accent: '#d946ef', beast: '🐺', particles: ['✨', '🐺', '✨'], gradient: ['#6b21a8', '#c084fc'] },
  6:  { color: '#9333ea', glow: 'rgba(147, 51, 234, 0.5)',  accent: '#f0abfc', beast: '🐺', particles: ['⚡', '🌌', '⚡'], gradient: ['#7e22ce', '#e879f9'] },
  7:  { color: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)',  accent: '#06b6d4', beast: '🦂', particles: ['⚡', '🌐', '⚡'], gradient: ['#0891b2', '#22d3ee'] },
  8:  { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)',  accent: '#67e8f9', beast: '🦂', particles: ['💥', '🦂', '💥'], gradient: ['#0e7490', '#06b6d4'] },
  9:  { color: '#0891b2', glow: 'rgba(8, 145, 178, 0.5)',   accent: '#a5f3fc', beast: '🦂', particles: ['⚡', '💠', '⚡'], gradient: ['#155e75', '#67e8f9'] },
  10: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)',  accent: '#fbbf24', beast: '🦁', particles: ['🔥', '🦁', '🔥'], gradient: ['#b45309', '#f59e0b'] },
  11: { color: '#d97706', glow: 'rgba(217, 119, 6, 0.45)',  accent: '#fde047', beast: '🦁', particles: ['🔥', '👑', '🔥'], gradient: ['#92400e', '#fbbf24'] },
  12: { color: '#b45309', glow: 'rgba(180, 83, 9, 0.5)',    accent: '#fef08a', beast: '🦁', particles: ['💥', '🌞', '💥'], gradient: ['#78350f', '#f59e0b'] },
  13: { color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)',  accent: '#fb923c', beast: '🐅', particles: ['🔥', '🐅', '🔥'], gradient: ['#c2410c', '#f97316'] },
  14: { color: '#ea580c', glow: 'rgba(234, 88, 12, 0.45)',  accent: '#ffedd5', beast: '🐅', particles: ['⚡', '💥', '⚡'], gradient: ['#9a3412', '#fb923c'] },
  15: { color: '#c2410c', glow: 'rgba(194, 65, 12, 0.5)',   accent: '#fed7aa', beast: '🐅', particles: ['🔥', '⚡', '🔥'], gradient: ['#7c2d12', '#ea580c'] },
  16: { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)',  accent: '#fb7185', beast: '🐉', particles: ['✨', '🐉', '✨'], gradient: ['#be123c', '#f43f5e'] },
  17: { color: '#e11d48', glow: 'rgba(225, 29, 72, 0.5)',   accent: '#ffe4e6', beast: '🐲', particles: ['🔥', '🐲', '🔥'], gradient: ['#9f1239', '#fb7185'] },
  18: { color: '#be123c', glow: 'rgba(190, 18, 60, 0.6)',   accent: '#fff1f2', beast: '👑', particles: ['🔥', '🐉', '🔥'], gradient: ['#881337', '#e11d48'] },
};

function RealPurpleCosmicWaveWidget({ level }: { level: number }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scalePulse = useRef(new Animated.Value(1)).current;
  const rotateOuter = useRef(new Animated.Value(0)).current;
  const rotateInner = useRef(new Animated.Value(0)).current;

  const getThemePalette = () => {
    if (level >= 16) {
      return { c1: '#f43f5e', c2: '#e11d48', c3: '#ffe4e6' };
    }
    if (level >= 13) {
      return { c1: '#f97316', c2: '#ea580c', c3: '#ffedd5' };
    }
    if (level >= 10) {
      return { c1: '#f59e0b', c2: '#d97706', c3: '#fef08a' };
    }
    if (level >= 7) {
      return { c1: '#22d3ee', c2: '#06b6d4', c3: '#a5f3fc' };
    }
    if (level >= 4) {
      return { c1: '#c084fc', c2: '#9333ea', c3: '#f0abfc' };
    }
    return { c1: '#d946ef', c2: '#a855f7', c3: '#f0abfc' };
  };

  const pal = getThemePalette();

  useEffect(() => {
    if (!isAnimating) {
      scalePulse.setValue(1);
      rotateOuter.setValue(0);
      rotateInner.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scalePulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(scalePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );

    const rotOuter = Animated.loop(
      Animated.timing(rotateOuter, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })
    );

    const rotInner = Animated.loop(
      Animated.timing(rotateInner, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
    );

    pulseLoop.start();
    rotOuter.start();
    rotInner.start();

    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 4500);

    return () => {
      pulseLoop.stop();
      rotOuter.stop();
      rotInner.stop();
      clearTimeout(timer);
    };
  }, [isAnimating]);

  const spinClockwise = rotateOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCounter = rotateInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });


  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        setIsAnimating(true);
        Animated.sequence([
          Animated.spring(scaleAnim, { toValue: 1.3, friction: 3, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
      }}
      style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      {/* Outer Glowing Neon Aura Backing */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 76, height: 76,
          borderRadius: 38,
          backgroundColor: pal.c1,
          opacity: 0.2,
          transform: [{ scale: scalePulse }],
        }}
        pointerEvents="none"
      />

      {/* SVG Multi-Layer Concentric Rings & Arc Flare - Exact Image Match */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 76, height: 76,
          transform: [{ rotate: spinClockwise }, { scale: scalePulse }],
        }}
        pointerEvents="none"
      >
        <Svg width="76" height="76" viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id={`waveGrad_${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={pal.c1} stopOpacity="1" />
              <Stop offset="50%" stopColor={pal.c2} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={pal.c3} stopOpacity="0.9" />
            </SvgLinearGradient>
          </Defs>

          {/* Outer Ring 1: Thick Arc Flare */}
          <Circle cx="50" cy="50" r="45" stroke={`url(#waveGrad_${level})`} strokeWidth="4.5" strokeDasharray="220 30" fill="none" />

          {/* Ring 2: Dotted Orbit Ring */}
          <Circle cx="50" cy="50" r="39" stroke={pal.c1} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.9" fill="none" />

          {/* Ring 3: Fine Concentric Frequency Ring */}
          <Circle cx="50" cy="50" r="33" stroke={pal.c3} strokeWidth="1" opacity="0.75" fill="none" />

          {/* Ring 4: Inner Dashed Ring */}
          <Circle cx="50" cy="50" r="26" stroke={pal.c1} strokeWidth="2" strokeDasharray="12 6" opacity="0.85" fill="none" />

          {/* Ring 5: Core Orbit Ring */}
          <Circle cx="50" cy="50" r="19" stroke={pal.c2} strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
        </Svg>
      </Animated.View>

      {/* Counter-Spin Inner Starlight Sparkle Field */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 50, height: 50,
          transform: [{ rotate: spinCounter }],
        }}
        pointerEvents="none"
      >
        <Svg width="50" height="50" viewBox="0 0 50 50">
          <Circle cx="25" cy="4" r="1.5" fill={pal.c3} />
          <Circle cx="46" cy="25" r="2" fill={pal.c1} />
          <Circle cx="25" cy="46" r="1.5" fill={pal.c3} />
          <Circle cx="4" cy="25" r="2" fill={pal.c1} />
        </Svg>
      </Animated.View>

      {/* Pulsating Center Purple Crystal Orb Dot */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={{
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: '#0c0814',
          borderWidth: 2, borderColor: pal.c1,
          alignItems: 'center', justifyContent: 'center',
          elevation: 8,
          shadowColor: pal.c1,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 8,
        }}>
          <View style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: pal.c3,
            shadowColor: pal.c3, shadowOpacity: 1, shadowRadius: 4,
          }} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function RealDragonFireMagicWaveWidget() {
  const [isAnimating, setIsAnimating] = useState(false);
  const scalePulse = useRef(new Animated.Value(1)).current;
  const rotateOuter = useRef(new Animated.Value(0)).current;
  const rotateSpikes = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAnimating) {
      scalePulse.setValue(1);
      rotateOuter.setValue(0);
      rotateSpikes.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scalePulse, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(scalePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );

    const rotOuter = Animated.loop(
      Animated.timing(rotateOuter, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    );

    const rotSpikes = Animated.loop(
      Animated.timing(rotateSpikes, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
    );

    pulseLoop.start();
    rotOuter.start();
    rotSpikes.start();

    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 4500);

    return () => {
      pulseLoop.stop();
      rotOuter.stop();
      rotSpikes.stop();
      clearTimeout(timer);
    };
  }, [isAnimating]);

  const spinClockwise = rotateOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCounter = rotateSpikes.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setIsAnimating(true)}
      style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      {/* Fiery Red Glowing Aura Backing */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 80, height: 80,
          borderRadius: 40,
          backgroundColor: '#ef4444',
          opacity: 0.3,
          shadowColor: '#dc2626',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1, shadowRadius: 12,
          transform: [{ scale: scalePulse }],
        }}
        pointerEvents="none"
      />

      {/* SVG Outer Crimson Fiery Scale Concentric Rings */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 80, height: 80,
          transform: [{ rotate: spinClockwise }, { scale: scalePulse }],
        }}
        pointerEvents="none"
      >
        <Svg width="80" height="80" viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="dragonFireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <Stop offset="50%" stopColor="#dc2626" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.8" />
            </SvgLinearGradient>
          </Defs>

          {/* Outer Double Crimson Fire Rings */}
          <Circle cx="50" cy="50" r="46" stroke="#f87171" strokeWidth="2.5" fill="none" />
          <Circle cx="50" cy="50" r="42" stroke="url(#dragonFireGrad)" strokeWidth="3" strokeDasharray="180 40" fill="none" />
          <Circle cx="50" cy="50" r="38" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="8 4" fill="none" />
          <Circle cx="50" cy="50" r="34" stroke="#f87171" strokeWidth="1" opacity="0.8" fill="none" />
        </Svg>
      </Animated.View>

      {/* SVG 8-Point Radial Fireburst Spikes & Runed Disc */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 64, height: 64,
          transform: [{ rotate: spinCounter }],
        }}
        pointerEvents="none"
      >
        <Svg width="64" height="64" viewBox="0 0 100 100">
          {/* 8-Point Star Spikes radiating outwards */}
          <Path d="M50 5 L53 35 L85 50 L53 65 L50 95 L47 65 L15 50 L47 35 Z" fill="none" stroke="#f87171" strokeWidth="2" opacity="0.9" />
          <Path d="M78 22 L62 40 L78 78 L40 62 L22 78 L38 40 L22 22 L40 38 Z" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.75" />

          {/* Inner Runed Ring */}
          <Circle cx="50" cy="50" r="24" stroke="#fecaca" strokeWidth="2" strokeDasharray="6 3" fill="none" />
        </Svg>
      </Animated.View>

      {/* Center Fiery Core Disc Dot */}
      <View style={{
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#450a0a',
        borderWidth: 2, borderColor: '#f87171',
        alignItems: 'center', justifyContent: 'center',
        elevation: 10,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 10,
      }}>
        <View style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: '#fecaca',
          shadowColor: '#fecaca', shadowOpacity: 1, shadowRadius: 4,
        }} />
      </View>
    </TouchableOpacity>
  );
}

function SvipWaveLivePreviewWidget({ level }: { level: number }) {
  if (level >= 16) {
    return <RealDragonFireMagicWaveWidget />;
  }
  return <RealPurpleCosmicWaveWidget level={level} />;
}



  const renderUniqueBadge = (lvl: number, animated = true) => {
    const customBadgeUrl = vipConfig?.levels?.[lvl]?.badgeUrl;
    if (customBadgeUrl) {
      return (
        <View className="flex-row items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-yellow-500/40 rounded-full">
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(customBadgeUrl) }} className="h-4 w-4" contentFit="contain" />
          <Text className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">SVIP {lvl}</Text>
        </View>
      );
    }

    // Theme config per level group
    const getConfig = () => {
      if (lvl >= 1 && lvl <= 3) {
        // Silver Owl — Blue/Cyan
        const intensity = lvl <= 3 ? 0.7 : 1;
        return {
          bg1: '#0c1a2e',
          bg2: '#0ea5e9',
          border: '#38bdf8',
          glow: '#0ea5e9',
          label: '#e0f2fe',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 2C9 2 7 4 7 6.5c0 1 .3 2 .8 2.8C6.3 10 5 11.5 5 13.5 5 17 8 20 12 20s7-3 7-6.5c0-2-.9-3.7-2.2-4.7.5-.7.7-1.7.7-2.8C17.5 4 15 2 12 2z" fill={`rgba(56,189,248,${intensity})`}/>
              <Circle cx="9.5" cy="9" r="1.5" fill="#fde047"/>
              <Circle cx="14.5" cy="9" r="1.5" fill="#fde047"/>
              <Path d="M11 11.5 L12 13 L13 11.5" fill="#93c5fd" stroke="none"/>
            </Svg>
          )
        };
      } else if (lvl >= 4 && lvl <= 6) {
        // Velvet Wolf — Purple/Pink
        const intensity = ((lvl - 3) / 3);
        return {
          bg1: '#1a0a2e',
          bg2: '#9333ea',
          border: '#d946ef',
          glow: '#a855f7',
          label: '#fdf4ff',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 3 L8 7 L5 6 L7 10 C5 11.5 4 13.5 4 16c0 3.3 3.6 6 8 6s8-2.7 8-6c0-2.5-1.4-4.7-3.5-5.8L18 6l-3 1z" fill={`rgba(168,85,247,${0.6 + intensity * 0.4})`}/>
              <Circle cx="9" cy="13" r="1.5" fill="#f0abfc"/>
              <Circle cx="15" cy="13" r="1.5" fill="#f0abfc"/>
              <Path d="M10.5 16 Q12 17.5 13.5 16" stroke="#e879f9" strokeWidth="1.2" fill="none"/>
            </Svg>
          )
        };
      } else if (lvl >= 7 && lvl <= 9) {
        // Cyber Scorpion — Cyan/Teal
        const intensity = ((lvl - 6) / 3);
        return {
          bg1: '#0a1a2e',
          bg2: '#0891b2',
          border: '#06b6d4',
          glow: '#22d3ee',
          label: '#ecfeff',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 4c-2 0-3.5 1-4 3-.3 1.2 0 2.5.5 3.5C7 11.5 6 13 6 15c0 3 2.7 5 6 5s6-2 6-5c0-2-1-3.5-2.5-4.5.5-1 .8-2.3.5-3.5-.5-2-2-3-4-3z" fill={`rgba(6,182,212,${0.6 + intensity * 0.4})`}/>
              <Circle cx="9" cy="12" r="1.2" fill="#a5f3fc"/>
              <Circle cx="15" cy="12" r="1.2" fill="#a5f3fc"/>
              <Path d="M10 15 Q12 16.5 14 15" stroke="#67e8f9" strokeWidth="1" fill="none"/>
              <Path d="M12 2 L12 4 M5 8 L3 6 M19 8 L21 6" stroke="#22d3ee" strokeWidth="0.8" opacity="0.7"/>
            </Svg>
          )
        };
      } else if (lvl >= 10 && lvl <= 12) {
        // Fiery Lion — Red/Gold
        const intensity = ((lvl - 9) / 3);
        return {
          bg1: '#1f0a00',
          bg2: '#dc2626',
          border: '#fbbf24',
          glow: '#f97316',
          label: '#fffbeb',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Circle cx="12" cy="11" r="5" fill={`rgba(251,146,60,${0.6 + intensity * 0.4})`}/>
              <Path d="M5 8 Q7 4 9 7 Q10 4 12 5 Q14 4 15 7 Q17 4 19 8" stroke="#fbbf24" strokeWidth="1.5" fill="none"/>
              <Circle cx="9.5" cy="10.5" r="1.2" fill="#1f0a00"/>
              <Circle cx="14.5" cy="10.5" r="1.2" fill="#1f0a00"/>
              <Path d="M10.5 13 Q12 14.5 13.5 13" stroke="#7f1d1d" strokeWidth="1" fill="none"/>
              <Path d="M12 16 L12 20 M10 17 L8 21 M14 17 L16 21" stroke="#fbbf24" strokeWidth="0.8" opacity="0.6"/>
            </Svg>
          )
        };
      } else if (lvl >= 13 && lvl <= 15) {
        // Royal Tiger — Orange/Yellow
        const intensity = ((lvl - 12) / 3);
        return {
          bg1: '#1f0f00',
          bg2: '#d97706',
          border: '#eab308',
          glow: '#f59e0b',
          label: '#fefce8',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Circle cx="12" cy="11" r="5" fill={`rgba(245,158,11,${0.6 + intensity * 0.4})`}/>
              <Path d="M7 5 Q9 3 10 5 Q11 3 12 4 Q13 3 14 5 Q15 3 17 5" stroke="#eab308" strokeWidth="1.2" fill="none"/>
              <Circle cx="9.5" cy="10.5" r="1.2" fill="#1f0f00"/>
              <Circle cx="14.5" cy="10.5" r="1.2" fill="#1f0f00"/>
              <Path d="M10.5 13 Q12 14.5 13.5 13" stroke="#78350f" strokeWidth="1" fill="none"/>
              <Path d="M8 16 L7 19 M12 15 L12 19 M16 16 L17 19" stroke="#fbbf24" strokeWidth="0.8" opacity="0.6"/>
            </Svg>
          )
        };
      } else {
        // Obsidian Dragon — Black/Gold (16-18)
        const intensity = ((lvl - 15) / 3);
        return {
          bg1: '#0a0014',
          bg2: '#7c3aed',
          border: '#fbbf24',
          glow: '#eab308',
          label: '#fde68a',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 2 L15 7 L20 5 L17 10 L21 12 L16 13 L18 18 L12 15 L6 18 L8 13 L3 12 L7 10 L4 5 L9 7z" fill={`rgba(234,179,8,${0.5 + intensity * 0.5})`} stroke="#fbbf24" strokeWidth="0.5"/>
              <Circle cx="9.5" cy="10" r="1" fill="#1a0a00"/>
              <Circle cx="14.5" cy="10" r="1" fill="#1a0a00"/>
              <Path d="M10 12.5 Q12 14 14 12.5" stroke="#dc2626" strokeWidth="1" fill="none"/>
            </Svg>
          )
        };
      }
    };

    const config = getConfig();

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: config.border,
        backgroundColor: config.bg1,
        shadowColor: config.glow,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
      }}>
        {config.icon}
        <Text style={{ color: config.label, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>
          SVIP {lvl}
        </Text>
      </View>
    );
  };


  // UI Colors mapped to activeTheme
  const getThemeColors = () => {
    switch (activeTheme) {
      case 'owl':
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-500/20',
          bg: '#0891b2',
          gradient: ['#0891b2', '#0ea5e9', '#2563eb'],
          btnBg: 'bg-cyan-500'
        };
      case 'wolf':
        return {
          text: 'text-purple-400',
          border: 'border-purple-500/20',
          bg: '#a855f7',
          gradient: ['#a855f7', '#d946ef', '#ec4899'],
          btnBg: 'bg-purple-500'
        };
      case 'scorpion':
        return {
          text: 'text-teal-400',
          border: 'border-teal-500/20',
          bg: '#06b6d4',
          gradient: ['#0891b2', '#06b6d4', '#3b82f6'],
          btnBg: 'bg-teal-500'
        };
      case 'lion':
        return {
          text: 'text-orange-400',
          border: 'border-orange-500/20',
          bg: '#f97316',
          gradient: ['#f97316', '#f59e0b', '#ef4444'],
          btnBg: 'bg-orange-500'
        };
      case 'tiger':
        return {
          text: 'text-yellow-400',
          border: 'border-yellow-500/20',
          bg: '#d97706',
          gradient: ['#d97706', '#eab308', '#f59e0b'],
          btnBg: 'bg-yellow-500'
        };
      case 'dragon':
        return {
          text: 'text-yellow-400',
          border: 'border-yellow-500/25',
          bg: '#eab308',
          gradient: ['#eab308', '#d97706', '#7c3aed'],
          btnBg: 'bg-amber-500'
        };
      default:
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-500/20',
          bg: '#0891b2',
          gradient: ['#0891b2', '#0ea5e9', '#2563eb'],
          btnBg: 'bg-cyan-500'
        };
    }
  };

  const themeColors = getThemeColors();

  return (
    <View className="flex-1 bg-black">
            {/* Dynamic Animal Wallpapers, Ambient Star Dust & Top Header Mascot Badge Backdrop */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {/* Dynamic Animal Wallpaper (Background) */}
        <Image 
          source={getBackdropAsset(selectedLevel)} 
          style={[StyleSheet.absoluteFillObject, { opacity: 0.85 }]} 
          contentFit="cover" 
        />
        
        {/* Centered Top Header SVIP Mascot Badge Backdrop (exactly like screenshot 2) */}
        {(() => {
          const badgeUrl = vipConfig?.levels?.[selectedLevel]?.badgeUrl;
          if (badgeUrl) {
            return (
              <View style={{ position: 'absolute', top: 45, left: 0, right: 0, height: 320, alignItems: 'center', justifyContent: 'center', opacity: 1.0 }}>
                <Image 
                  cachePolicy="memory-disk" 
                  source={{ uri: toCDN(badgeUrl) }} 
                  style={{ width: 240, height: 240 }} 
                  contentFit="contain" 
                />
              </View>
            );
          }
          return null;
        })()}

      </View>
      {/* Theme-driven background removed to show static wallpaper */}

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header Bar (Shifted Higher Up) */}
        <View className="flex-row items-center justify-between px-6 pb-2 pt-0 -mt-2">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="p-2 bg-white/5 border border-white/10 rounded-full"
          >
            <ChevronLeft size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <Text className="text-sm font-black tracking-widest text-white uppercase">VIP CLUB</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={() => setIsRulesOpen(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-full"
            >
              <HelpCircle size={18} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsSettingsOpen(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-full"
            >
              <Settings size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 mt-[230px]" showsVerticalScrollIndicator={false}>
          {/* Level Switcher — theme-colored per group */}
          <View className="mt-6 space-y-2">
            <Text style={{ textShadowColor: 'rgba(0, 0, 0, 0.95)', textShadowOffset: { width: 1.5, height: 1.5 }, textShadowRadius: 3 }} className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Select SVIP Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 -mx-4 px-4">
              {SVIP_LEVELS_DATA.map((lvl) => {
                const isSelected = selectedLevel === lvl.level;
                const isUserLevel = userSvipLevel >= lvl.level;
                // Theme color per group
                let tabBg = '#0c1520';
                let tabBorder = '#1e3a5f';
                let tabGlow = '#0ea5e9';
                let tabText = '#7dd3fc';
                if (lvl.level >= 4 && lvl.level <= 6)  { tabBg = '#1a0a2e'; tabBorder = '#6b21a8'; tabGlow = '#a855f7'; tabText = '#d8b4fe'; }
                if (lvl.level >= 7 && lvl.level <= 9)  { tabBg = '#0a1a2e'; tabBorder = '#0e7490'; tabGlow = '#06b6d4'; tabText = '#a5f3fc'; }
                if (lvl.level >= 10 && lvl.level <= 12) { tabBg = '#1f0a00'; tabBorder = '#92400e'; tabGlow = '#f97316'; tabText = '#fed7aa'; }
                if (lvl.level >= 13 && lvl.level <= 15) { tabBg = '#1f0f00'; tabBorder = '#a16207'; tabGlow = '#eab308'; tabText = '#fef08a'; }
                if (lvl.level >= 16)                    { tabBg = '#0d0a00'; tabBorder = '#78350f'; tabGlow = '#eab308'; tabText = '#fde68a'; }
                return (
                  <TouchableOpacity
                    key={lvl.level}
                    onPress={() => setSelectedLevel(lvl.level)}
                    style={{
                      marginRight: 10,
                      height: 42,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? tabGlow : tabBorder,
                      backgroundColor: isSelected ? tabBg : 'rgba(15,15,25,0.6)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      shadowColor: isSelected ? tabGlow : 'transparent',
                      shadowOpacity: isSelected ? 0.7 : 0,
                      shadowRadius: 8,
                      elevation: isSelected ? 6 : 0,
                    }}
                  >
                    {isUserLevel && <CheckCircle size={10} color="#10b981" />}
                    <Text style={{ color: isSelected ? tabGlow : '#94a3b8', fontSize: 11, fontWeight: '800' }}>{lvl.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Identity Progress Card (Shifted to start cleanly below the background Owl) */}
          <View className="bg-transparent pl-0 pr-5 pt-5 pb-1 mt-0">
            <View className="flex-row items-center gap-4">
              <View style={{ width: 110, height: 110, borderRadius: 55, marginLeft: -12 }} className="border-2 border-purple-500/50 items-center justify-center bg-slate-900 overflow-hidden">
                {userProfile?.avatarUrl ? (
                  <Image 
                    source={{ uri: toCDN(userProfile.avatarUrl) }} 
                    style={{ width: 110, height: 110 }} 
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text className="text-white font-bold text-5xl">{(userProfile?.username || 'U').charAt(0)}</Text>
                )}
              </View>
              <View className="flex-1 space-y-1">
                <Text className="text-base font-black text-white">{userProfile?.username || 'Gamer'}</Text>
                <View className="flex-row items-center gap-2">
                  {userSvipLevel > 0 ? (
                    renderSvipStrip(userSvipLevel)
                  ) : (
                    <Text className="text-[9px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider">Non-SVIP Member</Text>
                  )}
                  <Text className="text-[10px] text-slate-400 font-bold">ID: {userProfile?.accountNumber || '000000'}</Text>
                </View>
              </View>
            </View>

            <View className="mt-3 pt-2.5 border-t border-white/5 space-y-2">
              <View className="flex-row justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Text style={{ textShadowColor: 'rgba(0, 0, 0, 0.95)', textShadowOffset: { width: 1.5, height: 1.5 }, textShadowRadius: 3 }} className="text-white font-black">SVIP POINTS PROGRESS</Text>
                <Text style={{ textShadowColor: 'rgba(0, 0, 0, 0.95)', textShadowOffset: { width: 1.5, height: 1.5 }, textShadowRadius: 3 }} className="text-yellow-400 font-black">{Math.floor((userProfile?.wallet?.monthlySpent || 0) / 10).toLocaleString()} / {(activeLevelData.exp / 10).toLocaleString()} Points</Text>
              </View>
              <View className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <View 
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: `${Math.min(100, ((userProfile?.wallet?.monthlySpent || 0) / activeLevelData.exp) * 100)}%` }}
                />
              </View>
            </View>
          </View>

          {/* SVIP Unlocked Exclusives Grid Showcase */}
          {(() => {
            // Helper to get matching frame asset - Firestore per-level URL first, then fallback to local
            const getFrameAsset = (lvl: number) => {
              const firestoreUrl = vipConfig?.levels?.[lvl]?.frameUrl;
              if (firestoreUrl) return { uri: firestoreUrl };
              if (lvl >= 16) return require('../../../assets/images/themes/svip_dragon_frame.png');
              if (lvl >= 13) return require('../../../assets/images/themes/svip_tiger_frame.png');
              if (lvl >= 10) return require('../../../assets/images/themes/svip_lion_frame.png');
              if (lvl >= 7)  return require('../../../assets/images/themes/svip_scorpion_frame.png');
              if (lvl >= 4)  return require('../../../assets/images/themes/svip_wolf_frame.png');
              return require('../../../assets/images/themes/svip_owl_frame.png');
            };

            // Using premium high-fidelity 3D assets dynamically mapped to animal groups
            const getBubbleAsset = (lvl: number) => {
              if (lvl >= 16) return require('../../../assets/images/themes/svip_dragon_bubble.png');
              if (lvl >= 13) return require('../../../assets/images/themes/svip_tiger_bubble.png');
              if (lvl >= 10) return require('../../../assets/images/themes/svip_lion_bubble.png');
              if (lvl >= 7)  return require('../../../assets/images/themes/svip_scorpion_bubble.png');
              if (lvl >= 4)  return require('../../../assets/images/themes/svip_wolf_bubble.png');
              return require('../../../assets/images/themes/svip_owl_bubble.png');
            };

            const getEntranceAsset = (lvl: number) => {
              if (lvl >= 16) return require('../../../assets/images/themes/svip_dragon_entrance.png');
              if (lvl >= 13) return require('../../../assets/images/themes/svip_tiger_entrance.png');
              if (lvl >= 10) return require('../../../assets/images/themes/svip_lion_entrance.png');
              if (lvl >= 7)  return require('../../../assets/images/themes/svip_scorpion_entrance.png');
              if (lvl >= 4)  return require('../../../assets/images/themes/svip_wolf_entrance.png');
              return require('../../../assets/images/themes/svip_owl_entrance.png');
            };

            const getWaveAsset = (lvl: number) => {
              if (lvl >= 16) return require('../../../assets/images/themes/svip_dragon_wave.png');
              if (lvl >= 13) return require('../../../assets/images/themes/svip_tiger_wave.png');
              if (lvl >= 10) return require('../../../assets/images/themes/svip_lion_wave.png');
              if (lvl >= 7)  return require('../../../assets/images/themes/svip_scorpion_wave.png');
              if (lvl >= 4)  return require('../../../assets/images/themes/svip_wolf_wave.png');
              return require('../../../assets/images/themes/svip_owl_wave.png');
            };

            return (
              <View className="mt-0 space-y-4 px-1">
                <Text style={{ textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }} className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-1">
                  SVIP Level Privileges
                </Text>

                {/* Grid Container */}
                <View className="space-y-3">
                  {/* Row 1: Gold Coins, Frame, Entrance */}
                  <View className="flex-row gap-3">
                    {/* Card 1: Gold Coins / Month */}
                    <TouchableOpacity 
                      onPress={() => {
                        if (userSvipLevel > 0) {
                          if (monthlyClaimed) {
                            Alert.alert('Already Claimed', 'You have already claimed your monthly SVIP coins this month!');
                          } else {
                            handleClaimMonthlyCoins();
                          }
                        } else {
                          setShowMonthlyInfo(true);
                        }
                      }}
                      className="flex-1 bg-[#140f0c]/90 border border-amber-500/30 rounded-2xl p-3 items-center justify-between h-36"
                    >
                      <View className="flex-1 items-center justify-center w-full relative">
                        <Text className="text-3xl">💰</Text>
                        <View className="bg-amber-500/90 px-2 py-0.5 rounded-full mt-1">
                          <Text className="text-black text-[8px] font-black">
                            {SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.monthlyCoins?.toLocaleString('en-IN') || '0'}/Mo
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[10px] font-bold text-amber-400 mt-1 lowercase">gold coins / month</Text>
                    </TouchableOpacity>

                    {/* Card 2: Frame */}
                    <View className="flex-1 bg-[#140f0c]/90 border border-[#3d2a1d] rounded-2xl p-3 items-center justify-between h-36">
                      <View className="relative w-20 h-20 items-center justify-center">
                        {/* Avatar Image */}
                        <View className="w-12 h-12 rounded-full overflow-hidden items-center justify-center bg-slate-900">
                          {userProfile?.avatarUrl ? (
                            <Image source={{ uri: toCDN(userProfile.avatarUrl) }} style={{ width: 48, height: 48 }} contentFit="cover" />
                          ) : (
                            <Text className="text-white font-bold text-base">{(userProfile?.username || 'U').charAt(0)}</Text>
                          )}
                        </View>
                        {/* Custom 3D Animal Avatar Frame Overlay */}
                        <Image 
                          source={getFrameAsset(selectedLevel)} 
                          style={{ position: 'absolute', width: 72, height: 72 }} 
                          contentFit="contain" 
                        />
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400 mt-2 lowercase">frame</Text>
                    </View>

                    {/* Card 3: Entrance */}
                    <View className="flex-1 bg-[#140f0c]/90 border border-[#3d2a1d] rounded-2xl p-3 items-center justify-between h-36">
                      <View className="flex-1 items-center justify-center w-full relative">
                        {/* Premium 3D Entrance Effect Banner */}
                        <Image 
                          source={getEntranceAsset(selectedLevel)} 
                          style={{ width: '100%', height: 42 }} 
                          contentFit="contain" 
                        />
                        {/* Real-Time Logged-In User Name Overlay */}
                        <View style={{ position: 'absolute', right: 10, top: 14, maxWidth: '65%' }}>
                          <Text style={{ 
                            color: '#ffffff', 
                            fontSize: 8, 
                            fontWeight: '900', 
                            letterSpacing: 0.5,
                            textShadowColor: 'rgba(0, 0, 0, 0.95)', 
                            textShadowOffset: { width: 1, height: 1 }, 
                            textShadowRadius: 3 
                          }} numberOfLines={1}>
                            {(userProfile?.username || 'USER').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400 mt-2 lowercase">entrance</Text>
                    </View>
                  </View>

                  {/* Row 2: Bubble, Wave, Logo */}
                  <View className="flex-row gap-3">
                    {/* Card 4: Bubble */}
                    <View className="flex-1 bg-[#140f0c]/90 border border-[#3d2a1d] rounded-2xl p-3 items-center justify-between h-36">
                      <View className="flex-1 items-center justify-center w-full">
                        {/* Premium 3D Chat Bubble */}
                        <Image 
                          source={getBubbleAsset(selectedLevel)} 
                          style={{ width: '90%', height: 48 }} 
                          contentFit="contain" 
                        />
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400 mt-2 lowercase">bubble</Text>
                    </View>

                    {/* Card 5: Mic Wave */}
                    <View className="flex-1 bg-[#140f0c]/90 border border-[#3d2a1d] rounded-2xl p-3 items-center justify-between h-36">
                      <View className="flex-1 items-center justify-center w-full">
                        <SvipWaveLivePreviewWidget level={selectedLevel} />
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400 mt-2 lowercase">wave</Text>
                    </View>

                    {/* Card 6: Logo */}
                    <View className="flex-1 bg-[#140f0c]/90 border border-[#3d2a1d] rounded-2xl p-3 items-center justify-between h-36">
                      <View className="flex-1 items-center justify-center w-full">
                        {renderSvipStrip(selectedLevel)}
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400 mt-2 lowercase">logo</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Counters Banner */}
          <View className="flex-row items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-4 mt-6">
            <View className="space-y-0.5">
              <Text className="text-[9px] font-black uppercase text-slate-400">SVIP BENEFITS</Text>
              <Text className="text-white font-bold text-sm">Unlocked: {unlockedCount} / {SVIP_PRIVILEGES_DATA.length}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsSettingsOpen(true)}
              className="bg-white/10 px-3 py-2 border border-white/20 rounded-xl"
            >
              <Text className="text-[10px] font-black uppercase text-white tracking-wider">Stealth Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Privileges Grid */}
          <View className="mt-8 mb-24 flex-row flex-wrap justify-between">
            {SVIP_PRIVILEGES_DATA.map((benefit) => {
              const isUnlocked = benefit.level <= userSvipLevel;
              const BenefitIcon = benefit.icon;
              return (
                <View 
                  key={benefit.id}
                  style={{ width: (width - 48) / 3 }}
                  className={`p-3 border rounded-2xl items-center text-center gap-1.5 mb-3 relative ${
                    isUnlocked ? 'bg-slate-950/60 border-amber-500/20' : 'bg-slate-950/30 border-white/5 opacity-40'
                  }`}
                >
                  {!isUnlocked && (
                    <View className="absolute top-1.5 right-1.5 p-0.5 bg-black/60 rounded-full">
                      <Lock size={8} color="#94a3b8" />
                    </View>
                  )}
                  <View className={`h-9 w-9 rounded-xl items-center justify-center border ${
                    isUnlocked ? 'bg-amber-500/10 border-amber-500/20 text-yellow-400' : 'bg-white/5 border-white/10 text-slate-500'
                  }`}>
                    <BenefitIcon size={16} color={isUnlocked ? '#fbbf24' : '#64748b'} />
                  </View>
                  <Text className="text-white text-[9px] font-black text-center truncate max-w-full" numberOfLines={1}>{benefit.name}</Text>
                  <Text className="text-[7px] text-slate-400 font-bold uppercase">SVIP {benefit.level}+</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Upgrade Button */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-white/5">
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => setIsRulesOpen(true)}
              className="h-12 px-5 bg-white/5 border border-white/10 rounded-xl items-center justify-center"
            >
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Rules</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsPurchaseOpen(true)}
              className={`flex-1 h-12 rounded-xl items-center justify-center flex-row gap-2 ${themeColors.btnBg}`}
            >
              <Zap size={14} color="#fff" fill="#fff" />
              <Text className="text-white font-bold text-sm uppercase tracking-wider">UPGRADE SVIP</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Stealth settings Modal */}
        <Modal
          visible={isSettingsOpen}
          onRequestClose={() => setIsSettingsOpen(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 space-y-5">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">PRIVILEGE STEALTH</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure hidden immunity options</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsSettingsOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex-row justify-between items-center">
                <Text className="text-[10px] font-black text-slate-400 uppercase">Your Active Level:</Text>
                {renderSvipStrip(userSvipLevel)}
              </View>

              <ScrollView className="max-h-96 space-y-3">
                {[
                  { key: 'mysteriousVisitor', label: 'Mysterious Visitor', desc: 'Visit other user profiles completely incognito.', reqLevel: 5 },
                  { key: 'hideGiftRecord', label: 'Hide Gift Record', desc: 'Prevent gift list updates from showing in public rooms.', reqLevel: 8 },
                  { key: 'rankInvisible', label: 'Rank Invisible', desc: 'Hide your username and score entirely from leaderboards.', reqLevel: 9 },
                  { key: 'roomInvisible', label: 'Room Invisible', desc: 'Enter any chatroom with absolute silence and stealth.', reqLevel: 12 },
                  { key: 'avoidBeingKicked', label: 'Avoid Being Kicked', desc: 'Absolute immunity to all room kicks, bans, or mutes.', reqLevel: 13 },
                ].map((sw) => {
                  const isLocked = userSvipLevel < sw.reqLevel;
                  const isActive = stealthSettings[sw.key as keyof typeof stealthSettings];
                  return (
                    <View 
                      key={sw.key}
                      className={`p-4 rounded-xl border flex-row items-center justify-between mb-3 ${
                        isLocked ? 'bg-black/40 border-white/5 opacity-40' : 'bg-slate-900/60 border-white/10'
                      }`}
                    >
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="text-white text-xs font-black">{sw.label}</Text>
                          {isLocked ? (
                            <Text className="text-[8px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 uppercase tracking-wider">SVIP {sw.reqLevel}+</Text>
                          ) : (
                            <Text className="text-[8px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 uppercase tracking-wider">Unlocked</Text>
                          )}
                        </View>
                        <Text className="text-slate-400 text-[9px] font-medium leading-normal">{sw.desc}</Text>
                      </View>
                      <TouchableOpacity
                        disabled={isLocked}
                        onPress={() => handleToggleChange(sw.key as keyof typeof stealthSettings, sw.reqLevel)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors relative justify-center ${
                          isActive ? 'bg-yellow-400 items-end' : 'bg-slate-800 items-start'
                        }`}
                      >
                        <View className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Monthly Coins Info Modal */}
        <Modal
          visible={showMonthlyInfo}
          onRequestClose={() => setShowMonthlyInfo(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 max-h-[85vh]">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5 mb-4">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg">🪙</Text>
                  <Text className="text-sm font-black text-amber-400 uppercase tracking-wider">Gold Coins / Month</Text>
                </View>
                <TouchableOpacity onPress={() => setShowMonthlyInfo(false)}>
                  <Text className="text-white text-xs font-bold">✕</Text>
                </TouchableOpacity>
              </View>

              {/* Table Header */}
              <View className="flex-row bg-amber-500/20 rounded-xl px-3 py-2 mb-1">
                <Text className="flex-1 text-[9px] font-black text-amber-300 uppercase">SVIP Level</Text>
                <Text className="flex-1 text-[9px] font-black text-amber-300 uppercase text-right">Coins Reward</Text>
                <Text className="flex-1 text-[9px] font-black text-amber-300 uppercase text-right">SVIP Level</Text>
                <Text className="flex-1 text-[9px] font-black text-amber-300 uppercase text-right">Coins Reward</Text>
              </View>

              {/* Table Rows */}
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 9 }, (_, i) => {
                  const left = SVIP_LEVELS_DATA[i];
                  const right = SVIP_LEVELS_DATA[i + 9];
                  const isLeftCurrent = left.level === userSvipLevel;
                  const isRightCurrent = right?.level === userSvipLevel;
                  return (
                    <View key={i} className="flex-row px-3 py-2 border-b border-white/5">
                      <Text className={`flex-1 text-[11px] font-bold ${isLeftCurrent ? 'text-amber-400' : 'text-slate-300'}`}>
                        SVIP{left.level}
                      </Text>
                      <Text className={`flex-1 text-[11px] font-bold text-right ${isLeftCurrent ? 'text-amber-400' : 'text-white'}`}>
                        {left.monthlyCoins.toLocaleString('en-IN')}/mo
                      </Text>
                      {right ? (
                        <>
                          <Text className={`flex-1 text-[11px] font-bold text-right ${isRightCurrent ? 'text-amber-400' : 'text-slate-300'}`}>
                            SVIP{right.level}
                          </Text>
                          <Text className={`flex-1 text-[11px] font-bold text-right ${isRightCurrent ? 'text-amber-400' : 'text-white'}`}>
                            {right.monthlyCoins.toLocaleString('en-IN')}/mo
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text className="flex-1" />
                          <Text className="flex-1" />
                        </>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <Text className="text-amber-200/50 text-[9px] font-bold text-center mt-4">
                A fixed amount of gold coins can be claimed monthly as an SVIP benefit.
              </Text>

              <TouchableOpacity
                onPress={() => setShowMonthlyInfo(false)}
                className="mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 items-center"
              >
                <Text className="text-black font-black text-sm uppercase tracking-wider">Ok</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 2. Rules introduction Modal */}
        <Modal
          visible={isRulesOpen}
          onRequestClose={() => setIsRulesOpen(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-h-[85vh]">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">SVIP RULES & VALIDITY</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Monthly Points, Points Back & Upgrade Rules</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsRulesOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
                {/* Rule 1: How Points Work */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1.5">1. How SVIP Points Work</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• 10 Coins Recharge = 1 SVIP Point</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• SVIP Points = Monthly Spent ÷ 10</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Points update instantly when you recharge</Text>
                </View>

                {/* Rule 2: Instant Upgrade */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1.5">2. Instant Upgrade</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Once upgrade point requirements are met, your SVIP level updates immediately</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Your current SVIP level will be retained until the end of the next month</Text>
                </View>

                {/* Rule 3: Monthly Reset + Points Back */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1.5">3. Monthly Reset & Points Back</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• On the 1st of each month, your SVIP points reset</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• You receive Points Back based on your current level (see table below)</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Points Back become your starting balance for the new month</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Monthly spending limit resets to Points Back amount</Text>
                </View>

                {/* Rule 4: Monthly Maintenance */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1.5">4. Monthly Maintenance</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• At the end of each month, your points are checked against your current level</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• If your points don't meet the requirement, you'll be downgraded to the highest qualifying level</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Downgrade happens on the 1st of the next month during reset</Text>
                </View>

                {/* Level Thresholds Table */}
                <View className="space-y-2 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest ml-1">5. Level Thresholds & Points Back</Text>
                  <View className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/60">
                    <View className="flex-row bg-white/5 py-2 px-3 border-b border-white/5">
                      <Text className="flex-[0.6] text-slate-400 text-[9px] font-black uppercase">Level</Text>
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase text-center">Coins Required</Text>
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase text-right">Points Back</Text>
                    </View>
                    {SVIP_LEVELS_DATA.map((lvl) => (
                      <View key={lvl.level} className="flex-row py-2 px-3 border-b border-white/5">
                        <Text className="flex-[0.6] text-white text-[10px] font-bold">SVIP {lvl.level}</Text>
                        <Text className="flex-1 text-yellow-400 text-[10px] font-bold text-center">{lvl.points}</Text>
                        <Text className="flex-1 text-emerald-400 text-[10px] font-bold text-right">{lvl.pointsBack}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 3. Purchase SVIP Modal */}
        <Modal
          visible={isPurchaseOpen}
          onRequestClose={() => setIsPurchaseOpen(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-h-[85vh]">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">Upgrade SVIP</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Purchase EXP with coins</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsPurchaseOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              {/* Current Status */}
              <View className="bg-white/5 border border-white/10 rounded-xl p-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[10px] font-black text-slate-400 uppercase">Your Current Level</Text>
                  {renderSvipStrip(userSvipLevel)}
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[10px] font-bold text-slate-400">SVIP Points</Text>
                  <Text className="text-yellow-400 text-xs font-black">{Math.floor((userProfile?.wallet?.monthlySpent || 0) / 10).toLocaleString('en-IN')} / {(activeLevelData.exp / 10).toLocaleString('en-IN')}</Text>
                </View>
                <View className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5 mt-2">
                  <View 
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${Math.min(100, ((userProfile?.wallet?.monthlySpent || 0) / activeLevelData.exp) * 100)}%` }}
                  />
                </View>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-[9px] font-bold text-slate-500">Coins Balance</Text>
                  <Text className="text-white text-xs font-black">{(userProfile?.wallet?.coins || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Level Selection */}
              <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Target Level</Text>
                <View className="space-y-2">
                  {SVIP_LEVELS_DATA.map((lvl) => {
                    const monthlySpent = userProfile?.wallet?.monthlySpent || 0;
                    const svipPoints = Math.floor(monthlySpent / 10);
                    const isAlreadyReached = svipPoints >= (lvl.exp / 10);
                    const isSelected = selectedLevel === lvl.level;
                    const cost = isAlreadyReached ? 0 : Math.max(0, lvl.exp - monthlySpent);

                    return (
                      <TouchableOpacity
                        key={lvl.level}
                        disabled={isAlreadyReached}
                        onPress={() => setSelectedLevel(lvl.level)}
                        className={`p-3 rounded-xl border flex-row items-center justify-between ${
                          isSelected ? 'bg-purple-600/20 border-purple-400/50' : 
                          isAlreadyReached ? 'bg-emerald-500/10 border-emerald-500/20' : 
                          'bg-white/5 border-white/10'
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          {isAlreadyReached ? (
                            <CheckCircle size={16} color="#10b981" />
                          ) : (
                            <View className="w-4 h-4 rounded-full border-2 border-white/30 items-center justify-center">
                              {isSelected && <View className="w-2 h-2 rounded-full bg-purple-400" />}
                            </View>
                          )}
                          <View>
                            <Text className={`text-xs font-black ${isAlreadyReached ? 'text-emerald-400' : 'text-white'}`}>{lvl.name}</Text>
                            <Text className="text-[9px] text-slate-400 font-bold">{lvl.points} EXP • {lvl.theme}</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          {isAlreadyReached ? (
                            <Text className="text-[9px] font-black text-emerald-400 uppercase">Reached</Text>
                          ) : (
                            <Text className="text-[10px] font-black text-yellow-400">{cost.toLocaleString('en-IN')} coins</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Buy Button */}
              <View className="pt-2">
                <TouchableOpacity
                  onPress={handlePurchaseSvip}
                  disabled={isPurchasing || (userProfile?.wallet?.monthlySpent || 0) >= (SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.exp || 0)}
                  className={`h-14 rounded-2xl items-center justify-center flex-row gap-2 ${
                    (userProfile?.wallet?.monthlySpent || 0) >= (SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.exp || 0)
                      ? 'bg-slate-800' : themeColors.btnBg
                  }`}
                >
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Zap size={16} color="#fff" fill="#fff" />
                      <Text className="text-white font-black text-sm uppercase tracking-wider">
                        {(userProfile?.wallet?.monthlySpent || 0) >= (SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.exp || 0)
                          ? 'Already Reached' : `Buy SVIP ${selectedLevel}`
                        }
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text className="text-[8px] text-slate-500 text-center mt-2 font-bold">10 Coins = 1 SVIP Point. Upgrade is instant.</Text>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>


    </View>
  );
}

