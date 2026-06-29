import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Modal, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Unlock, Zap, X } from 'lucide-react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Ellipse,
  G,
  Path,
  Circle,
  Polygon,
  Rect,
  Line,
  Text as SvgText,
  Filter,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode
} from 'react-native-svg';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '../../firebase/provider';
import { doc, updateDoc, onSnapshot, collection } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { TopSupporter } from '../../lib/types';
import { RocketLevelSection } from '../loot/rocket-level-section';
import { LootLevelAnimation } from './loot-level-animation';
import { GoldenCoin } from '../GoldenCoin';
import { AvatarFrame } from '../profile/AvatarFrame';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface LootLevel {
  id: string; name: string; threshold: number; image: string; animation: string; voice: string;
}

interface LootBoxDisplayProps {
  onOpenGate?: (gateIndex: number) => void;
  onGateReady?: (gateIndex: number, levelName: string) => void;
  roomId: string;
  topSupporters?: TopSupporter[];
  isOwner?: boolean;
}

const LEVEL_ICONS: Record<string, string> = {
  home: '🏠', bank: '🏦', car: '🚗', hotel: '🏨', bus: '🚌', train: '🚂', ship: '🚢', aeroplane: '✈️', submarine: '⚓', rocket: '🚀',
};

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

const DEFAULT_LEVELS: LootLevel[] = [
  { id: 'home', name: 'Home', threshold: 10000000, image: '', animation: '', voice: '' },
  { id: 'bank', name: 'Bank', threshold: 30000000, image: '', animation: '', voice: '' },
  { id: 'car', name: 'Car', threshold: 50000000, image: '', animation: '', voice: '' },
  { id: 'hotel', name: 'Hotel', threshold: 80000000, image: '', animation: '', voice: '' },
  { id: 'bus', name: 'Bus', threshold: 90000000, image: '', animation: '', voice: '' },
  { id: 'train', name: 'Train', threshold: 120000000, image: '', animation: '', voice: '' },
  { id: 'ship', name: 'Ship', threshold: 130000000, image: '', animation: '', voice: '' },
  { id: 'aeroplane', name: 'Aeroplane', threshold: 150000000, image: '', animation: '', voice: '' },
  { id: 'submarine', name: 'Submarine', threshold: 180000000, image: '', animation: '', voice: '' },
  { id: 'rocket', name: 'Rocket', threshold: 220000000, image: '', animation: '', voice: '' },
];

export function LootBoxDisplay({ onOpenGate, onGateReady, roomId, topSupporters = [], isOwner = false }: LootBoxDisplayProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showPath, setShowPath] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const readyAnim = useRef(new Animated.Value(1)).current;
  const lightning1Opacity = useRef(new Animated.Value(0)).current;
  const lightning2Opacity = useRef(new Animated.Value(0)).current;
  
  // Premium Mansion animation states
  const auraRotateAnim = useRef(new Animated.Value(0)).current;
  const beamPulseAnim = useRef(new Animated.Value(0.4)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      y: new Animated.Value(340),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current;

  // Scene glow scale animation (matching HTML .sceneGlow)
  const sceneGlowAnim = useRef(new Animated.Value(0.92)).current;

  const [previewLevelName, setPreviewLevelName] = useState<string | undefined>(undefined);
  const [showPreviewAnimation, setShowPreviewAnimation] = useState(false);
  
  // Continuous Rocket exhaust flame animation value
  const rocketFlameAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Initialize loop for rocket flame and continuous mansion float
  useEffect(() => {
    Animated.loop(
      Animated.timing(rocketFlameAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false, // SVG paths coordinates interpolation requires false
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [rocketFlameAnim, floatAnim]);

  const firestore = useFirestore();
  const { user } = useUser();
  const roomRef = useMemoFirebase(() => !firestore || !roomId ? null : doc(firestore, 'chatRooms', roomId), [firestore, roomId]);
  const { data: room } = useDoc<any>(roomRef);
  const lootConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'appConfig', 'lootSettings'), [firestore]);
  const { data: lootConfig } = useDoc<any>(lootConfigRef);

  const userDocRef = useMemoFirebase(
    () => (!firestore || !user?.uid ? null : doc(firestore, 'users', user.uid)),
    [firestore, user?.uid]
  );
  const { data: userDoc } = useDoc<any>(userDocRef);

  const serverLevels = lootConfig?.levels || [];
  const levels = serverLevels.length >= DEFAULT_LEVELS.length
    ? serverLevels
    : [
        ...serverLevels,
        ...DEFAULT_LEVELS.slice(serverLevels.length)
      ];
  const currentProgress = room?.stats?.dailyGifts || 0;

  const [storeItems, setStoreItems] = useState<any[]>([]);
  const dbInstance = useFirestore();

  useEffect(() => {
    if (!dbInstance) return;
    const unsub = onSnapshot(collection(dbInstance, 'storeItems'), (snap: any) => {
      if (snap) {
        setStoreItems(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }
    }, () => {});
    return () => unsub();
  }, [dbInstance]);

  const [timeLeftVal, setTimeLeftVal] = useState({ hours: '23', minutes: '59', seconds: '59' });

  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      
      setTimeLeftVal({
        hours: String(hh).padStart(2, '0'),
        minutes: String(mm).padStart(2, '0'),
        seconds: String(ss).padStart(2, '0')
      });
    };
    calcTime();
    const tId = setInterval(calcTime, 1000);
    return () => clearInterval(tId);
  }, []);

  const [completedGateLevels, setCompletedGateLevels] = useState<Record<number, boolean>>({});
  const lootInitializedRef = useRef(false);
  const gateFiredRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    const savedFired = userDoc?.lootProgress?.[roomId]?.gateFired;
    if (savedFired && !gateFiredRef.current[0]) {
      Object.keys(savedFired).forEach((k) => {
        gateFiredRef.current[Number(k)] = savedFired[k];
      });
    }
  }, [userDoc, roomId]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  const lastLevelThreshold = levels[levels.length - 1]?.threshold || 150000000;
  const effProgress = currentProgress % lastLevelThreshold;

  useEffect(() => {
    const saved = userDoc?.lootProgress?.[roomId]?.completedGates;
    if (saved && !lootInitializedRef.current) {
      setCompletedGateLevels(saved);
      lootInitializedRef.current = true;
    }
  }, [userDoc, roomId]);

  // Find the NEXT uncompleted level whose threshold is met
  useEffect(() => {
    if (levels.length === 0) return;

    let nextGateIdx = -1;
    for (let i = 0; i < levels.length; i++) {
      if (effProgress >= levels[i].threshold && !completedGateLevels[i]) {
        nextGateIdx = i;
        break;
      }
    }

    if (nextGateIdx === -1) {
      let highestCompleted = -1;
      for (let i = 0; i < levels.length; i++) {
        if (completedGateLevels[i]) highestCompleted = i;
      }
      nextGateIdx = Math.min(highestCompleted + 1, levels.length - 1);
    }

    if (nextGateIdx !== currentLevelIndex) {
      setCurrentLevelIndex(nextGateIdx);
    }
  }, [currentProgress, levels, completedGateLevels]);

  const curLevel = levels[currentLevelIndex] || levels[0];
  const nextLevel = levels[currentLevelIndex + 1];
  const progressPct = nextLevel
    ? Math.min(Math.max(((effProgress - curLevel.threshold) / (nextLevel.threshold - curLevel.threshold)) * 100, 0), 100)
    : effProgress >= curLevel.threshold ? 100 : 0;

  const canOpenGate = effProgress >= curLevel.threshold;
  const isGateCompleted = !!completedGateLevels[currentLevelIndex];
  const shouldFireGate = canOpenGate && !isGateCompleted;

  // AUTO-FIRE: When threshold is first reached, notify parent to open gate
  useEffect(() => {
    if (shouldFireGate && !gateFiredRef.current[currentLevelIndex]) {
      gateFiredRef.current[currentLevelIndex] = true;
      onGateReady?.(currentLevelIndex, curLevel.name);
      if (firestore && user?.uid) {
        updateDoc(
          doc(firestore, 'users', user.uid),
          { [`lootProgress.${roomId}.gateFired.${currentLevelIndex}`]: true }
        ).catch(() => {});
      }
    }
  }, [shouldFireGate, currentLevelIndex, curLevel.name]);

  // Auto scrolling
  useEffect(() => {
    if (canOpenGate && !isGateCompleted) { setActiveIndex(currentLevelIndex); return; }
    if (showPath) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setActiveIndex(p => (p + 1) % levels.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [levels.length, canOpenGate, isGateCompleted, currentLevelIndex, showPath, fadeAnim]);

  // Pulse on unlock
  useEffect(() => {
    if (canOpenGate && !isGateCompleted) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])).start();
    } else { pulseAnim.setValue(1); }
  }, [canOpenGate, isGateCompleted]);

  const activeLevel = levels[activeIndex] || levels[0];

  // "READY" text pulse
  useEffect(() => {
    if (shouldFireGate) {
      Animated.loop(Animated.sequence([
        Animated.timing(readyAnim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.timing(readyAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])).start();
    } else { readyAnim.setValue(1); }
  }, [shouldFireGate]);

  // Lightning crackle loop for Car
  useEffect(() => {
    let active = true;
    const runLightning = () => {
      if (!active) return;
      Animated.sequence([
        Animated.delay(Math.random() * 400 + 200),
        Animated.timing(lightning1Opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(lightning1Opacity, { toValue: 0.2, duration: 30, useNativeDriver: true }),
        Animated.timing(lightning1Opacity, { toValue: 0.8, duration: 40, useNativeDriver: true }),
        Animated.timing(lightning1Opacity, { toValue: 0, duration: 60, useNativeDriver: true }),
        Animated.delay(Math.random() * 500 + 200),
        Animated.timing(lightning2Opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(lightning2Opacity, { toValue: 0.3, duration: 40, useNativeDriver: true }),
        Animated.timing(lightning2Opacity, { toValue: 0.7, duration: 40, useNativeDriver: true }),
        Animated.timing(lightning2Opacity, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start(() => {
        if (active) runLightning();
      });
    };

    if (activeLevel?.id === 'car' || activeLevel?.id === 'home') {
      runLightning();
    } else {
      lightning1Opacity.setValue(0);
      lightning2Opacity.setValue(0);
    }

    return () => {
      active = false;
    };
  }, [activeLevel?.id]);

  // Ambient effects loop for Mansion, Bank, Hotel, Bus, Train, and Rocket Levels
  useEffect(() => {
    if (
      activeLevel?.id !== 'home' &&
      activeLevel?.id !== 'bank' &&
      activeLevel?.id !== 'hotel' &&
      activeLevel?.id !== 'bus' &&
      activeLevel?.id !== 'train' &&
      activeLevel?.id?.toLowerCase() !== 'rocket'
    ) {
      auraRotateAnim.setValue(0);
      orbitAnim.setValue(0);
      beamPulseAnim.setValue(0.4);
      particles.forEach((p) => {
        p.opacity.setValue(0);
      });
      return;
    }

    // Rocket level doesn't need aura and orbit rotate animations
    const auraLoop = Animated.loop(
      Animated.timing(auraRotateAnim, {
        toValue: 1,
        duration: 16000,
        useNativeDriver: true,
      })
    );
    auraLoop.start();

    const orbitLoop = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: true,
      })
    );
    orbitLoop.start();

    const beamLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamPulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(beamPulseAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    );
    beamLoop.start();

    // Staggered floating particles
    const particleStopCallbacks: Array<() => void> = [];
    particles.forEach((p, idx) => {
      let active = true;
      const animateSingleParticle = () => {
        if (!active) return;
        p.y.setValue(260); // Float relative to platform base height
        p.x.setValue(Math.random() * 260 - 130);
        p.opacity.setValue(0);
        p.scale.setValue(Math.random() * 0.7 + 0.3);

        Animated.sequence([
          Animated.delay(idx * 500 + Math.random() * 400),
          Animated.parallel([
            Animated.timing(p.y, {
              toValue: -20 - Math.random() * 60,
              duration: 3500 + Math.random() * 1500,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: Math.random() * 0.5 + 0.4, duration: 800, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0, duration: 2700, useNativeDriver: true }),
            ]),
          ]),
        ]).start(() => {
          if (active) animateSingleParticle();
        });
      };

      animateSingleParticle();
      particleStopCallbacks.push(() => { active = false; });
    });

      // Scene glow pulse loop (matching HTML .sceneGlow)
      const sceneGlowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sceneGlowAnim, { toValue: 1.08, duration: 1700, useNativeDriver: true }),
          Animated.timing(sceneGlowAnim, { toValue: 0.92, duration: 1700, useNativeDriver: true }),
        ])
      );
      sceneGlowLoop.start();

    return () => {
      auraLoop.stop();
      orbitLoop.stop();
      beamLoop.stop();
      sceneGlowLoop.stop();
      particleStopCallbacks.forEach((cb) => cb());
    };
  }, [activeLevel?.id]);

  let displayPct = 0;
  if (activeIndex < currentLevelIndex) displayPct = 100;
  else if (activeIndex === currentLevelIndex) displayPct = Math.round(progressPct);
  else displayPct = 0;

  const isCurrentActive = activeIndex === currentLevelIndex;
  const isGateLocked = isCurrentActive && canOpenGate && !isGateCompleted;

  const handleOpenGateClick = () => {
    const newCompleted = { ...completedGateLevels, [currentLevelIndex]: true };
    setCompletedGateLevels(newCompleted);
    
    // First close the selector path panel modal smoothly
    setShowPath(false);

    // Run the next modal display callback inside a minor delay to avoid UI thread block/deadlock
    setTimeout(() => {
      onOpenGate?.(currentLevelIndex);
    }, 350);

    if (firestore && user?.uid) {
      updateDoc(
        doc(firestore, 'users', user.uid),
        { [`lootProgress.${roomId}.completedGates`]: newCompleted }
      ).catch(() => {});
    }
  };

  const renderCenterStageContent = () => {
    if (activeLevel?.id === 'home') {
      const o1X = orbitAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [-120, 0, 120, 0, -120],
      });
      const o1Y = orbitAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, -20, 0, 20, 0],
      });

      const o2X = orbitAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [120, 0, -120, 0, 120],
      });
      const o2Y = orbitAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, 20, 0, -20, 0],
      });

      const o3X = orbitAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, -120, 0, 120, 0],
      });
      const o3Y = orbitAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [20, 0, -20, 0, 20],
      });

      return (
        /* Isometric Royal Mansion for Home level - Clean look with smooth floating/jumping animation */
        <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }], alignItems: 'center', justifyContent: 'center', width: 350, height: 350, position: 'relative' }}>
          {/* THE CORE MANSION SVG */}
          <View style={{ width: 320, height: 320, zIndex: 10 }}>
            <Svg width="320" height="320" viewBox="0 0 390 390" style={{ overflow: 'visible' }}>
              <Defs>
                <Filter id="glowOrange" x="-30%" y="-30%" width="160%" height="160%">
                  <FeGaussianBlur stdDeviation="4" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
                <Filter id="glowCyan" x="-30%" y="-30%" width="160%" height="160%">
                  <FeGaussianBlur stdDeviation="3" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
                <SvgLinearGradient id="baseTop" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#2e0854" />
                  <Stop offset="100%" stopColor="#090014" />
                </SvgLinearGradient>
                <SvgLinearGradient id="baseSide" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4c1d95" />
                  <Stop offset="100%" stopColor="#0f051d" />
                </SvgLinearGradient>
                <SvgLinearGradient id="wallF" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#ffe699" />
                  <Stop offset="30%" stopColor="#d4af37" />
                  <Stop offset="70%" stopColor="#aa7c11" />
                  <Stop offset="100%" stopColor="#543c08" />
                </SvgLinearGradient>
                <SvgLinearGradient id="wallR" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#ca8a04" />
                  <Stop offset="100%" stopColor="#451a03" />
                </SvgLinearGradient>
                <SvgLinearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#f472b6" />
                  <Stop offset="50%" stopColor="#d946ef" />
                  <Stop offset="100%" stopColor="#701a75" />
                </SvgLinearGradient>
                <SvgLinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#e0f2fe" />
                  <Stop offset="100%" stopColor="#0284c7" />
                </SvgLinearGradient>
              </Defs>
              {/* 🌕 Realistic Crescent Moon with Animated Breathing Moonlight Glow (Behind Mansion) */}
              <AnimatedG style={{
                opacity: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.0] // Soft breathing glow shine
                })
              }}>
                {/* Moon Radial Glow Halo */}
                <Circle cx="320" cy="45" r="40" fill="rgba(254,240,138,0.18)" filter="url(#glowOrange)" />
                <Circle cx="320" cy="45" r="20" fill="rgba(254,240,138,0.25)" />
                {/* Crescent Moon Path */}
                <Path d="M312 30 A 20 20 0 1 0 336 54 A 16 16 0 1 1 312 30 Z" fill="#fef08a" stroke="#fef9c3" strokeWidth={1} />
              </AnimatedG>

              {/* Dynamic Falling Raindrops (Connected to orbit rotation timer for wind-blown raindrop effects) */}
              <AnimatedG transform={(() => {
                const rainY = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 90] });
                return [{ translateY: rainY }, { translateX: -10 }];
              })()}>
                {/* Raindrops distribution */}
                <Line x1="40" y1="20" x2="35" y2="45" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="120" y1="10" x2="115" y2="35" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="280" y1="15" x2="275" y2="40" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="330" y1="30" x2="325" y2="55" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="80" y1="80" x2="75" y2="105" stroke="rgba(165,243,252,0.3)" strokeWidth={1.0} />
                <Line x1="160" y1="70" x2="155" y2="95" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="240" y1="65" x2="235" y2="90" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="300" y1="110" x2="295" y2="135" stroke="rgba(165,243,252,0.3)" strokeWidth={1.0} />
                <Line x1="50" y1="170" x2="45" y2="195" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="110" y1="150" x2="105" y2="175" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
                <Line x1="270" y1="160" x2="265" y2="185" stroke="rgba(165,243,252,0.3)" strokeWidth={1.0} />
                <Line x1="340" y1="180" x2="335" y2="205" stroke="rgba(165,243,252,0.4)" strokeWidth={1.2} />
              </AnimatedG>

              {/* platform */}
              <Ellipse cx="195" cy="305" rx="153" ry="60" fill="rgba(0,0,0,0.55)" />
              <Path d="M58 269 L195 198 L334 269 L195 342 Z" fill="url(#baseTop)" stroke="#ffd700" strokeWidth={4} filter="url(#glowOrange)" />
              <Path d="M58 269 L195 342 L195 362 L58 290 Z" fill="url(#baseSide)" stroke="#d946ef" strokeWidth={2} />
              <Path d="M334 269 L195 342 L195 362 L334 290 Z" fill="#090014" stroke="#d946ef" strokeWidth={2} />
              <Path d="M83 269 L195 212 L309 269 L195 329 Z" fill="rgba(217,70,239,0.08)" stroke="#fbbf24" strokeWidth={2} />
              <Path d="M101 270 L195 224 L291 270 L195 319 Z" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" strokeWidth={1.5} />
              
              {/* main building tier 1 */}
              <G id="villa">
                <Path d="M104 205 L104 142 L195 95 L195 252 Z" fill="url(#wallF)" stroke="#ff9b31" strokeWidth={2.5} />
                <Path d="M195 95 L286 142 L286 205 L195 252 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2.5} />
                <Path d="M104 142 L195 95 L286 142 L195 190 Z" fill="url(#roof)" stroke="#ffd36a" strokeWidth={3} />
                
                {/* tier 2 */}
                <Path d="M134 141 L134 94 L195 63 L195 170 Z" fill="url(#wallF)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M195 63 L256 94 L256 141 L195 170 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M134 94 L195 63 L256 94 L195 128 Z" fill="url(#roof)" stroke="#ffd36a" strokeWidth={2.5} />
                
                {/* tier 3 tower */}
                <Path d="M173 78 L173 36 L210 18 L210 97 Z" fill="url(#wallF)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M210 18 L248 38 L248 78 L210 97 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M173 36 L210 18 L248 38 L210 58 Z" fill="url(#roof)" stroke="#ffd36a" strokeWidth={2.5} />
                
                {/* left wing */}
                <Path d="M78 223 L78 173 L124 150 L124 242 Z" fill="url(#wallF)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M124 150 L164 171 L164 222 L124 242 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M78 173 L124 150 L164 171 L118 197 Z" fill="url(#roof)" stroke="#ffd36a" strokeWidth={2} />
                
                {/* right wing */}
                <Path d="M226 171 L266 150 L312 173 L266 197 Z" fill="url(#roof)" stroke="#ffd36a" strokeWidth={2} />
                <Path d="M226 171 L226 222 L266 242 L266 197 Z" fill="url(#wallF)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M266 197 L312 173 L312 223 L266 242 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2} />
                
                {/* windows front */}
                <G id="windows">
                  <Rect fill="#ffc66a" opacity={0.9} x="122" y="151" width="13" height="22" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="145" y="138" width="13" height="22" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="168" y="126" width="13" height="22" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="144" y="98" width="12" height="18" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="166" y="87" width="12" height="18" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="183" y="44" width="11" height="16" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="92" y="183" width="12" height="19" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="108" y="175" width="12" height="19" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="233" y="128" width="12" height="19" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="257" y="141" width="12" height="19" rx="2" />
                  <Rect fill="#ffc66a" opacity={0.9} x="282" y="184" width="12" height="20" rx="2" />
                </G>
                
                {/* glass balcony */}
                <Path d="M162 183 L195 165 L228 183 L195 201 Z" fill="#50f3ff" opacity={0.72} stroke="#baffff" strokeWidth={1.5} />
                
                {/* 🏰 Structural Gold & Glass Pillars at Entrance (Adds realistic 3D depth) */}
                <Path d="M163 194 L163 246" stroke="url(#baseTop)" strokeWidth={4} />
                <Path d="M163 194 L163 246" stroke="#ffd700" strokeWidth={1.5} />
                <Circle cx="163" cy="194" r="3.5" fill="#ffd700" />
                
                <Path d="M227 194 L227 246" stroke="url(#baseTop)" strokeWidth={4} />
                <Path d="M227 194 L227 246" stroke="#ffd700" strokeWidth={1.5} />
                <Circle cx="227" cy="194" r="3.5" fill="#ffd700" />

                {/* 🏮 Glowing Wall Lanterns (Visual depth anchors) */}
                <G opacity={0.9}>
                  {/* Left wall lantern */}
                  <Line x1="110" y1="130" x2="110" y2="138" stroke="#ffaa00" strokeWidth={2} />
                  <Circle cx="110" cy="138" r="4.5" fill="#ffea70" />
                  <Circle cx="110" cy="138" r="2.5" fill="#fff" />
                  
                  {/* Right wall lantern */}
                  <Line x1="280" y1="130" x2="280" y2="138" stroke="#ffaa00" strokeWidth={2} />
                  <Circle cx="280" cy="138" r="4.5" fill="#ffea70" />
                  <Circle cx="280" cy="138" r="2.5" fill="#fff" />
                </G>

                {/* ⚜️ Golden Spire Peaks on Tower Tops */}
                <Path d="M121 96 L121 78" stroke="#ffd700" strokeWidth={2.5} />
                <Circle cx="121" cy="78" r="3.5" fill="#fff" />

                <Path d="M269 96 L269 78" stroke="#ffd700" strokeWidth={2.5} />
                <Circle cx="269" cy="78" r="3.5" fill="#fff" />

                <Path d="M210 18 L210 2" stroke="#ffd700" strokeWidth={3} />
                <Circle cx="210" cy="2" r="4" fill="#ffea70" />

                {/* gate with gold grids */}
                <G id="gateGroup">
                  <Path d="M169 224 L195 210 L221 224 L195 238 Z" fill="#2c1a12" stroke="#ffd36a" strokeWidth={2} />
                  <Path d="M170 224 L195 211 L195 238 L170 251 Z" fill="#7b4018" stroke="#ffd36a" strokeWidth={2} />
                  <Path d="M195 211 L220 224 L220 251 L195 238 Z" fill="#5d2c13" stroke="#ffd36a" strokeWidth={2} />
                  {/* Gold Grid Ornaments */}
                  <Path d="M176 229 L189 222 M176 238 L189 231 M176 247 L189 240" stroke="#ffd700" strokeWidth={1} />
                  <Path d="M214 229 L201 222 M214 238 L201 231 M214 247 L201 240" stroke="#ffd700" strokeWidth={1} />
                </G>
                
                {/* left vertical royal tower */}
                <Path d="M82 198 L82 116 L121 96 L121 219 Z" fill="url(#wallF)" stroke="#fff0aa" strokeWidth={2} filter="url(#glowOrange)" />
                <Path d="M121 96 L153 113 L153 197 L121 219 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2} />
                <Path d="M82 116 L121 96 L153 113 L114 135 Z" fill="url(#roof)" stroke="#fff0aa" strokeWidth={2.3} filter="url(#glowOrange)" />
                <Rect fill="#fff0a0" x="96" y="134" width="10" height="18" rx="2" filter="url(#glowOrange)" />
                <Rect fill="#fff0a0" x="113" y="125" width="10" height="18" rx="2" filter="url(#glowOrange)" />
                <Rect fill="#fff0a0" x="130" y="135" width="10" height="18" rx="2" filter="url(#glowOrange)" />
                
                {/* right vertical royal tower */}
                <Path d="M237 113 L269 96 L308 116 L269 135 Z" fill="url(#roof)" stroke="#fff0aa" strokeWidth={2.3} filter="url(#glowOrange)" />
                <Path d="M237 113 L237 197 L269 219 L269 135 Z" fill="url(#wallF)" stroke="#fff0aa" strokeWidth={2} filter="url(#glowOrange)" />
                <Path d="M269 135 L308 116 L308 198 L269 219 Z" fill="url(#wallR)" stroke="#ff9b31" strokeWidth={2} />
                <Rect fill="#fff0a0" x="251" y="135" width="10" height="18" rx="2" filter="url(#glowOrange)" />
                <Rect fill="#fff0a0" x="269" y="125" width="10" height="18" rx="2" filter="url(#glowOrange)" />
                <Rect fill="#fff0a0" x="286" y="135" width="10" height="18" rx="2" filter="url(#glowOrange)" />
                
                {/* center grand entrance height */}
                <Path d="M156 226 L195 204 L234 226 L195 249 Z" fill="rgba(255,211,106,0.22)" stroke="#ffd36a" strokeWidth={2} filter="url(#glowOrange)" />
                <Path d="M176 236 L195 224 L214 236 L195 247 Z" fill="rgba(255,255,255,0.24)" stroke="#fff0aa" strokeWidth={1.6} />
                <Path d="M164 214 L164 190 M226 214 L226 190" stroke="#fff0aa" strokeWidth={4} filter="url(#glowOrange)" />
                <Path d="M158 190 L195 171 L232 190" fill="none" stroke="#fff0aa" strokeWidth={2.3} filter="url(#glowOrange)" />
              </G>
              


              {/* 🌪️ Premium Wind Effect Lines (Wired to continuous orbit rotation) */}
              <AnimatedG transform={(() => {
                const windX = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });
                return [{ translateX: windX }];
              })()}>
                <Path d="M 20 60 Q 60 40, 100 60 T 180 50" fill="none" stroke="rgba(180,240,255,0.22)" strokeWidth={1.5} />
                <Path d="M 220 90 Q 260 70, 300 90 T 370 80" fill="none" stroke="rgba(180,240,255,0.18)" strokeWidth={1.2} />
                <Path d="M 40 180 Q 90 160, 140 180 T 220 170" fill="none" stroke="rgba(180,240,255,0.15)" strokeWidth={1.0} />
              </AnimatedG>

              {/* ⚡ Premium Crackling Lightning Bolts (Optimized without heavy CPU SVG filters for 60fps performance) */}
              <AnimatedPath
                d="M 60 10 L 85 80 L 70 95 L 110 160 L 95 168 L 120 220"
                fill="none"
                stroke="#38bdf8"
                strokeWidth={5}
                opacity={Animated.multiply(lightning1Opacity, 0.45)}
              />
              <AnimatedPath
                d="M 60 10 L 85 80 L 70 95 L 110 160 L 95 168 L 120 220"
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.5}
                opacity={lightning1Opacity}
              />

              <AnimatedPath
                d="M 330 15 L 305 90 L 318 105 L 285 180 L 298 190 L 275 250"
                fill="none"
                stroke="#fbbf24"
                strokeWidth={5}
                opacity={Animated.multiply(lightning2Opacity, 0.45)}
              />
              <AnimatedPath
                d="M 330 15 L 305 90 L 318 105 L 285 180 L 298 190 L 275 250"
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.5}
                opacity={lightning2Opacity}
              />
            </Svg>
          </View>

          {/* FLOOR GLOW ELLIPSE (HTML .floor) */}
          <View style={{ position: 'absolute', bottom: 32, width: 280, height: 48, borderRadius: 140, backgroundColor: 'rgba(255,155,49,0.10)' }} pointerEvents="none" />

          {/* 5. AMBIENT JETS AT THE BOTTOM PEDESTAL */}
          <Animated.View style={{ position: 'absolute', left: '26%', bottom: 42, width: 8, height: 35, opacity: beamPulseAnim }} pointerEvents="none">
            <LinearGradient colors={['#fff', '#ffd36a', 'transparent']} style={{ flex: 1, borderRadius: 4 }} />
          </Animated.View>
          <Animated.View style={{ position: 'absolute', right: '26%', bottom: 42, width: 8, height: 35, opacity: beamPulseAnim }} pointerEvents="none">
            <LinearGradient colors={['#fff', '#ffd36a', 'transparent']} style={{ flex: 1, borderRadius: 4 }} />
          </Animated.View>
          {/* Center jet (HTML j3) */}
          <Animated.View style={{ position: 'absolute', left: '44%', bottom: 42, width: 12, height: 65, opacity: beamPulseAnim }} pointerEvents="none">
            <LinearGradient colors={['#fff', '#ffd36a', '#ff9b31', '#ff6600', 'transparent']} style={{ flex: 1, borderRadius: 6 }} />
          </Animated.View>

          {/* 6. FLOATING SPARKS (Drifting Upward) */}
          {particles.map((p, index) => (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index % 3 === 0 ? '#ffd36a' : index % 3 === 1 ? '#ff9b31' : '#27eaff',
                opacity: p.opacity,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale }
                ],
                shadowColor: '#ff9b31',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 5,
                zIndex: 15
              }}
              pointerEvents="none"
            />
          ))}

          {/* 7. ORBITING ENERGY ORBS */}
          <Animated.View style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#ffffff',
            transform: [{ translateX: o1X }, { translateY: o1Y }],
            shadowColor: '#ff9b31',
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 20
          }} pointerEvents="none" />

          <Animated.View style={{
            position: 'absolute',
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: '#ffd36a',
            transform: [{ translateX: o2X }, { translateY: o2Y }],
            shadowColor: '#ff9b31',
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 20
          }} pointerEvents="none" />

          <Animated.View style={{
            position: 'absolute',
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: '#27eaff',
            transform: [{ translateX: o3X }, { translateY: o3Y }],
            shadowColor: '#27eaff',
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 20
          }} pointerEvents="none" />

        </Animated.View>
      );
    }

    if (activeLevel?.id === 'car') {
      return (
        /* Cyber Supercar SVG model - narrow width and taller top-to-bottom size */
        <View style={{ width: 300, height: 320, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ translateY: pulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [0, -1.5] }) }], width: 300, height: 280 }}>
            <Svg width="300" height="280" viewBox="0 0 600 250" style={{ transform: [{ scaleX: 0.75 }, { scaleY: 1.6 }] }}>
              <Defs>
                <SvgLinearGradient id="bodyRed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#ff0c3c" />
                  <Stop offset="35%" stopColor="#dc002b" />
                  <Stop offset="70%" stopColor="#91001a" />
                  <Stop offset="100%" stopColor="#4a000b" />
                </SvgLinearGradient>
                <SvgLinearGradient id="bodyCarbon" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#2a2d32" />
                  <Stop offset="50%" stopColor="#181a1c" />
                  <Stop offset="100%" stopColor="#0a0b0c" />
                </SvgLinearGradient>
                <SvgLinearGradient id="wheelRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#4b5563" />
                  <Stop offset="50%" stopColor="#1f2937" />
                  <Stop offset="100%" stopColor="#111827" />
                </SvgLinearGradient>
                <SvgLinearGradient id="windshieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#0f172a" />
                  <Stop offset="60%" stopColor="#020617" />
                  <Stop offset="100%" stopColor="#1e1b4b" />
                </SvgLinearGradient>
              </Defs>
              <Ellipse cx="300" cy="205" rx="270" ry="18" fill="rgba(0,0,0,0.85)" />
              <G opacity="0.35" transform="scale(1, -0.6) translate(0, -320)">
                <Path d="M50 160 Q80 105 180 95 Q300 80 430 95 Q520 105 560 160 Q565 170 540 180 Q430 195 300 195 Q170 195 60 180 Q35 170 50 160 Z" fill="url(#bodyRed)" />
              </G>
              <G id="frontWheel">
                <Circle cx="150" cy="170" r="42" fill="#0c0d0e" stroke="#1c1e20" strokeWidth="2" />
                <Circle cx="150" cy="170" r="33" fill="url(#wheelRimGrad)" />
                <Path d="M150 137 L150 203 M117 170 L183 170 M127 147 L173 193 M127 193 L173 147" stroke="#374151" strokeWidth="2.5" />
                <Circle cx="150" cy="170" r="14" fill="#111827" stroke="#fbbf24" strokeWidth="1.5" />
                <Circle cx="150" cy="170" r="6" fill="#fbbf24" />
              </G>
              <G id="rearWheel">
                <Circle cx="470" cy="172" r="44" fill="#0c0d0e" stroke="#1c1e20" strokeWidth="2" />
                <Circle cx="470" cy="172" r="35" fill="url(#wheelRimGrad)" />
                <Path d="M470 137 L470 207 M435 172 L505 172 M445 147 L495 197 M445 197 L495 147" stroke="#374151" strokeWidth="2.5" />
                <Circle cx="470" cy="172" r="14" fill="#111827" stroke="#fbbf24" strokeWidth="1.5" />
                <Circle cx="470" cy="172" r="6" fill="#fbbf24" />
              </G>
              <Path d="M45 185 L90 190 H520 L550 185 L565 192 L530 200 H80 L40 192 Z" fill="url(#bodyCarbon)" />
              <Path d="M42 165 C40 160 55 155 75 155 C95 155 110 165 125 175 L80 185 Z" fill="#2d0006" />
              <Path d="M40 170 C40 160 65 148 105 146 C125 145 150 152 170 165 L165 180 C130 182 80 182 40 170 Z" fill="url(#bodyRed)" />
              <Path d="M45 170 C55 130 120 95 180 92 C230 90 280 88 320 94 C370 100 450 102 500 115 C540 125 560 145 565 165 C570 175 550 185 530 187 H75 L45 170 Z" fill="url(#bodyRed)" />
              <Path d="M280 105 C330 105 380 110 405 120 C420 125 430 135 435 150 C410 155 350 160 280 150 Z" fill="#3b000a" />
              <Path d="M290 100 C340 100 375 105 395 115 C410 122 418 130 422 142 C400 146 350 150 290 142 Z" fill="url(#bodyRed)" stroke="#ff003c" strokeWidth={0.8} />
              <Path d="M175 120 C180 105 210 95 260 92 C320 88 380 96 410 115 C420 122 422 135 410 140 C380 142 300 145 190 140 C175 135 170 128 175 120 Z" fill="url(#bodyCarbon)" />
              <Path d="M190 118 C205 105 240 98 280 96 C330 94 370 100 395 112 L385 125 C350 122 280 120 205 125 Z" fill="url(#windshieldGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
              <Path d="M205 112 Q230 103 270 102" stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
              <Path d="M95 170 C95 135 135 125 180 130 C195 132 205 142 200 155 C195 170 185 185 185 185" fill="none" stroke="url(#bodyRed)" strokeWidth="6" />
              <Path d="M100 170 C100 140 135 132 175 136" fill="none" stroke="#ff003c" strokeWidth={1.5} opacity={0.8} />
              <Path d="M415 172 C415 138 450 128 495 132 C515 134 525 145 520 162 L510 188" fill="none" stroke="url(#bodyRed)" strokeWidth="7" />
              <Path d="M500 115 L530 105 L555 105 L548 118 Z" fill="url(#bodyCarbon)" />
              <Path d="M530 105 H565 V112 H548 Z" fill="url(#bodyCarbon)" />
              <Path d="M72 152 Q82 145 110 148 L105 155 Q85 152 75 156 Z" fill="#111827" />
              <Path d="M75 151 Q85 146 108 149" fill="none" stroke="#00f3ff" strokeWidth="4" strokeLinecap="round" />
              <Path d="M78 151 L95 150" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity={0.9} />
              <Polygon points="56,170 60,166 64,170 60,174" fill="#fbbf24" />
              <Path d="M562 138 C565 138 566 145 563 148" fill="none" stroke="#ff0055" strokeWidth="5.5" strokeLinecap="round" />
              <Path d="M210 116 Q200 112 188 115 Q185 118 198 120 L212 120 Z" fill="url(#bodyCarbon)" />
              <Path d="M210 116 Q200 112 188 115 L190 117 Q198 115 208 118 Z" fill="#ff003c" />
            </Svg>
          </Animated.View>

          {/* Lightning Overlay 1 (Cyan bolts) */}
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: lightning1Opacity }} pointerEvents="none">
            <Svg width="300" height="250" viewBox="0 0 600 250">
              <Path d="M 80 15 L 110 55 L 95 85 L 135 110 L 120 130 L 155 145" stroke="#00f3ff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M 450 145 L 435 165 L 465 175 L 455 195" stroke="#00f3ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </Svg>
          </Animated.View>

          {/* Lightning Overlay 2 (Magenta bolts) */}
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: lightning2Opacity }} pointerEvents="none">
            <Svg width="300" height="250" viewBox="0 0 600 250">
              <Path d="M 430 10 L 445 45 L 425 75 L 460 95 L 445 115 L 490 120" stroke="#ff007f" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'hotel' || activeLevel?.id?.toLowerCase() === 'hotel') {
      return (
        /* Cyberpunk Super Hotel SVG model */
        <View style={{ width: 340, height: 340, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }], width: 340, height: 300 }}>
            <Svg width="340" height="300" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
              <Defs>
                <SvgLinearGradient id="hotelHullGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#1e1b4b" />
                  <Stop offset="50%" stopColor="#311042" />
                  <Stop offset="100%" stopColor="#030712" />
                </SvgLinearGradient>
                <SvgLinearGradient id="hotelGlassCyan" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#00f3ff" />
                  <Stop offset="100%" stopColor="#1e3a8a" />
                </SvgLinearGradient>
                <Filter id="hotelNeonPink" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation="6" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* Shadow Base */}
              <Ellipse cx="200" cy="350" rx="150" ry="22" fill="rgba(0,0,0,0.6)" />

              {/* Under-pedestal glowing ring */}
              <Ellipse cx="200" cy="350" rx="170" ry="30" fill="none" stroke="#ec4899" strokeWidth={2.5} filter="url(#hotelNeonPink)" />
              <Ellipse cx="200" cy="350" rx="120" ry="18" fill="none" stroke="#00f3ff" strokeWidth={1.5} />

              {/* Tower 1 (Left Wing Side Tower) */}
              <G transform="translate(-10, 20)">
                <Path d="M100 320 L150 295 L150 160 L100 185 Z" fill="url(#hotelHullGrad)" stroke="#ec4899" strokeWidth={1} />
                <Path d="M150 295 L200 320 L200 185 L150 160 Z" fill="#030712" stroke="#ec4899" strokeWidth={1} />
                
                {/* Glowing rooms/windows grid */}
                <Rect fill="#00f3ff" x="112" y="200" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#00f3ff" x="128" y="200" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#ec4899" x="162" y="195" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />
                <Rect fill="#ec4899" x="178" y="195" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />

                <Rect fill="#00f3ff" x="112" y="235" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#00f3ff" x="128" y="235" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#ec4899" x="162" y="230" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />
                <Rect fill="#ec4899" x="178" y="230" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />

                <Rect fill="#ec4899" x="112" y="270" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />
                <Rect fill="#00f3ff" x="162" y="265" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
              </G>

              {/* Tower 2 (Right Wing Side Tower) */}
              <G transform="translate(10, 20)">
                <Path d="M200 320 L250 295 L250 160 L200 185 Z" fill="url(#hotelHullGrad)" stroke="#00f3ff" strokeWidth={1} />
                <Path d="M250 295 L300 320 L300 185 L250 160 Z" fill="#030712" stroke="#00f3ff" strokeWidth={1} />

                {/* Glowing rooms/windows grid */}
                <Rect fill="#ec4899" x="212" y="195" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />
                <Rect fill="#00f3ff" x="262" y="200" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#00f3ff" x="278" y="200" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />

                <Rect fill="#ec4899" x="212" y="230" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />
                <Rect fill="#00f3ff" x="262" y="235" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#00f3ff" x="278" y="235" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />

                <Rect fill="#00f3ff" x="212" y="265" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.8} />
                <Rect fill="#ec4899" x="262" y="270" width="8" height="15" rx="1" filter="url(#hotelNeonPink)" opacity={0.9} />
              </G>

              {/* Center Main Tall Penthouse Block */}
              <Path d="M140 310 L200 280 L260 310 L260 90 L200 60 L140 90 Z" fill="url(#hotelHullGrad)" stroke="#00f3ff" strokeWidth={2.5} />
              <Path d="M200 280 L260 310 L260 90 L200 60 Z" fill="#030712" stroke="#ec4899" strokeWidth={1.5} />

              {/* Vertical Glowing Cyber strip down the center */}
              <Line x1="200" y1="60" x2="200" y2="280" stroke="#00f3ff" strokeWidth={3} filter="url(#hotelNeonPink)" />

              {/* Grand glass balconies & suites */}
              <Path d="M152 140 L200 115 L248 140" fill="none" stroke="#ec4899" strokeWidth={2} filter="url(#hotelNeonPink)" />
              <Path d="M152 200 L200 175 L248 200" fill="none" stroke="#00f3ff" strokeWidth={2.5} />
              <Path d="M152 260 L200 235 L248 260" fill="none" stroke="#ec4899" strokeWidth={2} filter="url(#hotelNeonPink)" />

              {/* Cyber Signboard "HOTEL" Text Design */}
              <G transform="translate(162, 102)">
                <Rect x="0" y="0" width="76" height="24" rx="4" fill="#020617" stroke="#ec4899" strokeWidth={2} filter="url(#hotelNeonPink)" />
                <SvgText x="38" y="16" fill="#00f3ff" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing={2}>
                  HOTEL
                </SvgText>
              </G>

              {/* Penthouse Crown Roof Helipad Deck */}
              <Path d="M140 90 L200 60 L260 90 L200 108 Z" fill="#1e1b4b" stroke="#00f3ff" strokeWidth={2.5} />
              <Ellipse cx="200" cy="84" rx="35" ry="12" fill="none" stroke="#ec4899" strokeWidth={2} filter="url(#hotelNeonPink)" />
              {/* Helipad Letter H logo */}
              <SvgText x="200" y="88" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">
                H
              </SvgText>

              {/* Cyber Scanner Sweeping laser line */}
              <AnimatedLine
                x1="144"
                y1={beamPulseAnim.interpolate({ inputRange: [0.15, 0.85], outputRange: [92, 290] })}
                x2="256"
                y2={beamPulseAnim.interpolate({ inputRange: [0.15, 0.85], outputRange: [92, 290] })}
                stroke="#00f3ff"
                strokeWidth={2}
                opacity={0.8}
                filter="url(#hotelNeonPink)"
              />

              {/* 📡 Animated Cyber Satellite / Radar Dish on Helipad */}
              <AnimatedG style={{
                transform: [{
                  rotate: auraRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }],
                originX: 200,
                originY: 84
              }}>
                <Path d="M195 80 L205 80 L200 68 Z" fill="#ec4899" stroke="#00f3ff" strokeWidth={0.8} />
                <Circle cx="200" cy="68" r="2.5" fill="#00f3ff" />
              </AnimatedG>

              {/* Volumetric rooftop search lasers */}
              <Polygon points="200,84 80,0 120,0" fill="rgba(0,243,255,0.18)" />
              <Polygon points="200,84 320,0 280,0" fill="rgba(236,72,153,0.15)" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'bus') {
      return (
        <View style={{ width: 340, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }], width: 340, height: 220 }}>
            <Svg width="340" height="220" viewBox="0 0 600 300">
              <Defs>
                <SvgLinearGradient id="busBody" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#1e1b4b" />
                  <Stop offset="40%" stopColor="#4c1d95" />
                  <Stop offset="80%" stopColor="#2e1065" />
                  <Stop offset="100%" stopColor="#0f172a" />
                </SvgLinearGradient>
                <SvgLinearGradient id="busCyanNeon" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#00f3ff" />
                  <Stop offset="100%" stopColor="#008bb8" />
                </SvgLinearGradient>
                <SvgLinearGradient id="busMagentaNeon" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#ec4899" />
                  <Stop offset="100%" stopColor="#be185d" />
                </SvgLinearGradient>
                <SvgLinearGradient id="busGlass" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#1e293b" />
                  <Stop offset="50%" stopColor="#0f172a" />
                  <Stop offset="100%" stopColor="#312e81" />
                </SvgLinearGradient>
                <Filter id="busGlowCyan" x="-10%" y="-10%" width="120%" height="120%">
                  <FeGaussianBlur stdDeviation="6" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* Levitation Shadows & Base Glow */}
              <Ellipse cx="300" cy="270" rx="220" ry="15" fill="rgba(0,0,0,0.8)" />
              <Ellipse cx="300" cy="270" rx="160" ry="8" fill="#00f3ff" opacity="0.35" filter="url(#busGlowCyan)" />

              {/* 🛣️ Moving Speed Road Dash Marks (Speed visual effect moving right to left) */}
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [650, 50] })}
                y1="274"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] })}
                y2="274"
                stroke="#00f3ff"
                strokeWidth={3}
                opacity={0.65}
                strokeDasharray="10 15"
                filter="url(#busGlowCyan)"
              />
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [350, -250] })}
                y1="274"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [300, -300] })}
                y2="274"
                stroke="#00f3ff"
                strokeWidth={3}
                opacity={0.65}
                strokeDasharray="10 15"
                filter="url(#busGlowCyan)"
              />

              {/* 3D Realistic Black Rubber Wheels (with rotating rims) */}
              {/* Front Wheel */}
              <G transform="translate(170, 245)">
                {/* Tire Outer shadow */}
                <Ellipse cx="0" cy="20" rx="35" ry="8" fill="rgba(0,0,0,0.6)" />
                {/* Black Rubber Tire Body */}
                <Circle cx="0" cy="0" r="32" fill="#090d16" stroke="#2a2f3d" strokeWidth={3} />
                {/* Inner Tire Tread Grooves */}
                <Circle cx="0" cy="0" r="28" fill="none" stroke="#181d28" strokeWidth={1} strokeDasharray="3 3" />
                
                {/* 3D Metallic Silver Rim System (Pulsing / Rotating) */}
                <AnimatedG style={{
                  transform: [{
                    rotate: auraRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  <Circle cx="0" cy="0" r="22" fill="#475569" stroke="#94a3b8" strokeWidth={2} />
                  {/* Wheel Spokes */}
                  <Path d="M-22 0 H22 M0 -22 V22" stroke="#cbd5e1" strokeWidth={3} />
                  <Path d="M-15 -15 L15 15 M-15 15 L15 -15" stroke="#cbd5e1" strokeWidth={2} />
                  {/* Core Hub Cap */}
                  <Circle cx="0" cy="0" r="8" fill="#1e293b" />
                  <Circle cx="0" cy="0" r="4" fill="#fbbf24" />
                </AnimatedG>
              </G>
              
              {/* Rear Wheel */}
              <G transform="translate(410, 245)">
                {/* Tire Outer shadow */}
                <Ellipse cx="0" cy="20" rx="35" ry="8" fill="rgba(0,0,0,0.6)" />
                {/* Black Rubber Tire Body */}
                <Circle cx="0" cy="0" r="32" fill="#090d16" stroke="#2a2f3d" strokeWidth={3} />
                {/* Inner Tire Tread Grooves */}
                <Circle cx="0" cy="0" r="28" fill="none" stroke="#181d28" strokeWidth={1} strokeDasharray="3 3" />
                
                {/* 3D Metallic Silver Rim System (Pulsing / Rotating) */}
                <AnimatedG style={{
                  transform: [{
                    rotate: auraRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  <Circle cx="0" cy="0" r="22" fill="#475569" stroke="#94a3b8" strokeWidth={2} />
                  {/* Wheel Spokes */}
                  <Path d="M-22 0 H22 M0 -22 V22" stroke="#cbd5e1" strokeWidth={3} />
                  <Path d="M-15 -15 L15 15 M-15 15 L15 -15" stroke="#cbd5e1" strokeWidth={2} />
                  {/* Core Hub Cap */}
                  <Circle cx="0" cy="0" r="8" fill="#1e293b" />
                  <Circle cx="0" cy="0" r="4" fill="#fbbf24" />
                </AnimatedG>
              </G>

              {/* Main Bus Body */}
              {/* Lower Deck Panel */}
              <Path d="M100 230 H480 V150 L470 110 H110 L100 150 Z" fill="url(#busBody)" stroke="#ec4899" strokeWidth={2} />
              
              {/* Upper Deck Panel */}
              <Path d="M110 110 H470 V45 C470 40 450 35 430 35 H150 C130 35 110 40 110 45 Z" fill="url(#busBody)" stroke="#00f3ff" strokeWidth={2.2} />

              {/* Double-Decker Divider Chrome Strip */}
              <Path d="M98 135 H482 L478 143 H102 Z" fill="url(#busMagentaNeon)" opacity="0.9" />

              {/* Glass dome panels & Windows */}
              {/* Upper Deck - Panoramic Window Left */}
              <Path d="M130 50 H200 V95 H130 Z" fill="url(#busGlass)" stroke="#00f3ff" strokeWidth={1} />
              <Path d="M135 55 L160 90" stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1.5} />
              
              {/* Upper Deck - Mid Windows */}
              <Path d="M220 50 H290 V95 H220 Z" fill="url(#busGlass)" stroke="#00f3ff" strokeWidth={1} />
              <Path d="M310 50 H380 V95 H310 Z" fill="url(#busGlass)" stroke="#00f3ff" strokeWidth={1} />
              
              {/* Upper Deck - Panoramic Right */}
              <Path d="M400 50 H450 V95 H400 Z" fill="url(#busGlass)" stroke="#00f3ff" strokeWidth={1} />

              {/* Lower Deck Windows */}
              <Path d="M130 155 H200 V195 H130 Z" fill="url(#busGlass)" stroke="#ec4899" strokeWidth={1} />
              <Path d="M220 155 H290 V195 H220 Z" fill="url(#busGlass)" stroke="#ec4899" strokeWidth={1} />
              <Path d="M310 155 H380 V195 H310 Z" fill="url(#busGlass)" stroke="#ec4899" strokeWidth={1} />
              
              {/* Glass Cockpit Shield (Front Window System) */}
              <Path d="M430 155 C430 155 460 155 472 168 L478 190 H430 Z" fill="url(#busGlass)" stroke="#00f3ff" strokeWidth={1.5} />

              {/* Electronic Cyber Destination Board Indicator */}
              <Rect x="210" y="112" width="180" height="20" rx="5" fill="#000" stroke="#00f3ff" strokeWidth={1} />
              <SvgText
                x="300"
                y="126"
                fill="#fbbf24"
                fontSize="12"
                fontWeight="900"
                textAnchor="middle"
                letterSpacing={2}
              >
                CYBER-BUS
              </SvgText>

              {/* Front and Rear High-Intensity Lights */}
              {/* Headlights Front (Cyan Beam) */}
              <Polygon points="480,210 520,180 520,240 480,225" fill="rgba(0, 243, 255, 0.4)" filter="url(#busGlowCyan)" />
              <Circle cx="480" cy="217" r="8" fill="#fff" stroke="#00f3ff" strokeWidth={2} filter="url(#busGlowCyan)" />

              {/* Tail Lights Rear (Red pulsing brake line) */}
              <Path d="M98 200 H103 V220 H98 Z" fill="#ef4444" filter="url(#busGlowCyan)" />

              {/* Futuristic Aerodynamic Spoilers / Fins */}
              <Path d="M100 40 L85 30 L95 55 Z" fill="url(#busMagentaNeon)" />
              <Path d="M480 40 L495 30 L485 55 Z" fill="url(#busCyanNeon)" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'train') {
      return (
        /* Code-generated Specular Phong Shading 3D Train Mesh */
        <View style={{ width: 340, height: 340, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }], width: 340, height: 300 }}>
            <Svg width="340" height="300" viewBox="0 0 600 350" style={{ overflow: 'visible' }}>
              <Defs>
                {/* Ray-traced high contrast chrome gradient */}
                <SvgLinearGradient id="real3DChrome" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#ffffff" />
                  <Stop offset="8%" stopColor="#e2e8f0" />
                  <Stop offset="18%" stopColor="#64748b" />
                  <Stop offset="28%" stopColor="#1e293b" />
                  <Stop offset="38%" stopColor="#ffffff" />
                  <Stop offset="48%" stopColor="#94a3b8" />
                  <Stop offset="65%" stopColor="#334155" />
                  <Stop offset="82%" stopColor="#cbd5e1" />
                  <Stop offset="100%" stopColor="#0f172a" />
                </SvgLinearGradient>

                {/* Dark chassis specular iron */}
                <SvgLinearGradient id="real3DIron" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#475569" />
                  <Stop offset="20%" stopColor="#1e293b" />
                  <Stop offset="70%" stopColor="#0f172a" />
                  <Stop offset="100%" stopColor="#020617" />
                </SvgLinearGradient>

                {/* Glass canopy reflections */}
                <SvgLinearGradient id="real3DGlass" x1="0%" y1="0%" x2="50%" y2="100%">
                  <Stop offset="0%" stopColor="#020617" />
                  <Stop offset="40%" stopColor="#0f172a" />
                  <Stop offset="70%" stopColor="#1e3a8a" />
                  <Stop offset="100%" stopColor="#1d4ed8" />
                </SvgLinearGradient>

                <Filter id="bloomEffect" x="-30%" y="-30%" width="160%" height="160%">
                  <FeGaussianBlur stdDeviation="8" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* Real 3D Ambient Occlusion Shadow */}
              <Ellipse cx="300" cy="285" rx="190" ry="14" fill="rgba(0,0,0,0.8)" />
              <Ellipse cx="270" cy="282" rx="110" ry="7" fill="rgba(0,0,0,0.95)" />

              {/* Diagonal Neon Tracks */}
              <Path d="M40 330 L560 170" fill="none" stroke="#1e293b" strokeWidth={18} />
              <Path d="M40 330 L560 170" fill="none" stroke="#e2e8f0" strokeWidth={3} opacity={0.9} />
              <Path d="M40 330 L560 170" fill="none" stroke="#38bdf8" strokeWidth={6} filter="url(#bloomEffect)" opacity={0.6} />

              <Path d="M60 345 L580 185" fill="none" stroke="#0f172a" strokeWidth={14} />
              <Path d="M60 345 L580 185" fill="none" stroke="#f43f5e" strokeWidth={4} filter="url(#bloomEffect)" opacity={0.5} />

              {/* REAR COMPARTMENT SUB-MESH (Projected cylinder logic) */}
              <G id="backCompartments">
                {/* Main body shell */}
                <Path d="M260 150 C350 120 480 100 580 92 L580 195 C480 190 350 200 260 215 Z" fill="url(#real3DChrome)" stroke="#0f172a" strokeWidth={1} />
                
                {/* Real Specular Highlights Trails (Simulates reflective cylindrical surface) */}
                <Path d="M260 162 C350 132 480 112 580 104" fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.8} />
                <Path d="M260 160 C350 130 480 110 580 102" fill="none" stroke="#000000" strokeWidth={1.5} opacity={0.4} />
                <Path d="M260 185 C350 155 480 135 580 127" fill="none" stroke="#ffffff" strokeWidth={1.5} opacity={0.7} />
                <Path d="M260 198 C350 168 480 148 580 140" fill="none" stroke="#000000" strokeWidth={2.5} opacity={0.5} />

                {/* Side cabin windows with 3D inset borders */}
                <Path d="M360 125 H400 L395 155 H355 Z" fill="url(#real3DGlass)" stroke="#090d16" strokeWidth={2} />
                <Path d="M430 120 H470 L465 150 H425 Z" fill="url(#real3DGlass)" stroke="#090d16" strokeWidth={2} />
                <Path d="M500 115 H540 L535 145 H495 Z" fill="url(#real3DGlass)" stroke="#090d16" strokeWidth={2} />

                {/* Window inner highlights (Specular glass beam) */}
                <Path d="M362 127 L375 127 L368 153 Z" fill="#ffffff" opacity={0.25} />
                <Path d="M432 122 L445 122 L438 148 Z" fill="#ffffff" opacity={0.25} />

                {/* Blinking yellow interior lights */}
                <Rect x="380" y="132" width="12" height="10" rx="1.5" fill="#facc15" opacity={0.85} filter="url(#bloomEffect)" />
                <Rect x="450" y="127" width="12" height="10" rx="1.5" fill="#facc15" opacity={0.85} filter="url(#bloomEffect)" />
              </G>

              {/* DYNAMIC CABIN NOSE (Complex multi-layered curves) */}
              <G id="cabinFront">
                {/* 3D Base metal capsule */}
                <Path d="M120 220 C110 200 125 150 200 132 C260 118 280 148 260 215 C240 248 180 265 130 258 C115 254 122 232 120 220 Z" fill="url(#real3DChrome)" stroke="#0f172a" strokeWidth={1} />
                
                {/* Layered panel overlays for dimensional depth */}
                <Path d="M125 210 C125 190 140 160 185 148 L220 180 L185 235 Z" fill="url(#real3DChrome)" opacity={0.9} stroke="#0f172a" strokeWidth={1.5} />
                
                {/* Edge Specular light glares */}
                <Path d="M130 188 C135 170 160 152 188 145" fill="none" stroke="#ffffff" strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
                <Path d="M132 192 C137 175 162 158 190 150" fill="none" stroke="#1e293b" strokeWidth={1.5} opacity={0.5} />
                <Path d="M140 240 C170 252 220 242 245 220" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />

                {/* Real-time deep layout panel separators */}
                <Path d="M175 138 C195 158 200 190 185 218" fill="none" stroke="#000000" strokeWidth={2.5} opacity={0.65} />
                <Path d="M175 138 C195 158 200 190 185 218" fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.3} />
                <Path d="M210 242 C230 222 242 195 242 170" fill="none" stroke="#000000" strokeWidth={2.2} opacity={0.6} />

                {/* Double Front Bumper blocks */}
                <Path d="M125 252 L105 272 H135 L145 250 Z" fill="url(#real3DIron)" stroke="#475569" strokeWidth={1.5} />

                {/* Triple Segmented Glass canopy (HUD elements behind reflection) */}
                <Path d="M142 195 C146 168 178 145 220 140 C240 138 250 155 240 185 C225 210 188 222 158 218 C145 218 140 208 142 195 Z" fill="url(#real3DGlass)" stroke="#090d16" strokeWidth={3} />
                
                {/* Windshield glare cuts */}
                <Path d="M165 155 C185 148 215 148 225 158" fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.75} />
                <Path d="M152 188 L188 170" stroke="#ffffff" strokeWidth={1.5} opacity={0.35} />

                {/* Holographic orange dashboard HUD values */}
                <Path d="M182 165 C185 160 210 162 215 178" fill="none" stroke="#f59e0b" strokeWidth={2.5} filter="url(#bloomEffect)" />
                <SvgText x="195" y="172" fill="#fbbf24" fontSize="10" fontWeight="900" letterSpacing={1} filter="url(#bloomEffect)">
                  57 rmP
                </SvgText>
              </G>

              {/* MAGNETIC LEVITATION BOGIES (MagLev core pads replacing normal wheels) */}
              <G id="chassisBogies" transform="translate(130, 240)">
                <Rect x="-10" y="0" width="110" height="15" rx="7" fill="url(#real3DIron)" stroke="#00f3ff" strokeWidth={1.5} filter="url(#bloomEffect)" />
                
                {/* Magnetic Wave Generators (Pulsing Rings) */}
                <AnimatedEllipse
                  cx="20"
                  cy="22"
                  rx={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [18, 30] })}
                  ry={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [4, 8] })}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  opacity={0.8}
                />
                <AnimatedEllipse
                  cx="70"
                  cy="22"
                  rx={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [18, 30] })}
                  ry={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [4, 8] })}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  opacity={0.8}
                />

                {/* Core MagLev pods */}
                <Circle cx="20" cy="10" r="10" fill="#0f172a" stroke="#00f3ff" strokeWidth={2} />
                <Circle cx="20" cy="10" r="5" fill="#00f3ff" filter="url(#bloomEffect)" />
                <Circle cx="70" cy="10" r="10" fill="#0f172a" stroke="#00f3ff" strokeWidth={2} />
                <Circle cx="70" cy="10" r="5" fill="#00f3ff" filter="url(#bloomEffect)" />
              </G>

              {/* Rear MagLev bogie assembly */}
              <G transform="translate(320, 195)">
                <Rect x="0" y="0" width="100" height="14" rx="5" fill="url(#real3DIron)" stroke="#f43f5e" strokeWidth={1.2} />
                
                {/* Rear Levitation Wave generators */}
                <AnimatedEllipse
                  cx="25"
                  cy="20"
                  rx={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [16, 26] })}
                  ry={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [3, 7] })}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
                <AnimatedEllipse
                  cx="75"
                  cy="20"
                  rx={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [16, 26] })}
                  ry={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [3, 7] })}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  opacity={0.7}
                />

                <Circle cx="25" cy="10" r="8" fill="#0f172a" stroke="#f43f5e" strokeWidth={1.5} />
                <Circle cx="75" cy="10" r="8" fill="#0f172a" stroke="#f43f5e" strokeWidth={1.5} />
              </G>

              {/* NEON BLUE HEADLIGHTS (Sharp chevron) */}
              <G filter="url(#bloomEffect)">
                <Path d="M152 222 L172 205 L180 215 L156 230 Z" fill="#ffffff" />
                <Path d="M152 222 L172 205 L180 215 Z" fill="#38bdf8" />
              </G>

              {/* Scanner LEDs */}
              <Circle cx="198" cy="226" r="4.5" fill="#f97316" filter="url(#bloomEffect)" />
              <Circle cx="208" cy="232" r="3.5" fill="#f97316" filter="url(#bloomEffect)" />

              {/* 💨 Speed Sparks & Track Particles (Spawning from bottom wheels) */}
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [220, 30] })}
                y1="280"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [190, 10] })}
                y2="280"
                stroke="#f43f5e"
                strokeWidth={2}
                opacity={0.8}
                filter="url(#bloomEffect)"
              />
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [420, 260] })}
                y1="250"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [380, 220] })}
                y2="250"
                stroke="#38bdf8"
                strokeWidth={2.5}
                opacity={0.7}
                filter="url(#bloomEffect)"
              />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'ship') {
      return (
        /* Cyber Cruiser Ship SVG model */
        <View style={{ width: 340, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }], width: 340, height: 220 }}>
            <Svg width="340" height="220" viewBox="0 0 600 300" style={{ overflow: 'visible' }}>
              <Defs>
                <SvgLinearGradient id="shipHull" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#1e293b" />
                  <Stop offset="50%" stopColor="#0f172a" />
                  <Stop offset="100%" stopColor="#020617" />
                </SvgLinearGradient>
                <SvgLinearGradient id="shipChrome" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#38bdf8" />
                  <Stop offset="50%" stopColor="#0284c7" />
                  <Stop offset="100%" stopColor="#0369a1" />
                </SvgLinearGradient>
                <SvgLinearGradient id="cyanWakeGlow" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#00f3ff" />
                  <Stop offset="100%" stopColor="transparent" />
                </SvgLinearGradient>
                <Filter id="shipNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation="6" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* Ambient Blue Water Surface Glow Base */}
              <Ellipse cx="300" cy="260" rx="230" ry="25" fill="#00f3ff" opacity="0.15" filter="url(#shipNeonGlow)" />

              {/* Water Wake / Glowing waves underneath - Repositioned lower (y=255 to 275) for high visibility */}
              <AnimatedPath
                d={auraRotateAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M60 255 Q300 295 540 255 Q300 315 60 255",
                    "M60 255 Q300 315 540 255 Q300 280 60 255",
                    "M60 255 Q300 295 540 255 Q300 315 60 255"
                  ]
                })}
                fill="#00f3ff"
                opacity={0.6}
                filter="url(#shipNeonGlow)"
              />
              <AnimatedPath
                d={auraRotateAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M40 262 Q300 280 560 262",
                    "M40 262 Q300 310 560 262",
                    "M40 262 Q300 280 560 262"
                  ]
                })}
                fill="none"
                stroke="#e0f"
                strokeWidth={4.5}
                filter="url(#shipNeonGlow)"
              />
              <AnimatedPath
                d={auraRotateAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M90 268 Q300 305 510 268",
                    "M90 268 Q300 280 510 268",
                    "M90 268 Q300 305 510 268"
                  ]
                })}
                fill="none"
                stroke="#00f3ff"
                strokeWidth={3}
                filter="url(#shipNeonGlow)"
              />

              {/* Ship Shadow */}
              <Ellipse cx="300" cy="252" rx="200" ry="12" fill="rgba(0,0,0,0.6)" />

              {/* Main Ship Cyber Hull */}
              {/* Bow to stern panels */}
              <Path d="M80 200 L120 150 L480 150 L520 200 L440 240 H160 Z" fill="url(#shipHull)" stroke="#00f3ff" strokeWidth={2} />
              
              {/* Lower hull shield panel */}
              <Path d="M160 240 H440 L400 250 H200 Z" fill="#020617" stroke="#00f3ff" strokeWidth={1} />
              
              {/* Chrome Metallic Decal Side Plate */}
              <Path d="M150 170 H450 L470 200 H130 Z" fill="url(#shipChrome)" opacity={0.8} />

              {/* Glowing Deck Cabin Windows */}
              <Rect x="200" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />
              <Rect x="250" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />
              <Rect x="300" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />
              <Rect x="350" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />

              {/* Neon Pink/Magenta accent side lines */}
              <Path d="M120 160 H480" stroke="#f43f5e" strokeWidth={2.5} filter="url(#shipNeonGlow)" />
              <Path d="M140 210 H460" stroke="#00f3ff" strokeWidth={1.5} />

              {/* Deck Command Bridge (Upper Structure) */}
              <Path d="M220 150 L240 115 H360 L380 150 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={1.8} />
              {/* Bridge Windows */}
              <Polygon points="255,123 345,123 335,140 265,140" fill="#00f3ff" opacity={0.9} />

              {/* Communications Tower & Radar */}
              <Line x1="300" y1="115" x2="300" y2="70" stroke="#475569" strokeWidth={3} />
              
              {/* Rotating Radar Antenna */}
              <AnimatedG style={{
                transform: [{
                  translateX: 300,
                }, {
                  translateY: 70,
                }, {
                  rotate: auraRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }, {
                  translateX: -300,
                }, {
                  translateY: -70,
                }]
              }}>
                <Ellipse cx="300" cy="70" rx="18" ry="5" fill="#334155" stroke="#00f3ff" strokeWidth={1.2} />
                <Line x1="285" y1="70" x2="315" y2="70" stroke="#00f3ff" strokeWidth={2} />
              </AnimatedG>
              
              {/* Holographic Glowing Radar Waves projecting from tower */}
              <Path d="M280 60 Q300 50 320 60" fill="none" stroke="#00f3ff" strokeWidth={2} filter="url(#shipNeonGlow)" />
              <Path d="M270 50 Q300 35 330 50" fill="none" stroke="#00f3ff" strokeWidth={1} opacity={0.6} />

              {/* Blinking Beacon Lights (Navigation signals) */}
              <AnimatedCircle
                cx="120"
                cy="150"
                r={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [2, 5] })}
                fill="#ef4444"
                filter="url(#shipNeonGlow)"
              />
              <AnimatedCircle
                cx="480"
                cy="150"
                r={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [2, 5] })}
                fill="#10b981"
                filter="url(#shipNeonGlow)"
              />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id?.toLowerCase() === 'plane' || activeLevel?.id?.toLowerCase() === 'aeroplane') {
      return (
        /* Ultimate Stealth Interceptor Fighter Jet SVG based on reference */
        <View style={{ width: 340, height: 340, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }], width: 340, height: 300 }}>
            <Svg width="340" height="300" viewBox="0 0 600 350" style={{ overflow: 'visible' }}>
              <Defs>
                {/* Matte Stealth Black/Charcoal Hull */}
                <SvgLinearGradient id="refPlaneHull" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#2a2b2e" />
                  <Stop offset="60%" stopColor="#18191c" />
                  <Stop offset="100%" stopColor="#08090a" />
                </SvgLinearGradient>
                {/* Bright Gold-Orange Panel lines */}
                <SvgLinearGradient id="refGoldDecal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#facc15" />
                  <Stop offset="100%" stopColor="#d97706" />
                </SvgLinearGradient>
                {/* Cockpit Canopy glass shader */}
                <SvgLinearGradient id="refJetGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#e0f2fe" opacity={0.8} />
                  <Stop offset="50%" stopColor="#7dd3fc" opacity={0.65} />
                  <Stop offset="100%" stopColor="#0284c7" opacity={0.9} />
                </SvgLinearGradient>
                {/* Engine Flame */}
                <SvgLinearGradient id="refEngineFire" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#ff4500" />
                  <Stop offset="30%" stopColor="#facc15" />
                  <Stop offset="100%" stopColor="transparent" />
                </SvgLinearGradient>
                <Filter id="refLaserGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation="6" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* Wind Speed Lines / Jet streaks passing by - Animated with auraRotateAnim */}
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [650, -100] })}
                y1="80"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [750, 0] })}
                y2="80"
                stroke="#38bdf8"
                strokeWidth={1.5}
                opacity={0.6}
              />
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [550, -200] })}
                y1="280"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [650, -100] })}
                y2="280"
                stroke="#ffffff"
                strokeWidth={2}
                opacity={0.4}
              />
              <AnimatedLine
                x1={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [700, -50] })}
                y1="190"
                x2={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [800, 50] })}
                y2="190"
                stroke="#e879f9"
                strokeWidth={1.5}
                opacity={0.5}
              />

              {/* Pedestal & Shadows */}
              <Ellipse cx="300" cy="275" rx="180" ry="12" fill="rgba(0,0,0,0.6)" />
              <Ellipse cx="300" cy="275" rx="200" ry="24" fill="none" stroke="#facc15" strokeWidth={1.5} opacity={0.3} filter="url(#refLaserGlow)" />

              {/* AFTERBURNER THRUST ENGINE FLAMES (Flickering with beamPulseAnim) */}
              <AnimatedPath
                d={beamPulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [
                    "M120 180 L-10 190 L120 190 Z",
                    "M120 180 L-60 190 L120 190 Z"
                  ]
                })}
                fill="url(#refEngineFire)"
                filter="url(#refLaserGlow)"
              />
              <AnimatedPath
                d={beamPulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [
                    "M120 200 L-10 190 L120 190 Z",
                    "M120 200 L-60 190 L120 190 Z"
                  ]
                })}
                fill="url(#refEngineFire)"
                filter="url(#refLaserGlow)"
              />

              {/* MAIN WINGS & CANARDS ASSEMBLY */}
              {/* Starboard Main Wing Bottom (Swept back delta wing with yellow highlight trims) */}
              <Path d="M240 225 L100 320 H180 L350 220 Z" fill="#18191c" stroke="#374151" strokeWidth={1.5} />
              {/* Wing Gold Highlight Stripe */}
              <Path d="M120 310 L180 320 H160 L100 320 Z" fill="url(#refGoldDecal)" />
              <Line x1="220" y1="230" x2="150" y2="285" stroke="#facc15" strokeWidth={2.2} />

              {/* Port Main Wing Top */}
              <Path d="M240 165 L100 70 H180 L350 170 Z" fill="#08090a" stroke="#374151" strokeWidth={1.5} />
              <Path d="M120 80 L180 70 H160 L100 70 Z" fill="url(#refGoldDecal)" />
              <Line x1="220" y1="160" x2="150" y2="105" stroke="#facc15" strokeWidth={2.2} />

              {/* FUSELAGE MAIN BODY CORE (Pointed stealth shape pointing right) */}
              <Path d="M530 205 C420 155 350 148 200 150 H120 L95 175 L95 215 L120 240 H200 C350 242 420 235 530 205 Z" fill="url(#refPlaneHull)" stroke="#4b5563" strokeWidth={2} />

              {/* Futuristic cockpit glass canopy (Windshield glass) */}
              <Path d="M375 162 C405 158 450 162 472 196 C435 204 395 200 375 162 Z" fill="url(#refJetGlass)" stroke="#38bdf8" strokeWidth={1.5} />
              <Path d="M382 168 A 18 18 0 0 1 435 180" fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.65} />

              {/* Front fuselage nose yellow tech panel trims */}
              <Line x1="480" y1="195" x2="520" y2="202" stroke="#facc15" strokeWidth={2} filter="url(#refLaserGlow)" />
              <Line x1="455" y1="198" x2="495" y2="204" stroke="#facc15" strokeWidth={1.8} />

              {/* BACK DUAL TURBINE ENGINES (Circular intakes mounted on top near stabilizer) */}
              {/* Left Top Engine Cylinder */}
              <G transform="translate(180, 105)">
                <Rect x="0" y="0" width="70" height="28" rx="6" fill="#18191c" stroke="#4b5563" strokeWidth={1.5} />
                {/* Circular yellow intake cowl at front of the engine tube */}
                <Ellipse cx="70" cy="14" rx="4" ry="12" fill="#08090a" stroke="#facc15" strokeWidth={2} />
                <Ellipse cx="70" cy="14" rx="2" ry="7" fill="#000" />
                <Line x1="10" y1="22" x2="50" y2="22" stroke="#facc15" strokeWidth={1.5} />
              </G>

              {/* Right Bottom Engine Cylinder */}
              <G transform="translate(180, 218)">
                <Rect x="0" y="0" width="70" height="28" rx="6" fill="#18191c" stroke="#4b5563" strokeWidth={1.5} />
                <Ellipse cx="70" cy="14" rx="4" ry="12" fill="#08090a" stroke="#facc15" strokeWidth={2} />
                <Ellipse cx="70" cy="14" rx="2" ry="7" fill="#000" />
                <Line x1="10" y1="6" x2="50" y2="6" stroke="#facc15" strokeWidth={1.5} />
              </G>

              {/* Twin vertical tail fins */}
              <Polygon points="150,150 80,60 110,150" fill="#2a2b2e" stroke="#facc15" strokeWidth={1.2} />
              <Polygon points="150,240 80,330 110,240" fill="#18191c" stroke="#facc15" strokeWidth={1.2} />

              {/* Tech indicators decals ("7" icon mark) */}
              <SvgText x="320" y="195" fill="#facc15" fontSize="12" fontWeight="900">
                7
              </SvgText>

              {/* Navigation Wings lasers */}
              <Line x1="100" y1="70" x2="60" y2="70" stroke="#facc15" strokeWidth={2.5} filter="url(#refLaserGlow)" />
              <Line x1="100" y1="320" x2="60" y2="320" stroke="#facc15" strokeWidth={2.5} filter="url(#refLaserGlow)" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'submarine' || activeLevel?.id?.toLowerCase() === 'submarine') {
      return (
        /* Ultimate Cyber Submarine SVG Model based on reference blueprint */
        <View style={{ width: 340, height: 340, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }], width: 340, height: 300 }}>
            <Svg width="340" height="300" viewBox="0 0 600 350" style={{ overflow: 'visible' }}>
              <Defs>
                {/* Charcoal dark carbon hull gradient */}
                <SvgLinearGradient id="refSubHull" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#2e3033" />
                  <Stop offset="50%" stopColor="#1e2022" />
                  <Stop offset="100%" stopColor="#0f1011" />
                </SvgLinearGradient>
                {/* Premium Industrial Yellow */}
                <SvgLinearGradient id="refYellowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#facc15" />
                  <Stop offset="100%" stopColor="#ca8a04" />
                </SvgLinearGradient>
                {/* Holographic Cyan Cockpit Glass */}
                <SvgLinearGradient id="refCockpitGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#38bdf8" />
                  <Stop offset="100%" stopColor="#0369a1" />
                </SvgLinearGradient>
                {/* Sonar Glow filter */}
                <Filter id="sonarGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation="6" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* 🫧 Underwater Bubble Particles - Floating Upwards with auraRotateAnim */}
              <AnimatedCircle
                cx="150"
                cy={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [290, 80] })}
                r={4}
                fill="rgba(255, 255, 255, 0.4)"
                stroke="#38bdf8"
                strokeWidth={0.8}
              />
              <AnimatedCircle
                cx="210"
                cy={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [320, 100] })}
                r={6}
                fill="rgba(255, 255, 255, 0.35)"
                stroke="#38bdf8"
                strokeWidth={1}
              />
              <AnimatedCircle
                cx="380"
                cy={auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: [270, 60] })}
                r={5}
                fill="rgba(255, 255, 255, 0.45)"
                stroke="#38bdf8"
                strokeWidth={0.8}
              />

              {/* Submarine Pedestal Shadows */}
              <Ellipse cx="300" cy="275" rx="160" ry="12" fill="rgba(0,0,0,0.65)" />
              <Ellipse cx="300" cy="275" rx="190" ry="22" fill="none" stroke="#facc15" strokeWidth={1.5} opacity={0.4} />

              {/* BACK PROPULSION & TAIL ASSEMBLY */}
              {/* Propeller Axle and Blade - Spinning using auraRotateAnim */}
              <G transform="translate(500, 180)">
                <Rect x="0" y="-4" width="20" height="8" fill="#1f2937" />
                <AnimatedG style={{
                  transform: [{
                    rotate: auraRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  {/* Propeller Blade Wings */}
                  <Ellipse cx="20" cy="0" rx="4" ry="25" fill="#ca8a04" stroke="#facc15" strokeWidth={1} />
                  <Ellipse cx="20" cy="0" rx="25" ry="4" fill="#ca8a04" stroke="#facc15" strokeWidth={1} />
                </AnimatedG>
              </G>

              {/* Vertical stabilizer tail rudder (Sleek dark design with yellow detail) */}
              <Path d="M420 160 L490 80 H515 L480 180 Z" fill="#1e2022" stroke="#facc15" strokeWidth={1.5} />
              {/* Rudder Yellow Accent Decal */}
              <Path d="M470 120 L495 90 H505 L480 130 Z" fill="url(#refYellowGrad)" />
              
              {/* Horizontal rear wing stabilization fins */}
              <Path d="M460 215 L530 230 L520 240 L450 220 Z" fill="#0f1011" stroke="#facc15" strokeWidth={1} />
              <Path d="M460 175 L530 160 L520 150 L450 170 Z" fill="#0f1011" stroke="#facc15" strokeWidth={1} />

              {/* MAIN CARBON HULL (Streamlined cylindrical pod) */}
              <Path d="M160 170 C160 120 220 115 440 145 C485 150 510 170 500 205 C480 235 380 255 210 245 C175 240 160 210 160 170 Z" fill="url(#refSubHull)" stroke="#374151" strokeWidth={2.5} />

              {/* Hull Plating/Seam Segments (Industrial blueprint details) */}
              <Path d="M220 130 C220 170 210 210 205 242" fill="none" stroke="#4b5563" strokeWidth={1.5} />
              <Path d="M280 135 C285 170 280 210 270 245" fill="none" stroke="#4b5563" strokeWidth={1.5} />
              <Path d="M340 140 C345 170 342 210 330 248" fill="none" stroke="#4b5563" strokeWidth={1.5} />
              <Path d="M400 145 C405 175 402 210 390 250" fill="none" stroke="#4b5563" strokeWidth={1.5} />

              {/* INDUSTRIAL YELLOW ACCENTS (Fuselage panels) */}
              {/* Lower ventral yellow skid/accent guard */}
              <Path d="M225 244 C270 248 370 250 420 245 L415 253 C365 258 270 256 220 248 Z" fill="url(#refYellowGrad)" />
              <Path d="M190 225 L210 246 L200 250 L180 228 Z" fill="url(#refYellowGrad)" stroke="#1e2022" strokeWidth={1} />

              {/* NOSE ASSEMBLY (Yellow Segment & Turbine Intake) */}
              {/* Yellow nose collar plate */}
              <Path d="M160 170 C160 138 185 130 205 130 C195 160 195 190 205 215 C185 215 160 202 160 170 Z" fill="url(#refYellowGrad)" stroke="#1e2022" strokeWidth={1.5} />
              {/* Nose cone tip profile */}
              <Path d="M142 170 C142 148 152 142 165 142 C165 160 165 180 165 198 C152 198 142 192 142 170 Z" fill="#1e2022" />
              {/* Center Turbine Circular Intake hole (Front tunnel) */}
              <Ellipse cx="144" cy="170" rx="6" ry="14" fill="#030712" stroke="#facc15" strokeWidth={1.5} />
              <Ellipse cx="144" cy="170" rx="3" ry="8" fill="#000" />

              {/* CONNING TOWER / BRIDGE (Mounted on top) */}
              <Path d="M295 138 L305 90 H375 L385 142 Z" fill="url(#refSubHull)" stroke="#4b5563" strokeWidth={2} />
              <Path d="M305 90 H375 V102 H307 Z" fill="#0f1011" stroke="#facc15" strokeWidth={1} />
              
              {/* Futuristic angled cyan cockpit windshield on tower */}
              <Path d="M298 125 L310 96 H330 L322 130 Z" fill="url(#refCockpitGlass)" stroke="#38bdf8" strokeWidth={1.2} />
              <Path d="M302 120 L311 100" stroke="#fff" strokeWidth={2} opacity={0.5} />

              {/* Bridge Tower Yellow Decal Stripe */}
              <Path d="M352 108 H372 V124 H350 Z" fill="url(#refYellowGrad)" />
              <SvgText x="361" y="120" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                55
              </SvgText>

              {/* MULTIPLE COMMUNICATIONS ANTENNAS (Top array rods) */}
              <Line x1="318" y1="90" x2="318" y2="40" stroke="#4b5563" strokeWidth={3.2} />
              <Circle cx="318" cy="40" r="2.5" fill="#facc15" />

              <Line x1="334" y1="90" x2="334" y2="30" stroke="#1f2937" strokeWidth={2.8} />
              
              {/* Sonar Receiver Rod with blinking beacon */}
              <Line x1="345" y1="90" x2="345" y2="20" stroke="#4b5563" strokeWidth={4} />
              <AnimatedCircle
                cx="345"
                cy="20"
                r={beamPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [2, 5.5] })}
                fill="#ef4444"
                filter="url(#sonarGlow)"
              />

              <Line x1="358" y1="90" x2="358" y2="35" stroke="#1f2937" strokeWidth={2.5} />

              {/* DELTA WINGS / HYDROPLANES (Stabilizers with indicator stripes) */}
              {/* Port Side Main Wing (Angled down) */}
              <Path d="M260 195 L370 205 L350 230 L250 215 Z" fill="#1e2022" stroke="#4b5563" strokeWidth={1.5} />
              {/* Wing Endplate Yellow Tip */}
              <Path d="M350 203 L370 205 L365 212 L347 210 Z" fill="url(#refYellowGrad)" />
              <Line x1="280" y1="202" x2="330" y2="207" stroke="#facc15" strokeWidth={2} />

              {/* STARBOARD THRUSTER CYLINDERS (Yellow side boosters from reference) */}
              <G transform="translate(195, 30)">
                {/* Cylinder main body */}
                <Rect x="10" y="160" width="75" height="26" rx="6" fill="url(#refYellowGrad)" stroke="#1e2022" strokeWidth={2} />
                {/* Black front intake cap */}
                <Path d="M10 160 C5 160 2 166 2 173 C2 180 5 186 10 186 Z" fill="#0f1011" stroke="#facc15" strokeWidth={1} />
                <Circle cx="6" cy="173" r="3.5" fill="#000" />
                {/* Rear exhaust rim */}
                <Rect x="80" y="163" width="8" height="20" rx="2" fill="#1e2022" />
              </G>

              <G transform="translate(90, 50)">
                {/* Smaller lower yellow cylinder */}
                <Rect x="10" y="165" width="65" height="20" rx="5" fill="url(#refYellowGrad)" stroke="#1e2022" strokeWidth={1.8} />
                <Path d="M10 165 C6 165 3 170 3 175 C3 180 6 185 10 185 Z" fill="#0f1011" stroke="#facc15" strokeWidth={1} />
                <Circle cx="6" cy="175" r="2.5" fill="#000" />
                <Rect x="70" y="168" width="6" height="14" rx="2" fill="#1e2022" />
              </G>

              {/* TECHNICAL GRAPHICS & SERIAL NUMBERS ON HULL */}
              <SvgText x="285" y="185" fill="#9ca3af" fontSize="9" fontWeight="bold" letterSpacing={1}>
                D-78
              </SvgText>
              {/* Tiny warning decals */}
              <Rect x="235" y="178" width="8" height="6" fill="#ef4444" />
              <Rect x="247" y="178" width="8" height="6" fill="#facc15" />

              {/* Navigation Indicator LEDs */}
              <Circle cx="218" cy="150" r="3.5" fill="#22c55e" filter="url(#sonarGlow)" />
              <Circle cx="240" cy="152" r="3.5" fill="#ef4444" filter="url(#sonarGlow)" opacity={0.8} />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'rocket' || activeLevel?.id?.toLowerCase() === 'rocket') {
      return (
        <View style={{ width: 340, height: 380, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }], width: 340, height: 380, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={340} height={380} style={{ overflow: 'visible' }} viewBox="0 0 600 370">
              <G transform="scale(1.28) translate(-65, -32)">
              {/* Glow Filters & Specular Gradients */}
              <Defs>
                {/* Matte Carbon / Dark Metallic */}
                <SvgLinearGradient id="dangerousCarbon" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#2d3748" />
                  <Stop offset="50%" stopColor="#1a202c" />
                  <Stop offset="100%" stopColor="#0a0f1d" />
                </SvgLinearGradient>
                {/* Crimson Red Armor Panels */}
                <SvgLinearGradient id="dangerousCrimson" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#ef4444" />
                  <Stop offset="50%" stopColor="#dc2626" />
                  <Stop offset="100%" stopColor="#7f1d1d" />
                </SvgLinearGradient>
                {/* Amber/Orange Cockpit Glass */}
                <SvgLinearGradient id="dangerousAmberGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#fef08a" />
                  <Stop offset="40%" stopColor="#f97316" />
                  <Stop offset="100%" stopColor="#9a3412" />
                </SvgLinearGradient>
                {/* Fire Orange/Red Exhaust Flame */}
                <SvgLinearGradient id="dangerousFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#ef4444" opacity={0.95} />
                  <Stop offset="50%" stopColor="#f97316" opacity={0.75} />
                  <Stop offset="100%" stopColor="transparent" />
                </SvgLinearGradient>
                <Filter id="dangerousOrangeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation="8" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              </Defs>

              {/* Pedestal Cyber Laser Ring under rocket - Glowing Dangerous Orange */}
              <Ellipse cx="300" cy="285" rx="140" ry="25" fill="none" stroke="#f97316" strokeWidth={3} filter="url(#dangerousOrangeGlow)" />
              <Ellipse cx="300" cy="285" rx="90" ry="16" fill="none" stroke="#ef4444" strokeWidth={1.5} />

              {/* Crimson Red side wing attachments with warning marks */}
              {/* Left Wing */}
              <Path d="M245 130 C200 170 160 190 160 245 L240 225 Z" fill="url(#dangerousCrimson)" stroke="#ef4444" strokeWidth={1.5} />
              <Polygon points="175,205 230,195 228,218 170,225" fill="#f97316" opacity={0.7} />
              <Line x1="170" y1="230" x2="230" y2="220" stroke="#fff" strokeWidth={1} opacity={0.4} />

              {/* Right Wing */}
              <Path d="M355 130 C400 170 440 190 440 245 L360 225 Z" fill="url(#dangerousCrimson)" stroke="#ef4444" strokeWidth={1.5} />
              <Polygon points="425,205 370,195 372,218 430,225" fill="#f97316" opacity={0.7} />
              <Line x1="430" y1="230" x2="370" y2="220" stroke="#fff" strokeWidth={1} opacity={0.4} />

              {/* Main Rocket Body (Teardrop layout with carbon metal gradient) */}
              <Path d="M300 -50 C215 95 230 215 245 255 L300 275 L355 255 C370 215 385 95 300 -50 Z" fill="url(#dangerousCarbon)" stroke="#ef4444" strokeWidth={1} />
              
              {/* Specular curved lighting highlights along rocket center edge */}
              <Path d="M300 -48 C225 95 238 205 252 245" fill="none" stroke="#ffffff" strokeWidth={3.5} opacity={0.5} strokeLinecap="round" />
              <Path d="M300 -50 C245 95 258 205 272 245" fill="none" stroke="#f97316" strokeWidth={1.5} opacity={0.6} />

              {/* Amber Windshield glass visor (Holographic details) */}
              <Path d="M300 5 C265 95 265 175 265 195 H335 C335 175 335 95 300 5 Z" fill="url(#dangerousAmberGlass)" stroke="#f97316" strokeWidth={1.5} />
              <Path d="M295 28 A 22 22 0 0 1 318 70" fill="none" stroke="#ffffff" strokeWidth={3.5} opacity={0.6} />
              
              {/* Core reactor node */}
              <Rect x="282" y="155" width="36" height="30" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth={2} />
              <Circle cx="300" cy="170" r="5" fill="#f97316" filter="url(#dangerousOrangeGlow)" />

              {/* Dark iron exhaust bells nozzle connectors */}
              <Path d="M260 255 H340 L330 267 H270 Z" fill="#1a202c" stroke="#475569" strokeWidth={1} />

              <Rect x="245" y="218" width="45" height="32" rx="10" fill="#2d3748" stroke="#ef4444" strokeWidth={2.5} />
              <Circle cx="267" cy="234" r="11" fill="#0f172a" />
              
              <Rect x="310" y="218" width="45" height="32" rx="10" fill="#2d3748" stroke="#ef4444" strokeWidth={2.5} />
              <Circle cx="333" cy="234" r="11" fill="#0f172a" />

              {/* Bottom stabilizer fin */}
              <Polygon points="293,238 307,238 300,280" fill="url(#dangerousCrimson)" stroke="#ef4444" strokeWidth={1} />

              {/* Twin fire booster exhaust trails - Rendered ON TOP of the body so they are visible */}
              {/* Left Thruster (Nozzle center 267) Wiggling Plume */}
              <AnimatedPath 
                d={rocketFlameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M267 245 Q245 285 260 330 Q285 285 267 245 Z",
                    "M267 245 Q250 295 258 350 Q280 295 267 245 Z",
                    "M267 245 Q245 285 260 330 Q285 285 267 245 Z"
                  ]
                })} 
                fill="url(#dangerousFlameGrad)" 
                filter="url(#dangerousOrangeGlow)" 
              />
              <AnimatedPath 
                d={rocketFlameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M267 245 Q255 280 267 305 Q275 280 267 245 Z",
                    "M267 245 Q258 285 265 320 Q272 285 267 245 Z",
                    "M267 245 Q255 280 267 305 Q275 280 267 245 Z"
                  ]
                })} 
                fill="#fff5e6" 
                filter="url(#dangerousOrangeGlow)" 
                opacity={0.9} 
              />
              <AnimatedPath 
                d={rocketFlameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M265 245 L270 280 L267 245 Z",
                    "M265 245 L268 295 L267 245 Z",
                    "M265 245 L270 280 L267 245 Z"
                  ]
                })} 
                fill="#facc15" 
              />

              {/* Right Thruster (Nozzle center 333) Wiggling Plume */}
              <AnimatedPath 
                d={rocketFlameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M333 245 Q315 285 330 330 Q355 285 333 245 Z",
                    "M333 245 Q320 295 328 350 Q350 295 333 245 Z",
                    "M333 245 Q315 285 330 330 Q355 285 333 245 Z"
                  ]
                })} 
                fill="url(#dangerousFlameGrad)" 
                filter="url(#dangerousOrangeGlow)" 
              />
              <AnimatedPath 
                d={rocketFlameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M333 245 Q325 280 333 305 Q345 280 333 245 Z",
                    "M333 245 Q328 285 331 320 Q338 285 333 245 Z",
                    "M333 245 Q325 280 333 305 Q345 280 333 245 Z"
                  ]
                })} 
                fill="#fff5e6" 
                filter="url(#dangerousOrangeGlow)" 
                opacity={0.9} 
              />
              <AnimatedPath 
                d={rocketFlameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "M331 245 L335 280 L333 245 Z",
                    "M331 245 L332 295 L333 245 Z",
                    "M331 245 L335 280 L333 245 Z"
                  ]
                })} 
                fill="#facc15" 
              />

              {/* Continuous floating spark particles sliding downward */}
              <AnimatedCircle 
                cx="255" 
                cy={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [255, 340] })} 
                r={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 1] })} 
                opacity={rocketFlameAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.9, 0.8, 0] })} 
                fill="#f97316" 
                filter="url(#dangerousOrangeGlow)" 
              />
              <AnimatedCircle 
                cx="263" 
                cy={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [260, 325] })} 
                r={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [3, 0.5] })} 
                opacity={rocketFlameAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.9, 0.7, 0] })} 
                fill="#facc15" 
              />
              <AnimatedCircle 
                cx="327" 
                cy={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [255, 340] })} 
                r={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 1] })} 
                opacity={rocketFlameAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.9, 0.8, 0] })} 
                fill="#f97316" 
                filter="url(#dangerousOrangeGlow)" 
              />
              <AnimatedCircle 
                cx="335" 
                cy={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [260, 325] })} 
                r={rocketFlameAnim.interpolate({ inputRange: [0, 1], outputRange: [3, 0.5] })} 
                opacity={rocketFlameAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.9, 0.7, 0] })} 
                fill="#facc15" 
              />
              </G>
            </Svg>
          </Animated.View>
        </View>
      );
    }

    if (activeLevel?.id === 'bank') {
      return (
        /* Luxury Classic Gold & White Marble Bank - Clean realistic premium design */
        <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }], alignItems: 'center', justifyContent: 'center', width: 350, height: 350, position: 'relative' }}>
          {/* Isometric Bank 3D Model */}
          <View style={{ width: 320, height: 320, zIndex: 10 }}>
            <Svg width="320" height="320" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
              <Defs>
                <Filter id="bankSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation="3.5" result="blur" />
                  <FeMerge>
                    <FeMergeNode in="blur" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
                <SvgLinearGradient id="marbleWallF" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#ffffff" />
                  <Stop offset="60%" stopColor="#f1f5f9" />
                  <Stop offset="100%" stopColor="#cbd5e1" />
                </SvgLinearGradient>
                <SvgLinearGradient id="marbleWallR" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#e2e8f0" />
                  <Stop offset="100%" stopColor="#94a3b8" />
                </SvgLinearGradient>
                <SvgLinearGradient id="goldClassic" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#ffe082" />
                  <Stop offset="50%" stopColor="#ffd54f" />
                  <Stop offset="100%" stopColor="#ffb300" />
                </SvgLinearGradient>
                <SvgLinearGradient id="roofShadow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#475569" />
                  <Stop offset="100%" stopColor="#1e293b" />
                </SvgLinearGradient>
              </Defs>

              {/* Platform Base Shadow */}
              <Ellipse cx="200" cy="315" rx="150" ry="50" fill="rgba(0,0,0,0.55)" />

              {/* 🏦 STEP 1: Marble Base Stairs (Foundation of a classic bank) */}
              {/* Bottom Step */}
              <Path d="M60 290 L200 220 L340 290 L200 360 Z" fill="url(#marbleWallR)" stroke="#94a3b8" strokeWidth={1.5} />
              <Path d="M60 290 L200 360 L200 372 L60 302 Z" fill="#64748b" />
              <Path d="M340 290 L200 360 L200 372 L340 302 Z" fill="#475569" />

              {/* Middle Step */}
              <Path d="M75 282 L200 220 L325 282 L200 344 Z" fill="url(#marbleWallF)" stroke="#cbd5e1" strokeWidth={1} />
              <Path d="M75 282 L200 344 L200 353 L75 291 Z" fill="#94a3b8" />
              <Path d="M325 282 L200 344 L200 353 L325 291 Z" fill="#64748b" />

              {/* Top Base Step */}
              <Path d="M90 274 L200 220 L310 274 L200 328 Z" fill="url(#marbleWallR)" stroke="#94a3b8" strokeWidth={1} />
              <Path d="M90 274 L200 328 L200 335 L90 281 Z" fill="#64748b" />
              <Path d="M310 274 L200 328 L200 335 L310 281 Z" fill="#475569" />

              {/* 🏛️ STEP 2: Classic Greek Columns (White Marble with Gold Caps) */}
              {/* Column 1 (Left Outer) */}
              <Path d="M102 260 L102 165 L116 158 L116 253 Z" fill="url(#marbleWallF)" />
              <Path d="M116 253 L116 158 L126 163 L126 258 Z" fill="url(#marbleWallR)" />
              {/* Gold Cap & Base */}
              <Rect x="100" y="156" width="28" height="6" fill="url(#goldClassic)" rx="1.5" />
              <Rect x="100" y="255" width="28" height="6" fill="url(#goldClassic)" rx="1.5" />

              {/* Column 2 (Left Inner) */}
              <Path d="M142 240 L142 157 L153 151 L153 234 Z" fill="url(#marbleWallF)" />
              <Path d="M153 234 L153 151 L162 156 L162 239 Z" fill="url(#marbleWallR)" />
              <Rect x="140" y="149" width="24" height="5" fill="url(#goldClassic)" rx="1.5" />
              <Rect x="140" y="236" width="24" height="5" fill="url(#goldClassic)" rx="1.5" />

              {/* Column 3 (Right Inner) */}
              <Path d="M238 239 L238 156 L247 151 L247 234 Z" fill="url(#marbleWallF)" />
              <Path d="M247 234 L247 151 L258 157 L258 240 Z" fill="url(#marbleWallR)" />
              <Rect x="236" y="149" width="24" height="5" fill="url(#goldClassic)" rx="1.5" />
              <Rect x="236" y="236" width="24" height="5" fill="url(#goldClassic)" rx="1.5" />

              {/* Column 4 (Right Outer) */}
              <Path d="M274 258 L274 163 L284 158 L284 253 Z" fill="url(#marbleWallF)" />
              <Path d="M284 253 L284 158 L298 265 L298 260 Z" fill="url(#marbleWallR)" />
              <Rect x="272" y="156" width="28" height="6" fill="url(#goldClassic)" rx="1.5" />
              <Rect x="272" y="255" width="28" height="6" fill="url(#goldClassic)" rx="1.5" />

              {/* 🚪 STEP 3: Large Royal Golden Vault Door (Center Entrance) */}
              <Path d="M172 230 L172 152 L228 152 L228 230 Z" fill="#1e293b" stroke="url(#goldClassic)" strokeWidth={2.2} />
              {/* Vault Wheel */}
              <Circle cx="200" cy="191" r="24" fill="#0f172a" stroke="url(#goldClassic)" strokeWidth={3} />
              <Circle cx="200" cy="191" r="14" fill="url(#goldClassic)" />
              {/* Handles */}
              <Path d="M200 167 L200 215" stroke="url(#goldClassic)" strokeWidth={2.5} />
              <Path d="M176 191 H224" stroke="url(#goldClassic)" strokeWidth={2.5} />
              <Circle cx="200" cy="191" r="5" fill="#ffffff" />

              {/* 🏛️ STEP 4: Classic Bank Pediment (Triangle Roof with Golden Crown detailing) */}
              <Polygon points="80,165 200,95 320,165" fill="url(#marbleWallR)" stroke="url(#goldClassic)" strokeWidth={4} filter="url(#bankSoftGlow)" />
              <Polygon points="95,160 200,108 305,160" fill="url(#roofShadow)" />
              
              {/* Golden Crest inside the triangle (Dollar sign ornament representing Treasury) */}
              <Circle cx="200" cy="138" r="13" fill="url(#goldClassic)" />
              <SvgText x="200" y="144" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle">$</SvgText>

              {/* Gold Crown Spire on Roof top */}
              <Path d="M200 95 L200 80" stroke="url(#goldClassic)" strokeWidth={3} />
              <Circle cx="200" cy="80" r="4.5" fill="#ffffff" filter="url(#bankSoftGlow)" />

              {/* 🪙 STEP 5: Stacked Gold Coins at the front sides (Visual representation of treasure) */}
              {/* Left Coin Stack */}
              <G transform="translate(10, 5)">
                <Ellipse cx="115" cy="275" rx="14" ry="5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={1} />
                <Ellipse cx="115" cy="271" rx="14" ry="5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={1} />
                <Ellipse cx="115" cy="267" rx="14" ry="5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={1} />
              </G>
              {/* Right Coin Stack */}
              <G transform="translate(-10, 5)">
                <Ellipse cx="285" cy="275" rx="14" ry="5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={1} />
                <Ellipse cx="285" cy="271" rx="14" ry="5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={1} />
                <Ellipse cx="285" cy="267" rx="14" ry="5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={1} />
              </G>

              {/* 🪙 Animated Spill: Gold Coins rolling out from the Vault Door down the stairs */}
              <AnimatedG transform={(() => {
                const coinProgress = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
                const coinOpacity = orbitAnim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });
                return [{ translateY: coinProgress }, { translateX: orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -35] }) }];
              })()} style={{ opacity: orbitAnim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }) }}>
                {/* Coin spilling left */}
                <Circle cx="190" cy="210" r="5.5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={0.8} />
              </AnimatedG>
              
              <AnimatedG transform={(() => {
                const coinProgress = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 55] });
                return [{ translateY: coinProgress }, { translateX: orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }];
              })()} style={{ opacity: orbitAnim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }) }}>
                {/* Coin spilling right */}
                <Circle cx="210" cy="210" r="5.5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={0.8} />
              </AnimatedG>

              <AnimatedG transform={(() => {
                const coinProgress = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 75] });
                return [{ translateY: coinProgress }, { translateX: orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }];
              })()} style={{ opacity: orbitAnim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }) }}>
                {/* Coin spilling center */}
                <Circle cx="200" cy="215" r="5.5" fill="url(#goldClassic)" stroke="#d97706" strokeWidth={0.8} />
              </AnimatedG>

              {/* 💸 Animated Flying Cash (Green & Gold Dollar notes floating in the wind) */}
              <AnimatedG transform={(() => {
                const windX = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] });
                const windY = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -50] });
                return [{ translateX: windX }, { translateY: windY }];
              })()}>
                {/* Green Bill 1 */}
                <Rect x="150" y="240" width="16" height="8" rx="1.5" fill="#86efac" stroke="#15803d" strokeWidth={0.6} transform="rotate(15, 150, 240)" />
                {/* Gold Bill 2 */}
                <Rect x="230" y="250" width="14" height="7" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth={0.6} transform="rotate(-25, 230, 250)" />
              </AnimatedG>

              <AnimatedG transform={(() => {
                const windX = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [60, -90] });
                const windY = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -60] });
                return [{ translateX: windX }, { translateY: windY }];
              })()}>
                {/* Green Bill 3 */}
                <Rect x="130" y="210" width="15" height="8" rx="1" fill="#86efac" stroke="#166534" strokeWidth={0.6} transform="rotate(-10, 130, 210)" />
                {/* Green Bill 4 */}
                <Rect x="260" y="200" width="17" height="9" rx="1.5" fill="#a7f3d0" stroke="#047857" strokeWidth={0.6} transform="rotate(35, 260, 200)" />
              </AnimatedG>
            </Svg>
          </View>

          {/* Floating digital gold particles rising upward */}
          {particles.map((p, index) => (
            <Animated.View
              key={`station-spark-${index}`}
              style={{
                position: 'absolute',
                width: index % 2 === 0 ? 8 : 6,
                height: index % 2 === 0 ? 8 : 6,
                borderRadius: 99,
                backgroundColor: index % 3 === 0 ? '#fbbf24' : index % 3 === 1 ? '#f59e0b' : '#10b981',
                opacity: p.opacity,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y.interpolate({ inputRange: [-20, 260], outputRange: [42, 260] }) },
                  { scale: p.scale }
                ],
                shadowColor: '#fbbf24',
                shadowOpacity: 0.8,
                shadowRadius: 5,
                zIndex: 15
              }}
              pointerEvents="none"
            />
          ))}

          {/* Ambient Platform Ring */}
          <View style={{ position: 'absolute', bottom: 32, width: 280, height: 48, borderRadius: 140, backgroundColor: 'rgba(0,243,255,0.06)' }} pointerEvents="none" />
        </Animated.View>
      );
    }

    return (
      /* Premium Rocket SVG dynamically colored */
      <Animated.View style={{ transform: [{ translateY: pulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [0, -4] }) }] }}>
        <Svg width="180" height="180" viewBox="0 0 60 72">
          <Defs>
            <SvgLinearGradient id="rocketBodyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#eaffff" />
              <Stop offset="0.4" stopColor={
                activeIndex === 0 ? '#9dff2f' :
                activeIndex === 1 ? '#39d8ff' :
                activeIndex === 3 ? '#ffd436' :
                activeIndex === 4 ? '#ff4545' :
                activeIndex === 5 ? '#49f7ff' :
                activeIndex === 6 ? '#eaffff' : '#ff4fd8'
              } />
              <Stop offset="1" stopColor="#050209" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M30 4 C38 20 44 36 46 48 L52 52 L52 58 L42 56 C38 62 34 66 30 70 C26 66 22 62 18 56 L8 58 L8 52 L14 48 C16 36 22 20 30 4Z" fill="url(#rocketBodyGrad)" />
          <Ellipse cx="30" cy="38" rx="6" ry="7" fill="#123353" opacity="0.6" />
          <Circle cx="30" cy="37" r="3" fill="#fff" />
          <Path d="M18 48 L8 55 L8 60 L22 54Z" fill="#a855f7" opacity="0.8" />
          <Path d="M42 48 L52 55 L52 60 L38 54Z" fill="#a855f7" opacity="0.8" />
          <Path d="M30 5 C34 22 36 38 35 48" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        </Svg>
      </Animated.View>
    );
  };

  return (
    <View>
      <Animated.View style={{ transform: [{ scale: isGateLocked ? pulseAnim : 1 }] }}>
        <TouchableOpacity
          onPress={() => { if (isGateLocked) handleOpenGateClick(); else setShowPath(!showPath); }}
          activeOpacity={0.8}
          style={[
            styles.boxContainer,
            {
              borderColor: isGateLocked ? '#fbbf24' : 'rgba(168,85,247,0.3)',
              borderWidth: isGateLocked ? 2 : 1,
            }
          ]}
        >
          {(() => {
              const localImage = LEVEL_IMAGES[activeLevel?.id];
              if (localImage) {
                return (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Image source={localImage} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
                  </View>
                );
              } else {
              return (
                <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: fadeAnim }}>
                  <Text style={styles.emojiText}>{LEVEL_ICONS[activeLevel?.id] || '🏠'}</Text>
                </Animated.View>
              );
            }
          })()}

          <Animated.View style={[styles.bottomInfo, { opacity: fadeAnim }]}>
            <Text numberOfLines={1} style={styles.levelNameText}>{activeLevel?.name || 'Home'}</Text>
            <View style={styles.progressBarWrapper}>
              <View style={[styles.progressBarFill, { width: `${displayPct}%` }]} />
            </View>
            <Text style={styles.percentageText}>{displayPct}%</Text>
          </Animated.View>

          {isGateLocked && (
            <View style={styles.lockOverlay}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient colors={['#fbbf24', '#f59e0b', '#f97316']} style={styles.unlockCircle}>
                  <Unlock size={14} color="black" />
                </LinearGradient>
              </Animated.View>
            </View>
          )}

          {shouldFireGate && (
            <View style={styles.readyBadge}>
              <Zap size={8} color="#fbbf24" />
              <Animated.Text style={[styles.readyText, { opacity: readyAnim }]}>LIVE</Animated.Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={showPath} transparent animationType="fade" onRequestClose={() => setShowPath(false)}>
        <View style={styles.fullscreenModal}>
          <LinearGradient colors={['#050209', '#0d0724', '#050209']} style={StyleSheet.absoluteFillObject} />

          {/* BACKGROUND STARS GRID MOCK */}
          <View style={styles.gridOverlay} pointerEvents="none" />

          {/* HEADER */}
          <View style={styles.dashboardHeader}>
            <Text style={styles.dashboardTitle}>LOOT LEVEL STATION</Text>
            <TouchableOpacity onPress={() => setShowPath(false)} style={styles.closeBtn}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* MAIN BOARD */}
          <View style={styles.dashboardBody}>
            
            {/* LEFT COLUMN: LEVEL SELECTORS (Lv.1 to Lv.8) */}
            <View style={styles.leftSelectorCol}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
                {(levels as LootLevel[]).map((level: LootLevel, idx: number) => {
                  const isSelected = activeIndex === idx;
                  const isUnlocked = idx <= currentLevelIndex;
                  const isCurrent = idx === currentLevelIndex;
                  
                  return (
                    <TouchableOpacity
                      key={level.id}
                      onPress={() => setActiveIndex(idx)}
                      activeOpacity={0.85}
                      hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
                      style={[
                        styles.levelSelectorItem,
                        isSelected && styles.levelSelectorItemSelected,
                        !isUnlocked && styles.levelSelectorItemLocked
                      ]}
                    >
                      <View style={[
                        styles.levelSelectorBadge,
                        isSelected ? { backgroundColor: '#fbbf24' } : isUnlocked ? { backgroundColor: '#a855f7' } : { backgroundColor: '#334155' }
                      ]}>
                        <Text style={[styles.levelSelectorBadgeText, { color: isSelected ? '#000' : '#fff' }]}>
                          Lv.{idx + 1}
                        </Text>
                      </View>
                      <Text style={[
                        styles.levelSelectorText,
                        isSelected ? { color: '#fbbf24' } : isUnlocked ? { color: '#e2e8f0' } : { color: '#64748b' }
                      ]}>
                        {level.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* CENTER COLUMN: VEHICLE / ROCKET VISUALIZATION ON STAGE */}
            <View style={styles.centerStageCol}>
              <View style={styles.showcaseStage}>
                {renderCenterStageContent()}

                {/* Rotating Glowing Pedestal Floor */}
                <View style={styles.pedestalStageBase} />
              </View>

              {/* Reset countdown box */}
              <View style={styles.countdownBox}>
                <Text style={styles.countdownLabel}>Reset countdown:</Text>
                <View style={styles.countdownTimerRow}>
                  <Text style={styles.countdownTimeVal}>{timeLeftVal.hours}</Text>
                  <Text style={styles.countdownColon}>:</Text>
                  <Text style={styles.countdownTimeVal}>{timeLeftVal.minutes}</Text>
                  <Text style={styles.countdownColon}>:</Text>
                  <Text style={styles.countdownTimeVal}>{timeLeftVal.seconds}</Text>
                </View>
              </View>
            </View>

            {/* RIGHT COLUMN: PROGRESS METERS */}
            <View style={styles.rightProgressCol}>
              <View style={styles.verticalProgressContainer}>
                <View style={styles.verticalProgressOuter}>
                  <View style={[styles.verticalProgressInner, { height: `${displayPct}%` }]} />
                </View>
                <View style={styles.verticalProgressPercentBadge}>
                  <Text style={styles.verticalProgressPercentText}>{displayPct}%</Text>
                </View>
              </View>
            </View>

          </View>

          {/* REWARDS SECTION */}
          {/* REWARDS SECTION */}
          <View style={styles.rewardsPanel}>
            <View style={styles.rewardsPanelHeader}>
              <Text style={styles.rewardsPanelTitle}>🎁 Unlocks & Rewards (2x Threshold Pool)</Text>
            </View>
            {(() => {
              // Dynamic store uploaded items mapping matching the 30 Firestore boutique items
              const LEVEL_STORE_ITEMS: Record<string, { frame: string; frameName: string; entry: string; entryName: string; themeColor: string }> = {
                home: { frame: 'basra', frameName: 'Basra Golden', entry: 'basra_entry', entryName: 'Royal Basra Entry', themeColor: '#fbbf24' },
                bank: { frame: 'Golden Spark', frameName: 'Golden Spark', entry: 'CS leader', entryName: 'CS leader Entry', themeColor: '#00f3ff' },
                car: { frame: 'Dark Star', frameName: 'Dark Star Frame', entry: 'CS leader', entryName: 'CS leader Entry', themeColor: '#ff0c3c' },
                hotel: { frame: 'Immortal Glory', frameName: 'Immortal Glory', entry: 'Customer Service', entryName: 'CS Official Entry', themeColor: '#a855f7' },
                bus: { frame: 'Cloud Sky', frameName: 'Cloud Sky Frame', entry: 'CS leader', entryName: 'CS leader Entry', themeColor: '#ec4899' },
                train: { frame: 'Dragon Elite', frameName: 'Dragon Elite', entry: 'Dragon Elite', entryName: 'Dragon Elite Entry', themeColor: '#10b981' },
                ship: { frame: 'Angel Wing', frameName: 'Angel Wing Frame', entry: 'Angel Wing', entryName: 'Angel Wing Entry', themeColor: '#06b6d4' },
                aeroplane: { frame: 'Dragon Elite', frameName: 'Dragon Elite Frame', entry: 'Dragon Elite', entryName: 'Dragon Elite Entry', themeColor: '#f97316' },
                submarine: { frame: 'Lion Roar', frameName: 'Lion Roar Frame', entry: 'Lion Roar', entryName: 'Lion Roar Entry', themeColor: '#3b82f6' },
                rocket: { frame: 'Lion Roar', frameName: 'Lion Roar Frame', entry: 'Lion Roar', entryName: 'Lion Roar Entry', themeColor: '#ef4444' }
              };

              const activeId = activeLevel?.id?.toLowerCase() || 'home';
              const storeConfig = LEVEL_STORE_ITEMS[activeId] || LEVEL_STORE_ITEMS.home;

              // Helper to calculate dynamic EXP based on the selected level index
              const getLevelExp = (lvlId: string, rank: number) => {
                const list = ['home', 'bank', 'car', 'hotel', 'bus', 'train', 'ship', 'aeroplane', 'submarine', 'rocket'];
                const idx = Math.max(0, list.indexOf(lvlId?.toLowerCase() || 'home'));
                const multiplier = 1 + (2.111 * idx);
                const baseExp = rank === 1 ? 5000 : rank === 2 ? 2500 : 1000;
                return Math.round(baseExp * multiplier);
              };

              const coinsPool = (activeLevel?.threshold || 10000000) * 2;
              const exp1 = getLevelExp(activeLevel?.id, 1);
              const exp2 = getLevelExp(activeLevel?.id, 2);
              const exp3 = getLevelExp(activeLevel?.id, 3);
              
              // Frame dynamic preview image mapping if custom uploaded frames
              const getFrameAssetUri = (frameKey: string) => {
                const match = storeItems.find(item => item.name === frameKey || item.id === frameKey);
                return match?.imageUrl || match?.url || frameKey;
              };

              const targetFrameMedia = getFrameAssetUri(storeConfig.frame);

              const currentLvlId = activeLevel?.id?.toLowerCase() || 'home';
              const highLevelList = ['aeroplane', 'submarine', 'rocket'];
              const isHighLvl = highLevelList.includes(currentLvlId);

              return (
                <View style={styles.rewardsShelfRow}>
                  {/* TOP 1 */}
                  <View style={styles.rewardShelfItem}>
                    <View style={styles.rewardItemTopBadge}>
                      <Text style={styles.rewardItemTopBadgeText}>🥇 Rank 1</Text>
                    </View>
                    <View style={[styles.rewardCardArt, { borderColor: '#fbbf24', paddingVertical: isHighLvl ? 4 : 8, justifyContent: 'center', alignItems: 'center' }]}>
                      <AvatarFrame frameMediaUrl={targetFrameMedia} size={42} />
                      <Text style={{ fontSize: 7, color: '#fbbf24', fontWeight: '800', marginTop: 3, textAlign: 'center' }} numberOfLines={1}>
                        {storeConfig.frameName}
                      </Text>
                      {isHighLvl && (
                        <>
                          <Text style={{ fontSize: 6, color: '#f8fafc', fontWeight: '600', marginTop: 1, backgroundColor: 'rgba(251,191,36,0.15)', px: 4, borderRadius: 2, textAlign: 'center' }} numberOfLines={1}>
                            ✨ Theme Reward
                          </Text>
                          <Text style={{ fontSize: 6, color: '#38bdf8', fontWeight: '600', marginTop: 1, backgroundColor: 'rgba(56,189,248,0.15)', px: 4, borderRadius: 2, textAlign: 'center' }} numberOfLines={1}>
                            🚀 {storeConfig.entryName}
                          </Text>
                        </>
                      )}
                    </View>
                    <Text style={[styles.rewardItemValText, { color: '#fbbf24', marginTop: 2 }]}>+{exp1.toLocaleString()} EXP</Text>
                  </View>

                  {/* TOP 2 */}
                  <View style={styles.rewardShelfItem}>
                    <View style={styles.rewardItemTopBadge}>
                      <Text style={styles.rewardItemTopBadgeText}>🥈 Rank 2</Text>
                    </View>
                    <View style={[styles.rewardCardArt, { borderColor: '#cbd5e1', paddingVertical: 8, justifyContent: 'center', alignItems: 'center' }]}>
                      <AvatarFrame frameMediaUrl={targetFrameMedia} size={42} />
                      <Text style={{ fontSize: 7, color: '#cbd5e1', fontWeight: '800', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                        {storeConfig.frameName}
                      </Text>
                    </View>
                    <Text style={[styles.rewardItemValText, { color: '#cbd5e1', marginTop: 2 }]}>+{exp2.toLocaleString()} EXP</Text>
                  </View>

                  {/* TOP 3 */}
                  <View style={styles.rewardShelfItem}>
                    <View style={styles.rewardItemTopBadge}>
                      <Text style={styles.rewardItemTopBadgeText}>🥉 Rank 3</Text>
                    </View>
                    <View style={[styles.rewardCardArt, { borderColor: '#b45309', paddingVertical: 8, justifyContent: 'center', alignItems: 'center' }]}>
                      <AvatarFrame frameMediaUrl={targetFrameMedia} size={42} />
                      <Text style={{ fontSize: 7, color: '#b45309', fontWeight: '800', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                        {storeConfig.frameName}
                      </Text>
                    </View>
                    <Text style={[styles.rewardItemValText, { color: '#b45309', marginTop: 2 }]}>+{exp3.toLocaleString()} EXP</Text>
                  </View>

                  {/* COIN POOL */}
                  <View style={styles.rewardShelfItem}>
                    <View style={[styles.rewardItemTopBadge, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.rewardItemTopBadgeText}>Coin Share</Text>
                    </View>
                    <View style={[styles.rewardCardArt, { borderColor: '#10b981', paddingVertical: 6, justifyContent: 'center', alignItems: 'center' }]}>
                      <GoldenCoin size={32} />
                      <Text style={{ fontSize: 8, color: '#4ade80', fontWeight: '800', marginTop: 4 }}>Proportional</Text>
                    </View>
                    <Text style={[styles.rewardItemValText, { color: '#4ade80' }]}>{coinsPool.toLocaleString()}</Text>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* FOOTER ACTIONS */}
          <View style={styles.dashboardFooter}>
            <TouchableOpacity style={styles.rankingFooterBtn}>
              <Text style={styles.rankingFooterBtnText}>Ranking</Text>
            </TouchableOpacity>
          </View>

        </View>
      </Modal>

      {/* FULL SCREEN SVG LEVEL PREVIEW MODAL */}
      <LootLevelAnimation
        visible={showPreviewAnimation}
        levelName={previewLevelName}
        onComplete={() => {
          setShowPreviewAnimation(false);
          setPreviewLevelName(undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    width: 60, height: 60, borderRadius: 16, padding: 6,
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(30,27,75,0.9)', overflow: 'hidden', position: 'relative',
  },
  emojiText: { fontSize: 22 },
  bottomInfo: { width: '100%', alignItems: 'center' },
  levelNameText: { fontSize: 7, fontWeight: '900', color: 'white', textTransform: 'uppercase', textAlign: 'center' },
  progressBarWrapper: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9, overflow: 'hidden', marginTop: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#a855f7', borderRadius: 9 },
  percentageText: { fontSize: 5, fontWeight: '900', color: '#e9d5ff', textAlign: 'center', marginTop: 1 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  unlockCircle: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'white',
  },
  readyBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#dc2626', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#fbbf24',
  },
  readyText: { color: '#fbbf24', fontSize: 6, fontWeight: '900' },
  
  // FULLSCREEN DASHBOARD MODAL STYLES
  fullscreenModal: {
    flex: 1,
    paddingTop: 45,
    paddingBottom: 24,
    backgroundColor: '#050209',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    zIndex: 10,
  },
  dashboardTitle: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(56, 189, 248, 0.5)',
    textShadowRadius: 6,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  dashboardBody: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  leftSelectorCol: {
    width: '28%',
    height: '100%',
    zIndex: 99,
    elevation: 10,
  },
  levelSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    gap: 6,
  },
  levelSelectorItemSelected: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  levelSelectorItemLocked: {
    opacity: 0.5,
  },
  levelSelectorBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelSelectorBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  levelSelectorText: {
    fontSize: 10,
    fontWeight: '700',
  },
  centerStageCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  showcaseStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 180,
  },
  pedestalStageBase: {
    width: 180,
    height: 18,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56,189,248,0.1)',
    marginTop: -8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  countdownBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  countdownLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  countdownTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  countdownTimeVal: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '900',
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  countdownColon: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
  },
  rightProgressCol: {
    width: '10%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalProgressContainer: {
    width: 24,
    height: '80%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  verticalProgressOuter: {
    width: 12,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  verticalProgressInner: {
    width: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
  },
  verticalProgressPercentBadge: {
    position: 'absolute',
    bottom: -24,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  verticalProgressPercentText: {
    color: '#38bdf8',
    fontSize: 8,
    fontWeight: '900',
  },
  rewardsPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  rewardsPanelHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardsPanelTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  rewardsShelfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rewardShelfItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardItemTopBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
    marginBottom: -6,
  },
  rewardItemTopBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  rewardCardArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  rewardItemValText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },
  dashboardFooter: {
    alignItems: 'center',
    marginTop: 16,
  },
  rankingFooterBtn: {
    width: '85%',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rankingFooterBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  popupCard: {
    position: 'absolute', bottom: 86, right: 8, width: 290,
    backgroundColor: '#1e1b4b', borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)', padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
  },
  openGateBtn: { backgroundColor: '#fbbf24', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  openGateBtnText: { color: 'black', fontWeight: '900', fontSize: 10 },
});
