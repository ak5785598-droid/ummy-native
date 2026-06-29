import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '../../firebase/provider';
import { doc } from '@/firebase/firestore-compat';
import { RocketLevelCard } from './rocket-level-card';
import { RocketLevelUpEffect } from './rocket-level-up-effect';
import { Image } from 'expo-image';

interface LootLevel {
  id: string;
  name: string;
  threshold: number;
  image?: string;
  animation?: string;
  voice?: string;
}

const LEVEL_CONFIG: { [key: string]: { icon: string; accent: string; accent2: string; reward: number; image: any } } = {
  home:      { icon: '🏠', accent: '#9dff2f', accent2: '#2dffdb', reward: 480000,  image: require('../../../assets/images/loot/level_home.png') },
  bank:      { icon: '🏦', accent: '#39d8ff', accent2: '#246bff', reward: 680000,  image: require('../../../assets/images/loot/level_bank.png') },
  car:       { icon: '🚗', accent: '#c13cff', accent2: '#ff4fe8', reward: 880000,  image: require('../../../assets/images/loot/level_car.png') },
  hotel:     { icon: '🏨', accent: '#ffd436', accent2: '#ff8c1a', reward: 1080000, image: require('../../../assets/images/loot/level_hotel.png') },
  bus:       { icon: '🚌', accent: '#ff4545', accent2: '#ffb020', reward: 1480000, image: require('../../../assets/images/loot/level_bus.png') },
  train:     { icon: '🚂', accent: '#49f7ff', accent2: '#0aa7ff', reward: 1880000, image: require('../../../assets/images/loot/level_train.png') },
  ship:      { icon: '🚢', accent: '#eaffff', accent2: '#75b8ff', reward: 2280000, image: require('../../../assets/images/loot/level_ship.png') },
  aeroplane: { icon: '✈️', accent: '#ff4fd8', accent2: '#29e8ff', reward: 3000000, image: require('../../../assets/images/loot/level_aeroplane.png') },
};

const DEFAULT_LEVELS: LootLevel[] = [
  { id: 'home', name: 'Home', threshold: 10000000 },
  { id: 'bank', name: 'Bank', threshold: 30000000 },
  { id: 'car', name: 'Car', threshold: 50000000 },
  { id: 'hotel', name: 'Hotel', threshold: 80000000 },
  { id: 'bus', name: 'Bus', threshold: 90000000 },
  { id: 'train', name: 'Train', threshold: 120000000 },
  { id: 'ship', name: 'Ship', threshold: 130000000 },
  { id: 'aeroplane', name: 'Aeroplane', threshold: 150000000 },
];

interface RocketLevelSectionProps {
  totalGifted?: number;
  onSelectLevel?: (levelName: string) => void;
}

export function RocketLevelSection({ totalGifted = 0, onSelectLevel }: RocketLevelSectionProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const lootConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'appConfig', 'lootSettings'), [firestore]);
  const { data: lootConfig } = useDoc<any>(lootConfigRef);

  const userDocRef = useMemoFirebase(
    () => (!firestore || !user?.uid ? null : doc(firestore, 'users', user.uid)),
    [firestore, user?.uid]
  );
  const { data: userDoc } = useDoc<any>(userDocRef);

  const levels = lootConfig?.levels || DEFAULT_LEVELS;

  // Calculate user's total gifted coins across all rooms
  const userGifted = useMemo(() => {
    if (userDoc?.stats?.totalGifted) return userDoc.stats.totalGifted;
    return totalGifted;
  }, [userDoc, totalGifted]);

  // Find current level based on gifted coins
  const currentLevelIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < levels.length; i++) {
      if (userGifted >= levels[i].threshold) idx = i;
    }
    return idx;
  }, [userGifted, levels]);

  // Calculate progress to next level
  const getProgress = (levelIdx: number) => {
    const level = levels[levelIdx];
    const nextLevel = levels[levelIdx + 1];
    if (!nextLevel) return userGifted >= level.threshold ? 100 : 0;
    if (userGifted >= nextLevel.threshold) return 100;
    if (userGifted < level.threshold) return 0;
    return ((userGifted - level.threshold) / (nextLevel.threshold - level.threshold)) * 100;
  };

  // Level up effect state
  const [levelUpState, setLevelUpState] = useState<{
    visible: boolean;
    level: number;
    name: string;
    accent: string;
    accent2: string;
    icon: string;
    reward: number;
  } | null>(null);

  const prevLevelRef = useRef(currentLevelIndex);

  useEffect(() => {
    if (currentLevelIndex > prevLevelRef.current && currentLevelIndex < levels.length) {
      const cfg = LEVEL_CONFIG[levels[currentLevelIndex].id] || LEVEL_CONFIG.home;
      setLevelUpState({
        visible: true,
        level: currentLevelIndex,
        name: levels[currentLevelIndex].name,
        accent: cfg.accent,
        accent2: cfg.accent2,
        icon: cfg.icon,
        reward: cfg.reward,
      });
    }
    prevLevelRef.current = currentLevelIndex;
  }, [currentLevelIndex, levels]);

  // Calculate total progress percentage
  const totalProgress = useMemo(() => {
    const maxThreshold = levels[levels.length - 1]?.threshold || 150000000;
    return Math.min((userGifted / maxThreshold) * 100, 100);
  }, [userGifted, levels]);

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🚀 Loot Level</Text>
          <Text style={styles.headerSubtitle}>{userGifted.toLocaleString('en-IN')} coins gifted</Text>
        </View>
        <View style={styles.totalProgressContainer}>
          <View style={styles.totalProgressOuter}>
            <View style={[styles.totalProgressInner, { width: `${totalProgress}%` }]} />
          </View>
          <Text style={styles.totalProgressText}>{Math.round(totalProgress)}%</Text>
        </View>
      </View>

      {/* Level cards horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {levels.map((level: LootLevel, idx: number) => {
          const cfg = LEVEL_CONFIG[level.id] || LEVEL_CONFIG.home;
          const isUnlocked = idx < currentLevelIndex;
          const isCurrent = idx === currentLevelIndex;
          const isHighest = idx === levels.length - 1 && isCurrent;

          return (
            <RocketLevelCard
              key={level.id}
              level={idx}
              name={level.name}
              icon={cfg.icon}
              threshold={level.threshold}
              accent={cfg.accent}
              accent2={cfg.accent2}
              progress={getProgress(idx)}
              isUnlocked={isUnlocked}
              isCurrent={isCurrent}
              isHighest={isHighest}
              localImage={cfg.image}
              onPress={() => onSelectLevel?.(level.name)}
            />
          );
        })}
      </ScrollView>

      {/* Level up effect */}
      {levelUpState && (
        <RocketLevelUpEffect
          key={`levelup-${levelUpState.level}`}
          visible={levelUpState.visible}
          level={levelUpState.level}
          levelName={levelUpState.name}
          accent={levelUpState.accent}
          accent2={levelUpState.accent2}
          icon={levelUpState.icon}
          reward={levelUpState.reward}
          onComplete={() => setLevelUpState(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(15,10,40,0.95)',
    borderRadius: 16,
    marginHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(120,80,255,0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  totalProgressContainer: {
    alignItems: 'center',
    width: 80,
  },
  totalProgressOuter: {
    width: 80,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  totalProgressInner: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 3,
  },
  totalProgressText: {
    color: '#c084fc',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
});
