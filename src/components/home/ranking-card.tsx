import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useCollection, useFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit, where } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface RankingCardProps {
  onPress: () => void;
}

const CARD_BG = require('../../../assets/images/home_cards/bg_card_ranking.png');

function RankingCardAnimOverlay() {
  const glow = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  
  // Embers rising up
  const embers = useRef(Array.from({ length: 6 }, () => ({
    animY: new Animated.Value(0),
    animX: new Animated.Value(0),
    opacity: new Animated.Value(0),
    x: 10 + Math.random() * 140,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 2000,
  }))).current;

  useEffect(() => {
    // Pulse glow loop
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])).start();

    // Laser sheen sweep loop
    Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 2500, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();

    // Embers animation loops
    embers.forEach(ember => {
      const runEmber = () => {
        ember.animY.setValue(0);
        ember.animX.setValue(0);
        ember.opacity.setValue(0);
        
        Animated.sequence([
          Animated.delay(ember.delay),
          Animated.parallel([
            Animated.timing(ember.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(ember.animY, {
              toValue: -80,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(ember.animX, {
              toValue: (Math.random() - 0.5) * 30,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ember.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          runEmber();
        });
      };
      runEmber();
    });
  }, []);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 240] });
  const pulseScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.15] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Mystical glowing orbs */}
      <Animated.View style={{
        position: 'absolute', top: -10, left: -10, width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(168,85,247,0.15)',
        transform: [{ scale: pulseScale }],
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: -15, right: -15, width: 90, height: 90, borderRadius: 45,
        backgroundColor: 'rgba(234,179,8,0.12)',
        transform: [{ scale: pulseScale }],
      }} />

      {/* Rising golden fire embers */}
      {embers.map((emb, idx) => (
        <Animated.View key={idx} style={{
          position: 'absolute',
          bottom: 10,
          left: emb.x,
          width: emb.size,
          height: emb.size,
          borderRadius: emb.size / 2,
          backgroundColor: idx % 2 === 0 ? '#f59e0b' : '#d946ef',
          opacity: emb.opacity,
          transform: [
            { translateY: emb.animY },
            { translateX: emb.animX },
          ],
        }} />
      ))}

      {/* Sweeping metallic laser sheen */}
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, width: 30,
        backgroundColor: 'rgba(255,255,255,0.06)',
        transform: [{ translateX: sweepX }, { skewX: '-25deg' }],
      }} />
    </View>
  );
}

export function RankingCard({ onPress }: RankingCardProps) {
  const { firestore, isHydrated } = useFirebase();

  const topUsersQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(
      collection(firestore, 'users'),
      where('wallet.dailySpent', '>', 0),
      orderBy('wallet.dailySpent', 'desc'),
      limit(3)
    );
  }, [firestore, isHydrated]);

  const { data: topUsers } = useCollection(topUsersQuery);
  const [mode, setMode] = useState<'carousel' | 'podium'>('carousel');
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const usersCount = topUsers?.length || 0;

  useEffect(() => {
    if (usersCount === 0) return;

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
            if (next >= usersCount) {
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
  }, [mode, activeIndex, usersCount]);

  const currentUser = topUsers?.[activeIndex];
  const frameColor = activeIndex === 0 ? '#fbbf24' : activeIndex === 1 ? '#cbd5e1' : '#d97706';

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
        colors={['rgba(88,28,135,0.5)', 'rgba(0,0,0,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <RankingCardAnimOverlay />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Crown size={12} color="#fbbf24" fill="#fbbf24" />
          <Text style={styles.headerText}>Ranking</Text>
        </View>

        {/* Dynamic Carousel / Podium Content */}
        <Animated.View style={[styles.carouselContainer, { opacity: fadeAnim }]}>
          {mode === 'carousel' ? (
            currentUser ? (
              <View style={styles.userContainer}>
                <View style={[styles.avatarWrapper, { borderColor: frameColor }]}>
                  <Image
                    cachePolicy="memory-disk"
                    source={{ uri: currentUser.avatarUrl || 'https://picsum.photos/100' }}
                    style={styles.avatar}
                  />
                </View>
                <Text numberOfLines={1} style={styles.nameText}>{currentUser.username || 'User'}</Text>
                <Text style={styles.spentText}>🪙 {currentUser.wallet?.dailySpent?.toLocaleString() || 0}</Text>
              </View>
            ) : (
              <View style={styles.userContainer}>
                <View style={[styles.avatarWrapper, { borderColor: '#a78bfa' }]}>
                  <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Crown size={16} color="rgba(255,255,255,0.4)" />
                  </View>
                </View>
                <Text style={styles.nameText}>Top User</Text>
                <Text style={styles.spentText}>Waiting...</Text>
              </View>
            )
          ) : (
            // Podium View (Show all Top 3 Staircase/Podium layout statically)
            <View style={styles.podiumContainer}>
              {/* 2nd */}
              <View style={styles.podiumRankSide}>
                {topUsers && topUsers.length >= 2 ? (
                  <View style={styles.podiumAvatarWrapper}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topUsers[1].avatarUrl || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatar, { borderColor: '#cbd5e1' }]}
                    />
                  </View>
                ) : (
                  <View style={[styles.podiumAvatar, styles.placeholderAvatar, { borderColor: '#cbd5e1', borderWidth: 1.5 }]} />
                )}
              </View>

              {/* 1st (Raised Center) */}
              <View style={styles.podiumRankCenter}>
                {topUsers && topUsers.length >= 1 ? (
                  <View style={styles.podiumAvatarWrapperLarge}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topUsers[0].avatarUrl || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatarLarge, { borderColor: '#fbbf24' }]}
                    />
                  </View>
                ) : (
                  <View style={[styles.podiumAvatarLarge, styles.placeholderAvatar, { borderColor: '#fbbf24', borderWidth: 2 }]} />
                )}
              </View>

              {/* 3rd */}
              <View style={styles.podiumRankSide}>
                {topUsers && topUsers.length >= 3 ? (
                  <View style={styles.podiumAvatarWrapper}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: topUsers[2].avatarUrl || 'https://picsum.photos/100' }}
                      style={[styles.podiumAvatar, { borderColor: '#d97706' }]}
                    />
                  </View>
                ) : (
                  <View style={[styles.podiumAvatar, styles.placeholderAvatar, { borderColor: '#d97706', borderWidth: 1.5 }]} />
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
    color: '#fbbf24',
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
  userContainer: {
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
    backgroundColor: '#1e1b4b',
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
  spentText: {
    color: '#fbbf24',
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
    backgroundColor: '#1e1b4b',
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
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    paddingHorizontal: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  medalTextLarge: {
    fontSize: 9,
  },
});
