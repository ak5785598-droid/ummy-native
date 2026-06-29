import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { X, Users, Timer, Zap, Crown, Lock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { doc } from '@/firebase/firestore-compat';
import { useFirestore, useDatabase } from '../../firebase/provider';
import { ref as databaseRef, set as databaseSet, onValue, runTransaction as databaseTransaction } from 'firebase/database';
import { TopSupporter } from '../../lib/types';

interface LootGateProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  levelName?: string;
  levelIndex?: number;
  topSupporters?: TopSupporter[];
  isOwner?: boolean;
  currentUserId?: string;
  onCrack?: (gateIndex: number) => void;
  lootConfig?: {
    duration?: number;
    entryLimit?: number;
    gatePriority?: string;
  } | null;
}

const DEFAULT_GATE_DURATION = 15;
const DEFAULT_MAX_ENTRIES = 20;
const TOP_CRACKERS = 3;

const LEVEL_IMAGES: Record<string, any> = {
  home: require('../../../assets/images/loot/level_home.png'),
  bank: require('../../../assets/images/loot/level_bank.png'),
  car: require('../../../assets/images/loot/level_car.png'),
  hotel: require('../../../assets/images/loot/level_hotel.png'),
  bus: require('../../../assets/images/loot/level_bus.png'),
  train: require('../../../assets/images/loot/level_train.png'),
  ship: require('../../../assets/images/loot/level_ship.png'),
  aeroplane: require('../../../assets/images/loot/level_aeroplane.png'),
};
const LEVEL_KEYS = ['home', 'bank', 'car', 'hotel', 'bus', 'train', 'ship', 'aeroplane'];

const LEVEL_COLORS: Record<string, string> = {
  home: '#fbbf24',
  bank: '#9ca3af',
  car: '#ef4444',
  hotel: '#a855f7',
  bus: '#3b82f6',
  train: '#22c55e',
  ship: '#06b6d4',
  aeroplane: '#f472b6',
};

export function LootGate({
  visible,
  onClose,
  roomId,
  levelName = 'Home',
  levelIndex = 0,
  topSupporters = [],
  isOwner = false,
  currentUserId,
  onCrack,
  lootConfig,
}: LootGateProps) {
  const firestore = useFirestore();
  const database = useDatabase();

  const gateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const countdownPulse = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const blastScale = useRef(new Animated.Value(0)).current;
  const blastRotate = useRef(new Animated.Value(0)).current;
  const blastOpacity = useRef(new Animated.Value(1)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(0)).current;
  const crackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const GATE_DURATION = lootConfig?.duration || DEFAULT_GATE_DURATION;
  const MAX_ENTRIES = lootConfig?.entryLimit || DEFAULT_MAX_ENTRIES;
  const gatePriority = lootConfig?.gatePriority || 'top_sender';

  const [timeLeft, setTimeLeft] = useState(GATE_DURATION);
  const [entries, setEntries] = useState<string[]>([]);
  const [cracked, setCracked] = useState(false);
  const [myRank, setMyRank] = useState<number>(-1);
  const [blastPhase, setBlastPhase] = useState<'gate' | 'explosion' | 'done'>('gate');

  const top3Uids = topSupporters.slice(0, TOP_CRACKERS).map((s) => s.uid);
  const isFull = entries.length >= MAX_ENTRIES;
  const hasEntered = entries.includes(currentUserId || '');

  const canCrack = (() => {
    if (isOwner && gatePriority === 'owner_first') return true;
    if (top3Uids.includes(currentUserId || '')) return true;
    if (isOwner) return true;
    if (gatePriority === 'random' && !isFull && entries.length > 0) return true;
    return false;
  })();

  const gateId = roomId ? `chatRooms/${roomId}/lootGates/${levelIndex}` : `lootGates/${levelIndex}`;

  useEffect(() => {
    return () => {
      if (crackTimerRef.current) clearTimeout(crackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible || !database || !roomId) return;
    const rtdbPath = `rooms/${roomId}/lootGates/${levelIndex}/entries`;
    const unsub = onValue(databaseRef(database, rtdbPath), (snap: any) => {
      const arr = snap.val();
      if (Array.isArray(arr)) {
        setEntries(arr);
      } else {
        setEntries([]);
      }
    });
    return () => unsub();
  }, [visible, database, roomId, levelIndex]);

  useEffect(() => {
    if (!visible) return;
    setTimeLeft(GATE_DURATION);
    setCracked(false);
    setMyRank(-1);
    setBlastPhase('gate');
    gateAnim.setValue(0);
    blastScale.setValue(0);
    blastRotate.setValue(0);
    blastOpacity.setValue(1);
    explosionScale.setValue(0);
    explosionOpacity.setValue(0);

    if (isOwner && database && roomId) {
      const rtdbPath = `rooms/${roomId}/lootGates/${levelIndex}/entries`;
      databaseSet(databaseRef(database, rtdbPath), []).catch(() => {});
    }
  }, [visible, GATE_DURATION, isOwner, database, roomId, levelIndex]);

  useEffect(() => {
    if (visible) {
      Animated.spring(gateAnim, { toValue: 1, friction: 6, tension: 20, useNativeDriver: true }).start();
      if (canCrack) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      }
    } else {
      gateAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [visible, canCrack]);

  useEffect(() => {
    if (cracked && blastPhase === 'gate') {
      blastScale.setValue(0.1);
      blastRotate.setValue(0);
      blastOpacity.setValue(1);
      Animated.parallel([
        Animated.spring(blastScale, { toValue: 1.2, friction: 4, tension: 30, useNativeDriver: true }),
        Animated.timing(blastRotate, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(blastScale, { toValue: 2.5, duration: 400, useNativeDriver: true }),
          Animated.timing(blastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          setBlastPhase('explosion');
        });
      });
    }
  }, [cracked, blastPhase]);

  useEffect(() => {
    if (blastPhase === 'explosion') {
      explosionOpacity.setValue(1);
      explosionScale.setValue(0);
      const particles = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return Animated.parallel([
          Animated.timing(explosionScale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
          Animated.timing(explosionOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]);
      });
      Animated.parallel(particles).start(() => {
        setBlastPhase('done');
        crackTimerRef.current = setTimeout(() => {
          onCrack?.(levelIndex);
        }, 500);
      });
    }
  }, [blastPhase]);

  useEffect(() => {
    if (!visible || cracked) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, cracked, GATE_DURATION]);

  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !cracked) {
      Animated.sequence([
        Animated.timing(countdownPulse, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(countdownPulse, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft, cracked]);

  useEffect(() => {
    if (visible && timeLeft === 0 && !cracked) {
      const t = setTimeout(onClose, 800);
      return () => clearTimeout(t);
    }
  }, [timeLeft, visible, cracked]);

  const handleEnter = useCallback(async () => {
    if (!currentUserId || hasEntered || isFull || cracked || !database || !roomId) return;
    try {
      const rtdbPath = `rooms/${roomId}/lootGates/${levelIndex}/entries`;
      await databaseTransaction(databaseRef(database, rtdbPath), (currentEntries) => {
        const arr = currentEntries || [];
        if (arr.includes(currentUserId)) return;
        if (arr.length >= MAX_ENTRIES) return;
        return [...arr, currentUserId];
      });
      setMyRank(entries.length + 1);
    } catch {}
  }, [currentUserId, hasEntered, isFull, cracked, database, roomId, levelIndex, entries.length, MAX_ENTRIES]);

  const handleCrack = useCallback(() => {
    if (!canCrack || cracked || timeLeft === 0) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      setCracked(true);
    });
  }, [canCrack, cracked, timeLeft]);

  const top3 = topSupporters.slice(0, TOP_CRACKERS);
  const activeLevelKey = LEVEL_KEYS[levelIndex] || 'home';
  const levelColor = LEVEL_COLORS[activeLevelKey] || '#fbbf24';

  const blastRotation = blastRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        {cracked ? (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0718', justifyContent: 'center', alignItems: 'center' }}>
            {blastPhase === 'gate' && (
              <Animated.View style={{ transform: [{ scale: blastScale }, { rotate: blastRotation }], opacity: blastOpacity }}>
                <View style={{
                  width: 240, height: 240, borderRadius: 120,
                  borderWidth: 6, borderColor: levelColor,
                  shadowColor: levelColor, shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1, shadowRadius: 40,
                  overflow: 'hidden', backgroundColor: '#1e1b4b',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Image source={LEVEL_IMAGES[activeLevelKey]} style={{ width: 200, height: 200 }} contentFit="cover" cachePolicy="memory-disk" />
                </View>
              </Animated.View>
            )}

            {blastPhase === 'explosion' && (
              <>
                {Array.from({ length: 8 }, (_, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const ex = Math.cos(angle) * 140;
                  const ey = Math.sin(angle) * 140;
                  return (
                    <Animated.View
                      key={i}
                      style={{
                        position: 'absolute',
                        width: 20 + (i % 3) * 10,
                        height: 20 + (i % 3) * 10,
                        borderRadius: (20 + (i % 3) * 10) / 2,
                        backgroundColor: levelColor,
                        opacity: explosionOpacity,
                        transform: [
                          { scale: explosionScale },
                          { translateX: ex },
                          { translateY: ey },
                        ],
                      }}
                    />
                  );
                })}
                <Animated.View style={{
                  position: 'absolute',
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: 'white',
                  opacity: explosionOpacity,
                  transform: [{ scale: explosionScale }],
                }} />
                <Animated.View style={{
                  position: 'absolute',
                  width: 160, height: 160, borderRadius: 80,
                  borderWidth: 4, borderColor: levelColor,
                  opacity: explosionOpacity,
                  transform: [{ scale: explosionScale }],
                }} />
              </>
            )}

            {blastPhase === 'done' && (
              <>
                <Text style={{
                  color: '#fbbf24', fontSize: 32, fontWeight: '900', textTransform: 'uppercase',
                  letterSpacing: 3, textShadowColor: 'rgba(251,191,36,0.8)', textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 16, textAlign: 'center',
                }}>
                  Gate Cracked!
                </Text>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', marginTop: 12, textTransform: 'uppercase', textAlign: 'center' }}>
                  Level {levelIndex + 1}: {levelName}
                </Text>
                <Text style={{ color: '#a78bfa', fontSize: 13, marginTop: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                  Looting room opens in a moment...
                </Text>
              </>
            )}
          </View>
        ) : (
          <Animated.View
            style={{
              backgroundColor: '#0f172a',
              borderRadius: 28,
              width: '88%',
              padding: 24,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: canCrack ? 'rgba(251,191,36,0.5)' : 'rgba(239,68,68,0.3)',
              transform: [{ scale: gateAnim }, { translateX: shakeAnim }],
              opacity: gateAnim,
            }}
          >
            <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 10 }}>
              <X size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900' }}>{levelName}</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 12 }}>LOOT GATE — Level {levelIndex + 1}</Text>

            <Animated.View
              style={{
                backgroundColor: timeLeft <= 5 ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.1)',
                borderRadius: 16, padding: 12, width: '100%', alignItems: 'center',
                borderWidth: 1, borderColor: timeLeft <= 5 ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.2)',
                marginBottom: 12,
                transform: [{ scale: timeLeft <= 5 ? countdownPulse : 1 }],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Timer size={14} color={timeLeft <= 5 ? '#ef4444' : '#fbbf24'} />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' }}>
                  Gate closes in
                </Text>
              </View>
              <Text style={{ color: timeLeft <= 5 ? '#ef4444' : '#fbbf24', fontSize: 32, fontWeight: '900', marginTop: 4 }}>
                {timeLeft}s
              </Text>
            </Animated.View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Users size={14} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>
                {entries.length}/{MAX_ENTRIES} entered
              </Text>
              {hasEntered && (
                <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '700' }}>You're #{myRank}</Text>
                </View>
              )}
            </View>

            <View style={{ width: '100%', marginBottom: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>
                Who can crack the gate?
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {top3.length > 0 ? top3.map((s, i) => {
                  const isMe = s.uid === currentUserId;
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                  return (
                    <View
                      key={s.uid}
                      style={{
                        alignItems: 'center',
                        backgroundColor: isMe ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                        borderRadius: 12, padding: 8, minWidth: 70,
                        borderWidth: 1, borderColor: isMe ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{medal}</Text>
                      {s.avatarUrl ? (
                        <Image source={{ uri: s.avatarUrl }} style={{ width: 28, height: 28, borderRadius: 14, marginTop: 4 }} cachePolicy="memory-disk" />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>{s.username?.[0] || '?'}</Text>
                        </View>
                      )}
                      <Text style={{ color: isMe ? '#fbbf24' : '#e2e8f0', fontSize: 9, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
                        {isMe ? 'You' : s.username}
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 8 }}>#{i + 1}</Text>
                    </View>
                  );
                }) : (
                  <Text style={{ color: '#64748b', fontSize: 11 }}>No supporters yet</Text>
                )}
                {isOwner && (
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: 'rgba(168,85,247,0.15)',
                      borderRadius: 12, padding: 8, minWidth: 70,
                      borderWidth: 1, borderColor: '#a855f7',
                    }}
                  >
                    <Crown size={18} color="#a855f7" />
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.2)', marginTop: 4, alignItems: 'center', justifyContent: 'center' }}>
                      <Crown size={14} color="#c084fc" />
                    </View>
                    <Text style={{ color: '#c084fc', fontSize: 9, fontWeight: '700', marginTop: 4 }}>Owner</Text>
                    <Text style={{ color: '#a855f7', fontSize: 8 }}>👑</Text>
                  </View>
                )}
              </View>
            </View>

            {timeLeft === 0 ? (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', width: '100%' }}>
                <Lock size={18} color="#ef4444" />
                <Text style={{ color: '#f87171', fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>Gate Closed</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Wait for next level</Text>
              </View>
            ) : canCrack ? (
              <TouchableOpacity onPress={handleCrack} activeOpacity={0.8} style={{ width: '100%' }}>
                <Animated.View
                  style={{
                    backgroundColor: '#f59e0b', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                    shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
                    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Zap size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Crack the Gate!</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>You're authorized to open</Text>
                </Animated.View>
              </TouchableOpacity>
            ) : hasEntered ? (
              <View style={{ backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)', width: '100%' }}>
                <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: 'bold' }}>⏳ Waiting for gate to crack...</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Top sender or owner will open it</Text>
              </View>
            ) : isFull ? (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', width: '100%' }}>
                <Text style={{ color: '#f87171', fontSize: 13, fontWeight: 'bold' }}>Gate Full ({MAX_ENTRIES}/{MAX_ENTRIES})</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleEnter} activeOpacity={0.8} style={{ width: '100%' }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Enter Gate Queue</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Be among first {MAX_ENTRIES} to enter</Text>
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}
