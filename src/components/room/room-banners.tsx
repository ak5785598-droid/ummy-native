import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Trophy, Rocket, Crown, Gift } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { useFirestore, useDoc, useMemoFirebase } from '../../firebase/provider';
import { doc } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

// SVG Content Strings directly embedded to avoid bundler resolution and loading issues
const SVGS = {
  weeklyStar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b5cf6"/>
        <stop offset="50%" stop-color="#4f46e5"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
    </defs>
    <rect width="100" height="150" rx="16" fill="url(#g1)"/>
    <circle cx="50" cy="65" r="24" fill="rgba(255,255,255,0.15)"/>
    <path d="M50 35 L54 48 L67 48 L56 56 L60 69 L50 60 L40 69 L44 56 L33 48 L46 48 Z" fill="#fbbf24"/>
    <text x="50" y="115" fill="white" font-size="9" font-weight="900" text-anchor="middle" letter-spacing="1">WEEKLY STAR</text>
    <text x="50" y="130" fill="rgba(255,255,255,0.6)" font-size="7" font-weight="700" text-anchor="middle">1:1,000,000</text>
  </svg>`,
  mergeAristocracy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">
    <defs>
      <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1d4ed8"/>
        <stop offset="50%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="100" height="150" rx="16" fill="url(#g2)"/>
    <circle cx="50" cy="65" r="24" fill="rgba(255,255,255,0.1)"/>
    <path d="M50 40 L62 65 H38 Z M50 68 L58 80 H42 Z" fill="#38bdf8"/>
    <text x="50" y="115" fill="white" font-size="8" font-weight="900" text-anchor="middle" letter-spacing="0.5">ARISTOCRACY</text>
    <text x="50" y="130" fill="rgba(38,189,248,0.8)" font-size="7" font-weight="700" text-anchor="middle">EXCLUSIVE PERKS</text>
  </svg>`,
  luckySpin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">
    <defs>
      <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f43f5e"/>
        <stop offset="50%" stop-color="#be123c"/>
        <stop offset="100%" stop-color="#4c0519"/>
      </linearGradient>
    </defs>
    <rect width="100" height="150" rx="16" fill="url(#g3)"/>
    <circle cx="50" cy="65" r="24" fill="rgba(255,255,255,0.15)"/>
    <path d="M42 45 H58 V55 H42 Z M45 55 H55 V75 H45 Z" fill="#fbbf24"/>
    <circle cx="50" cy="60" r="3" fill="#ef4444"/>
    <text x="50" y="115" fill="white" font-size="9" font-weight="900" text-anchor="middle" letter-spacing="1">LUCKY SPIN</text>
    <text x="50" y="130" fill="rgba(255,255,255,0.6)" font-size="7" font-weight="700" text-anchor="middle">TRY YOUR LUCK</text>
  </svg>`
};

interface RoomBannersProps {
  onOpenSupport?: () => void;
  onOpenSpin?: () => void;
  onOpenChest?: () => void;
}

const STATIC_BANNERS = [
  { id: 'weekly-star', icon: Sparkles, color: ['#7c3aed', '#4f46e5', '#6b21a8'] as const, xml: SVGS.weeklyStar },
  { id: 'merge-aristocracy', icon: Rocket, color: ['#2563eb', '#1e293b', '#1e3a8a'] as const, xml: SVGS.mergeAristocracy },
  { id: 'room-support', icon: Trophy, color: ['#f59e0b', '#ea580c', '#991b1b'] as const },
  { id: 'golden-chest', icon: Crown, color: ['#d97706', '#b45309', '#78350f'] as const },
  { id: 'lucky-spin', icon: Gift, color: ['#f43f5e', '#e11d48', '#881337'] as const, xml: SVGS.luckySpin },
];

export function RoomBanners({ onOpenSupport, onOpenSpin, onOpenChest }: RoomBannersProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevIndex = useRef(0);

  const firestore = useFirestore();
  const bannerRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'appConfig', 'roomBanners'), [firestore]);
  const { data: bannerConfig } = useDoc(bannerRef);

  const displayBanners = React.useMemo(() => {
    return STATIC_BANNERS.map(b => {
      const custom = bannerConfig?.slides?.find((s: any) => s.id === b.id);
      return {
        ...b,
        customUrl: custom?.imageUrl || null
      };
    });
  }, [bannerConfig]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % displayBanners.length;
        slideAnim.setValue(75);
        prevIndex.current = prev;
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  const handlePress = (banner: any) => {
    if (banner.id === 'room-support') onOpenSupport?.();
    else if (banner.id === 'lucky-spin') onOpenSpin?.();
    else if (banner.id === 'golden-chest') onOpenChest?.();
  };

  const banner = displayBanners[activeIndex >= displayBanners.length ? 0 : activeIndex];
  if (!banner) return null;

  const IconComponent = banner.icon;

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
        <TouchableOpacity onPress={() => handlePress(banner)} activeOpacity={0.8} style={styles.touchable}>
          {banner.customUrl ? (
            <View style={styles.bannerWrapper}>
              <Image source={{ uri: banner.customUrl }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
              <View style={styles.shine} />
            </View>
          ) : banner.xml ? (
            <View style={styles.bannerWrapper}>
              <SvgXml xml={banner.xml} width="100%" height="100%" />
              <View style={styles.shine} />
            </View>
          ) : (
            <LinearGradient colors={banner.color} style={styles.gradientWrapper}>
              <View style={styles.shine} />
              <IconComponent size={28} color="white" />
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.dotContainer}>
        {displayBanners.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex ? styles.activeDot : styles.inactiveDot]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  touchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  bannerWrapper: {
    width: 75,
    aspectRatio: 2/3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientWrapper: {
    width: 75,
    aspectRatio: 2/3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  shine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
    top: -40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
