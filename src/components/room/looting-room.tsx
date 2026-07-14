import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions, StyleSheet, Image, ScrollView } from 'react-native';
import { ShieldAlert, Trophy } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { doc, increment, onSnapshot } from '@/firebase/firestore-compat';
import { useFirestore, useUser, useDatabase } from '../../firebase/provider';
import { ref as databaseRef, onValue, set as rtdbSet } from 'firebase/database';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';
import { GoldenCoin } from '../GoldenCoin';
import { PremiumDiamond } from '../PremiumDiamond';
import { LootLevelAnimation } from './loot-level-animation';

const { width, height } = Dimensions.get('window');
const SESSION_DURATION = 30; // Changed from 60 to 30 seconds
const MAX_ITEMS = 60; // Reduced from 120 to 60 for lag-free touch responsiveness
const GAME_HEIGHT = height * 0.78; // occupy 78% of screen (positioned higher)
const ANIMATION_BOTTOM_Y = 270; // Reverted falling items start coordinate to drop right below the original size animation

const LEVEL_KEYS = ['home', 'bank', 'car', 'hotel', 'bus', 'train', 'ship', 'aeroplane', 'submarine', 'rocket'];
const THRESHOLD_MAP = [10000000, 30000000, 50000000, 80000000, 90000000, 120000000, 130000000, 150000000, 180000000, 220000000];

// Open-access, direct CDN URLs with double digits for Soundjay compliance (No 404 or 403 errors)
const COIN_SOUND_URL = 'https://www.soundjay.com/buttons/sounds/button-09.mp3'; // High-pitched collect ping
const BOX_SOUND_URL = 'https://www.soundjay.com/buttons/sounds/button-10.mp3'; // Grand level/prize chime
const SKULL_SOUND_URL = 'https://www.soundjay.com/buttons/sounds/button-05.mp3'; // Penalty buzzer

const LEVEL_SOUNDS: Record<string, string> = {
  home: 'https://www.soundjay.com/buttons/sounds/button-03.mp3',
  bank: 'https://www.soundjay.com/buttons/sounds/button-01.mp3',
  car: 'https://www.soundjay.com/buttons/sounds/button-02.mp3',
  hotel: 'https://www.soundjay.com/buttons/sounds/button-03.mp3',
  bus: 'https://www.soundjay.com/buttons/sounds/button-04.mp3',
  train: 'https://www.soundjay.com/buttons/sounds/button-04.mp3',
  ship: 'https://www.soundjay.com/buttons/sounds/button-01.mp3',
  aeroplane: 'https://www.soundjay.com/buttons/sounds/button-02.mp3',
  submarine: 'https://www.soundjay.com/buttons/sounds/button-01.mp3',
  rocket: 'https://www.soundjay.com/buttons/sounds/button-03.mp3',
};

// Throttled sound system — max 1 sound per SOUND_THROTTLE_MS to prevent audio overload
let lastSoundTime = 0;
const SOUND_THROTTLE_MS = 200;
// Pre-loaded sound instances (created once, replayed)
let coinSound: any = null;
let boxSound: any = null;
let skullSound: any = null;
let soundsInitialized = false;

async function initSounds() {
  if (soundsInitialized) return;
  soundsInitialized = true; // prevent re-entry immediately
  try { const c = await Audio.Sound.createAsync({ uri: COIN_SOUND_URL }, { volume: 0.5 }); coinSound = c.sound; } catch (_) {}
  try { const b = await Audio.Sound.createAsync({ uri: BOX_SOUND_URL }, { volume: 0.6 }); boxSound = b.sound; } catch (_) {}
  try { const s = await Audio.Sound.createAsync({ uri: SKULL_SOUND_URL }, { volume: 0.5 }); skullSound = s.sound; } catch (_) {}
}

async function playAudioEffect(type: 'coin' | 'box' | 'skull') {
  const now = Date.now();
  if (now - lastSoundTime < SOUND_THROTTLE_MS) return;
  lastSoundTime = now;
  try {
    const sound = type === 'box' ? boxSound : type === 'skull' ? skullSound : coinSound;
    if (sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (e) {
    // Replay failed — silently skip
  }
}

const REWARD_TYPES = [
  { type: 'coin' as const, value: 10, weight: 15 },
  { type: 'coin' as const, value: 25, weight: 10 },
  { type: 'coin' as const, value: 50, weight: 5 },
  { type: 'diamond' as const, value: 100, weight: 4 },
  { type: 'diamond' as const, value: 200, weight: 1 },
  { type: 'note' as const, value: 500, weight: 65 }, // Major proportion is cash notes (65% probability)
  { type: 'skull' as const, value: -50, weight: 5 }, // Penalty skull obstacle
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
  type: 'coin' | 'diamond' | 'note' | 'skull' | 'box';
  value: number;
  x: number;
  startDelay: number;
}

interface LooterScore {
  uid: string;
  name: string;
  avatar?: string;
  score: number;
}

function FallingReward({
  item,
  onCollect,
  collected,
  isFrenzy,
}: {
  item: FallingItem;
  onCollect: (x: number, y: number, value: number, type: 'coin' | 'diamond' | 'note' | 'skull' | 'box', itemId: string) => void;
  collected: boolean;
  isFrenzy: boolean;
}) {
  const yPos = useRef(new Animated.Value(ANIMATION_BOTTOM_Y)).current; // Spawns and starts falling exactly below the animation (ANIMATION_BOTTOM_Y)
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const xPos = useRef(item.x).current;

  useEffect(() => {
    if (collected) return;
    
    // Boxes fall slightly slower to be distinguished and easily clickable
    const isBox = item.type === 'box';
    const baseDuration = isBox ? 3000 : (isFrenzy ? 1200 : 2200);
    const randomDuration = isBox ? 800 : (isFrenzy ? 400 : 1000);
    const fallDuration = baseDuration + Math.random() * randomDuration;
    
    Animated.parallel([
      Animated.timing(yPos, {
        toValue: GAME_HEIGHT - 90,
        duration: fallDuration,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: 1,
            duration: 350 + Math.random() * 300,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 350 + Math.random() * 300,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Natural opacity fadeout at the bottom to avoid abrupt clipping inside the screen boundaries
    const fadeOutDelay = fallDuration - 350;
    const t = setTimeout(() => {
      if (!collected) {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, fadeOutDelay);

    return () => clearTimeout(t);
  }, [isFrenzy, collected]);

  const handlePress = () => {
    if (collected) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.6, friction: 3, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    onCollect(xPos, GAME_HEIGHT / 2, item.value, item.type, item.uid);
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
        // Expanded hitSlop padding makes fast-moving item touches highly responsive and lag-free
        hitSlop={{ top: 22, bottom: 22, left: 22, right: 22 }}
        style={{ width: item.type === 'box' ? 80 : 56, height: item.type === 'box' ? 80 : 56, alignItems: 'center', justifyContent: 'center' }}
      >
        {item.type === 'coin' && <GoldenCoin size={38} />}
        {item.type === 'diamond' && <PremiumDiamond size={34} />}
        {item.type === 'note' && (
          /* Realistic US Dollar note style layout */
          <View style={{ width: 56, height: 30, backgroundColor: '#85bb65', borderRadius: 2, borderWidth: 1.5, borderColor: '#2e5618', padding: 1, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 }}>
            {/* Fine border inside the note */}
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#1b3f09', borderRadius: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {/* Corner mini dollar signs */}
              <Text style={{ position: 'absolute', top: 0, left: 1, fontSize: 5, fontWeight: 'bold', color: '#1b3f09' }}>$</Text>
              <Text style={{ position: 'absolute', top: 0, right: 1, fontSize: 5, fontWeight: 'bold', color: '#1b3f09' }}>$</Text>
              <Text style={{ position: 'absolute', bottom: 0, left: 1, fontSize: 5, fontWeight: 'bold', color: '#1b3f09' }}>$</Text>
              <Text style={{ position: 'absolute', bottom: 0, right: 1, fontSize: 5, fontWeight: 'bold', color: '#1b3f09' }}>$</Text>
              
              {/* Center Oval vignette (US President portrait area) */}
              <View style={{ width: 22, height: 18, borderRadius: 9, backgroundColor: '#e2efda', borderWidth: 0.75, borderColor: '#4d7c0f', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '900', marginTop: -1 }}>$</Text>
              </View>
            </View>
          </View>
        )}
        {item.type === 'skull' && (
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#7f1d1d', borderWidth: 1.5, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 }}>
            <Text style={{ fontSize: 18 }}>💀</Text>
          </View>
        )}
        {item.type === 'box' && (
          <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center', shadowColor: '#facc15', shadowOpacity: 0.7, shadowRadius: 12 }}>
            <Text style={{ fontSize: 54 }}>🎁</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface LootingRoomProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  levelIndex?: number;
  isOwner?: boolean;
}

export function LootingRoom({ visible, onClose, roomId, levelIndex, isOwner }: LootingRoomProps) {
  const firestore = useFirestore();
  const database = useDatabase();
  const { user } = useUser();
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [floatingPops, setFloatingPops] = useState<FloatingPop[]>([]);
  const [confettiPieces, setConfettiPieces] = useState<Confetti[]>([]);
  const [leaderboardScores, setLeaderboardScores] = useState<LooterScore[]>([]);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [profileName, setProfileName] = useState<string>('');
  const collectedItemsRef = useRef<Set<string>>(new Set());
  const comboCountRef = useRef(0);

  const popIdRef = useRef(0);
  const confettiIdRef = useRef(0);
  const lastCollectTimeRef = useRef<number>(0);
  const accumulatedScoreRef = useRef(0);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const isFrenzy = timeLeft <= 10 && timeLeft > 0;
  const levelKey = levelIndex !== undefined ? LEVEL_KEYS[levelIndex] || 'home' : 'home';

  // Dynamic Level Threshold and Reward Pool (2x Threshold Pool)
  const currentThreshold = levelIndex !== undefined ? THRESHOLD_MAP[levelIndex] || 10000000 : 10000000;
  const rewardPool = currentThreshold * 2;

  // Listen directly to Firestore User Document to fetch latest updated user username
  useEffect(() => {
    if (!visible || !firestore || !user?.uid) {
      setProfileName('');
      return;
    }
    const userRef = doc(firestore, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      if (data && data.username) {
        setProfileName(data.username);
      } else if (data && data.name) {
        setProfileName(data.name);
      } else {
        setProfileName(user.displayName || 'Looter');
      }
    }, () => {
      setProfileName(user.displayName || 'Looter');
    });
    return () => unsub();
  }, [visible, firestore, user?.uid]);

  // Verify entry eligibility from RTD
  useEffect(() => {
    if (!visible || !database || !roomId || !user?.uid || levelIndex === undefined) {
      setIsAuthorized(null);
      return;
    }

    if (isOwner) {
      setIsAuthorized(true);
      return;
    }

    const rtdbPath = `rooms/${roomId}/lootGates/${levelIndex}/entries`;
    const unsub = onValue(databaseRef(database, rtdbPath), (snap: any) => {
      const val = snap.val();
      if (!val) {
        setIsAuthorized(false);
        return;
      }
      
      let isUserJoined = false;
      if (Array.isArray(val)) {
        isUserJoined = val.includes(user.uid);
      } else if (typeof val === 'object') {
        if (val[user.uid] !== undefined) {
          isUserJoined = true;
        } else {
          isUserJoined = Object.values(val).includes(user.uid);
        }
      }
      setIsAuthorized(isUserJoined);
    }, (err) => {
      setIsAuthorized(false);
    });
    return () => unsub();
  }, [visible, database, roomId, levelIndex, user?.uid, isOwner]);

  // Subscribe to real-time participant scores
  useEffect(() => {
    if (!visible || !database || !roomId || levelIndex === undefined || isAuthorized !== true) {
      setLeaderboardScores([]);
      return;
    }

    const scoresPath = `rooms/${roomId}/lootGates/${levelIndex}/scores`;
    const scoresRef = databaseRef(database, scoresPath);
    const unsubScores = onValue(scoresRef, (snap) => {
      const val = snap.val();
      if (val) {
        const scoresList = Object.values(val) as LooterScore[];
        scoresList.sort((a, b) => b.score - a.score);
        setLeaderboardScores(scoresList);
      }
    });

    return () => unsubScores();
  }, [visible, database, roomId, levelIndex, isAuthorized]);

  // Initialize and Countdown Timer
  useEffect(() => {
    if (!visible || isAuthorized !== true) {
      setItems([]);
      setScore(0);
      setTimeLeft(SESSION_DURATION);
      setFloatingPops([]);
      setConfettiPieces([]);
      setShowResultPopup(false);
      comboCountRef.current = 0;
      collectedItemsRef.current = new Set();
      accumulatedScoreRef.current = 0;
      lastCollectTimeRef.current = 0;
      return;
    }

    // Initialize sound system and play level start sound
    initSounds().then(() => {
      playAudioEffect('box');
    });

    // Moderate initial fall to prevent start lag (15 items)
    const initialItems: FallingItem[] = Array.from({ length: 15 }, (_, i) => {
      const r = pickReward();
      return {
        uid: `init_${Date.now()}_${i}`,
        type: r.type,
        value: r.value,
        x: Math.random() * (width - 60),
        startDelay: i * 30,
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
  }, [visible, isAuthorized]);

  // Handle optimized dynamic spawn rate (Continuous rain, 2 items every 250ms)
  // Balanced for smooth 60 FPS with responsive touch on all devices
  useEffect(() => {
    if (!visible || isAuthorized !== true || timeLeft === 0) return;
    const spawnInterval = setInterval(() => {
      setItems((prev) => {
        const batch: FallingItem[] = Array.from({ length: 2 }, () => {
          const r = pickReward();
          return {
            uid: `spawn_${Date.now()}_${Math.random()}`,
            type: r.type,
            value: r.value,
            x: Math.random() * (width - 60),
            startDelay: 0,
          };
        });
        const next = [...prev, ...batch];
        return next.length > MAX_ITEMS ? next.slice(next.length - MAX_ITEMS) : next;
      });
    }, 250);

    return () => clearInterval(spawnInterval);
  }, [visible, timeLeft === 0, isAuthorized]);

  // Spawn 3-4 treasure boxes every 5 seconds (5s, 10s, 15s, 20s, 25s, 30s)
  useEffect(() => {
    if (!visible || isAuthorized !== true || timeLeft === 0) return;
    // Trigger check every 5 seconds
    if (timeLeft % 5 === 0 && timeLeft < SESSION_DURATION) {
      const newBoxes: FallingItem[] = Array.from({ length: 3 + Math.floor(Math.random() * 2) }, (_, i) => ({
        uid: `box_${Date.now()}_${i}_${Math.random()}`,
        type: 'box',
        value: Math.floor(10000000 + Math.random() * 40000000), // Random 1 Crore to 5 Crore
        x: Math.random() * (width - 80),
        startDelay: i * 150,
      }));
      setItems((prev) => [...prev, ...newBoxes]);
    }
  }, [timeLeft, visible, isAuthorized]);

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
    (x: number, y: number, value: number, type: 'coin' | 'diamond' | 'note' | 'skull' | 'box', itemId: string) => {
      if (collectedItemsRef.current.has(itemId)) return;
      collectedItemsRef.current.add(itemId);
      let earnedCoins = value;
      let floatingColor = '#fbbf24';

      // Play corresponding collection sound effect (throttled, max 1 per 200ms)
      playAudioEffect(type === 'box' ? 'box' : type === 'skull' ? 'skull' : 'coin');

      if (value > 0) {
        if (type !== 'box') {
          const now = Date.now();
          const diff = now - lastCollectTimeRef.current;
          let newCombo = 1;
          if (diff <= 800) {
            newCombo = comboCountRef.current + 1;
          }
          comboCountRef.current = newCombo;
          lastCollectTimeRef.current = now;

          const comboMult = 1 + Math.min(Math.floor(newCombo / 3) * 0.5, 4.0);
          const frenzyMult = isFrenzy ? 2 : 1;

          earnedCoins = Math.round(value * comboMult * frenzyMult);
        }
      } else {
        comboCountRef.current = 0;
        lastCollectTimeRef.current = 0;
        floatingColor = '#f87171';
      }

      setScore((s) => s + earnedCoins);
      accumulatedScoreRef.current += earnedCoins;

      const popId = popIdRef.current++;
      const anim = new Animated.Value(1);
      
      // Format 1 Cr to 5 Cr pop text nicely
      let displayText = '';
      if (type === 'box') {
        displayText = `+${(value / 10000000).toFixed(1)} Cr`;
        floatingColor = '#facc15';
      } else {
        displayText = earnedCoins > 0 ? `+${earnedCoins}` : `${earnedCoins}`;
      }

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

  // Compute final distributed proportional share of the threshold pool
  const getProportionalShare = useCallback((uid: string) => {
    const totalRawScore = leaderboardScores.reduce((sum, item) => sum + item.score, 0);
    const targetObj = leaderboardScores.find(item => item.uid === uid);
    const targetRawScore = targetObj ? targetObj.score : (uid === user?.uid ? accumulatedScoreRef.current : 0);

    if (totalRawScore <= 0) {
      return 0; // Return 0 if there are no raw scores to split the pool
    }

    // Distribute the 2x Threshold dynamic rewardPool proportionally
    return Math.round((targetRawScore / totalRawScore) * rewardPool);
  }, [leaderboardScores, rewardPool, user?.uid]);

  const handleAutoClose = useCallback(() => {
    if (firestore && user?.uid && isAuthorized === true) {
      // Calculate real proportional share of the threshold pool
      const poolShare = getProportionalShare(user.uid);
      const rawLootScore = accumulatedScoreRef.current;
      
      // Sum BOTH values as requested: pool reward + direct tapped score
      const finalCoinsReward = poolShare + rawLootScore;

      if (finalCoinsReward > 0) {
        // Real write operation crediting both distributed coins + tapped score to user's wallet
        updateDocumentNonBlocking(
          doc(firestore, 'users', user.uid),
          { 'wallet.coins': increment(finalCoinsReward) }
        );
        updateDocumentNonBlocking(
          doc(firestore, 'users', user.uid, 'profile', user.uid),
          { 'wallet.coins': increment(finalCoinsReward) }
        );
      }
    }
    onClose();
  }, [onClose, firestore, user, isAuthorized, getProportionalShare]);

  // Sync final score to RTDB and trigger exactly ONE 5-second close timer
  useEffect(() => {
    if (visible && isAuthorized === true && timeLeft === 0 && !showResultPopup) {
      // Record user score to Realtime Database so other room participants can see it
      if (database && roomId && levelIndex !== undefined && user?.uid) {
        const userScoreRef = databaseRef(database, `rooms/${roomId}/lootGates/${levelIndex}/scores/${user.uid}`);
        rtdbSet(userScoreRef, {
          uid: user.uid,
          name: profileName || user.displayName || 'Looter',
          avatar: user.photoURL || '',
          score: accumulatedScoreRef.current
        }).catch(err => console.log('RTDB Score Sync Failed:', err));
      }

      // Display the multiplayer leaderboard popup
      setShowResultPopup(true);
    }
  }, [timeLeft, visible, isAuthorized, database, roomId, levelIndex, user, profileName, showResultPopup]);

  // Separate robust timer that auto-closes result popup after 5 seconds
  const handleAutoCloseRef = useRef(handleAutoClose);
  handleAutoCloseRef.current = handleAutoClose;

  useEffect(() => {
    if (showResultPopup) {
      const timer = setTimeout(() => {
        handleAutoCloseRef.current();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showResultPopup]);

  const isEnding = timeLeft === 0;

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      {/* Container is bottom sheet with transparent background */}
      <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}>
        
        {isAuthorized === null && (
          <View style={{ height: GAME_HEIGHT, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Checking eligibility...</Text>
          </View>
        )}

        {isAuthorized === false && (
          <View style={{ height: GAME_HEIGHT, backgroundColor: 'rgba(17,7,36,0.95)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 2, borderTopColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <ShieldAlert size={48} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: '900', marginTop: 16 }}>Access Denied</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
              You are not registered in the entry queue for this Loot Gate level. Only successfully joined participants can play.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAuthorized === true && (
          <View style={{ height: GAME_HEIGHT, backgroundColor: 'transparent', overflow: 'visible' }}>
            
            {/* Position the detailed animation at the top of the sheet container (top: -30) */}
            <View style={{ position: 'absolute', top: -30, left: 0, right: 0, alignItems: 'center', zIndex: 5, overflow: 'visible' }}>
              <LootLevelAnimation 
                visible={visible} 
                asComponent={true} 
                levelName={levelKey} 
                onComplete={() => {}} 
              />
            </View>

            {/* Falling items viewport area */}
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
                    Session ended! Calculating rewards...
                  </Text>
                </View>
              </View>
            )}

            {/* Multiplayer Leaderboard Popup (Show for 5 seconds after session ends) */}
            {/* Set background to transparent overlay with soft dimming (rgba(0,0,0,0.45)) so chat room is visible */}
            {showResultPopup && (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
                <View style={{ width: '96%', maxHeight: '80%', backgroundColor: 'rgba(30, 16, 56, 0.98)', borderRadius: 24, borderWidth: 2, borderColor: '#fbbf24', padding: 16, alignItems: 'center', shadowColor: '#fbbf24', shadowOpacity: 0.3, shadowRadius: 15 }}>
                  
                  {/* Leaderboard Icon & Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <Trophy color="#fbbf24" size={28} />
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Loot Results
                    </Text>
                  </View>

                  {/* Dynamic Threshold dynamic pool details */}
                  <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
                    Distributed from {rewardPool.toLocaleString()} Coins Pool!
                  </Text>

                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Closing in 5 seconds...
                  </Text>

                  {/* Participant List */}
                  <ScrollView style={{ width: '100%', marginBottom: 5 }} showsVerticalScrollIndicator={false}>
                    {leaderboardScores.map((item, index) => {
                      const isMe = item.uid === user?.uid;
                      const poolShare = getProportionalShare(item.uid);
                      const rawLoot = item.score;
                      const totalWon = poolShare + rawLoot;

                      return (
                        <View
                          key={item.uid}
                          style={{
                            backgroundColor: isMe ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                            borderWidth: 1,
                            borderColor: isMe ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: 12,
                            marginBottom: 8
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {/* Rank */}
                              <Text style={{ color: index === 0 ? '#fbbf24' : (index === 1 ? '#cbd5e1' : '#94a3b8'), fontSize: 15, fontWeight: 'bold', width: 22 }}>
                                #{index + 1}
                              </Text>

                              {/* Avatar */}
                              {item.avatar ? (
                                <Image source={{ uri: item.avatar }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#a855f7' }} />
                              ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#581c87', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{item.name[0]?.toUpperCase()}</Text>
                                </View>
                              )}

                              {/* Username */}
                              <Text style={{ color: isMe ? '#fbbf24' : '#fff', fontSize: 14, fontWeight: isMe ? 'bold' : '500' }} numberOfLines={1}>
                                {item.name} {isMe && '(You)'}
                              </Text>
                            </View>

                            {/* Total Won Payout */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Text style={{ color: '#facc15', fontSize: 15, fontWeight: 'bold' }}>
                                +{totalWon.toLocaleString()}
                              </Text>
                              <GoldenCoin size={15} />
                            </View>
                          </View>

                          {/* Breakdown display */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 6 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                              🎯 Tapped: +{rawLoot.toLocaleString()}
                            </Text>
                            <Text style={{ color: '#a855f7', fontSize: 11, fontWeight: '600' }}>
                              🎁 Pool Share: +{poolShare.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                    {leaderboardScores.length === 0 && (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#94a3b8' }}>No participant score recorded</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({});
