import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DEFAULT_GATE_DURATION = 15;
const DEFAULT_MAX_ENTRIES = 20;
const TOP_CRACKERS = 3;
const BURST_DURATION = 10;
const BURST_ITEM_MAX = 60;
const CASH_EMOJIS = [String.fromCodePoint(0x1F4B5), String.fromCodePoint(0x1F4B6), String.fromCodePoint(0x1F4B8)];
const COIN_EMOJI = String.fromCodePoint(0x1FA99);
const GIFT_EMOJI = String.fromCodePoint(0x1F381);
const CONFETTI_COLORS = ['#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316'];
const CONFETTI_SHAPES = ['circle', 'rect', 'triangle'];

const LEVEL_IMAGES: Record<string, any> = {
  home: require('../../../assets/images/loot/level_home.png'),
  bank: require('../../../assets/images/loot/level_bank.png'),
  car: require('../../../assets/images/loot/level_car.png'),
  hotel: require('../../../assets/images/loot/level_hotel.png'),
  bus: require('../../../assets/images/loot/level_bus.png'),
  train: require('../../../assets/images/loot/level_train.png'),
  ship: require('../../../assets/images/loot/level_ship.png'),
  aeroplane: require('../../../assets/images/loot/level_aeroplane.png'),
  submarine: require('../../../assets/images/loot/level_submarine.png'),
  rocket: require('../../../assets/images/loot/level_rocket.png'),
};
const LEVEL_KEYS = ['home', 'bank', 'car', 'hotel', 'bus', 'train', 'ship', 'aeroplane', 'submarine', 'rocket'];

const LEVEL_COLORS: Record<string, string> = {
  home: '#fbbf24',
  bank: '#9ca3af',
  car: '#ef4444',
  hotel: '#a855f7',
  bus: '#3b82f6',
  train: '#22c55e',
  ship: '#06b6d4',
  aeroplane: '#f59e0b',
  submarine: '#0ea5e9',
  rocket: '#ec4899',
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
  const flashAnimated = useRef(new Animated.Value(0)).current;
  const crackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  interface BurstParticle {
    id: number;
    x: Animated.Value;
    y: Animated.Value;
    rotation: Animated.Value;
    scale: Animated.Value;
    opacity: Animated.Value;
    type: 'cash' | 'coin' | 'gift' | 'confetti';
    emoji?: string;
    color?: string;
    shape?: string;
    size: number;
  }
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const particleCounterRef = useRef(0);
  const burstIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setParticles([]);
    particleCounterRef.current = 0;
    gateAnim.setValue(0);
    blastScale.setValue(0);
    blastRotate.setValue(0);
    blastOpacity.setValue(1);
    explosionScale.setValue(0);
    explosionOpacity.setValue(0);
    flashAnimated.setValue(0);
    if (burstIntervalRef.current) { clearInterval(burstIntervalRef.current); burstIntervalRef.current = null; }

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
      // Center flash burst
      flashAnimated.setValue(0);
      Animated.sequence([
        Animated.timing(flashAnimated, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnimated, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();

      // Continuous particle rain for 10 seconds
      const createParticle = (): BurstParticle => {
        const id = particleCounterRef.current++;
        const type = Math.random() < 0.30 ? 'cash' : Math.random() < 0.55 ? 'coin' : Math.random() < 0.80 ? 'gift' : 'confetti';
        const startX = Math.random() * SCREEN_W;
        const startY = -30 - Math.random() * 60;

        let emoji: string | undefined;
        let color: string | undefined;
        let shape: string | undefined;
        let size: number;

        if (type === 'cash') {
          emoji = CASH_EMOJIS[Math.floor(Math.random() * CASH_EMOJIS.length)];
          size = 28 + Math.random() * 16;
        } else if (type === 'coin') {
          emoji = COIN_EMOJI;
          size = 22 + Math.random() * 18;
        } else if (type === 'gift') {
          emoji = GIFT_EMOJI;
          size = 30 + Math.random() * 14;
        } else {
          color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
          shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
          size = 6 + Math.random() * 10;
        }

        const x = new Animated.Value(startX);
        const y = new Animated.Value(startY);
        const rotation = new Animated.Value(0);
        const scale = new Animated.Value(0);
        const opacity = new Animated.Value(0);

        opacity.addListener(({ value }) => { if (value <= 0) { x.stopAnimation(); y.stopAnimation(); rotation.stopAnimation(); scale.stopAnimation(); opacity.stopAnimation(); } });

        const delay = Math.random() * 200;
        const fallDuration = 3000 + Math.random() * 5000;
        const driftX = (Math.random() - 0.5) * 120;
        const spin = Math.random() * 720 - 360;
        const targetY = SCREEN_H + 50;

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(y, { toValue: targetY, duration: fallDuration, useNativeDriver: true }),
            Animated.timing(x, { toValue: startX + driftX, duration: fallDuration, useNativeDriver: true }),
            Animated.timing(rotation, { toValue: spin, duration: fallDuration, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(fallDuration * 0.1),
              Animated.parallel([
                Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
              ]),
              Animated.delay(fallDuration * 0.6),
              Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
          ]).start();
        }, delay);

        return { id, x, y, rotation, scale, opacity, type, emoji, color, shape, size };
      };

      burstIntervalRef.current = setInterval(() => {
        setParticles(prev => {
          const batch = Array.from({ length: 4 + Math.floor(Math.random() * 2) }, createParticle);
          const next = [...prev, ...batch];
          return next.length > BURST_ITEM_MAX ? next.slice(-BURST_ITEM_MAX) : next;
        });
      }, 180);

      // Auto-transition to done after 10 seconds
      crackTimerRef.current = setTimeout(() => {
        if (burstIntervalRef.current) { clearInterval(burstIntervalRef.current); burstIntervalRef.current = null; }
        setParticles([]);
        setBlastPhase('done');
        setTimeout(() => { onCrack?.(levelIndex); }, 600);
      }, BURST_DURATION * 1000);
    }

    return () => {
      if (burstIntervalRef.current) { clearInterval(burstIntervalRef.current); burstIntervalRef.current = null; }
    };
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
                {/* Center flash burst */}
                <Animated.View style={{
                  position: 'absolute', width: 120, height: 120, borderRadius: 60,
                  backgroundColor: 'white', opacity: flashAnimated,
                  transform: [{ scale: flashAnimated.interpolate({ inputRange: [0, 1], outputRange: [0.5, 4] }) }],
                }} />
                {/* Shockwave rings */}
                {[0, 1, 2].map(ring => (
                  <Animated.View key={`ring-${ring}`} style={{
                    position: 'absolute', width: 100 + ring * 60, height: 100 + ring * 60,
                    borderRadius: (100 + ring * 60) / 2, borderWidth: 3,
                    borderColor: ring === 0 ? 'white' : levelColor,
                    opacity: flashAnimated.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] }),
                    transform: [{ scale: flashAnimated.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.5 + ring * 0.5] }) }],
                  }} />
                ))}
                {/* Falling particles: cash, coins, gifts, confetti */}
                {particles.map(p => {
                  if (p.type === 'confetti') {
                    const triSize = p.size;
                    return (
                      <Animated.View key={p.id} style={{
                        position: 'absolute', left: 0, top: 0, opacity: p.opacity,
                        transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: p.rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }, { scale: p.scale }],
                      }}>
                        {p.shape === 'circle' ? (
                          <View style={{ width: triSize, height: triSize, borderRadius: triSize / 2, backgroundColor: p.color }} />
                        ) : p.shape === 'rect' ? (
                          <View style={{ width: triSize, height: triSize * 0.5, borderRadius: 2, backgroundColor: p.color }} />
                        ) : (
                          <View style={{ width: 0, height: 0, borderLeftWidth: triSize / 2, borderRightWidth: triSize / 2, borderBottomWidth: triSize, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: p.color }} />
                        )}
                      </Animated.View>
                    );
                  }
                  return (
                    <Animated.Text key={p.id} style={{
                      position: 'absolute', left: 0, top: 0, fontSize: p.size, opacity: p.opacity,
                      transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: p.rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }, { scale: p.scale }],
                    }}>
                      {p.emoji}
                    </Animated.Text>
                  );
                })}
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
