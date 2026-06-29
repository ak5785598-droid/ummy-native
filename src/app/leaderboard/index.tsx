import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Medal, TrendingUp, HelpCircle, ArrowLeft, User, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFirebase } from '../../firebase/provider';
import { collection, query, where, orderBy, limit, onSnapshot } from '@/firebase/firestore-compat';
import { useCollection, useMemoFirebase } from '../../firebase/provider';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { GoldenCoin } from '../../components/GoldenCoin';

const TABS = [
  { key: 'rich', label: 'Honor', icon: Crown },
  { key: 'charm', label: 'Charm', icon: Medal },
  { key: 'rooms', label: 'Room', icon: TrendingUp },
];

const LOCAL_THEMES: Record<string, any> = {
  'celestial_love.jpg': require('../../../assets/images/themes/celestial_love.jpg'),
  'celestial_love_v2.jpg': require('../../../assets/images/themes/celestial_love_v2.jpg'),
  'coding_hacker_v2.jpg': require('../../../assets/images/themes/coding_hacker_v2.jpg'),
  'community_help_v2.jpg': require('../../../assets/images/themes/community_help_v2.jpg'),
  'dreamy_hearts.jpg': require('../../../assets/images/themes/dreamy_hearts.jpg'),
  'dreamy_hearts_v2.jpg': require('../../../assets/images/themes/dreamy_hearts_v2.jpg'),
  'friendly_guide_scenic.jpg': require('../../../assets/images/themes/friendly_guide_scenic.jpg'),
  'gaming_arcade_v2.jpg': require('../../../assets/images/themes/gaming_arcade_v2.jpg'),
  'halloween_2025_v2.jpg': require('../../../assets/images/themes/halloween_2025_v2.jpg'),
  'heartbeat_arcade_scenic.jpg': require('../../../assets/images/themes/heartbeat_arcade_scenic.jpg'),
  'help_center_light.jpg': require('../../../assets/images/themes/help_center_light.jpg'),
  'midnight_proposal.jpg': require('../../../assets/images/themes/midnight_proposal.jpg'),
  'minimal_help_v2.jpg': require('../../../assets/images/themes/minimal_help_v2.jpg'),
  'moonlit_romance.jpg': require('../../../assets/images/themes/moonlit_romance.jpg'),
  'neon_night_scenic.jpg': require('../../../assets/images/themes/neon_night_scenic.jpg'),
  'official_hub_dark.jpg': require('../../../assets/images/themes/official_hub_dark.jpg'),
  'official_hub_light.jpg': require('../../../assets/images/themes/official_hub_light.jpg'),
  'official_ummy_v2.jpg': require('../../../assets/images/themes/official_ummy_v2.jpg'),
  'sunset_shore.jpg': require('../../../assets/images/themes/sunset_shore.jpg'),
  'sunset_shore_v2.jpg': require('../../../assets/images/themes/sunset_shore_v2.jpg'),
  'ummy_emoji_party.jpg': require('../../../assets/images/themes/ummy_emoji_party.jpg'),
  'ummy_galaxy.jpg': require('../../../assets/images/themes/ummy_galaxy.jpg'),
  'ummy_galaxy_v2.jpg': require('../../../assets/images/themes/ummy_galaxy_v2.jpg'),
  'ummy_golden_glow.jpg': require('../../../assets/images/themes/ummy_golden_glow.jpg'),
  'ummy_help_guide.jpg': require('../../../assets/images/themes/ummy_help_guide.jpg'),
  'ummy_love_vibes.jpg': require('../../../assets/images/themes/ummy_love_vibes.jpg'),
  'ummy_neon_night.jpg': require('../../../assets/images/themes/ummy_neon_night.jpg'),
  'ummy_prime.jpg': require('../../../assets/images/themes/ummy_prime.jpg'),
  'ummy_spring_garden.jpg': require('../../../assets/images/themes/ummy_spring_garden.jpg'),
  'ummy_spring_garden_v2.jpg': require('../../../assets/images/themes/ummy_spring_garden_v2.jpg'),
  'ummy_support_hub.jpg': require('../../../assets/images/themes/ummy_support_hub.jpg'),
};

function formatValue(val: number): string {
  if (!val) return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString();
}

// --- Dynamic Premium Background Component (Natively adapted from Web CSS) ---
const DynamicThemeBackground = () => {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1e0e14' }} pointerEvents="none">
      {/* Base Gradient from reddish-purple to brown to deep purple */}
      <LinearGradient
        colors={['#2e152b', '#2c1b18', '#3b1c32']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Top Left pink glowing blob */}
      <View 
        style={{ position: 'absolute', top: '-10%', left: '-10%', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(236, 72, 153, 0.1)', transform: [{ scale: 1.5 }] }}
      />
      {/* Bottom Right purple glowing blob */}
      <View 
        style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(147, 51, 234, 0.1)', transform: [{ scale: 1.5 }] }}
      />
      {/* Middle Right brown glowing blob */}
      <View 
        style={{ position: 'absolute', top: '40%', right: '-20%', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(139, 69, 19, 0.15)', transform: [{ scale: 1.5 }] }}
      />
      {/* Bottom dark fade */}
      <LinearGradient
        colors={['transparent', '#1a0e14']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }}
      />
    </View>
  );
};

function LeaderboardAnimOverlay() {
  const borderGlow = useRef(new Animated.Value(0.4)).current;
  
  // 30 golden confetti/sparkle particles raining down
  const goldenRain = useRef(Array.from({ length: 30 }, () => ({
    animY: new Animated.Value(0),
    animX: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(1),
    x: Math.random() * 370,
    size: 2.5 + Math.random() * 4.5,
    delay: Math.random() * 5000,
    speed: 5000 + Math.random() * 5000,
    drift: (Math.random() - 0.5) * 40,
  }))).current;

  useEffect(() => {
    // Border pulsing loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(borderGlow, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Raining particles loop
    goldenRain.forEach(p => {
      const runRain = () => {
        p.animY.setValue(0);
        p.animX.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(1);

        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            // Fade-in at top, fade-out near bottom
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
              Animated.delay(p.speed - 2200),
              Animated.timing(p.opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ]),
            // Fall downwards
            Animated.timing(p.animY, {
              toValue: 780,
              duration: p.speed,
              useNativeDriver: true,
            }),
            // Drift sideways
            Animated.timing(p.animX, {
              toValue: p.drift,
              duration: p.speed,
              useNativeDriver: true,
            }),
            // Shrink as it falls
            Animated.timing(p.scale, {
              toValue: 0.2,
              duration: p.speed,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          runRain();
        });
      };
      runRain();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Golden Neon Glowing Screen Border */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute',
        top: 2, left: 2, right: 2, bottom: 2,
        borderWidth: 2.5,
        borderRadius: 24,
        borderColor: '#fbbf24',
        opacity: borderGlow,
        shadowColor: '#fbbf24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
      }} />

      {/* Outer Border Halo Accent */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderWidth: 1,
        borderRadius: 26,
        borderColor: 'rgba(255,255,255,0.15)',
        opacity: borderGlow,
      }} />

      {/* Twinkling Golden Rain Confetti */}
      {goldenRain.map((p, idx) => (
        <Animated.View key={idx} pointerEvents="none" style={{
          position: 'absolute',
          top: -20, // Start just off-screen at the top
          left: p.x,
          width: p.size,
          height: p.size,
          borderRadius: idx % 2 === 0 ? p.size / 2 : 1, // Circles and Diamond-like stars
          backgroundColor: idx % 3 === 0 ? '#ffffff' : '#fbbf24', // Sparkling White & Pure Gold
          opacity: p.opacity,
          transform: [
            { translateY: p.animY },
            { translateX: p.animX },
            { scale: p.scale },
          ],
          shadowColor: '#fbbf24',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
          elevation: 2,
        }} />
      ))}
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const initialTab = (searchParams.type as any) || 'rich';

  const { firestore } = useFirebase();
  const [activeTab, setActiveTab] = useState<'rich' | 'charm' | 'rooms'>(initialTab);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTheme, setActiveTheme] = useState<any>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Load Active Theme configuration from Firestore
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'leaderboardThemes'), where('isActive', '==', true), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      if (snapshot.docs.length > 0) {
        setActiveTheme({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveTheme(null);
      }
    }, (error: any) => {
      console.warn('Error fetching active theme:', error);
    });
    return () => unsubscribe();
  }, [firestore]);

  const getThemeImage = () => {
    if (!activeTheme || !activeTheme.backgroundUrl) return null;
    const url = activeTheme.backgroundUrl;
    const cleanUrl = url.split('?')[0];
    const filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    return LOCAL_THEMES[filename] || null;
  };

  const localThemeImage = getThemeImage();

  // Helper to generate field name dynamically matching web app structure
  const getFieldName = () => {
    const suffix = activeTab === 'rich' ? 'Spent' : activeTab === 'charm' ? 'GiftsReceived' : 'Gifts';
    return `${timeFilter}${suffix}`;
  };

  const queryConfig = useMemo(() => {
    const fieldName = getFieldName();
    if (activeTab === 'rich') {
      return { 
        collection: 'users', 
        field: `wallet.${fieldName}`, 
        labelField: 'username', 
        avatarField: 'avatarUrl' 
      };
    }
    if (activeTab === 'charm') {
      return { 
        collection: 'users', 
        field: `stats.${fieldName}`, 
        labelField: 'username', 
        avatarField: 'avatarUrl' 
      };
    }
    return { 
      collection: 'chatRooms', 
      field: `stats.${fieldName}`, 
      labelField: 'title', 
      avatarField: 'coverUrl' 
    };
  }, [activeTab, timeFilter]);

  const leaderboardQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, queryConfig.collection),
      where(queryConfig.field, '>', 0),
      orderBy(queryConfig.field, 'desc'),
      limit(50)
    );
  }, [firestore, queryConfig]);

  const { data: entries, isLoading, error } = useCollection(leaderboardQuery);

  useEffect(() => {
    if (error) {
      console.error('Firestore Leaderboard load error:', error);
    }
  }, [error]);

  const getValue = (item: any): number => {
    const fieldName = getFieldName();
    if (activeTab === 'rich') return item.wallet?.[fieldName] || 0;
    if (activeTab === 'charm') return item.stats?.[fieldName] || 0;
    return item.stats?.[fieldName] || 0;
  };

  const activeEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(item => getValue(item) > 0 && !item.rankHiding);
  }, [entries, activeTab, timeFilter]);

  const top3 = useMemo(() => {
    return activeEntries.slice(0, 3);
  }, [activeEntries]);

  const rest = useMemo(() => {
    return activeEntries.slice(3);
  }, [activeEntries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const getLabel = (item: any): string => {
    if (activeTab === 'rooms') return item.title || item.name || 'Room';
    return item.username || item.name || 'User';
  };

  const getAvatar = (item: any): string | null => {
    if (activeTab === 'rooms') return item.coverUrl || null;
    return item.avatarUrl || null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1a0e14' }}>
      {/* Web-aligned Dynamic Theme Background / Custom Theme Image background */}
      {localThemeImage || activeTheme?.backgroundUrl ? (
        <View style={{ position: 'absolute', top: -45, left: 0, right: 0, bottom: 0, height: '110%' }} pointerEvents="none">
          <Image 
            source={localThemeImage ? localThemeImage : { uri: activeTheme.backgroundUrl }} 
            style={{ position: 'absolute', top: -50, left: 0, right: 0, bottom: 0, width: '100%', height: '103%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} pointerEvents="none" />
        </View>
      ) : (
        <DynamicThemeBackground />
      )}
      <LeaderboardAnimOverlay />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

      {/* Header aligned with web layout */}
      <View className="flex-row items-center justify-between px-4 py-3" style={{ zIndex: 20 }}>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        {/* Navigation Tabs in the center */}
        <View className="flex-row gap-6">
          {TABS.map(tab => (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key as any)} className="py-1">
              <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === tab.key ? 'text-white' : 'text-white/40'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => setShowInfo(true)} className="p-2">
          <HelpCircle size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Time Filter Tabs under Header */}
      <View className="flex-row justify-center gap-2 px-4 pb-4" style={{ zIndex: 20 }}>
        {(['daily', 'weekly', 'monthly'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setTimeFilter(filter)}
            className={`px-4 py-1.5 rounded-full border transition-all ${timeFilter === filter ? 'bg-white/20 border-white/30' : 'bg-transparent border-white/10'}`}
          >
            <Text className={`text-[10px] font-black uppercase tracking-wider ${timeFilter === filter ? 'text-white' : 'text-white/40'}`}>
              {filter === 'daily' ? 'Daily' : filter === 'weekly' ? 'Weekly' : 'Monthly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Fixed Top 3 Podium (Only when not loading and entries exist) */}
      {!isLoading && activeEntries && activeEntries.length > 0 && (
        <View className="flex-row items-end justify-center px-4 pt-5 pb-4 z-10">
          <View style={{ zIndex: 1 }}>
            {top3[1] ? (
              <PodiumCard rank={2} value={getValue(top3[1])} label={getLabel(top3[1])} avatar={getAvatar(top3[1])} onPress={() => router.push(activeTab === 'rooms' ? `/rooms/${top3[1].id}` : `/profile/${top3[1].id}`)} activeTheme={activeTheme} />
            ) : (
              <PodiumCard rank={2} value={0} label="---" avatar={null} onPress={() => {}} activeTheme={activeTheme} />
            )}
          </View>
          
          <View style={{ zIndex: 3 }}>
            {top3[0] ? (
              <PodiumCard rank={1} value={getValue(top3[0])} label={getLabel(top3[0])} avatar={getAvatar(top3[0])} onPress={() => router.push(activeTab === 'rooms' ? `/rooms/${top3[0].id}` : `/profile/${top3[0].id}`)} activeTheme={activeTheme} />
            ) : (
              <PodiumCard rank={1} value={0} label="---" avatar={null} onPress={() => {}} activeTheme={activeTheme} />
            )}
          </View>
          
          <View style={{ zIndex: 2 }}>
            {top3[2] ? (
              <PodiumCard rank={3} value={getValue(top3[2])} label={getLabel(top3[2])} avatar={getAvatar(top3[2])} onPress={() => router.push(activeTab === 'rooms' ? `/rooms/${top3[2].id}` : `/profile/${top3[2].id}`)} activeTheme={activeTheme} />
            ) : (
              <PodiumCard rank={3} value={0} label="---" avatar={null} onPress={() => {}} activeTheme={activeTheme} />
            )}
          </View>
        </View>
      )}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#a78bfa" />
        </View>
      ) : activeEntries && activeEntries.length > 0 ? (
        <ScrollView
          className="flex-1 z-10"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="rgba(255,255,255,0.5)" />}
        >
          <View style={{ height: 65 }} />
          <View className="bg-white/5 rounded-3xl mx-4 p-2 mb-8">
            {rest.map((item, index) => {
              const rank = index + 4;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(activeTab === 'rooms' ? `/rooms/${item.id}` : `/profile/${item.id}`)}
                  className="flex-row items-center py-3 px-2 border-b border-white/5"
                >
                  <Text className="text-white/60 text-sm font-bold w-8 text-center">{rank}</Text>
                  {getAvatar(item) ? (
                    <Image cachePolicy="memory-disk" source={{ uri: getAvatar(item)! }} className="w-10 h-10 rounded-full mr-3" />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-purple-800 items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">{getLabel(item)[0]}</Text>
                    </View>
                  )}
                  <Text className="text-white text-sm font-bold flex-1" numberOfLines={1}>{getLabel(item)}</Text>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-amber-400 text-xs font-bold">{formatValue(getValue(item))}</Text>
                    <GoldenCoin size={10} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View className="h-12" />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <TrendingUp size={40} color="rgba(255,255,255,0.2)" />
          <Text className="text-white/40 text-sm mt-3">No rankings yet today</Text>
        </View>
      )}
      {/* Info Modal */}
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </SafeAreaView>
  </View>
  );
}

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
}

function InfoModal({ visible, onClose }: InfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View className="bg-white rounded-3xl w-[90%] max-w-sm p-6 shadow-2xl relative">
          {/* Close Button */}
          <TouchableOpacity 
            onPress={onClose}
            style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f1f5f9' }}
          >
            <X size={16} color="#64748b" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-lg font-black text-slate-900 mb-4 text-center">
            Ranking Info
          </Text>

          {/* Content */}
          <View className="space-y-3">
            {/* Honor */}
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-3">
              <Text className="font-bold text-amber-600 mb-1">🏆 Honor Ranking</Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                Honor Ranking is determined by the number of <Text className="font-bold text-amber-500">Coins you Spend</Text> in Gifts.
              </Text>
              <Text className="text-[10px] text-slate-500 mt-1 leading-normal">
                Daily Rewards: Sending Coins value × <Text className="font-bold">1.4%</Text> You will receive, Frame
              </Text>
            </View>

            {/* Charm */}
            <View className="bg-pink-50 rounded-2xl p-4 border border-pink-100 mb-3">
              <Text className="font-bold text-pink-600 mb-1">💖 Charm Ranking</Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                Charm Ranking is determined by the number of <Text className="font-bold text-pink-500">Coins you Received</Text> in Gifts.
              </Text>
              <Text className="text-[10px] text-slate-500 mt-1 leading-normal">
                Daily Rewards: Receiving Coins value × <Text className="font-bold">1.4%</Text> You will receive, Frame
              </Text>
            </View>

            {/* Room */}
            <View className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <Text className="font-bold text-purple-600 mb-1">🏠 Room Ranking</Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                Room Ranking is determined by the number of <Text className="font-bold text-purple-500">Coins you Spend</Text> in Room.
              </Text>
              <Text className="text-[10px] text-slate-500 mt-1 leading-normal">
                Daily Rewards: Sending Coins value × <Text className="font-bold">1.3%</Text> You will receive, Frame
              </Text>
            </View>
          </View>

          {/* OK Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 24, width: '100%', paddingVertical: 12, height: 44, backgroundColor: '#0f172a', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.9}
          >
            <Text className="text-white font-bold text-sm">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const AnimatedAvatarFrame = React.memo(function AnimatedAvatarFrame({ children, size, rank, frameConfig }: { children: React.ReactNode; size: number; rank: number; frameConfig?: { videoUrl?: string; imageUrl?: string; type?: string; isEnabled?: boolean } | null }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Rotation for orbiting stars & shine
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: rank === 1 ? 4000 : rank === 2 ? 6000 : 8000,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing border glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [rank]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateReverse = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  // Border and glow colors based on rank
  const themeColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#cbd5e1' : '#ea580c';
  const shadowColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : '#c2410c';

  const hasFrame = !!(frameConfig?.isEnabled && ((frameConfig?.imageUrl?.startsWith('http')) || (frameConfig?.type === 'video' && frameConfig?.videoUrl?.startsWith('http'))));
  const isVideo = hasFrame && frameConfig?.type === 'video' && frameConfig?.videoUrl?.startsWith('http');
  const frameUrl = isVideo ? frameConfig!.videoUrl! : (frameConfig?.imageUrl || null);
  const frameOverlaySize = size * 5.0;

  if (hasFrame) {
    return (
      <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', zIndex: 1 }}>
          {children}
        </View>
        <View style={{ position: 'absolute', width: frameOverlaySize, height: frameOverlaySize, backgroundColor: 'transparent', zIndex: 2 }}>
          {isVideo ? (
            <Video
              source={{ uri: frameUrl! }}
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              isMuted
              useNativeControls={false}
            />
          ) : (
            <Image
              cachePolicy="memory-disk"
              source={{ uri: frameUrl! }}
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              contentFit="contain"
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer Glow Pulse Ring */}
      <Animated.View style={{
        position: 'absolute',
        width: size + 6,
        height: size + 6,
        borderRadius: (size + 6) / 2,
        borderWidth: 1.5,
        borderColor: themeColor,
        opacity: pulseAnim,
        shadowColor: shadowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      }} />

      {/* Main Avatar Circle Wrapper (Children inside) */}
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 2, borderColor: themeColor }}>
        {children}
      </View>

      {/* Orbiting Star Container 1 (Rotates Clockwise) */}
      <Animated.View style={{
        position: 'absolute',
        width: size + 12,
        height: size + 12,
        transform: [{ rotate }],
        pointerEvents: 'none',
      }}>
        {/* Star Sparkle Element */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: (size + 12) / 2 - 3.5,
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: '#ffffff',
          shadowColor: themeColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 3,
          elevation: 3,
        }} />
      </Animated.View>
      {rank === 1 && (
        <Animated.View style={{
          position: 'absolute',
          width: size + 18,
          height: size + 18,
          transform: [{ rotate: rotateReverse }],
          pointerEvents: 'none',
        }}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: (size + 18) / 2 - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#fbbf24',
            shadowColor: '#ffffff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 3,
            elevation: 3,
          }} />
        </Animated.View>
      )}
    </View>
  );
});

const PodiumCard = React.memo(function PodiumCard({ rank, value, label, avatar, onPress, activeTheme }: { rank: number; value: number; label: string; avatar: string | null; onPress: () => void; activeTheme?: any }) {
  const isFirst = rank === 1;
  const width = isFirst ? 116 : 96;
  const height = isFirst ? 180 : 148;
  const avatarSize = isFirst ? 64 : 52;

  const containerSize = avatarSize + 16;

  const getFrameConfig = () => {
    if (!activeTheme?.frameConfigs) return null;
    const key = rank === 1 ? 'rank1' : rank === 2 ? 'rank2' : 'rank3';
    return activeTheme.frameConfigs[key] || null;
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      className="items-center mx-1 relative"
      style={{ width, height, marginTop: isFirst ? 0 : 32 }}
    >
      <View 
        className="absolute z-10"
        style={{ 
          top: isFirst ? 12 : 40,
          left: (width - containerSize) / 2,
          width: containerSize,
          height: containerSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatedAvatarFrame size={avatarSize} rank={rank} frameConfig={getFrameConfig()}>
          {avatar ? (
            <Image cachePolicy="memory-disk" source={{ uri: avatar }} 
              style={{ width: '100%', height: '100%' }} 
              className="rounded-full bg-slate-800" 
            />
          ) : (
            <View 
              className="rounded-full bg-purple-700 items-center justify-center" 
              style={{ width: '100%', height: '100%' }}
            >
              <User size={avatarSize / 2} color="white" />
            </View>
          )}
        </AnimatedAvatarFrame>
      </View>

      {/* Username Display positioned on the flag */}
      <View 
        className="absolute z-20 items-center px-1"
        style={{ 
          top: isFirst ? 130 : 128,
          left: 8,
          right: 8
        }}
      >
        <Text 
          className="text-white text-[9px] font-black uppercase text-center w-full" 
          numberOfLines={1}
          style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 3 }}
        >
          {label}
        </Text>
      </View>

      {/* Value/Score Display positioned on the flag */}
      <View 
        className="absolute z-20 flex-row items-center justify-center bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10"
        style={{ 
          top: isFirst ? 148 : 146,
          alignSelf: 'center'
        }}
      >
        <Text 
          className="text-yellow-400 text-[9px] font-black text-center" 
          numberOfLines={1}
          style={{ textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 2 }}
        >
          {formatValue(value)}
        </Text>
        <View style={{ marginLeft: 2 }}><GoldenCoin size={8} /></View>
      </View>
    </TouchableOpacity>
  );
});
