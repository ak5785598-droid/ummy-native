import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { doc, increment } from '@/firebase/firestore-compat';
import { useFirestore, useUser } from '../../firebase/provider';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';

const { width, height } = Dimensions.get('window');
const SESSION_DURATION = 60;
const MAX_ITEMS = 30;

interface LootingRoomProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

const REWARD_TYPES = [
  { emoji: '🪙', value: 10, weight: 45 },
  { emoji: '🪙', value: 25, weight: 28 },
  { emoji: '🪙', value: 50, weight: 15 },
  { emoji: '💎', value: 100, weight: 4 },
  { emoji: '💎', value: 200, weight: 0.8 },
  { emoji: '⭐', value: 500, weight: 0.2 },
  { emoji: '💀', value: -50, weight: 7 }, // Penalty skull obstacle
];

function pickReward() {
  const totalWeight = REWARD_TYPES.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const r of REWARD_TYPES) {
    rand -= r.weight;
    if (rand <= 0) return r;
  }
  return REWARD_TYPES[0];
}

interface FloatingPop {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  anim: Animated.Value;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  tx: Animated.Value;
  ty: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
}

interface FallingItem {
  uid: string;
  emoji: string;
  value: number;
  x: number;
  startDelay: number;
}

function FallingReward({
  item,
  onCollect,
  collected,
  isFrenzy,
}: {
  item: FallingItem;
  onCollect: (x: number, y: number, value: number, itemId: string) => void;
  collected: boolean;
  isFrenzy: boolean;
}) {
  const yPos = useRef(new Animated.Value(-60)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const xPos = useRef(item.x).current;

  useEffect(() => {
    if (collected) return;
    const baseDuration = isFrenzy ? 1600 : 3500;
    const randomDuration = isFrenzy ? 1000 : 2500;
    const fallDuration = baseDuration + Math.random() * randomDuration;
    Animated.parallel([
      Animated.timing(yPos, {
        toValue: height - 120,
        duration: fallDuration,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: 1,
            duration: 400 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 400 + Math.random() * 400,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [isFrenzy]);

  const handlePress = () => {
    if (collected) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.6, friction: 3, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    onCollect(xPos, height / 2, item.value, item.uid);
  };

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18deg', '18deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: xPos,
        transform: [{ translateY: yPos }, { rotate: rotation }, { scale }],
        opacity: collected ? 0 : opacity,
      }}
      pointerEvents={collected ? 'none' : 'auto'}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function LootingRoom({ visible, onClose, roomId }: LootingRoomProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [floatingPops, setFloatingPops] = useState<FloatingPop[]>([]);
  const [confettiPieces, setConfettiPieces] = useState<Confetti[]>([]);
  const collectedItemsRef = useRef<Set<string>>(new Set());
  const comboCountRef = useRef(0);
  const [comboDisplay, setComboDisplay] = useState(0);

  const popIdRef = useRef(0);
  const confettiIdRef = useRef(0);
  const lastCollectTimeRef = useRef<number>(0);
  const accumulatedScoreRef = useRef(0);

  const isFrenzy = timeLeft <= 10 && timeLeft > 0;

  // Initialize and Countdown Timer
  useEffect(() => {
    if (!visible) {
      setItems([]);
      setScore(0);
      setTimeLeft(SESSION_DURATION);
      setFloatingPops([]);
      setConfettiPieces([]);
      comboCountRef.current = 0;
      setComboDisplay(0);
      collectedItemsRef.current = new Set();
      accumulatedScoreRef.current = 0;
      lastCollectTimeRef.current = 0;
      return;
    }

    const initialItems: FallingItem[] = Array.from({ length: 8 }, (_, i) => {
      const r = pickReward();
      return {
        uid: `init_${Date.now()}_${i}`,
        emoji: r.emoji,
        value: r.value,
        x: Math.random() * (width - 60),
        startDelay: i * 300,
      };
    });
    setItems(initialItems);

    const timerInterval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [visible]);

  // Handle dynamic spawn rate for Frenzy Mode
  useEffect(() => {
    if (!visible || timeLeft === 0) return;
    const spawnTime = isFrenzy ? 700 : 1600;
    const spawnInterval = setInterval(() => {
      setItems((prev) => {
        const r = pickReward();
        const newItem: FallingItem = {
          uid: `spawn_${Date.now()}_${Math.random()}`,
          emoji: r.emoji,
          value: r.value,
          x: Math.random() * (width - 60),
          startDelay: 0,
        };
        const next = [...prev, newItem];
        return next.length > MAX_ITEMS ? next.slice(next.length - MAX_ITEMS) : next;
      });
    }, spawnTime);

    return () => clearInterval(spawnInterval);
  }, [visible, isFrenzy, timeLeft === 0]);

  const spawnConfetti = useCallback((cx: number, cy: number) => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const pieces: Confetti[] = Array.from({ length: 10 }, () => ({
      id: confettiIdRef.current++,
      x: cx,
      y: cy,
      tx: new Animated.Value((Math.random() - 0.5) * 160),
      ty: new Animated.Value(-(40 + Math.random() * 120)),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfettiPieces((prev) => [...prev, ...pieces]);

    pieces.forEach((p) => {
      Animated.parallel([
        Animated.spring(p.tx, { toValue: (Math.random() - 0.5) * 200, friction: 4, useNativeDriver: true }),
        Animated.spring(p.ty, { toValue: 100 + Math.random() * 150, friction: 4, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(p.scale, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start(() => {
        setConfettiPieces((prev) => prev.filter((c) => c.id !== p.id));
      });
    });
  }, []);

  const handleCollect = useCallback(
    (x: number, y: number, value: number, itemId: string) => {
      if (collectedItemsRef.current.has(itemId)) return;
      collectedItemsRef.current.add(itemId);
      let earnedCoins = value;
      let floatingColor = '#fbbf24';

      if (value > 0) {
        const now = Date.now();
        const diff = now - lastCollectTimeRef.current;
        let newCombo = 1;
        if (diff <= 800) {
          newCombo = comboCountRef.current + 1;
        }
        comboCountRef.current = newCombo;
        setComboDisplay(newCombo);
        lastCollectTimeRef.current = now;

        const comboMult = 1 + Math.min(Math.floor(newCombo / 3) * 0.5, 4.0);
        const frenzyMult = isFrenzy ? 2 : 1;

        earnedCoins = Math.round(value * comboMult * frenzyMult);
      } else {
        comboCountRef.current = 0;
        lastCollectTimeRef.current = 0;
        floatingColor = '#f87171';
      }

      setScore((s) => s + earnedCoins);
      accumulatedScoreRef.current += earnedCoins;

      const popId = popIdRef.current++;
      const anim = new Animated.Value(1);
      const displayText = earnedCoins > 0 ? `+${earnedCoins}` : `${earnedCoins}`;
      setFloatingPops((prev) => [...prev, { id: popId, x, y, text: displayText, color: floatingColor, anim }]);
      Animated.parallel([
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]).start(() => {
        setFloatingPops((prev) => prev.filter((p) => p.id !== popId));
      });

      if (value > 0) {
        spawnConfetti(x, y);
      }
    },
    [isFrenzy, spawnConfetti]
  );

  const handleAutoClose = useCallback(() => {
    const finalScore = accumulatedScoreRef.current;
    if (finalScore > 0 && firestore && user?.uid) {
      updateDocumentNonBlocking(
        doc(firestore, 'users', user.uid),
        { 'wallet.coins': increment(finalScore) }
      );
      updateDocumentNonBlocking(
        doc(firestore, 'users', user.uid, 'profile', user.uid),
        { 'wallet.coins': increment(finalScore) }
      );
    }
    onClose();
  }, [onClose, firestore, user]);

  useEffect(() => {
    if (visible && timeLeft === 0) {
      const t = setTimeout(handleAutoClose, 2000);
      return () => clearTimeout(t);
    }
  }, [timeLeft, visible, handleAutoClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isEnding = timeLeft === 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
        
        {/* Frenzy Border Overlay */}
        {isFrenzy && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            borderWidth: 4, borderColor: '#f59e0b', pointerEvents: 'none', zIndex: 10,
            opacity: 0.8,
          }} />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 50,
            paddingBottom: 8,
            zIndex: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
            <View>
              <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '900' }}>Looting Room</Text>
              {isFrenzy && (
                <Text style={{ color: '#f59e0b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>Frenzy Mode (2x)!</Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {comboDisplay >= 3 && (
              <View style={{ backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: '#c084fc', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: '#c084fc', fontWeight: '900', fontSize: 11 }}>COMBO x{comboDisplay}</Text>
              </View>
            )}
            <View
              style={{
                backgroundColor: 'rgba(251,191,36,0.15)',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: 'rgba(251,191,36,0.3)',
              }}
            >
              <Text style={{ color: '#fbbf24', fontWeight: '900', fontSize: 14 }}>🪙 {score.toLocaleString()}</Text>
            </View>
            <View
              style={{
                backgroundColor: timeLeft <= 10 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: timeLeft <= 10 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)',
              }}
            >
              <Text style={{ color: timeLeft <= 10 ? '#ef4444' : '#fff', fontWeight: '900', fontSize: 13 }}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleAutoClose} style={{ padding: 4 }}>
              <X size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1, zIndex: 15 }}>
          {items.map((item) => (
            <FallingReward
              key={item.uid}
              item={item}
              onCollect={handleCollect}
              collected={collectedItemsRef.current.has(item.uid)}
              isFrenzy={isFrenzy}
            />
          ))}
        </View>

        {floatingPops.map((pop) => (
          <Animated.View
            key={pop.id}
            style={{
              position: 'absolute',
              left: pop.x,
              top: pop.y,
              opacity: pop.anim,
              transform: [
                {
                  translateY: pop.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-80, 0],
                  }),
                },
                {
                  scale: pop.anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.3, 1],
                  }),
                },
              ],
              pointerEvents: 'none',
              zIndex: 30,
            }}
          >
            <Text style={{ color: pop.color, fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 }}>
              {pop.text}
            </Text>
          </Animated.View>
        ))}

        {confettiPieces.map((c) => (
          <Animated.View
            key={c.id}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: c.color,
              transform: [{ translateX: c.tx }, { translateY: c.ty }, { scale: c.scale }],
              opacity: c.opacity,
              pointerEvents: 'none',
              zIndex: 25,
            }}
          />
        ))}

        {isEnding && (
          <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center', zIndex: 30 }}>
            <View style={{ backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)' }}>
              <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
                Session ended! +{score.toLocaleString()} coins collected
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
