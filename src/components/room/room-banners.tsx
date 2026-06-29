import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
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

const LOCAL_BANNER_IMAGES: Record<string, any> = {
  'weekly-star': require('../../../assets/images/banners/banner_weekly_star.png'),
  'merge-aristocracy': require('../../../assets/images/banners/banner_aristocracy.png'),
  'golden-chest': require('../../../assets/images/banners/banner_golden_chest.png'),
  'lucky-spin': require('../../../assets/images/banners/banner_lucky_spin.png'),
};

const getBannerName = (id: string) => {
  switch (id) {
    case 'weekly-star': return 'WEEKLY\nSTAR';
    case 'merge-aristocracy': return 'ARISTOCRACY';
    case 'room-support': return '';
    case 'golden-chest': return 'GOLDEN\nCHEST';
    case 'lucky-spin': return 'LUCKY\nSPIN';
    default: return '';
  }
};

export function RoomBanners({ onOpenSupport, onOpenSpin, onOpenChest }: RoomBannersProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const firestore = useFirestore();
  const bannerRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'appConfig', 'roomBanners'), [firestore]);
  const { data: bannerConfig } = useDoc(bannerRef);

  const displayBanners = React.useMemo(() => {
    return STATIC_BANNERS.map(b => {
      const custom = bannerConfig?.slides?.find((s: any) => s.id === b.id);
      const forceLocal = b.id === 'weekly-star' || b.id === 'golden-chest';
      return {
        ...b,
        customUrl: (custom?.imageUrl && custom.imageUrl.trim() !== '' && !forceLocal) ? custom.imageUrl : null
      };
    });
  }, [bannerConfig]);

  // Create loop array by appending first item to the end
  const loopedBanners = React.useMemo(() => {
    if (displayBanners.length <= 1) return displayBanners;
    return [...displayBanners, displayBanners[0]];
  }, [displayBanners]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;

    if (activeIndex === displayBanners.length) {
      // Smoothly slide to the duplicated first item
      Animated.spring(slideAnim, {
        toValue: activeIndex * -75,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        // Immediately snap back to the actual first item (index 0) without transition
        slideAnim.setValue(0);
        setActiveIndex(0);
      });
    } else {
      Animated.spring(slideAnim, {
        toValue: activeIndex * -75,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, displayBanners.length]);

  const handlePress = (banner: any) => {
    if (banner.id === 'room-support') onOpenSupport?.();
    else if (banner.id === 'lucky-spin') onOpenSpin?.();
    else if (banner.id === 'golden-chest') onOpenChest?.();
  };

  return (
    <View style={styles.container}>
      {/* Outer clipped viewport */}
      <View style={styles.bannerViewport}>
        {/* Sliding inner row containing all banners */}
        <Animated.View style={[styles.slidingRow, { transform: [{ translateX: slideAnim }] }]}>
          {loopedBanners.map((banner, index) => {
            const IconComponent = banner.icon;
            // Compound key to prevent duplicate React keys warning for the looped element
            const itemKey = `${banner.id}-${index}`;
            return (
              <TouchableOpacity
                key={itemKey}
                onPress={() => handlePress(banner)}
                activeOpacity={0.8}
                style={styles.touchable}
              >
                {banner.customUrl ? (
                  <View style={styles.bannerWrapper}>
                    <Image source={{ uri: banner.customUrl }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
                    <View style={styles.shine} />
                  </View>
                ) : LOCAL_BANNER_IMAGES[banner.id] ? (
                  <View style={styles.bannerWrapper}>
                    <Image source={LOCAL_BANNER_IMAGES[banner.id]} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
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

                {/* Centered Name Overlay on top of all banners */}
                {getBannerName(banner.id) !== '' && (
                  <View style={styles.textOverlay} pointerEvents="none">
                    <Text style={[styles.bannerText, banner.id === 'merge-aristocracy' && { fontSize: 7 }]}>
                      {getBannerName(banner.id)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.dotContainer}>
        {displayBanners.map((_, i) => {
          const isAct = i === (activeIndex % displayBanners.length);
          return (
            <View key={i} style={[styles.dot, isAct ? styles.activeDot : styles.inactiveDot]} />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bannerViewport: {
    width: 75,
    aspectRatio: 2/3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  slidingRow: {
    flexDirection: 'row',
    height: '100%',
  },
  touchable: {
    width: 75,
    height: '100%',
    position: 'relative',
  },
  bannerWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientWrapper: {
    width: '100%',
    height: '100%',
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
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3.5,
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
