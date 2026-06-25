import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Star, Crown, Compass, Trophy, Gamepad2, Gift } from 'lucide-react-native';
import { useFirebase, useDoc } from '../../firebase/provider';
import { doc } from '@/firebase/firestore-compat';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 20;

const DEFAULT_BANNERS = [
  {
    id: 'weekly-star',
    title: 'Weekly Star',
    subtitle: '1:1,000,000',
    colors: ['#7C3AED', '#4F46E5', '#312E81'] as [string, string, string],
    iconName: 'Star',
    link: '/leaderboard?type=rich',
  },
  {
    id: 'merge-aristocracy',
    title: 'Merge Aristocracy',
    subtitle: 'Exclusive Perks',
    colors: ['#1E40AF', '#1E293B', '#1E3A8A'] as [string, string, string],
    iconName: 'Crown',
    link: '/families',
  },
  {
    id: 'lucky-spin',
    title: 'Lucky Spin',
    subtitle: 'Try Your Luck',
    colors: ['#F43F5E', '#DC2626', '#881337'] as [string, string, string],
    iconName: 'Gift',
    link: '/cp-house',
  },
];

const ICON_MAP: Record<string, any> = {
  Sparkles: Sparkles,
  Star: Star,
  Crown: Crown,
  Compass: Compass,
  Trophy: Trophy,
  Gamepad2: Gamepad2,
  Gift: Gift,
};

export function BannerCarousel({ onOpenSupport }: { onOpenSupport?: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const { firestore, isHydrated } = useFirebase();
  const bannerRef = useMemo(() => !firestore ? null : doc(firestore, 'appConfig', 'banners'), [firestore]);
  const { data: bannerConfig } = useDoc(bannerRef);

  const displaySlides = useMemo(() => {
    if (!isHydrated || !bannerConfig?.slides || bannerConfig.slides.length === 0) {
      return DEFAULT_BANNERS;
    }
    return bannerConfig.slides;
  }, [bannerConfig, isHydrated]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (displaySlides.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % displaySlides.length;
        scrollViewRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
        return next;
      });
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [displaySlides]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_WIDTH);
    setActiveIndex(index);
  };

  const getGradientColors = (slide: any): [string, string, ...string[]] => {
    if (slide.colors) return slide.colors;
    
    // Map Tailwind color classes from Firestore if present
    const colorStr = slide.color || '';
    if (colorStr.includes('purple') || colorStr.includes('violet')) {
      return ['#7C3AED', '#4F46E5', '#312E81'];
    }
    if (colorStr.includes('blue') || colorStr.includes('indigo')) {
      return ['#1E40AF', '#1E293B', '#1E3A8A'];
    }
    if (colorStr.includes('rose') || colorStr.includes('red') || colorStr.includes('orange')) {
      return ['#F43F5E', '#DC2626', '#881337'];
    }
    if (colorStr.includes('yellow') || colorStr.includes('amber')) {
      return ['#F59E0B', '#D97706', '#78350F'];
    }
    
    // Default fallback gradient
    return ['#8B5CF6', '#6366F1', '#4F46E5'];
  };

  return (
    <View className="h-[130px] relative">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {displaySlides.map((slide: any, index: number) => {
          const IconComponent = ICON_MAP[slide.iconName] || Sparkles;
          const isRemoteImage = slide.imageUrl && (slide.imageUrl.startsWith('http') || slide.imageUrl.startsWith('https'));

          return (
            <View key={slide.id || index} style={{ width: BANNER_WIDTH }} className="pr-1">
              <TouchableOpacity 
                activeOpacity={0.95}
                onPress={() => {
                  const isSupportBanner = 
                    slide.id === 'room-support' || 
                    slide.link === '/room-support' || 
                    slide.link === 'room-support' || 
                    slide.title?.toLowerCase().includes('support') ||
                    slide.id?.toLowerCase().includes('support');

                  if (isSupportBanner && onOpenSupport) {
                    onOpenSupport();
                    return;
                  }

                  if (slide.link) {
                    let targetLink = slide.link;
                    if (targetLink.startsWith('/cp-challenge')) {
                      targetLink = targetLink.replace('/cp-challenge', '/cp-house');
                    }
                    try {
                      router.push(targetLink as any);
                    } catch (e) {
                      console.warn('[BannerCarousel] Navigation failed for:', targetLink, e);
                    }
                  }
                }}
                className="h-[110px] rounded-[1.8rem] overflow-hidden shadow-lg border border-white/20 relative"
                style={{ borderRadius: 24 }}
              >
                {isRemoteImage ? (
                  <Image cachePolicy="memory-disk" source={{ uri: slide.imageUrl }}
                    className="w-full h-full object-cover"
                    contentFit="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={getGradientColors(slide)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-1 p-4 flex-row items-center justify-between"
                  >
                    {/* Left: Text Content */}
                    <View className="flex-1 justify-center z-10">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <View className="bg-white/20 p-1 rounded-lg border border-white/35">
                          <IconComponent size={14} color="white" />
                        </View>
                        <Text 
                          className="text-xl font-extrabold text-white tracking-tight"
                          style={{ textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
                        >
                          {slide.title}
                        </Text>
                      </View>
                      <Text className="text-[10px] font-black text-white/90 uppercase tracking-widest ml-1">
                        {slide.subtitle || slide.sub}
                      </Text>
                    </View>

                    {/* Right: Absolute-positioned decorative background icon (similar to SVG design) */}
                    <View className="absolute right-[-10px] bottom-[-20px] opacity-15 rotate-12">
                      <IconComponent size={100} color="white" />
                    </View>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View className="flex-row justify-center gap-1.5 absolute bottom-[10px] left-0 right-0 z-30 pointer-events-none">
        {displaySlides.map((_: any, index: any) => (
          <View
            key={index}
            className={`h-1.5 rounded-full ${index === activeIndex ? 'w-6 bg-slate-800' : 'w-1.5 bg-slate-300'}`}
          />
        ))}
      </View>
    </View>
  );
}
