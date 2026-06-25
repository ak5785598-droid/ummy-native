import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions, StyleSheet } from 'react-native';
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
import { doc, onSnapshot, updateDoc } from '@/firebase/firestore-compat';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

// --- DATA STRUCTURES ---
const SVIP_LEVELS_DATA = [
  { level: 1, name: 'SVIP 1', points: '1.5M', exp: 1500000, validity: '7 Days', maintPoints: '375K', maintExp: 375000, theme: 'owl' },
  { level: 2, name: 'SVIP 2', points: '3.0M', exp: 3000000, validity: '7 Days', maintPoints: '375K', maintExp: 375000, theme: 'owl' },
  { level: 3, name: 'SVIP 3', points: '6.25M', exp: 6250000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 4, name: 'SVIP 4', points: '12.5M', exp: 12500000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 5, name: 'SVIP 5', points: '25.0M', exp: 25000000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 6, name: 'SVIP 6', points: '50.0M', exp: 50000000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 7, name: 'SVIP 7', points: '75.0M', exp: 75000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 8, name: 'SVIP 8', points: '100.0M', exp: 100000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 9, name: 'SVIP 9', points: '150.0M', exp: 150000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 10, name: 'SVIP 10', points: '200.0M', exp: 200000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 11, name: 'SVIP 11', points: '275.0M', exp: 275000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 12, name: 'SVIP 12', points: '350.0M', exp: 350000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 13, name: 'SVIP 13', points: '425.0M', exp: 425000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 14, name: 'SVIP 14', points: '500.0M', exp: 500000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 15, name: 'SVIP 15', points: '575.0M', exp: 575000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 16, name: 'SVIP 16', points: '650.0M', exp: 650000000, validity: '60 Days', maintPoints: '100.0M', maintExp: 100000000, theme: 'dragon' },
  { level: 17, name: 'SVIP 17', points: '700.0M', exp: 700000000, validity: '60 Days', maintPoints: '100.0M', maintExp: 100000000, theme: 'dragon' },
  { level: 18, name: 'SVIP 18', points: '750.0M', exp: 750000000, validity: '60 Days', maintPoints: '100.0M', maintExp: 100000000, theme: 'dragon' },
];

const SVIP_PRIVILEGES_DATA = [
  { id: 1, name: 'SVIP Badge', desc: 'Premium level status marker', level: 1, icon: Award, category: 'Identity' },
  { id: 2, name: 'Silver-Wing Frame', desc: 'Noble Owl Avatar frame decoration', level: 1, icon: Crown, category: 'Identity' },
  { id: 3, name: 'Owl Chat Bubble', desc: 'Distinctive blue message border', level: 2, icon: MessageSquare, category: 'Interaction' },
  { id: 4, name: 'Entering Sound', desc: 'Audio sound wave chime on room entry', level: 2, icon: Volume2, category: 'VFX' },
  { id: 5, name: 'Golden Wave Mic', desc: 'Gilded mic waves in rooms', level: 3, icon: Radio, category: 'Interaction' },
  { id: 6, name: 'Silver Greeting Card', desc: 'Gleaming Owl entry greeting card', level: 4, icon: ShieldAlert, category: 'VFX' },
  { id: 7, name: 'Owl Portal Ride', desc: 'Animated Owl flight entry ride', level: 4, icon: Compass, category: 'VFX' },
  { id: 8, name: 'Mysterious Visitor', desc: 'Visit profiles with 100% stealth', level: 5, icon: EyeOff, category: 'Stealth' },
  { id: 9, name: 'Exclusive Owl Gift', desc: 'Unlock Owl core token gifting item', level: 5, icon: Gift, category: 'Gifts' },
  { id: 10, name: 'Weekly Coin Rebate', desc: 'Daily claimable coin multiplier bonuses', level: 6, icon: Zap, category: 'Rebates' },
  { id: 11, name: 'Wolf Velvet Frame', desc: 'Dark purple neon wolf border decoration', level: 7, icon: Crown, category: 'Identity' },
  { id: 12, name: 'Hide Gift Record', desc: 'Stealthily receive/send without record', level: 8, icon: Lock, category: 'Stealth' },
  { id: 13, name: 'Purple Crescent Ride', desc: 'Hovering moon ride portal entrance', level: 8, icon: Compass, category: 'VFX' },
  { id: 14, name: 'Rank Hiding', desc: 'Become completely invisible on charts', level: 9, icon: UserCheck, category: 'Stealth' },
  { id: 15, name: 'Wolf Neon Bubble', desc: 'Luminous violet chat bubble border', level: 9, icon: MessageSquare, category: 'Interaction' },
  { id: 16, name: 'Private Space Album', desc: 'Hidden album with access key control', level: 10, icon: Key, category: 'Interaction' },
  { id: 17, name: 'Fiery Lion Frame', desc: 'Solar ruby-red fiery card outline', level: 11, icon: Crown, category: 'Identity' },
  { id: 18, name: 'Lion Crimson Nameplate', desc: 'Stand out with bold red nameplate text', level: 11, icon: Flame, category: 'Identity' },
  { id: 19, name: 'Room Stealth Entry', desc: 'Enter any chatroom in absolute silence', level: 12, icon: EyeOff, category: 'Stealth' },
  { id: 20, name: 'Lion Portal Ride', desc: 'Fiery solar lion chariot entry portal', level: 12, icon: Compass, category: 'VFX' },
  { id: 21, name: 'Absolute Kick Immunity', desc: 'Immunity against all kicks & bans', level: 13, icon: ShieldCheck, category: 'Stealth' },
  { id: 22, name: 'Lion Crimson Bubble', desc: 'Glowing crimson flame chat outline', level: 14, icon: MessageSquare, category: 'Interaction' },
  { id: 23, name: 'CP Room Decoration', desc: 'Custom themed luxury CP room design', level: 14, icon: Heart, category: 'Interaction' },
  { id: 24, name: 'Custom Micro-Badge', desc: 'Personalized mini icon next to name', level: 15, icon: Award, category: 'Identity' },
  { id: 25, name: 'Obsidian Dragon Frame', desc: 'Cosmic scale dragon wings ornament', level: 16, icon: Crown, category: 'Identity' },
  { id: 26, name: 'Dragon Flight Ride', desc: 'Grand majestic dragon mount ride VFX', level: 16, icon: Compass, category: 'VFX' },
  { id: 27, name: 'Diamond Conversion Buff', desc: 'Higher limit for coin-to-diamond swaps', level: 17, icon: Gem, category: 'Rebates' },
  { id: 28, name: 'VIP Liaison Officer', desc: '24/7 dedicated support representative', level: 17, icon: Users, category: 'Interaction' },
  { id: 29, name: 'Imperial Dragon Bubble', desc: 'Dragon scales neon border overlay', level: 18, icon: MessageSquare, category: 'Interaction' },
  { id: 30, name: 'Global Server Broadcast', desc: 'Announce presence to all rooms globally', level: 18, icon: Radio, category: 'VFX' },
  { id: 31, name: 'Infinite Validity Lock', desc: 'Never downgrade; level locked forever', level: 18, icon: Crown, category: 'Rebates' },
];

export default function VipsClubScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  // States
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [vipConfig, setVipConfig] = useState<any>({
    bgType: 'dynamic',
    bgUrl: '',
    levels: {}
  });

  // Stealth toggles state
  const [stealthSettings, setStealthSettings] = useState({
    mysteriousVisitor: false,
    hideGiftRecord: false,
    rankInvisible: false,
    roomInvisible: false,
    avoidBeingKicked: false,
  });

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
    }, (err: any) => {
      console.warn("VIP settings sync error:", err);
    });

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

  const unlockedCount = SVIP_PRIVILEGES_DATA.filter(p => p.level <= selectedLevel).length;

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
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message || 'Could not update settings.');
      setStealthSettings(prev => ({ ...prev, [key]: !newStatus }));
    }
  };

  const renderUniqueBadge = (lvl: number, animated = true) => {
    const customBadgeUrl = vipConfig?.levels?.[lvl]?.badgeUrl;
    if (customBadgeUrl) {
      return (
        <View className="flex-row items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-yellow-500/40 rounded-full">
          <Image cachePolicy="memory-disk" source={{ uri: customBadgeUrl }} className="h-4 w-4" contentFit="contain" />
          <Text className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">SVIP {lvl}</Text>
        </View>
      );
    }

    let colors = ['#94a3b8', '#cbd5e1'];
    let labelColor = '#f1f5f9';
    let iconColor = '#cbd5e1';

    if (lvl >= 1 && lvl <= 6) {
      // Silver Owl
      colors = ['#475569', '#0ea5e9'];
      labelColor = '#e0f2fe';
      iconColor = '#38bdf8';
    } else if (lvl >= 7 && lvl <= 10) {
      // Velvet Wolf
      colors = ['#6366f1', '#ec4899'];
      labelColor = '#fdf2f8';
      iconColor = '#f472b6';
    } else if (lvl >= 11 && lvl <= 15) {
      // Fiery Lion
      colors = ['#dc2626', '#f59e0b'];
      labelColor = '#fffbeb';
      iconColor = '#fbbf24';
    } else {
      // Obsidian Dragon
      colors = ['#1e1b4b', '#fbbf24'];
      labelColor = '#fbbf24';
      iconColor = '#fbbf24';
    }

    return (
      <View 
        className="flex-row items-center gap-1.5 px-3 py-1 rounded-full border border-white/20"
        style={{ backgroundColor: colors[0] }}
      >
        <Star size={10} color={iconColor} fill={iconColor} />
        <Text style={{ color: labelColor }} className="text-[10px] font-black tracking-wider">SVIP {lvl}</Text>
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
      case 'lion':
        return {
          text: 'text-orange-400',
          border: 'border-orange-500/20',
          bg: '#f97316',
          gradient: ['#f97316', '#f59e0b', '#ef4444'],
          btnBg: 'bg-orange-500'
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
    <View className="flex-1 bg-[#070922]">
      {/* Background configurations */}
      {showCustomBg ? (
        isVideoBg ? (
          <Video
            source={{ uri: levelBgUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
          />
        ) : (
          <Image cachePolicy="memory-disk" source={{ uri: levelBgUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        )
      ) : vipConfig.bgType === 'image' && vipConfig.bgUrl ? (
        <Image cachePolicy="memory-disk" source={{ uri: vipConfig.bgUrl }} style={[StyleSheet.absoluteFillObject, { opacity: 0.25 }]} contentFit="cover" />
      ) : vipConfig.bgType === 'video' && vipConfig.bgUrl ? (
        <Video
          source={{ uri: vipConfig.bgUrl }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
      ) : null}

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-6 py-4">
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

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Identity Progress Card */}
          <View className="bg-[#0b0e1e]/80 border border-white/5 rounded-3xl p-5 mt-4 shadow-xl">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 rounded-full border-2 border-purple-500/50 items-center justify-center bg-slate-900">
                <Text className="text-white font-bold text-lg">{(userProfile?.username || 'U').charAt(0)}</Text>
              </View>
              <View className="flex-1 space-y-1">
                <Text className="text-base font-black text-white">{userProfile?.username || 'Gamer'}</Text>
                <View className="flex-row items-center gap-2">
                  {userSvipLevel > 0 ? (
                    renderUniqueBadge(userSvipLevel, false)
                  ) : (
                    <Text className="text-[9px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider">Non-SVIP Member</Text>
                  )}
                  <Text className="text-[10px] text-slate-400 font-bold">ID: {userProfile?.accountNumber || '000000'}</Text>
                </View>
              </View>
            </View>

            <View className="mt-5 pt-4 border-t border-white/5 space-y-2">
              <View className="flex-row justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Text className="text-slate-400">VIP EXP PROGRESS</Text>
                <Text className="text-yellow-400">{(userProfile?.wallet?.totalSpent || 0).toLocaleString()} / 1.5M EXP</Text>
              </View>
              <View className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <View 
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: `${Math.min(100, ((userProfile?.wallet?.totalSpent || 0) / 1500000) * 100)}%` }}
                />
              </View>
              <Text className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-right">1 Coin = 1 EXP. Updates instantly.</Text>
            </View>
          </View>

          {/* Level Switcher */}
          <View className="mt-6 space-y-2">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select SVIP Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 -mx-4 px-4">
              {SVIP_LEVELS_DATA.map((lvl) => {
                const isSelected = selectedLevel === lvl.level;
                const isUserLevel = userSvipLevel >= lvl.level;
                return (
                  <TouchableOpacity
                    key={lvl.level}
                    onPress={() => setSelectedLevel(lvl.level)}
                    className={`mr-3 h-10 px-4 rounded-xl border flex-row items-center gap-2 ${
                      isSelected ? 'bg-purple-600 border-purple-400' : 'bg-slate-900/60 border-white/5'
                    }`}
                  >
                    {isUserLevel && <CheckCircle size={10} color="#10b981" />}
                    <Text className="text-white text-xs font-bold">{lvl.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Tier Beast Emblem Presentation */}
          <View className="items-center justify-center py-6 mt-4">
            <View className="relative h-44 w-44 items-center justify-center">
              {vipConfig?.levels?.[selectedLevel]?.videoUrl ? (
                <Video
                  source={{ uri: vipConfig.levels[selectedLevel].videoUrl }}
                  style={{ width: 150, height: 150, borderRadius: 75 }}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                />
              ) : (
                <Svg viewBox="0 0 100 100" style={{ width: 140, height: 140 }}>
                  <Defs>
                    <SvgLinearGradient id="themeGrad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor={themeColors.gradient[0]} />
                      <Stop offset="50%" stopColor={themeColors.gradient[1]} />
                      <Stop offset="100%" stopColor={themeColors.gradient[2]} />
                    </SvgLinearGradient>
                  </Defs>
                  <Circle cx="50" cy="50" r="42" fill="none" stroke={themeColors.bg} strokeWidth="1" strokeDasharray="3 3" />
                  {activeTheme === 'owl' && (
                    <Path d="M15,40 C35,25 45,45 50,45 C55,45 65,25 85,40 C75,65 55,75 50,75 C45,75 25,65 15,40 Z" fill="url(#themeGrad)" />
                  )}
                  {activeTheme === 'wolf' && (
                    <Path d="M50,70 L48,62 Q45,55 52,48 Q55,45 50,38 L55,30 L58,35 Q65,40 58,48 Q56,52 58,58 Z" fill="url(#themeGrad)" />
                  )}
                  {activeTheme === 'lion' && (
                    <Path d="M35,65 Q30,55 35,42 Q40,30 50,32 Q60,30 65,42 Q70,55 65,65 L60,62 C62,55 60,45 50,45 C40,45 38,55 40,62 Z" fill="url(#themeGrad)" />
                  )}
                  {activeTheme === 'dragon' && (
                    <Path d="M38,40 Q40,30 50,28 Q60,30 62,40 C65,55 50,72 50,72 C50,72 35,55 38,40 Z" fill="url(#themeGrad)" />
                  )}
                </Svg>
              )}
            </View>

            {/* Circular Podium Base */}
            <View className="w-64 h-8 bg-slate-900 border border-white/10 rounded-full mt-2 items-center justify-center">
              <View className="h-1.5 w-12 bg-white/30 rounded-full blur-[1px]" />
            </View>

            <View className="items-center mt-4">
              <Text className="text-white text-lg font-black uppercase">{activeLevelData.name} • {activeTheme.toUpperCase()}</Text>
              <Text className={`text-xs font-bold text-center ${themeColors.text}`}>
                {activeTheme === 'owl' ? 'Owl Domain' :
                 activeTheme === 'wolf' ? 'Wolf Sanctuary' :
                 activeTheme === 'lion' ? 'Lion Arena' : 'Dragon Dynasty'}
              </Text>
            </View>
          </View>

          {/* Counters Banner */}
          <View className="flex-row items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-4 mt-6">
            <View className="space-y-0.5">
              <Text className="text-[9px] font-black uppercase text-slate-400">SVIP BENEFITS</Text>
              <Text className="text-white font-bold text-sm">Unlocked: {unlockedCount} / 31</Text>
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
              const isUnlocked = benefit.level <= selectedLevel;
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
              onPress={() => router.push('/wallet')}
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
                {renderUniqueBadge(userSvipLevel, false)}
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
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Validity, Maintenance & EXP Guidelines</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsRulesOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1.5">1. EXP Earning Principles</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Earn exactly 1 EXP for every 1 Coin purchased.</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Points are added instantly to your total spent accumulation.</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• EXP deductions are made in case of processed chargebacks or refunds.</Text>
                </View>

                <View className="space-y-2 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest ml-1">2. Level Threshold EXP Table</Text>
                  <View className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/60">
                    <View className="flex-row bg-white/5 py-2 px-3 border-b border-white/5">
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase">Level</Text>
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase text-center">EXP Required</Text>
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase text-right">Animal Theme</Text>
                    </View>
                    {SVIP_LEVELS_DATA.map((lvl) => (
                      <View key={lvl.level} className="flex-row py-2 px-3 border-b border-white/5">
                        <Text className="flex-1 text-white text-[10px] font-bold">SVIP {lvl.level}</Text>
                        <Text className="flex-1 text-yellow-400 text-[10px] font-bold text-center">{lvl.points} EXP</Text>
                        <Text className="flex-1 text-slate-400 text-[9px] font-bold text-right uppercase">{lvl.theme}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}
