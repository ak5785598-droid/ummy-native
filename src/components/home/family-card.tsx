import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface FamilyCardProps {
  onPress: () => void;
}

const CARD_BG = require('../../../assets/images/home_cards/bg_card_family.png');

export function FamilyCard({ onPress }: FamilyCardProps) {
  const { firestore, isHydrated } = useFirebase();

  const topFamiliesQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'families'), orderBy('totalWealth', 'desc'), limit(3));
  }, [firestore, isHydrated]);

  const { data: topFamilies } = useCollection(topFamiliesQuery);
  const [mode, setMode] = useState<'carousel' | 'podium'>('carousel');
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const familiesCount = topFamilies?.length || 0;

  useEffect(() => {
    if (familiesCount === 0) return;

    let timer: NodeJS.Timeout;

    if (mode === 'carousel') {
      timer = setInterval(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setActiveIndex((prev) => {
            const next = prev + 1;
            if (next >= familiesCount) {
              setMode('podium');
              return 0;
            }
            return next;
          });
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        });
      }, 3000);
    } else {
      // Hold the full Top 3 podium layout statically for 10 seconds
      timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setMode('carousel');
          setActiveIndex(0);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        });
      }, 10000);
    }

    return () => {
      clearInterval(timer);
      clearTimeout(timer);
    };
  }, [mode, activeIndex, familiesCount]);

  const currentFamily = topFamilies?.[activeIndex];
  const medal = activeIndex === 0 ? '🥇' : activeIndex === 1 ? '🥈' : '🥉';
  const frameColor = activeIndex === 0 ? '#38bdf8' : activeIndex === 1 ? '#cbd5e1' : '#d97706';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={styles.cardContainer}
    >
      {/* 3D Generated Background Image */}
      <Image
        source={CARD_BG}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      {/* Glassmorphic Themed Gradient Background Tint */}
      <LinearGradient
        colors={['rgba(30,58,138,0.5)', 'rgba(0,0,0,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Users size={12} color="#38bdf8" fill="#38bdf8" />
          <Text style={styles.headerText}>Family</Text>
        </View>

        {/* Dynamic Carousel / Podium Content */}
        <Animated.View style={[styles.carouselContainer, { opacity: fadeAnim }]}>
          {mode === 'carousel' ? (
            currentFamily ? (
              <View style={styles.familyContainer}>
                <View style={[styles.avatarWrapper, { borderColor: frameColor }]}>
                  <Image
                    cachePolicy="memory-disk"
                    source={{ uri: currentFamily.bannerUrl || 'https://picsum.photos/100' }}
                    style={styles.avatar}
                  />
                  <View style={styles.medalBadge}>
                    <Text style={styles.medalText}>{medal}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.nameText}>{currentFamily.name || 'Family'}</Text>
                <Text style={styles.wealthText}>🛡️ {currentFamily.totalWealth?.toLocaleString() || 0}</Text>
              </View>
            ) : (
              <View style={styles.familyContainer}>
                <View style={[styles.avatarWrapper, { borderColor: '#818cf8' }]}>
                  <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Users size={16} color="rgba(255,255,255,0.4)" />
                  </View>
                </View>
                <Text style={styles.nameText}>Top Family</Text>
                <Text style={styles.wealthText}>Waiting...</Text>
              </View>
            )
          ) : (
            // Podium View (Show all Top 3 Staircase/Podium layout statically)
            <View style={styles.podiumContainer}>
              {/* 2nd */}
              <View style={styles.podiumRankSide}>
                {topFamilies && topFamilies.length >= 2 ? (
                  <View style={styles.podiumAvatarWrapper}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topFamilies[1].bannerUrl || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatar, { borderColor: '#cbd5e1' }]}
                    />
                    <View style={styles.podiumMedalBadge}><Text style={styles.medalText}>🥈</Text></View>
                  </View>
                ) : (
                  <View style={[styles.podiumAvatar, styles.placeholderAvatar, { borderColor: '#cbd5e1', borderWidth: 1.5 }]}><Text style={styles.medalText}>🥈</Text></View>
                )}
              </View>

              {/* 1st (Raised Center) */}
              <View style={styles.podiumRankCenter}>
                {topFamilies && topFamilies.length >= 1 ? (
                  <View style={styles.podiumAvatarWrapperLarge}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topFamilies[0].bannerUrl || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarLarge, { borderColor: '#38bdf8' }]}
                    />
                    <View style={styles.podiumMedalBadgeLarge}><Text style={styles.medalTextLarge}>🥇</Text></View>
                  </View>
                ) : (
                  <View style={[styles.podiumAvatarLarge, styles.placeholderAvatar, { borderColor: '#38bdf8', borderWidth: 2 }]}><Text style={styles.medalTextLarge}>🥇</Text></View>
                )}
              </View>

              {/* 3rd */}
              <View style={styles.podiumRankSide}>
                {topFamilies && topFamilies.length >= 3 ? (
                  <View style={styles.podiumAvatarWrapper}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topFamilies[2].bannerUrl || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatar, { borderColor: '#d97706' }]}
                    />
                    <View style={styles.podiumMedalBadge}><Text style={styles.medalText}>🥉</Text></View>
                  </View>
                ) : (
                  <View style={[styles.podiumAvatar, styles.placeholderAvatar, { borderColor: '#d97706', borderWidth: 1.5 }]}><Text style={styles.medalText}>🥉</Text></View>
                )}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    aspectRatio: 1.33,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  content: {
    flex: 1,
    paddingTop: 1,
    paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  carouselContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    transform: [{ translateY: 6 }],
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  medalBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  medalText: {
    fontSize: 8,
  },
  nameText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  wealthText: {
    color: '#38bdf8',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 1,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    gap: 6,
  },
  podiumRankSide: {
    alignItems: 'center',
  },
  podiumRankCenter: {
    alignItems: 'center',
    transform: [{ translateY: -14 }],
  },
  podiumAvatarWrapper: {
    position: 'relative',
    width: 34,
    height: 34,
  },
  podiumAvatarWrapperLarge: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  podiumAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  podiumAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  podiumMedalBadge: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  podiumMedalBadgeLarge: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -9,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  medalTextLarge: {
    fontSize: 9,
  },
});
