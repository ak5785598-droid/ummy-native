import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface CpCardProps {
  onPress: () => void;
}

const CARD_BG = require('../../../assets/images/home_cards/bg_card_cp.png');

export function CpCard({ onPress }: CpCardProps) {
  const { firestore, isHydrated } = useFirebase();

  const topCpQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'cpPairs'), orderBy('cpValue', 'desc'), limit(3));
  }, [firestore, isHydrated]);

  const { data: topCp } = useCollection(topCpQuery);
  const [mode, setMode] = useState<'carousel' | 'podium'>('carousel');
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const cpCount = topCp?.length || 0;

  useEffect(() => {
    if (cpCount === 0) return;

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
            if (next >= cpCount) {
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
      // Hold the full Top 3 couple podium layout statically for 10 seconds
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
  }, [mode, activeIndex, cpCount]);

  const currentCp = topCp?.[activeIndex];
  const medal = activeIndex === 0 ? '🥇' : activeIndex === 1 ? '🥈' : '🥉';
  const heartEmoji = activeIndex === 0 ? '💖' : activeIndex === 1 ? '❤️' : '💕';
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
        colors={['rgba(157,23,77,0.5)', 'rgba(0,0,0,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { marginTop: -2 }]}>
          <Heart size={12} color="#f43f5e" fill="#f43f5e" />
          <Text style={styles.headerText}>CP Pair</Text>
        </View>

        {/* Dynamic Carousel / Podium Content */}
        <Animated.View style={[styles.carouselContainer, { opacity: fadeAnim }]}>
          {mode === 'carousel' ? (
            currentCp ? (
              <View style={styles.cpContainer}>
                <View style={styles.doubleAvatarWrapper}>
                  <Image
                    cachePolicy="memory-disk"
                    source={{ uri: currentCp.user1Avatar || 'https://picsum.photos/100' }}
                    style={[styles.avatar, styles.leftAvatar]}
                  />
                  <Image
                    cachePolicy="memory-disk"
                    source={{ uri: currentCp.user2Avatar || 'https://picsum.photos/100' }}
                    style={[styles.avatar, styles.rightAvatar]}
                  />
                  <View style={styles.medalBadge}>
                    <Text style={styles.medalText}>{medal}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.nameText}>
                  {currentCp.user1Name || 'User1'} & {currentCp.user2Name || 'User2'}
                </Text>
                <Text style={styles.cpValueText}>{heartEmoji} {currentCp.cpValue?.toLocaleString() || 0}</Text>
              </View>
            ) : (
              <View style={styles.cpContainer}>
                <View style={styles.doubleAvatarWrapper}>
                  <View style={[styles.avatar, styles.leftAvatar, styles.placeholderAvatar]}>
                    <Heart size={10} color="rgba(255,255,255,0.4)" />
                  </View>
                  <View style={[styles.avatar, styles.rightAvatar, styles.placeholderAvatar]}>
                    <Heart size={10} color="rgba(255,255,255,0.4)" />
                  </View>
                </View>
                <Text style={styles.nameText}>Top Couple</Text>
                <Text style={styles.cpValueText}>Waiting...</Text>
              </View>
            )
          ) : (
            // Podium View (Show all Top 3 couples in staircase layout statically)
            <View style={styles.podiumContainer}>
              {/* 2nd Couple */}
              <View style={styles.podiumRankSide}>
                {topCp && topCp.length >= 2 ? (
                  <View style={styles.podiumDoubleAvatar}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topCp[1].user1Avatar || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarSmall, styles.leftAvatar, { borderColor: '#cbd5e1' }]}
                    />
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topCp[1].user2Avatar || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarSmall, styles.rightAvatar, { borderColor: '#cbd5e1' }]}
                    />
                    <View style={styles.podiumMedalBadge}><Text style={styles.medalText}>🥈</Text></View>
                  </View>
                ) : (
                  <View style={[styles.podiumAvatarSmall, styles.placeholderAvatar, { borderColor: '#cbd5e1', borderWidth: 1 }]}><Text style={styles.medalText}>🥈</Text></View>
                )}
              </View>

              {/* 1st Couple (Raised Center) */}
              <View style={styles.podiumRankCenter}>
                {topCp && topCp.length >= 1 ? (
                  <View style={styles.podiumDoubleAvatarLarge}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topCp[0].user1Avatar || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarMedium, styles.leftAvatar, { borderColor: '#fbbf24' }]}
                    />
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topCp[0].user2Avatar || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarMedium, styles.rightAvatar, { borderColor: '#fbbf24' }]}
                    />
                    <View style={styles.podiumMedalBadgeLarge}><Text style={styles.medalTextLarge}>🥇</Text></View>
                  </View>
                ) : (
                  <View style={[styles.podiumAvatarMedium, styles.placeholderAvatar, { borderColor: '#fbbf24', borderWidth: 1.5 }]}><Text style={styles.medalTextLarge}>🥇</Text></View>
                )}
              </View>

              {/* 3rd Couple */}
              <View style={styles.podiumRankSide}>
                {topCp && topCp.length >= 3 ? (
                  <View style={styles.podiumDoubleAvatar}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topCp[2].user1Avatar || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarSmall, styles.leftAvatar, { borderColor: '#d97706' }]}
                    />
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topCp[2].user2Avatar || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarSmall, styles.rightAvatar, { borderColor: '#d97706' }]}
                    />
                    <View style={styles.podiumMedalBadge}><Text style={styles.medalText}>🥉</Text></View>
                  </View>
                ) : (
                  <View style={[styles.podiumAvatarSmall, styles.placeholderAvatar, { borderColor: '#d97706', borderWidth: 1 }]}><Text style={styles.medalText}>🥉</Text></View>
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
    color: '#f43f5e',
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
  cpContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    transform: [{ translateY: 6 }],
  },
  doubleAvatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    height: 42,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  leftAvatar: {
    zIndex: 1,
  },
  rightAvatar: {
    marginLeft: -10,
    zIndex: 2,
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  medalBadge: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -10,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
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
  cpValueText: {
    color: '#f43f5e',
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
  podiumDoubleAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 36,
    height: 24,
    position: 'relative',
    justifyContent: 'center',
  },
  podiumDoubleAvatarLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 48,
    height: 32,
    position: 'relative',
    justifyContent: 'center',
  },
  podiumAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'white',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  podiumAvatarMedium: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'white',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  podiumMedalBadge: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -8,
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  podiumMedalBadgeLarge: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -9,
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    paddingHorizontal: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  medalTextLarge: {
    fontSize: 9,
  },
});
