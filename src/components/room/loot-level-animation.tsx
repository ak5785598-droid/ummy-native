import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldenCoin } from '../GoldenCoin';
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

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

import { TopSupporter } from '../../lib/types';

interface LootLevelAnimationProps {
  visible: boolean;
  videoUrl?: string;
  levelName?: string;
  topSupporters?: TopSupporter[];
  onComplete: () => void;
}

export function LootLevelAnimation({ visible, videoUrl, levelName, topSupporters = [], onComplete }: LootLevelAnimationProps) {
  const videoRef = useRef<any>(null);
  const [status, setStatus] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const engineVibe = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.8)).current;
  const lightning1Opacity = useRef(new Animated.Value(0)).current;
  const lightning2Opacity = useRef(new Animated.Value(0)).current;

  // Car Level – Rain + Flash + Headlight Beam
  const carFlashOpacity = useRef(new Animated.Value(0)).current;
  const headlightBeamOpacity = useRef(new Animated.Value(0)).current;
  const rainDrops = useRef(
    Array.from({ length: 18 }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // Premium Mansion animation states
  const auraRotateAnim = useRef(new Animated.Value(0)).current;
  const beamPulseAnim = useRef(new Animated.Value(0.4)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      y: new Animated.Value(260),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current;

  // Unlock sequence animations (Home Level – matching HTML V5 premium effects)
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const bannerY = useRef(new Animated.Value(-35)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const scanX = useRef(new Animated.Value(-220)).current;
  const scanOpacity = useRef(new Animated.Value(0)).current;
  const crownScale = useRef(new Animated.Value(0.2)).current;
  const crownOpacity = useRef(new Animated.Value(0)).current;
  const sparkLineOpacity = useRef(new Animated.Value(0)).current;
  const sparkLineScaleX = useRef(new Animated.Value(0.2)).current;
  const mansionShakeX = useRef(new Animated.Value(0)).current;
  const sceneGlowScale = useRef(new Animated.Value(0.92)).current;

  // Reward distribution & Top 3 summary states
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);

  // Calculate dynamic EXP values based on the level index N
  const getLevelExp = (lvlName: string, rank: number) => {
    const list = ['home', 'bank', 'car', 'hotel', 'bus', 'train', 'ship', 'aeroplane', 'submarine', 'rocket'];
    const idx = Math.max(0, list.indexOf(lvlName?.toLowerCase() || 'home'));
    const multiplier = 1 + (2.111 * idx);
    const baseExp = rank === 1 ? 5000 : rank === 2 ? 2500 : 1000;
    return Math.round(baseExp * multiplier);
  };

  // Continuous Rocket exhaust flame animation value
  const rocketFlameAnim = useRef(new Animated.Value(0)).current;

  // Gate open translation and gold coin blast animation states
  const gateOpenAnim = useRef(new Animated.Value(0)).current;
  const coinBurstParticles = useRef(
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // Initialize loop for rocket flame animation
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (visible) {
      animLoop = Animated.loop(
        Animated.timing(rocketFlameAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false, // SVG paths coordinates interpolation requires false
        })
      );
      animLoop.start();
    }
    return () => {
      animLoop?.stop();
    };
  }, [visible]);

  // Orbit interpolations
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

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    // Auto-complete after 4.5 seconds
    timerRef.current = setTimeout(() => {
      onComplete();
    }, 4500);

    // If it is the car level, trigger engine vibration, glow loop, and lightning bolt loops
    let cleanupFuncs: Array<() => void> = [];

    if (levelName?.toLowerCase() === 'car') {
      // ── ENGINE VIBRATE + GLOW PULSE ─────────────────────────
      const carAnims = Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(engineVibe, { toValue: -1.2, duration: 60, useNativeDriver: true }),
            Animated.timing(engineVibe, { toValue: 1.2, duration: 60, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowPulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
            Animated.timing(glowPulse, { toValue: 0.75, duration: 900, useNativeDriver: true }),
          ])
        ),
      ]);
      carAnims.start();
      cleanupFuncs.push(() => carAnims.stop());

      // ── HEADLIGHT BEAM (pulsing on/off) ─────────────────────
      const beamLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(headlightBeamOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(headlightBeamOpacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
        ])
      );
      beamLoop.start();
      cleanupFuncs.push(() => beamLoop.stop());

      // ── LIGHTNING BOLTS ──────────────────────────────────────
      let lightningActive = true;
      const triggerFlash = () => {
        carFlashOpacity.setValue(0);
        Animated.sequence([
          Animated.timing(carFlashOpacity, { toValue: 0.95, duration: 60, useNativeDriver: true }),
          Animated.timing(carFlashOpacity, { toValue: 0.3, duration: 40, useNativeDriver: true }),
          Animated.timing(carFlashOpacity, { toValue: 0.8, duration: 50, useNativeDriver: true }),
          Animated.timing(carFlashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      };
      const runLightning = () => {
        if (!lightningActive) return;
        Animated.sequence([
          Animated.delay(Math.random() * 600 + 300),
          Animated.timing(lightning1Opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(lightning1Opacity, { toValue: 0.2, duration: 30, useNativeDriver: true }),
          Animated.timing(lightning1Opacity, { toValue: 0.8, duration: 40, useNativeDriver: true }),
          Animated.timing(lightning1Opacity, { toValue: 0, duration: 60, useNativeDriver: true }),
          Animated.delay(Math.random() * 700 + 400),
          Animated.timing(lightning2Opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(lightning2Opacity, { toValue: 0.3, duration: 40, useNativeDriver: true }),
          Animated.timing(lightning2Opacity, { toValue: 0.7, duration: 40, useNativeDriver: true }),
          Animated.timing(lightning2Opacity, { toValue: 0, duration: 80, useNativeDriver: true }),
        ]).start(() => {
          if (visible && lightningActive) {
            triggerFlash();
            runLightning();
          }
        });
      };
      runLightning();
      cleanupFuncs.push(() => { lightningActive = false; });

      // ── RAIN DROPS ──────────────────────────────────────────
      const RAIN_H = 300; // container height
      let rainActive = true;
      rainDrops.forEach((drop, idx) => {
        const animateDrop = () => {
          if (!rainActive) return;
          drop.x.setValue(Math.random() * 360 - 10);
          drop.y.setValue(-20);
          drop.opacity.setValue(0);
          Animated.sequence([
            Animated.delay(idx * 120 + Math.random() * 400),
            Animated.parallel([
              Animated.timing(drop.y, {
                toValue: RAIN_H + 10,
                duration: Math.random() * 400 + 500,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(drop.opacity, { toValue: Math.random() * 0.4 + 0.25, duration: 80, useNativeDriver: true }),
                Animated.timing(drop.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
              ]),
            ]),
          ]).start(() => { if (rainActive) animateDrop(); });
        };
        animateDrop();
      });
      cleanupFuncs.push(() => { rainActive = false; });
    }

    if (levelName?.toLowerCase() === 'home' || levelName?.toLowerCase() === 'bank') {
      const auraLoop = Animated.loop(
        Animated.timing(auraRotateAnim, {
          toValue: 1,
          duration: 16000,
          useNativeDriver: true,
        })
      );
      auraLoop.start();
      cleanupFuncs.push(() => auraLoop.stop());

      const orbitLoop = Animated.loop(
        Animated.timing(orbitAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        })
      );
      orbitLoop.start();
      cleanupFuncs.push(() => orbitLoop.stop());

      const beamLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(beamPulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(beamPulseAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
        ])
      );
      beamLoop.start();
      cleanupFuncs.push(() => beamLoop.stop());

      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        ])
      );
      glowLoop.start();
      cleanupFuncs.push(() => glowLoop.stop());

      // Staggered floating particles
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
        cleanupFuncs.push(() => { active = false; });
      });

      // Scene glow pulse loop (matching HTML .sceneGlow animation)
      const sceneGlowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sceneGlowScale, { toValue: 1.08, duration: 1700, useNativeDriver: true }),
          Animated.timing(sceneGlowScale, { toValue: 0.92, duration: 1700, useNativeDriver: true }),
        ])
      );
      sceneGlowLoop.start();
      cleanupFuncs.push(() => sceneGlowLoop.stop());

      // Reset all unlock sequence animated values
      flashOpacity.setValue(0); bannerOpacity.setValue(0); bannerY.setValue(-35);
      scanOpacity.setValue(0); scanX.setValue(-220); crownOpacity.setValue(0);
      crownScale.setValue(0.2); sparkLineOpacity.setValue(0); sparkLineScaleX.setValue(0.2);
      mansionShakeX.setValue(0);

      // Unlock animation helpers (matching HTML unlock() sequence)
      const playFlash = () => {
        flashOpacity.setValue(0);
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 620, useNativeDriver: true }),
        ]).start();
      };
      const playBanner = () => {
        bannerY.setValue(-35); bannerOpacity.setValue(0);
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bannerY, { toValue: 0, duration: 450, useNativeDriver: true }),
            Animated.timing(bannerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          ]),
          Animated.delay(1500),
          Animated.parallel([
            Animated.timing(bannerY, { toValue: -8, duration: 400, useNativeDriver: true }),
            Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]).start();
      };
      const playScan = () => {
        scanX.setValue(-220); scanOpacity.setValue(0);
        Animated.parallel([
          Animated.timing(scanX, { toValue: 220, duration: 1000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(scanOpacity, { toValue: 0.9, duration: 150, useNativeDriver: true }),
            Animated.timing(scanOpacity, { toValue: 0, duration: 850, useNativeDriver: true }),
          ]),
        ]).start();
      };
      const playCrownBlast = () => {
        crownScale.setValue(0.2); crownOpacity.setValue(0);
        Animated.parallel([
          Animated.timing(crownScale, { toValue: 18, duration: 950, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(crownOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
            Animated.timing(crownOpacity, { toValue: 0, duration: 790, useNativeDriver: true }),
          ]),
        ]).start();
      };
      const playSparkLine = () => {
        sparkLineOpacity.setValue(0); sparkLineScaleX.setValue(0.2);
        Animated.parallel([
          Animated.timing(sparkLineScaleX, { toValue: 1.8, duration: 1000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(sparkLineOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(sparkLineOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ]).start();
      };
      const playShake = () => {
        mansionShakeX.setValue(0);
        Animated.sequence([
          Animated.timing(mansionShakeX, { toValue: -8, duration: 46, useNativeDriver: true }),
          Animated.timing(mansionShakeX, { toValue: 7, duration: 46, useNativeDriver: true }),
          Animated.timing(mansionShakeX, { toValue: -6, duration: 46, useNativeDriver: true }),
          Animated.timing(mansionShakeX, { toValue: 6, duration: 46, useNativeDriver: true }),
          Animated.timing(mansionShakeX, { toValue: -4, duration: 46, useNativeDriver: true }),
          Animated.timing(mansionShakeX, { toValue: 3, duration: 46, useNativeDriver: true }),
          Animated.timing(mansionShakeX, { toValue: 0, duration: 46, useNativeDriver: true }),
        ]).start();
      };

      // Gate sliding and coin blast animation triggers
      const playGateOpenAndCoins = () => {
        gateOpenAnim.setValue(0);
        coinBurstParticles.forEach((p) => {
          p.x.setValue(0);
          p.y.setValue(0);
          p.scale.setValue(0);
          p.opacity.setValue(0);
          p.rotate.setValue(0);
        });

        // 1. Sliding gates open sequence after shield scan completes
        Animated.timing(gateOpenAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }).start();

        // 2. Blast coins simulation: spray out with random velocity and fall downward
        coinBurstParticles.forEach((p, idx) => {
          const angle = Math.random() * Math.PI + Math.PI; // upward facing arc (180deg to 360deg)
          const force = Math.random() * 190 + 70; // explosion push force
          const targetX = Math.cos(angle) * force;
          const targetY = Math.sin(angle) * force;
          
          Animated.sequence([
            Animated.delay(idx * 28), // staggered launch
            Animated.parallel([
              Animated.timing(p.scale, { toValue: Math.random() * 0.95 + 0.45, duration: 150, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
              Animated.timing(p.x, {
                toValue: targetX,
                duration: 900 + Math.random() * 300,
                useNativeDriver: true,
              }),
              Animated.sequence([
                // Projectile peak: initial fast jump up, then drop down past the frame bottom
                Animated.timing(p.y, {
                  toValue: targetY - 40,
                  duration: 400,
                  useNativeDriver: true,
                }),
                Animated.timing(p.y, {
                  toValue: 320,
                  duration: 800 + Math.random() * 400,
                  useNativeDriver: true,
                }),
              ]),
              Animated.timing(p.rotate, {
                toValue: Math.random() * 360 + 180,
                duration: 1200 + Math.random() * 400,
                useNativeDriver: true,
              }),
            ]),
            // Fade out at bottom
            Animated.timing(p.opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start();
        });

        // 3. Reward Data from real top supporters
        const rankEmojis = ['🥇', '🥈', '🥉', '👤'];
        const realContributors = topSupporters.slice(0, 4).map((s, i) => ({
          uid: s.uid,
          name: s.displayName || 'User',
          contribution: s.dailyAmount || 0,
          avatar: rankEmojis[i] || '👤',
        }));

        // Sum total active contributors contributions
        const totalContribution = realContributors.reduce((acc, curr) => acc + curr.contribution, 0);
        const list = ['home', 'bank', 'car', 'hotel', 'bus', 'train', 'ship', 'aeroplane', 'submarine', 'rocket'];
        const currentLvlIdx = Math.max(0, list.indexOf(levelName?.toLowerCase() || 'home'));
        const thresholdMap = [10000000, 30000000, 50000000, 80000000, 90000000, 120000000, 130000000, 150000000, 180000000, 220000000];
        const currentThreshold = thresholdMap[currentLvlIdx] || 10000000;
        const totalRewardPool = currentThreshold * 2; // 2x Threshold dynamic coins pool

        const results = realContributors.map((c, index) => {
          const sharePct = totalContribution > 0 ? (c.contribution / totalContribution) : 0.25;
          const coinsWon = Math.round(sharePct * totalRewardPool);
          const rank = index + 1;
          const expWon = rank <= 3 ? getLevelExp(levelName || 'home', rank) : 0;
          return {
            ...c,
            coinsWon,
            expWon,
            rank,
          };
        });

        setSummaryData(results);

        // Show distribution report overlay card after coins shower finishes
        setTimeout(() => {
          setShowSummary(true);
        }, 3200);
      };

      // Execute unlock sequence (matching HTML unlock() timing)
      playFlash(); playBanner(); playScan(); playShake();
      const _t1 = setTimeout(() => { playCrownBlast(); playSparkLine(); }, 500);
      const _t2 = setTimeout(() => { playFlash(); playScan(); playShake(); playGateOpenAndCoins(); }, 1200);
      cleanupFuncs.push(() => { clearTimeout(_t1); clearTimeout(_t2); });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      cleanupFuncs.forEach((cb) => cb());
    };
  }, [visible, onComplete, levelName]);

  const handlePlaybackStatusUpdate = (playbackStatus: any) => {
    if (playbackStatus.isLoaded) {
      setStatus(playbackStatus);
    }
    if (playbackStatus.didJustFinish || playbackStatus.isLoaded && playbackStatus.durationMillis && playbackStatus.positionMillis >= playbackStatus.durationMillis - 200) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onComplete();
    }
  };

  const isCarLevel = levelName?.toLowerCase() === 'car';
  const isHomeLevel = levelName?.toLowerCase() === 'home';
  const isBankLevel = levelName?.toLowerCase() === 'bank';
  const isBusLevel = levelName?.toLowerCase() === 'bus';
  const isTrainLevel = levelName?.toLowerCase() === 'train';
  const isShipLevel = levelName?.toLowerCase() === 'ship';
  const isPlaneLevel = levelName?.toLowerCase() === 'plane' || levelName?.toLowerCase() === 'aeroplane';
  const isSubmarineLevel = levelName?.toLowerCase() === 'submarine';
  const isRocketLevel = levelName?.toLowerCase() === 'rocket';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onComplete}>
      <View style={styles.container}>
        <View style={(isCarLevel || isHomeLevel || isBankLevel || isBusLevel || isTrainLevel || isShipLevel || isPlaneLevel || isSubmarineLevel || isRocketLevel) ? styles.carWrapper : styles.videoWrapper}>
          {videoUrl && !isCarLevel && !isHomeLevel && !isBankLevel && !isBusLevel && !isTrainLevel && !isShipLevel && !isPlaneLevel && !isSubmarineLevel && !isRocketLevel ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              useNativeControls={false}
            />
          ) : isCarLevel ? (
            <View style={styles.carStage}>

              {/* 1. SKY BACKGROUND */}
              <View style={StyleSheet.absoluteFillObject}>
                <LinearGradient
                  colors={['#04010d', '#080218', '#050209']}
                  style={{ flex: 1 }}
                />
              </View>

              {/* 2. CITY SILHOUETTE */}
              <View style={{ position: 'absolute', bottom: 65, left: 0, right: 0, height: 140 }}>
                <Svg width="100%" height="140" viewBox="0 0 700 200" preserveAspectRatio="xMidYMax slice">
                  <Path
                    d="M0 200 L0 120 L40 120 L40 90 L60 90 L60 60 L80 60 L80 90 L100 90 L100 110 L130 110 L130 70 L150 70 L150 50 L170 50 L170 70 L190 70 L190 110 L220 110 L220 80 L240 80 L240 50 L255 50 L255 30 L270 30 L270 50 L285 50 L285 80 L310 80 L310 100 L340 100 L340 65 L360 65 L360 40 L375 40 L375 65 L395 65 L395 100 L420 100 L420 75 L440 75 L440 55 L460 55 L460 75 L490 75 L490 95 L520 95 L520 70 L545 70 L545 95 L570 95 L570 120 L600 120 L640 120 L660 140 L700 200 Z"
                    fill="#100618"
                  />
                  <Rect x="63" y="65" width="7" height="9" fill="#00f3ff" opacity="0.8" />
                  <Rect x="74" y="65" width="7" height="9" fill="#ff0055" opacity="0.7" />
                  <Rect x="153" y="55" width="6" height="8" fill="#00f3ff" opacity="0.9" />
                  <Rect x="163" y="55" width="6" height="8" fill="#fff" opacity="0.5" />
                  <Rect x="258" y="35" width="6" height="8" fill="#ff0055" opacity="0.8" />
                  <Rect x="268" y="47" width="6" height="8" fill="#00f3ff" opacity="0.7" />
                  <Rect x="363" y="45" width="6" height="8" fill="#fff" opacity="0.6" />
                  <Rect x="443" y="60" width="6" height="8" fill="#00f3ff" opacity="0.8" />
                  <Rect x="453" y="60" width="6" height="8" fill="#ff0055" opacity="0.6" />
                </Svg>
              </View>

              {/* 3. RAIN DROPS */}
              {rainDrops.map((drop, idx) => (
                <Animated.View
                  key={`rain-${idx}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: idx % 2 === 0 ? 1.5 : 1,
                    height: idx % 3 === 0 ? 26 : idx % 3 === 1 ? 18 : 22,
                    borderRadius: 1,
                    backgroundColor: idx % 5 === 0 ? 'rgba(0,243,255,0.55)' : 'rgba(180,220,255,0.65)',
                    transform: [
                      { translateX: drop.x },
                      { translateY: drop.y },
                      { rotate: '-10deg' },
                    ],
                    opacity: drop.opacity,
                  }}
                />
              ))}

              {/* 4. HEADLIGHT BEAMS */}
              <Animated.View
                style={{
                  position: 'absolute',
                  left: -10,
                  bottom: 145,
                  width: 230,
                  height: 80,
                  opacity: headlightBeamOpacity,
                  transform: [{ rotate: '-8deg' }],
                }}
              >
                <LinearGradient
                  colors={['rgba(0,243,255,0.38)', 'rgba(0,243,255,0.08)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1, borderRadius: 80 }}
                />
              </Animated.View>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 10,
                  bottom: 165,
                  width: 180,
                  height: 50,
                  opacity: headlightBeamOpacity,
                  transform: [{ rotate: '-4deg' }],
                }}
              >
                <LinearGradient
                  colors={['rgba(0,243,255,0.22)', 'rgba(0,243,255,0.02)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1, borderRadius: 80 }}
                />
              </Animated.View>

              {/* 5. CAR SVG (vibrating engine - narrow width and taller top-to-bottom size) */}
              <Animated.View
                style={{
                  position: 'absolute',
                  bottom: 60,
                  left: 0,
                  right: 0,
                  height: 380,
                  alignItems: 'center',
                  transform: [{ translateY: engineVibe }],
                }}
              >
                <Svg width="400" height="380" viewBox="0 0 600 250" style={{ transform: [{ scaleX: 0.75 }, { scaleY: 1.6 }] }}>
                  <Defs>
                    <SvgLinearGradient id="cBodyRed" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#ff0c3c" />
                      <Stop offset="35%" stopColor="#dc002b" />
                      <Stop offset="70%" stopColor="#91001a" />
                      <Stop offset="100%" stopColor="#4a000b" />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="cBodyCarbon" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#2a2d32" />
                      <Stop offset="50%" stopColor="#181a1c" />
                      <Stop offset="100%" stopColor="#0a0b0c" />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="cWheelRim" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#4b5563" />
                      <Stop offset="50%" stopColor="#1f2937" />
                      <Stop offset="100%" stopColor="#111827" />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="cWindshield" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#0f172a" />
                      <Stop offset="60%" stopColor="#020617" />
                      <Stop offset="100%" stopColor="#1e1b4b" />
                    </SvgLinearGradient>
                  </Defs>
                  {/* Ground shadow */}
                  <Ellipse cx="300" cy="210" rx="270" ry="16" fill="rgba(0,0,0,0.9)" />
                  {/* Wet reflection */}
                  <G opacity="0.3" transform="scale(1,-0.55) translate(0,-385)">
                    <Path d="M50 160 Q80 105 180 95 Q300 80 430 95 Q520 105 560 160 Q565 170 540 180 Q430 195 300 195 Q170 195 60 180 Q35 170 50 160 Z" fill="url(#cBodyRed)" />
                  </G>
                  {/* Front Wheel */}
                  <G>
                    <Circle cx="150" cy="170" r="42" fill="#0c0d0e" stroke="#1c1e20" strokeWidth="2" />
                    <Circle cx="150" cy="170" r="33" fill="url(#cWheelRim)" />
                    <Path d="M150 137 L150 203 M117 170 L183 170 M127 147 L173 193 M127 193 L173 147" stroke="#374151" strokeWidth="2.5" />
                    <Circle cx="150" cy="170" r="14" fill="#111827" stroke="#fbbf24" strokeWidth="1.5" />
                    <Circle cx="150" cy="170" r="6" fill="#fbbf24" />
                  </G>
                  {/* Rear Wheel */}
                  <G>
                    <Circle cx="470" cy="172" r="44" fill="#0c0d0e" stroke="#1c1e20" strokeWidth="2" />
                    <Circle cx="470" cy="172" r="35" fill="url(#cWheelRim)" />
                    <Path d="M470 137 L470 207 M435 172 L505 172 M445 147 L495 197 M445 197 L495 147" stroke="#374151" strokeWidth="2.5" />
                    <Circle cx="470" cy="172" r="14" fill="#111827" stroke="#fbbf24" strokeWidth="1.5" />
                    <Circle cx="470" cy="172" r="6" fill="#fbbf24" />
                  </G>
                  {/* Splitter */}
                  <Path d="M45 185 L90 190 H520 L550 185 L565 192 L530 200 H80 L40 192 Z" fill="url(#cBodyCarbon)" />
                  {/* Body */}
                  <Path d="M42 165 C40 160 55 155 75 155 C95 155 110 165 125 175 L80 185 Z" fill="#2d0006" />
                  <Path d="M40 170 C40 160 65 148 105 146 C125 145 150 152 170 165 L165 180 C130 182 80 182 40 170 Z" fill="url(#cBodyRed)" />
                  <Path d="M45 170 C55 130 120 95 180 92 C230 90 280 88 320 94 C370 100 450 102 500 115 C540 125 560 145 565 165 C570 175 550 185 530 187 H75 L45 170 Z" fill="url(#cBodyRed)" />
                  <Path d="M280 105 C330 105 380 110 405 120 C420 125 430 135 435 150 C410 155 350 160 280 150 Z" fill="#3b000a" />
                  <Path d="M290 100 C340 100 375 105 395 115 C410 122 418 130 422 142 C400 146 350 150 290 142 Z" fill="url(#cBodyRed)" stroke="#ff003c" strokeWidth={0.8} />
                  {/* Windshield */}
                  <Path d="M175 120 C180 105 210 95 260 92 C320 88 380 96 410 115 C420 122 422 135 410 140 C380 142 300 145 190 140 C175 135 170 128 175 120 Z" fill="url(#cBodyCarbon)" />
                  <Path d="M190 118 C205 105 240 98 280 96 C330 94 370 100 395 112 L385 125 C350 122 280 120 205 125 Z" fill="url(#cWindshield)" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
                  <Path d="M205 112 Q230 103 270 102" stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
                  {/* Fenders */}
                  <Path d="M95 170 C95 135 135 125 180 130 C195 132 205 142 200 155 C195 170 185 185 185 185" fill="none" stroke="url(#cBodyRed)" strokeWidth="6" />
                  <Path d="M100 170 C100 140 135 132 175 136" fill="none" stroke="#ff003c" strokeWidth={1.5} opacity={0.8} />
                  <Path d="M415 172 C415 138 450 128 495 132 C515 134 525 145 520 162 L510 188" fill="none" stroke="url(#cBodyRed)" strokeWidth="7" />
                  {/* Rear Wing */}
                  <Path d="M500 115 L530 105 L555 105 L548 118 Z" fill="url(#cBodyCarbon)" />
                  <Path d="M530 105 H565 V112 H548 Z" fill="url(#cBodyCarbon)" />
                  {/* DRL Headlight */}
                  <Path d="M72 152 Q82 145 110 148 L105 155 Q85 152 75 156 Z" fill="#111827" />
                  <Path d="M75 151 Q85 146 108 149" fill="none" stroke="#00f3ff" strokeWidth="4.5" strokeLinecap="round" />
                  <Path d="M78 151 L95 150" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity={0.9} />
                  <Polygon points="56,170 60,166 64,170 60,174" fill="#fbbf24" />
                  {/* Tail Light */}
                  <Path d="M562 138 C565 138 566 145 563 148" fill="none" stroke="#ff0055" strokeWidth="6" strokeLinecap="round" />
                  {/* Mirror */}
                  <Path d="M210 116 Q200 112 188 115 Q185 118 198 120 L212 120 Z" fill="url(#cBodyCarbon)" />
                  <Path d="M210 116 Q200 112 188 115 L190 117 Q198 115 208 118 Z" fill="#ff003c" />
                </Svg>
              </Animated.View>

              {/* 6. FLOOR GRADIENT */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 58 }}>
                <LinearGradient
                  colors={['transparent', 'rgba(10,2,20,0.92)', 'rgba(4,1,9,1)']}
                  style={{ flex: 1, borderTopWidth: 1.5, borderColor: 'rgba(255,0,85,0.4)' }}
                />
              </View>

              {/* 7. LIGHTNING BOLT 1 – Cyan */}
              <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: lightning1Opacity }]} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 400 460">
                  <Path d="M200 10 L182 150 L230 185 L188 320 L215 345 L170 460" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M200 10 L182 150 L230 185 L188 320 L215 345 L170 460" fill="none" stroke="#00f3ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M182 150 L138 240 L162 275" fill="none" stroke="#00f3ff" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
                  <Path d="M188 320 L240 390 L225 420" fill="none" stroke="#00f3ff" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
                </Svg>
              </Animated.View>

              {/* 8. LIGHTNING BOLT 2 – Magenta */}
              <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: lightning2Opacity }]} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 400 460">
                  <Path d="M310 5 L325 130 L285 162 L330 290 L305 315 L355 440" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M310 5 L325 130 L285 162 L330 290 L305 315 L355 440" fill="none" stroke="#ff007f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M325 130 L270 205 L295 248" fill="none" stroke="#ff007f" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
                </Svg>
              </Animated.View>

              {/* 9. SCREEN FLASH OVERLAY */}
              <Animated.View
                style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(200,50,255,0.07)', opacity: carFlashOpacity }]}
                pointerEvents="none"
              />

              {/* 10. PULSING GLOW RING UNDER CAR */}
              <Animated.View
                style={{
                  position: 'absolute',
                  bottom: 50,
                  alignSelf: 'center',
                  width: 320,
                  height: 16,
                  borderRadius: 10,
                  backgroundColor: 'rgba(0,243,255,0.07)',
                  borderWidth: 1,
                  borderColor: 'rgba(0,243,255,0.65)',
                  opacity: glowPulse,
                  transform: [{ scaleX: glowPulse }],
                }}
              />

              {/* 11. TITLE TEXT (always on top — last in JSX) */}
              <View style={{ position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' }}>
                <Text style={{ color: '#fbbf24', fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2.5 }}>
                  Level Up: Car!
                </Text>
                <Text style={{ color: 'rgba(0,243,255,0.82)', fontSize: 10, fontWeight: '700', marginTop: 3, letterSpacing: 1.8 }}>
                  CYBER SUPERSPORT UNLOCKED
                </Text>
              </View>
            </View>
          ) : isHomeLevel ? (
            <View style={styles.carStage}>
              <Text style={{ color: '#fbbf24', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 4 }}>
                Level Up: Home!
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginBottom: 15 }}>
                Unlocking Cyber Fortress Level...
              </Text>

              {/* ISOMETRIC ROYAL MANSION ANIMATED CONTAINER */}
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 350, height: 275, position: 'relative' }}>

                {/* SCENE GLOW – pulsing radial behind mansion (HTML .sceneGlow) */}
                <Animated.View
                  style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(255,155,49,0.16)', shadowColor: '#ff9b31', shadowOpacity: 0.55, shadowRadius: 65, transform: [{ scale: sceneGlowScale }], opacity: 0.68 }}
                  pointerEvents="none"
                />
                
                {/* 1. ULTRA AURA BEHIND THE MANSION (Rotating Conic/Radial Glow) */}
                <Animated.View style={{
                  position: 'absolute',
                  width: 330,
                  height: 330,
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: [{ rotate: auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                  opacity: 0.85
                }}>
                  <Svg width="330" height="330" viewBox="0 0 330 330">
                    <Defs>
                      <SvgLinearGradient id="auraGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="rgba(255, 155, 49, 0.24)" />
                        <Stop offset="40%" stopColor="rgba(39, 234, 255, 0.16)" />
                        <Stop offset="100%" stopColor="transparent" />
                      </SvgLinearGradient>
                    </Defs>
                    <Circle cx="165" cy="165" r="150" fill="url(#auraGrad)" />
                    <Circle cx="165" cy="165" r="120" stroke="rgba(255, 211, 106, 0.3)" strokeWidth="1.8" fill="none" />
                    <Circle cx="165" cy="165" r="90" stroke="rgba(39, 234, 255, 0.22)" strokeWidth="1.3" fill="none" />
                  </Svg>
                </Animated.View>

                {/* 2. ROYAL BEAM PULSING */}
                <Animated.View style={{
                  position: 'absolute',
                  width: 320,
                  height: 260,
                  top: 0,
                  opacity: beamPulseAnim,
                  pointerEvents: 'none'
                }}>
                  <Svg width="320" height="260" viewBox="0 0 320 350">
                    <Defs>
                      <SvgLinearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.24)" />
                        <Stop offset="30%" stopColor="rgba(255, 211, 106, 0.12)" />
                        <Stop offset="100%" stopColor="transparent" />
                      </SvgLinearGradient>
                    </Defs>
                    <Path d="M128 0 L192 0 L270 350 L50 350 Z" fill="url(#beamGrad)" />
                  </Svg>
                </Animated.View>

                {/* 3. TWINKLING BACKGROUND STARS / ORBIT RINGS */}
                <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                  <Svg width="350" height="260" viewBox="0 0 350 350">
                    {/* Twinkles */}
                    <Circle cx="70" cy="90" r="2.5" fill="#fff" opacity={0.8} />
                    <Circle cx="290" cy="110" r="2.5" fill="#27eaff" opacity={0.7} />
                    <Circle cx="110" cy="40" r="2" fill="#ffd36a" opacity={0.6} />
                    <Circle cx="240" cy="50" r="2" fill="#fff" opacity={0.9} />
                    <Circle cx="50" cy="220" r="1.5" fill="#ffd36a" opacity={0.8} />
                    <Circle cx="310" cy="240" r="2" fill="#fff" opacity={0.65} />
                    
                    {/* Elliptical floor sceneGlow */}
                    <Ellipse cx="175" cy="265" rx="140" ry="50" fill="rgba(255, 155, 49, 0.08)" />
                  </Svg>
                </View>

                {/* 4a. TILTED ORBIT RINGS (HTML .orbitRing – rotateX(66deg)) */}
                <View
                  style={{ position: 'absolute', width: 320, height: 106, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,211,106,0.34)', bottom: 22, transform: [{ perspective: 800 }, { rotateX: '66deg' }] }}
                  pointerEvents="none"
                />
                <View
                  style={{ position: 'absolute', width: 260, height: 85, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(39,234,255,0.28)', bottom: 28, transform: [{ perspective: 800 }, { rotateX: '66deg' }] }}
                  pointerEvents="none"
                />

                {/* 4. THE CORE MANSION SVG – wrapped with scale pulse + shake */}
                <Animated.View style={{ transform: [{ scale: glowPulse }, { translateX: mansionShakeX }], zIndex: 10 }}>
                  <View style={{ width: 180, height: 180 }}>
                    <Svg width="180" height="180" viewBox="0 0 390 390" style={{ overflow: 'visible' }}>
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
                          <Stop offset="0%" stopColor="#4836a4" />
                          <Stop offset="100%" stopColor="#14124b" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="baseSide" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#242078" />
                          <Stop offset="100%" stopColor="#070827" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="wallF" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#ffc96e" />
                          <Stop offset="45%" stopColor="#b86225" />
                          <Stop offset="100%" stopColor="#432015" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="wallR" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#ca722e" />
                          <Stop offset="100%" stopColor="#2c1630" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0%" stopColor="#fff0a0" />
                          <Stop offset="35%" stopColor="#ff9b31" />
                          <Stop offset="100%" stopColor="#8b2f12" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#b8ffff" />
                          <Stop offset="100%" stopColor="#1e8bc2" />
                        </SvgLinearGradient>
                      </Defs>
                      {/* platform */}
                      <Ellipse cx="195" cy="305" rx="153" ry="60" fill="rgba(0,0,0,0.35)" />
                      <Path d="M58 269 L195 198 L334 269 L195 342 Z" fill="url(#baseTop)" stroke="#ff9b31" strokeWidth={4} filter="url(#glowOrange)" />
                      <Path d="M58 269 L195 342 L195 362 L58 290 Z" fill="url(#baseSide)" stroke="#ff9b31" strokeWidth={2} />
                      <Path d="M334 269 L195 342 L195 362 L334 290 Z" fill="#090923" stroke="#ff9b31" strokeWidth={2} />
                      <Path d="M83 269 L195 212 L309 269 L195 329 Z" fill="rgba(255,155,49,0.08)" stroke="#ffd36a" strokeWidth={2} />
                      <Path d="M101 270 L195 224 L291 270 L195 319 Z" fill="rgba(39,234,255,0.08)" stroke="#27eaff" strokeWidth={1.5} />
                      
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
                        
                        {/* gate */}
                        <G id="gateGroup">
                          <Path d="M169 224 L195 210 L221 224 L195 238 Z" fill="#2c1a12" stroke="#ffd36a" strokeWidth={2} />
                          <Path d="M170 224 L195 211 L195 238 L170 251 Z" fill="#7b4018" stroke="#ffd36a" strokeWidth={2} />
                          <Path d="M195 211 L220 224 L220 251 L195 238 Z" fill="#5d2c13" stroke="#ffd36a" strokeWidth={2} />
                        </G>
                        
                        {/* neon trims */}
                        <Path d="M104 205 L195 252 L286 205" fill="none" stroke="#ff9b31" strokeWidth={3} filter="url(#glowOrange)" />
                        <Path d="M134 141 L195 170 L256 141" fill="none" stroke="#ffe0a0" strokeWidth={1.6} filter="url(#glowOrange)" />
                        <Path d="M78 223 L124 242 L164 222" fill="none" stroke="#ffe0a0" strokeWidth={1.6} filter="url(#glowOrange)" />
                        <Path d="M226 222 L266 242 L312 223" fill="none" stroke="#ffe0a0" strokeWidth={1.6} filter="url(#glowOrange)" />
                        
                        {/* V2 premium penthouse crown */}
                        <Path d="M154 58 L210 30 L268 60 L210 92 Z" fill="rgba(255,211,106,0.18)" stroke="#fff0aa" strokeWidth={2.2} filter="url(#glowOrange)" />
                        <Path d="M159 76 L210 50 L261 76" stroke="#fff0aa" strokeWidth={2.3} fill="none" opacity={0.95} filter="url(#glowOrange)" />
                        <Path d="M175 29 L210 11 L245 29 L210 48 Z" fill="url(#roof)" stroke="#fff0aa" strokeWidth={2.2} filter="url(#glowOrange)" />
                        <Path d="M186 54 L186 30 L210 18 L210 68 Z" fill="rgba(255,196,88,0.62)" stroke="#ff9b31" strokeWidth={1.6} />
                        <Path d="M210 18 L235 31 L235 54 L210 68 Z" fill="rgba(138,62,30,0.75)" stroke="#ff9b31" strokeWidth={1.6} />
                        <Rect fill="#fff0a0" x="196" y="36" width="9" height="14" rx="2" filter="url(#glowOrange)" />
                        <Rect fill="#fff0a0" x="214" y="36" width="9" height="14" rx="2" filter="url(#glowOrange)" />
                        <Path d="M91 248 L195 303 L300 248" fill="none" stroke="#ffd36a" strokeWidth={3} filter="url(#glowOrange)" />
                        <Path d="M120 218 L195 258 L270 218" fill="none" stroke="#fff0aa" strokeWidth={2.3} opacity={0.95} filter="url(#glowOrange)" />
                        <Path d="M140 192 L195 222 L250 192" fill="none" stroke="#fff0aa" strokeWidth={2.3} opacity={0.95} filter="url(#glowOrange)" />
                        <Circle cx="195" cy="210" r="6" fill="#fff0aa" filter="url(#glowOrange)" />
                        <Circle cx="116" cy="224" r="4" fill="#fff0aa" filter="url(#glowOrange)" />
                        <Circle cx="274" cy="224" r="4" fill="#fff0aa" filter="url(#glowOrange)" />
                        
                        {/* V3 royal mansion height: side towers */}
                        <Path d="M91 242 L195 300 L303 242 L303 256 L195 318 L91 256 Z" fill="rgba(0,0,0,0.32)" />
                        <Path d="M91 226 L195 172 L303 226 L195 283 Z" fill="rgba(255,211,106,0.16)" stroke="#ffd36a" strokeWidth={2} opacity={0.55} filter="url(#glowOrange)" />
                        <Path d="M128 205 L195 169 L262 205 L195 240 Z" fill="rgba(39,234,255,0.18)" stroke="#baffff" strokeWidth={1.8} filter="url(#glowCyan)" />
                        <Path d="M112 230 L195 274 L282 230" fill="none" stroke="#ffd36a" strokeWidth={3} filter="url(#glowOrange)" />
                        <Path d="M128 207 L195 242 L262 207" fill="none" stroke="#ffd36a" strokeWidth={3} filter="url(#glowOrange)" />
                        
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
                        
                        {/* V4 crown lights and rooftop holo aura */}
                        <Path d="M150 45 C175 20 215 9 248 32" fill="none" stroke="#27eaff" strokeWidth={2} opacity={0.65} filter="url(#glowCyan)" />
                        <Path d="M138 67 C170 35 225 28 270 59" fill="none" stroke="#ffd36a" strokeWidth={2} opacity={0.62} filter="url(#glowOrange)" />
                        <Circle cx="148" cy="46" r="4" fill="#fff" filter="url(#glowCyan)" />
                        <Circle cx="248" cy="32" r="4" fill="#fff0aa" filter="url(#glowOrange)" />
                        <Circle cx="270" cy="59" r="3.5" fill="#fff" filter="url(#glowCyan)" />
                      </G>
                      
                      {/* V2 extra floating premium base rings */}
                      <Path d="M30 258 C112 196 278 196 360 258" fill="none" stroke="#fff0aa" strokeWidth={5} opacity={0.55} filter="url(#glowOrange)" />
                      <Path d="M42 266 C118 214 272 214 348 266" fill="none" stroke="#ffd36a" strokeWidth={4} opacity={0.62} filter="url(#glowOrange)" />
                      <Path d="M52 292 C118 338 272 338 338 292" fill="none" stroke="#ff9b31" strokeWidth={4} opacity={0.45} filter="url(#glowOrange)" />
                      
                      {/* decorative orbit lines */}
                      <Path d="M64 284 C120 246 268 246 326 284" fill="none" stroke="#ff9b31" strokeWidth={3} opacity={0.75} filter="url(#glowOrange)" />
                      <Path d="M91 296 C140 270 250 270 299 296" fill="none" stroke="#27eaff" strokeWidth={1.8} opacity={0.75} filter="url(#glowCyan)" />

                      {/* GOLDEN COINS EXPLOSIVE BLAST OVERLAY */}
                      {coinBurstParticles.map((p, idx) => (
                        <AnimatedG
                          key={`coin-${idx}`}
                          style={{
                            opacity: p.opacity,
                            transform: [
                              { translateX: p.x },
                              { translateY: p.y },
                              { scale: p.scale },
                              { rotate: p.rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }
                            ]
                          }}
                        >
                          {/* Centered at gate launch point cx: 195, cy: 220 */}
                          {/* Glowing golden 3D coin edge */}
                          <Circle cx="195" cy="220" r="10" fill="#d97706" />
                          {/* Shiny front face */}
                          <Circle cx="195" cy="220" r="8.2" fill="#fbbf24" stroke="#fef08a" strokeWidth={1.2} />
                          {/* Inner details / dollar emblem */}
                          <Path d="M195 215.5 L195 224.5 M192 217.5 H198 C198 217.5 192.5 218 192.5 220 C192.5 222 198 222.5 198 222.5" fill="none" stroke="#d97706" strokeWidth={1.5} strokeLinecap="round" />
                          <Circle cx="195" cy="220" r="11" fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.4} filter="url(#glowOrange)" />
                        </AnimatedG>
                      ))}
                    </Svg>
                  </View>
                </Animated.View>

                {/* FLOOR GLOW ELLIPSE (HTML .floor) */}
                <View style={{ position: 'absolute', bottom: 8, width: 260, height: 44, borderRadius: 130, backgroundColor: 'rgba(255,155,49,0.10)' }} pointerEvents="none" />

                {/* 5. AMBIENT JETS AT THE BOTTOM PEDESTAL */}
                <Animated.View style={{ position: 'absolute', left: '26%', bottom: -5, width: 8, height: 35, opacity: beamPulseAnim }} pointerEvents="none">
                  <LinearGradient colors={['#fff', '#ffd36a', 'transparent']} style={{ flex: 1, borderRadius: 4 }} />
                </Animated.View>
                <Animated.View style={{ position: 'absolute', right: '26%', bottom: -5, width: 8, height: 35, opacity: beamPulseAnim }} pointerEvents="none">
                  <LinearGradient colors={['#fff', '#ffd36a', 'transparent']} style={{ flex: 1, borderRadius: 4 }} />
                </Animated.View>
                {/* Center jet (HTML j3) */}
                <Animated.View style={{ position: 'absolute', left: '44%', bottom: -5, width: 12, height: 65, opacity: beamPulseAnim }} pointerEvents="none">
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

                {/* SCAN SWEEP (HTML .scanSweep) */}
                <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.85)', 'rgba(255,211,106,0.65)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
                </Animated.View>

                {/* CROWN BLAST (HTML .crownBlast) */}
                <Animated.View style={{ position: 'absolute', top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,240,170,0.95)', zIndex: 46, opacity: crownOpacity, transform: [{ scale: crownScale }], shadowColor: '#ff9b31', shadowOpacity: 1, shadowRadius: 22 }} pointerEvents="none" />

                {/* SPARK LINE (HTML .sparkLine) */}
                <Animated.View style={{ position: 'absolute', bottom: 52, width: 220, height: 2, borderRadius: 1, zIndex: 44, overflow: 'hidden', opacity: sparkLineOpacity, transform: [{ scaleX: sparkLineScaleX }], shadowColor: '#ff9b31', shadowOpacity: 1, shadowRadius: 10 }} pointerEvents="none">
                  <LinearGradient colors={['transparent', '#fff0aa', '#27eaff', '#fff0aa', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
                </Animated.View>
              </View>

              {/* FLASH OVERLAY – covers full carStage (HTML .flash) */}
              <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,210,120,0.35)', opacity: flashOpacity, zIndex: 50 }} pointerEvents="none" />

              {/* LEVEL BANNER (HTML .levelBanner) */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#ffe7a4', textTransform: 'uppercase' }}>LEVEL 1 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,155,49,0.18)', borderWidth: 2, borderColor: 'rgba(255,231,164,0.85)', shadowColor: '#ff9b31', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#ff9b31', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}>ROYAL HOME</Text>
                </View>
              </Animated.View>

              {/* Glowing Ambient Pedestal Ring */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#eab308',
                backgroundColor: 'rgba(234, 179, 8, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }]
              }} />
            </View>
          ) : isBankLevel ? (
            <View style={styles.carStage}>
              {/* 1. BANK DIGITAL SKY BACKDROP */}
              <View style={StyleSheet.absoluteFillObject}>
                <LinearGradient
                  colors={['#020108', '#050314', '#010006']}
                  style={{ flex: 1 }}
                />
              </View>

              {/* SCENE GLOW – pulsing radial behind the bank building */}
              <Animated.View
                style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(0,243,255,0.08)', shadowColor: '#00f3ff', shadowOpacity: 0.45, shadowRadius: 65, transform: [{ scale: sceneGlowScale }], opacity: 0.68, alignSelf: 'center', bottom: -50 }}
                pointerEvents="none"
              />

              {/* 2. ROTATING CONIC AURA BEHIND THE BANK */}
              <Animated.View style={{
                position: 'absolute',
                width: 330,
                height: 330,
                alignSelf: 'center',
                bottom: -20,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: auraRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                opacity: 0.65
              }}>
                <Svg width="330" height="330" viewBox="0 0 330 330">
                  <Defs>
                    <SvgLinearGradient id="bankAuraGrad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor="rgba(0, 243, 255, 0.22)" />
                      <Stop offset="40%" stopColor="rgba(251, 191, 36, 0.12)" />
                      <Stop offset="100%" stopColor="transparent" />
                    </SvgLinearGradient>
                  </Defs>
                  <Circle cx="165" cy="165" r="150" fill="url(#bankAuraGrad)" />
                  <Circle cx="165" cy="165" r="125" stroke="rgba(0, 243, 255, 0.25)" strokeWidth="1.5" fill="none" />
                  <Circle cx="165" cy="165" r="95" stroke="rgba(251, 191, 36, 0.18)" strokeWidth="1.2" fill="none" />
                </Svg>
              </Animated.View>

              {/* 3. LIGHT BEAMS FROM VAULT */}
              <Animated.View style={{
                position: 'absolute',
                width: 320,
                height: 260,
                alignSelf: 'center',
                bottom: 20,
                opacity: beamPulseAnim,
                pointerEvents: 'none'
              }}>
                <Svg width="320" height="260" viewBox="0 0 320 260">
                  <Defs>
                    <SvgLinearGradient id="bankBeamGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="rgba(0, 243, 255, 0.2)" />
                      <Stop offset="55%" stopColor="rgba(0, 243, 255, 0.05)" />
                      <Stop offset="100%" stopColor="transparent" />
                    </SvgLinearGradient>
                  </Defs>
                  <Path d="M110 0 L210 0 L280 260 L40 260 Z" fill="url(#bankBeamGrad)" />
                </Svg>
              </Animated.View>

              {/* TILTED PLATFORM ORBIT RINGS */}
              <View
                style={{ position: 'absolute', width: 340, height: 110, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(0,243,255,0.25)', bottom: 22, alignSelf: 'center', transform: [{ perspective: 800 }, { rotateX: '68deg' }] }}
                pointerEvents="none"
              />
              <View
                style={{ position: 'absolute', width: 280, height: 90, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.2)', bottom: 28, alignSelf: 'center', transform: [{ perspective: 800 }, { rotateX: '68deg' }] }}
                pointerEvents="none"
              />

              {/* 4. ISOMETRIC CYBER BANK SVG (Pulsing / Shaking Core) */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateX: mansionShakeX }], zIndex: 10, alignSelf: 'center', bottom: 35, position: 'absolute' }}>
                <View style={{ width: 320, height: 320 }}>
                  <Svg width="320" height="320" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
                    <Defs>
                      <Filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                        <FeGaussianBlur stdDeviation="5" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                      <Filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
                        <FeGaussianBlur stdDeviation="4" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                      <SvgLinearGradient id="platTop" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#0f172a" />
                        <Stop offset="100%" stopColor="#1e293b" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="platSide" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#020617" />
                        <Stop offset="100%" stopColor="#0f172a" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="bankWall" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#1e293b" />
                        <Stop offset="100%" stopColor="#334155" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="cyberGold" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#fbbf24" />
                        <Stop offset="100%" stopColor="#d97706" />
                      </SvgLinearGradient>
                    </Defs>

                    {/* Platform Base */}
                    <Ellipse cx="200" cy="310" rx="160" ry="60" fill="rgba(0,0,0,0.4)" />
                    {/* Isometric Hex Platform */}
                    <Path d="M50 280 L200 210 L350 280 L200 350 Z" fill="url(#platTop)" stroke="#00f3ff" strokeWidth={3.5} filter="url(#glowCyan)" />
                    <Path d="M50 280 L200 350 L200 370 L50 300 Z" fill="url(#platSide)" stroke="#00f3ff" strokeWidth={1.5} />
                    <Path d="M350 280 L200 350 L200 370 L350 300 Z" fill="#0b0f19" stroke="#00f3ff" strokeWidth={1.5} />

                    {/* Isometric Bank Main Facade Building */}
                    {/* Base Foundation Plate */}
                    <Path d="M90 280 L200 230 L310 280 L200 330 Z" fill="#0f172a" stroke="#27eaff" strokeWidth={1.5} />

                    {/* Left & Right High-tech Columns (Pillars) */}
                    {/* Column 1 (Left Outer) */}
                    <Path d="M100 270 L100 170 L120 160 L120 260 Z" fill="url(#bankWall)" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M120 260 L135 268 L135 168 L120 160 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={1} />
                    {/* Column 2 (Left Inner) */}
                    <Path d="M145 250 L145 160 L160 153 L160 243 Z" fill="url(#bankWall)" stroke="#00f3ff" strokeWidth={0.8} />
                    <Path d="M160 243 L172 249 L172 166 L160 153 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={0.8} />
                    {/* Column 3 (Right Inner) */}
                    <Path d="M228 249 L228 166 L240 160 L240 243 Z" fill="url(#bankWall)" stroke="#00f3ff" strokeWidth={0.8} />
                    <Path d="M240 243 L255 250 L255 170 L240 160 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={0.8} />
                    {/* Column 4 (Right Outer) */}
                    <Path d="M265 268 L265 168 L280 160 L280 260 Z" fill="url(#bankWall)" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M280 260 L300 270 L300 170 L280 160 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={1} />

                    {/* Neon Pillars indicator strip with blinking status LEDs */}
                    <Line x1="110" y1="168" x2="110" y2="263" stroke="#00f3ff" strokeWidth={2.5} filter="url(#glowCyan)" />
                    <Line x1="290" y1="168" x2="290" y2="263" stroke="#00f3ff" strokeWidth={2.5} filter="url(#glowCyan)" />

                    {/* Cyber Server Status LEDs on pillars */}
                    <Circle cx="110" cy="180" r="3.5" fill="#10b981" />
                    <Circle cx="110" cy="200" r="3.5" fill="#06b6d4" />
                    <Circle cx="110" cy="220" r="3.5" fill="#10b981" />
                    <Circle cx="110" cy="240" r="3.5" fill="#ef4444" />

                    <Circle cx="290" cy="180" r="3.5" fill="#ef4444" />
                    <Circle cx="290" cy="200" r="3.5" fill="#10b981" />
                    <Circle cx="290" cy="220" r="3.5" fill="#06b6d4" />
                    <Circle cx="290" cy="240" r="3.5" fill="#10b981" />

                    {/* Central Cyber Vault Door */}
                    <Path d="M172 249 L172 166 L228 166 L228 249 Z" fill="#020617" stroke="#fbbf24" strokeWidth={1.5} />
                    {/* Vault Outer Wheel */}
                    <Circle cx="200" cy="205" r="28" fill="#1e293b" stroke="#00f3ff" strokeWidth={2} filter="url(#glowCyan)" />
                    
                    {/* Rotating Gear Wheel Group */}
                    <AnimatedG style={{
                      transform: [{
                        rotate: auraRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }],
                      originX: 200,
                      originY: 205
                    }}>
                      <Circle cx="200" cy="205" r="16" fill="url(#cyberGold)" stroke="#fbbf24" strokeWidth={1.8} />
                      <Line x1="200" y1="184" x2="200" y2="226" stroke="#fbbf24" strokeWidth={3} />
                      <Line x1="179" y1="205" x2="221" y2="205" stroke="#fbbf24" strokeWidth={3} />
                      <Line x1="185" y1="190" x2="215" y2="220" stroke="#fbbf24" strokeWidth={2} />
                      <Line x1="185" y1="220" x2="215" y2="190" stroke="#fbbf24" strokeWidth={2} />
                      <Circle cx="200" cy="190" r="2.5" fill="#fff" />
                      <Circle cx="200" cy="220" r="2.5" fill="#fff" />
                      <Circle cx="185" cy="205" r="2.5" fill="#fff" />
                      <Circle cx="220" cy="205" r="2.5" fill="#fff" />
                    </AnimatedG>
                    <Circle cx="200" cy="205" r="6" fill="#020617" stroke="#fbbf24" strokeWidth={1.5} />

                    {/* Pediment (Triangle Roof Structure) */}
                    <Polygon points="80,170 200,105 320,170" fill="#0f172a" stroke="#fbbf24" strokeWidth={3.5} filter="url(#glowGold)" />
                    <Polygon points="95,165 200,118 305,165" fill="#1e293b" stroke="#00f3ff" strokeWidth={1.5} />

                    {/* Floating Holographic Cyber Dollar ($) */}
                    <G filter="url(#glowGold)">
                      <Circle cx="200" cy="142" r="20" fill="url(#cyberGold)" stroke="#fbbf24" strokeWidth={2.5} />
                      <SvgText
                        x="200"
                        y="151"
                        fill="#ffffff"
                        fontSize="24"
                        fontWeight="900"
                        textAnchor="middle"
                        textShadow="0 0 8px #fbbf24"
                      >
                        $
                      </SvgText>
                    </G>

                    {/* Dynamic Scanning Security Laser Line */}
                    <AnimatedLine
                      x1="120"
                      y1={beamPulseAnim.interpolate({
                        inputRange: [0.15, 0.85],
                        outputRange: [168, 255]
                      })}
                      x2="280"
                      y2={beamPulseAnim.interpolate({
                        inputRange: [0.15, 0.85],
                        outputRange: [168, 255]
                      })}
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      opacity={0.85}
                    />

                    {/* Neon Circuit Board Detailing on Base */}
                    <Path d="M60 285 L90 270 L110 278" fill="none" stroke="#00f3ff" strokeWidth={1.5} filter="url(#glowCyan)" />
                    <Path d="M340 285 L310 270 L290 278" fill="none" stroke="#00f3ff" strokeWidth={1.5} filter="url(#glowCyan)" />
                    <Circle cx="110" cy="278" r="2.5" fill="#00f3ff" />
                    <Circle cx="290" cy="278" r="2.5" fill="#00f3ff" />

                    {/* Digital Gold Ingot Stacks inside Vault */}
                    <G opacity={0.65}>
                      <Rect x="160" y="278" width="16" height="6" fill="#fbbf24" stroke="#d97706" rx="1" />
                      <Rect x="156" y="284" width="16" height="6" fill="#fbbf24" stroke="#d97706" rx="1" />
                      <Rect x="224" y="278" width="16" height="6" fill="#fbbf24" stroke="#d97706" rx="1" />
                      <Rect x="228" y="284" width="16" height="6" fill="#fbbf24" stroke="#d97706" rx="1" />
                    </G>
                  </Svg>
                </View>
              </Animated.View>

              {/* 5. FLOATING GOLD TRANSACTION SPARKS */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 10 : 7,
                    height: index % 2 === 0 ? 10 : 7,
                    borderRadius: 99,
                    backgroundColor: index % 3 === 0 ? '#fbbf24' : index % 3 === 1 ? '#00f3ff' : '#10b981',
                    opacity: p.opacity,
                    transform: [
                      { translateX: p.x },
                      { translateY: p.y },
                      { scale: p.scale }
                    ],
                    shadowColor: '#fbbf24',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                  pointerEvents="none"
                >
                  {/* Subtle Dollar Centered Text in Particles */}
                  {index % 2 === 0 && (
                    <Text style={{ fontSize: 6, fontWeight: '900', color: '#000', textAlign: 'center', lineHeight: 10 }}>$</Text>
                  )}
                </Animated.View>
              ))}

              {/* SCAN SWEEP LASER (HTML .scanSweep style) */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(0,243,255,0.7)', 'rgba(0,243,255,0.3)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* FLASH OVERLAY */}
              <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,243,255,0.12)', opacity: flashOpacity, zIndex: 50 }} pointerEvents="none" />

              {/* 6. LEVEL BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#00f3ff', textTransform: 'uppercase' }}>LEVEL 2 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(0,243,255,0.15)', borderWidth: 2, borderColor: 'rgba(0,243,255,0.85)', shadowColor: '#00f3ff', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#00f3ff', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}>CYBER BANK</Text>
                </View>
              </Animated.View>

              {/* Pulsing glow ring beneath */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#00f3ff',
                backgroundColor: 'rgba(0, 243, 255, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : isBusLevel ? (
            /* Cyber MagLev Smart Bus Animation Modal View */
            <View style={{ flex: 1, backgroundColor: '#020210', position: 'relative', overflow: 'hidden' }}>
              {/* Stars / Speed Sparks Background */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <View
                    key={`star-${i}`}
                    style={{
                      position: 'absolute',
                      top: `${Math.random() * 80}%`,
                      left: `${Math.random() * 90}%`,
                      width: 2,
                      height: 2,
                      backgroundColor: i % 2 === 0 ? '#00f3ff' : '#ec4899',
                      opacity: 0.45
                    }}
                  />
                ))}
              </View>

              {/* 3D Tilted Propeller Beam */}
              <Animated.View style={{
                position: 'absolute',
                width: 320,
                height: 260,
                alignSelf: 'center',
                bottom: 20,
                opacity: beamPulseAnim,
                pointerEvents: 'none'
              }}>
                <Svg width="320" height="260" viewBox="0 0 320 260">
                  <Defs>
                    <SvgLinearGradient id="busBeamGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="rgba(236, 72, 153, 0.2)" />
                      <Stop offset="55%" stopColor="rgba(0, 243, 255, 0.05)" />
                      <Stop offset="100%" stopColor="transparent" />
                    </SvgLinearGradient>
                  </Defs>
                  <Path d="M100 0 L220 0 L280 260 L40 260 Z" fill="url(#busBeamGrad)" />
                </Svg>
              </Animated.View>

              {/* MagLev Orbit Rings */}
              <View
                style={{ position: 'absolute', width: 340, height: 110, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(236,72,153,0.25)', bottom: 22, alignSelf: 'center', transform: [{ perspective: 800 }, { rotateX: '68deg' }] }}
                pointerEvents="none"
              />

              {/* 4. BUS SVG MODEL */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateY: engineVibe }], zIndex: 10, alignSelf: 'center', bottom: 40, position: 'absolute' }}>
                <View style={{ width: 320, height: 240 }}>
                  <Svg width="320" height="240" viewBox="0 0 600 300">
                    <Defs>
                      <SvgLinearGradient id="modalBusBody" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#1e1b4b" />
                        <Stop offset="40%" stopColor="#4c1d95" />
                        <Stop offset="80%" stopColor="#2e1065" />
                        <Stop offset="100%" stopColor="#0f172a" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalBusCyan" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#00f3ff" />
                        <Stop offset="100%" stopColor="#008bb8" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalBusMagenta" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#ec4899" />
                        <Stop offset="100%" stopColor="#be185d" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalBusGlass" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#1e293b" />
                        <Stop offset="50%" stopColor="#0f172a" />
                        <Stop offset="100%" stopColor="#312e81" />
                      </SvgLinearGradient>
                      <Filter id="modalBusGlow" x="-10%" y="-10%" width="120%" height="120%">
                        <FeGaussianBlur stdDeviation="6" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                    </Defs>

                    {/* Ground levitation details */}
                    <Ellipse cx="300" cy="270" rx="220" ry="15" fill="rgba(0,0,0,0.8)" />
                    <Ellipse cx="300" cy="270" rx="160" ry="8" fill="#00f3ff" opacity="0.35" filter="url(#modalBusGlow)" />

                    {/* MagLev Thruster Pods */}
                    <G transform="translate(140, 240)">
                      <Ellipse cx="0" cy="15" rx="55" ry="12" fill="rgba(0, 0, 0, 0.9)" />
                      <Ellipse cx="0" cy="15" rx="42" ry="7" fill="none" stroke="#00f3ff" strokeWidth={3} filter="url(#modalBusGlow)" />
                      <Path d="M-40 0 L-25 15 H25 L40 0 Z" fill="url(#modalBusMagenta)" />
                      <Circle cx="0" cy="15" r="4" fill="#fbbf24" />
                    </G>
                    <G transform="translate(440, 243)">
                      <Ellipse cx="0" cy="15" rx="58" ry="12" fill="rgba(0, 0, 0, 0.9)" />
                      <Ellipse cx="0" cy="15" rx="44" ry="7" fill="none" stroke="#00f3ff" strokeWidth={3} filter="url(#modalBusGlow)" />
                      <Path d="M-40 0 L-25 15 H25 L40 0 Z" fill="url(#modalBusMagenta)" />
                      <Circle cx="0" cy="15" r="4" fill="#fbbf24" />
                    </G>

                    {/* Main bus body paths */}
                    <Path d="M60 230 H540 V150 L530 110 H70 L60 150 Z" fill="url(#modalBusBody)" stroke="#ec4899" strokeWidth={2} />
                    <Path d="M70 110 H530 V45 C530 40 500 35 480 35 H120 C100 35 70 40 70 45 Z" fill="url(#modalBusBody)" stroke="#00f3ff" strokeWidth={2.2} />
                    <Path d="M58 135 H542 L538 143 H62 Z" fill="url(#modalBusMagenta)" opacity="0.9" />

                    {/* Windows */}
                    <Path d="M90 50 H180 V95 H90 Z" fill="url(#modalBusGlass)" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M200 50 H290 V95 H200 Z" fill="url(#modalBusGlass)" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M310 50 H400 V95 H310 Z" fill="url(#modalBusGlass)" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M420 50 H510 V95 H420 Z" fill="url(#modalBusGlass)" stroke="#00f3ff" strokeWidth={1} />

                    <Path d="M90 155 H170 V195 H90 Z" fill="url(#modalBusGlass)" stroke="#ec4899" strokeWidth={1} />
                    <Path d="M190 155 H270 V195 H190 Z" fill="url(#modalBusGlass)" stroke="#ec4899" strokeWidth={1} />
                    <Path d="M290 155 H370 V195 H290 Z" fill="url(#modalBusGlass)" stroke="#ec4899" strokeWidth={1} />
                    <Path d="M485 155 C485 155 515 155 530 168 L538 190 H485 Z" fill="url(#modalBusGlass)" stroke="#00f3ff" strokeWidth={1.5} />

                    {/* Digital board destination indicator */}
                    <Rect x="200" y="112" width="200" height="20" rx="5" fill="#000" stroke="#00f3ff" strokeWidth={1} />
                    <SvgText x="300" y="126" fill="#fbbf24" fontSize="12" fontWeight="900" textAnchor="middle" letterSpacing={2}>
                      CYBER-BUS
                    </SvgText>

                    {/* Headlights and tails */}
                    <Polygon points="540,210 580,180 580,240 540,225" fill="rgba(0, 243, 255, 0.4)" filter="url(#modalBusGlow)" />
                    <Circle cx="540" cy="217" r="8" fill="#fff" stroke="#00f3ff" strokeWidth={2} filter="url(#modalBusGlow)" />
                    <Path d="M58 200 H63 V220 H58 Z" fill="#ef4444" filter="url(#modalBusGlow)" />
                  </Svg>
                </View>
              </Animated.View>

              {/* Sparks Particles */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`bus-spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 8 : 5,
                    height: index % 2 === 0 ? 8 : 5,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#00f3ff' : '#ec4899',
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    shadowColor: '#00f3ff',
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                />
              ))}

              {/* SCAN SWEEP LASER */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(236,72,153,0.6)', 'rgba(0,243,255,0.3)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* 6. LEVEL BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#ec4899', textTransform: 'uppercase' }}>LEVEL 5 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(236,72,153,0.15)', borderWidth: 2, borderColor: 'rgba(236,72,153,0.85)', shadowColor: '#ec4899', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#ec4899', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}>CYBER BUS</Text>
                </View>
              </Animated.View>

              {/* Platform background shadow */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : isTrainLevel ? (
            /* Cyber MagLev Bullet Train Animation Modal View - Curving Space Tracks */
            <View style={{ flex: 1, backgroundColor: '#020617', position: 'relative', overflow: 'hidden' }}>
              {/* Stars / Space dust in background */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <View
                    key={`train-star-${i}`}
                    style={{
                      position: 'absolute',
                      top: `${Math.random() * 85}%`,
                      left: `${Math.random() * 95}%`,
                      width: i % 2 === 0 ? 3 : 1.5,
                      height: i % 2 === 0 ? 3 : 1.5,
                      backgroundColor: i % 3 === 0 ? '#00f3ff' : i % 3 === 1 ? '#fbbf24' : '#e0f',
                      opacity: 0.65
                    }}
                  />
                ))}
              </View>

              {/* 4. TRAIN MODEL SVG */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateY: engineVibe }], zIndex: 10, alignSelf: 'center', bottom: 30, position: 'absolute' }}>
                <View style={{ width: 320, height: 300 }}>
                  <Svg width="320" height="300" viewBox="0 0 600 300">
                    <Defs>
                      <SvgLinearGradient id="modalTrainChrome" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#e2e8f0" />
                        <Stop offset="30%" stopColor="#94a3b8" />
                        <Stop offset="65%" stopColor="#475569" />
                        <Stop offset="100%" stopColor="#1e293b" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalWindshieldTint" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#0284c7" />
                        <Stop offset="100%" stopColor="#0f172a" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalNeonCyanTrack" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#00f3ff" />
                        <Stop offset="100%" stopColor="#0ea5e9" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalNeonMagentaTrack" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#d946ef" />
                        <Stop offset="100%" stopColor="#8b5cf6" />
                      </SvgLinearGradient>
                      <Filter id="modalHighGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeGaussianBlur stdDeviation="8" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                    </Defs>

                    {/* Winding tracks */}
                    <Path d="M40 280 Q250 200 620 180" fill="none" stroke="url(#modalNeonMagentaTrack)" strokeWidth={16} opacity={0.8} />
                    <Path d="M40 280 Q250 200 620 180" fill="none" stroke="#fff" strokeWidth={4} />

                    <Path d="M110 300 Q300 220 620 190" fill="none" stroke="url(#modalNeonCyanTrack)" strokeWidth={24} filter="url(#modalHighGlow)" opacity={0.95} />
                    <Path d="M110 300 Q300 220 620 190" fill="none" stroke="#fff" strokeWidth={6} />

                    <Path d="M220 320 Q360 240 620 200" fill="none" stroke="url(#modalNeonMagentaTrack)" strokeWidth={14} opacity={0.7} />
                    
                    {/* Headlight beams */}
                    <Polygon points="190,195 -10,290 100,320 220,205" fill="rgba(255,255,255,0.22)" filter="url(#modalHighGlow)" />
                    <Polygon points="305,200 210,310 360,320 320,205" fill="rgba(0,243,255,0.18)" filter="url(#modalHighGlow)" />

                    {/* Train Nose & Cockpit */}
                    <Path d="M170 178 C250 160 380 155 620 160 L620 200 C420 198 280 205 190 225 Z" fill="url(#modalTrainChrome)" stroke="#94a3b8" strokeWidth={1.5} />
                    <Path d="M100 200 C95 190 115 155 170 148 C210 145 220 170 210 195 C200 215 160 228 115 224 C100 220 102 208 100 200 Z" fill="url(#modalTrainChrome)" stroke="#475569" strokeWidth={2} />
                    <Path d="M118 185 C122 170 140 158 165 156 C180 155 188 165 184 178 C176 190 155 196 132 195 C120 195 116 190 118 185 Z" fill="url(#modalWindshieldTint)" stroke="#0ea5e9" strokeWidth={1.5} />
                    <Path d="M135 162 C150 160 162 165 160 175" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2.5} />

                    {/* Side Windows */}
                    <Path d="M260 168 H295 L292 182 H258 Z" fill="#000" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M320 166 H355 L352 180 H318 Z" fill="#000" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M380 164 H415 L412 178 H378 Z" fill="#000" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M440 163 H475 L472 177 H438 Z" fill="#000" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M500 162 H535 L532 176 H498 Z" fill="#000" stroke="#00f3ff" strokeWidth={1} />

                    <Path d="M262 170 H290 V178 H262 Z" fill="#fbbf24" opacity={0.8} />
                    <Path d="M322 168 H350 V176 H322 Z" fill="#fbbf24" opacity={0.8} />
                    <Path d="M382 166 H410 V174 H382 Z" fill="#fbbf24" opacity={0.8} />

                    {/* Neon Stripes */}
                    <Path d="M190 205 C250 190 350 185 620 185" fill="none" stroke="#00f3ff" strokeWidth={3} filter="url(#modalHighGlow)" />
                    <Path d="M172 215 C230 202 330 196 620 194" fill="none" stroke="#ec4899" strokeWidth={1.5} />

                    {/* Headlights */}
                    <Circle cx="120" cy="208" r="9" fill="#fff" filter="url(#modalHighGlow)" />
                    <Circle cx="120" cy="208" r="5" fill="#fbbf24" />
                    <Circle cx="195" cy="214" r="9" fill="#fff" filter="url(#modalHighGlow)" />
                    <Circle cx="195" cy="214" r="5" fill="#fbbf24" />

                    <Path d="M125 224 L135 235 H155 L160 223" fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
                  </Svg>
                </View>
              </Animated.View>

              {/* Sparks Particles */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`train-spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 8 : 4,
                    height: index % 2 === 0 ? 8 : 4,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#00f3ff' : '#ec4899',
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    shadowColor: '#00f3ff',
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                />
              ))}

              {/* SCAN SWEEP LASER */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(0,243,255,0.6)', 'rgba(251,191,36,0.3)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* 6. LEVEL BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#00f3ff', textTransform: 'uppercase' }}>LEVEL 6 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(0,243,255,0.15)', borderWidth: 2, borderColor: 'rgba(0,243,255,0.85)', shadowColor: '#00f3ff', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#00f3ff', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}>CYBER TRAIN</Text>
                </View>
              </Animated.View>

              {/* Platform background shadow */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#00f3ff',
                backgroundColor: 'rgba(0, 243, 255, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : isShipLevel ? (
            /* Cyber Cruiser Ship Animation Modal View */
            <View style={{ flex: 1, backgroundColor: '#020617', position: 'relative', overflow: 'hidden' }}>
              {/* Stars / Space dust in background */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 15 }).map((_, i) => (
                  <View
                    key={`ship-star-${i}`}
                    style={{
                      position: 'absolute',
                      top: `${Math.random() * 85}%`,
                      left: `${Math.random() * 95}%`,
                      width: i % 2 === 0 ? 3 : 1.5,
                      height: i % 2 === 0 ? 3 : 1.5,
                      backgroundColor: i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#fbbf24' : '#e0f',
                      opacity: 0.6
                    }}
                  />
                ))}
              </View>

              {/* 3D Ship Model SVG */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateY: engineVibe }], zIndex: 10, alignSelf: 'center', bottom: 30, position: 'absolute' }}>
                <View style={{ width: 320, height: 300 }}>
                  <Svg width="320" height="300" viewBox="0 0 600 300">
                    <Defs>
                      <SvgLinearGradient id="modalShipHull" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#1e293b" />
                        <Stop offset="50%" stopColor="#0f172a" />
                        <Stop offset="100%" stopColor="#020617" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalShipChrome" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#38bdf8" />
                        <Stop offset="50%" stopColor="#0284c7" />
                        <Stop offset="100%" stopColor="#0369a1" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalCyanWakeGlow" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#00f3ff" />
                        <Stop offset="100%" stopColor="transparent" />
                      </SvgLinearGradient>
                      <Filter id="modalShipGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <FeGaussianBlur stdDeviation="6" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                    </Defs>

                    {/* Water Wake / Glowing Thruster waves underneath */}
                    <Path d="M100 240 Q300 290 500 240" fill="none" stroke="url(#modalCyanWakeGlow)" strokeWidth={12} filter="url(#modalShipGlow)" />
                    <Path d="M60 250 Q300 275 540 250" fill="none" stroke="#e0f" strokeWidth={3} filter="url(#modalShipGlow)" />

                    {/* Ship Shadow */}
                    <Ellipse cx="300" cy="252" rx="200" ry="12" fill="rgba(0,0,0,0.6)" />

                    {/* Main Ship Cyber Hull */}
                    <Path d="M80 200 L120 150 L480 150 L520 200 L440 240 H160 Z" fill="url(#modalShipHull)" stroke="#00f3ff" strokeWidth={2} />
                    <Path d="M160 240 H440 L400 250 H200 Z" fill="#020617" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M150 170 H450 L470 200 H130 Z" fill="url(#modalShipChrome)" opacity={0.8} />

                    {/* Windows */}
                    <Rect x="200" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />
                    <Rect x="250" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />
                    <Rect x="300" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />
                    <Rect x="350" y="178" width="25" height="12" rx="2" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1} />

                    <Path d="M120 160 H480" stroke="#f43f5e" strokeWidth={2.5} filter="url(#modalShipGlow)" />
                    <Path d="M140 210 H460" stroke="#00f3ff" strokeWidth={1.5} />

                    {/* Deck Bridge */}
                    <Path d="M220 150 L240 115 H360 L380 150 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={1.8} />
                    <Polygon points="255,123 345,123 335,140 265,140" fill="#00f3ff" opacity={0.9} />

                    {/* Radar Tower */}
                    <Line x1="300" y1="115" x2="300" y2="70" stroke="#475569" strokeWidth={3} />
                    <Ellipse cx="300" cy="70" rx="15" ry="4" fill="#334155" stroke="#00f3ff" strokeWidth={1.2} />
                    <Path d="M280 60 Q300 50 320 60" fill="none" stroke="#00f3ff" strokeWidth={2} filter="url(#modalShipGlow)" />

                    {/* LED Lights */}
                    <Circle cx="120" cy="150" r="3" fill="#ef4444" />
                    <Circle cx="480" cy="150" r="3" fill="#10b981" />
                  </Svg>
                </View>
              </Animated.View>

              {/* Sparks Particles */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`ship-spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 6 : 4,
                    height: index % 2 === 0 ? 6 : 4,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#38bdf8' : '#00f3ff',
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    shadowColor: '#38bdf8',
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                />
              ))}

              {/* SCAN SWEEP LASER */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(0,243,255,0.4)', 'rgba(236,72,153,0.2)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* LEVEL REWARD BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#38bdf8', textTransform: 'uppercase' }}>LEVEL 7 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 2, borderColor: 'rgba(56,189,248,0.85)', shadowColor: '#38bdf8', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#38bdf8', textShadowRadius: 10 }}>CYBER CRUISER</Text>
                </View>
              </Animated.View>

              {/* Platform background shadow */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : isPlaneLevel ? (
            /* Cyber supersonic Fighter Jet Animation Modal View */
            <View style={{ flex: 1, backgroundColor: '#020617', position: 'relative', overflow: 'hidden' }}>
              {/* Stars / Space dust in background */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 15 }).map((_, i) => (
                  <View
                    key={`plane-star-${i}`}
                    style={{
                      position: 'absolute',
                      top: `${Math.random() * 85}%`,
                      left: `${Math.random() * 95}%`,
                      width: i % 2 === 0 ? 3 : 1.5,
                      height: i % 2 === 0 ? 3 : 1.5,
                      backgroundColor: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#00f3ff' : '#e0f',
                      opacity: 0.6
                    }}
                  />
                ))}
              </View>

              {/* 3D Fighter Jet Model SVG */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateY: engineVibe }], zIndex: 10, alignSelf: 'center', bottom: 30, position: 'absolute' }}>
                <View style={{ width: 320, height: 300 }}>
                  <Svg width="320" height="300" viewBox="0 0 600 300">
                    <Defs>
                      <SvgLinearGradient id="modalPlaneHull" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#1e293b" />
                        <Stop offset="50%" stopColor="#334155" />
                        <Stop offset="100%" stopColor="#0f172a" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalPlaneGlass" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#fbbf24" />
                        <Stop offset="100%" stopColor="#ea580c" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalAfterburnerFire" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#ef4444" />
                        <Stop offset="50%" stopColor="#f97316" />
                        <Stop offset="100%" stopColor="transparent" />
                      </SvgLinearGradient>
                      <Filter id="modalPlaneGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <FeGaussianBlur stdDeviation="6" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                    </Defs>

                    {/* Shadow underneath */}
                    <Ellipse cx="300" cy="260" rx="160" ry="8" fill="rgba(0,0,0,0.5)" />

                    {/* Afterburner Thruster Fire Trail */}
                    <Path d="M120 185 L30 175 L120 195 Z" fill="url(#modalAfterburnerFire)" />
                    <Path d="M120 205 L30 215 L120 195 Z" fill="url(#modalAfterburnerFire)" />
                    
                    {/* Fuselage */}
                    <Path d="M520 195 L400 170 L220 160 H150 L120 175 L120 215 L150 230 H220 L400 220 Z" fill="url(#modalPlaneHull)" stroke="#00f3ff" strokeWidth={2} />

                    {/* Canopy visor */}
                    <Path d="M380 170 C410 168 470 172 490 195 C450 198 400 195 380 170 Z" fill="url(#modalPlaneGlass)" stroke="#f97316" strokeWidth={1.5} />
                    
                    {/* Left Wing */}
                    <Polygon points="260,160 140,90 180,160" fill="#0f172a" stroke="#00f3ff" strokeWidth={1.5} />
                    <Line x1="260" y1="160" x2="140" y2="90" stroke="#00f3ff" strokeWidth={3} filter="url(#modalPlaneGlow)" />

                    {/* Right Wing */}
                    <Polygon points="260,230 140,300 180,230" fill="#0f172a" stroke="#00f3ff" strokeWidth={1.5} />
                    <Line x1="260" y1="230" x2="140" y2="300" stroke="#e0f" strokeWidth={3} filter="url(#modalPlaneGlow)" />

                    {/* Tail fins */}
                    <Polygon points="160,160 100,80 120,160" fill="#334155" stroke="#00f3ff" strokeWidth={1} />
                    <Polygon points="160,230 100,310 120,230" fill="#334155" stroke="#00f3ff" strokeWidth={1} />

                    {/* Laser wingtip Cannons */}
                    <Line x1="140" y1="90" x2="90" y2="90" stroke="#ef4444" strokeWidth={2.5} filter="url(#modalPlaneGlow)" />
                    <Line x1="140" y1="300" x2="90" y2="300" stroke="#ef4444" strokeWidth={2.5} filter="url(#modalPlaneGlow)" />

                    {/* HUD lines */}
                    <Path d="M420 183 C440 180 470 188 475 194" fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.65} />
                  </Svg>
                </View>
              </Animated.View>

              {/* Sparks Particles */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`plane-spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 6 : 4,
                    height: index % 2 === 0 ? 6 : 4,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#f97316' : '#fbbf24',
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    shadowColor: '#f97316',
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                />
              ))}

              {/* SCAN SWEEP LASER */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(249,115,22,0.4)', 'rgba(0,243,255,0.2)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* LEVEL REWARD BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#f97316', textTransform: 'uppercase' }}>LEVEL 8 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 2, borderColor: 'rgba(249,115,22,0.85)', shadowColor: '#f97316', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#f97316', textShadowRadius: 10 }}>CYBER PLANE</Text>
                </View>
              </Animated.View>

              {/* Platform background shadow */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : isSubmarineLevel ? (
            /* Cyber Submarine Animation Modal View */
            <View style={{ flex: 1, backgroundColor: '#020617', position: 'relative', overflow: 'hidden' }}>
              {/* Stars / Space bubbles in background */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <View
                    key={`sub-star-${i}`}
                    style={{
                      position: 'absolute',
                      top: `${Math.random() * 85}%`,
                      left: `${Math.random() * 95}%`,
                      width: i % 2 === 0 ? 5 : 3,
                      height: i % 2 === 0 ? 5 : 3,
                      borderRadius: 9,
                      backgroundColor: '#00f3ff',
                      opacity: 0.4
                    }}
                  />
                ))}
              </View>

              {/* 3D Submarine Model SVG */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateY: engineVibe }], zIndex: 10, alignSelf: 'center', bottom: 30, position: 'absolute' }}>
                <View style={{ width: 320, height: 300 }}>
                  <Svg width="320" height="300" viewBox="0 0 600 300">
                    <Defs>
                      <SvgLinearGradient id="modalSubHull" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#0284c7" />
                        <Stop offset="50%" stopColor="#075985" />
                        <Stop offset="100%" stopColor="#0c4a6e" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="modalSonarGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#22c55e" />
                        <Stop offset="100%" stopColor="transparent" />
                      </SvgLinearGradient>
                      <Filter id="modalSubNeonCyan" x="-20%" y="-20%" width="140%" height="140%">
                        <FeGaussianBlur stdDeviation="6" result="blur" />
                        <FeMerge>
                          <FeMergeNode in="blur" />
                          <FeMergeNode in="SourceGraphic" />
                        </FeMerge>
                      </Filter>
                    </Defs>

                    {/* Ocean trails */}
                    <Path d="M40 180 Q300 130 560 180" fill="none" stroke="rgba(0,243,255,0.15)" strokeWidth={4} />
                    <Path d="M40 220 Q300 240 560 210" fill="none" stroke="rgba(236,72,153,0.12)" strokeWidth={3} />

                    {/* Sub Shadow */}
                    <Ellipse cx="300" cy="245" rx="170" ry="10" fill="rgba(0,0,0,0.55)" />

                    {/* Propeller */}
                    <Path d="M110 180 L80 140 V240 L110 200 Z" fill="#334155" stroke="#00f3ff" strokeWidth={1} />
                    <Rect x="75" y="150" width="8" height="80" rx="3" fill="#0c4a6e" stroke="#00f3ff" strokeWidth={1.2} />

                    {/* Body Hull */}
                    <Path d="M120 180 C120 140 200 120 420 135 C480 140 500 165 480 200 C460 230 350 240 160 230 C130 225 120 210 120 180 Z" fill="url(#modalSubHull)" stroke="#00f3ff" strokeWidth={2} />

                    {/* Bridge */}
                    <Path d="M260 130 L275 80 H350 L360 132 Z" fill="#075985" stroke="#00f3ff" strokeWidth={1.8} />
                    <Line x1="310" y1="80" x2="310" y2="40" stroke="#475569" strokeWidth={3.5} />
                    <Path d="M310 40 H335 L330 48 H310 Z" fill="#0f172a" stroke="#00f3ff" strokeWidth={1} />
                    <Path d="M340 35 Q355 40 340 50" fill="none" stroke="#22c55e" strokeWidth={2} filter="url(#modalSubNeonCyan)" />

                    {/* Viewport */}
                    <Circle cx="380" cy="180" r="28" fill="#1e293b" stroke="#00f3ff" strokeWidth={3} />
                    <Circle cx="380" cy="180" r="22" fill="#0284c7" opacity={0.9} />

                    {/* Headlights */}
                    <Polygon points="475,190 590,140 585,250 470,208" fill="url(#modalSonarGlowGrad)" opacity={0.35} />
                    <Circle cx="475" cy="198" r="7" fill="#fff" filter="url(#modalSubNeonCyan)" />

                    <Circle cx="160" cy="165" r="4.5" fill="#10b981" />
                    <Circle cx="210" cy="165" r="4.5" fill="#f43f5e" />
                  </Svg>
                </View>
              </Animated.View>

              {/* Sparks Particles */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`sub-spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 8 : 4,
                    height: index % 2 === 0 ? 8 : 4,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#0284c7' : '#00f3ff',
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    shadowColor: '#00f3ff',
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                />
              ))}

              {/* SCAN SWEEP LASER */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(0,243,255,0.4)', 'rgba(34,197,94,0.2)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* LEVEL REWARD BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#00f3ff', textTransform: 'uppercase' }}>LEVEL 9 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(0,243,255,0.15)', borderWidth: 2, borderColor: 'rgba(0,243,255,0.85)', shadowColor: '#00f3ff', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#00f3ff', textShadowRadius: 10 }}>CYBER SUBMARINE</Text>
                </View>
              </Animated.View>

              {/* Platform background shadow */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#00f3ff',
                backgroundColor: 'rgba(0, 243, 255, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : isRocketLevel ? (
            /* Cyber Space Rocket Animation Modal View */
            <View style={{ flex: 1, backgroundColor: '#020617', position: 'relative', overflow: 'hidden' }}>
              {/* Stars / Space dust in background */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <View
                    key={`rocket-star-${i}`}
                    style={{
                      position: 'absolute',
                      top: `${Math.random() * 85}%`,
                      left: `${Math.random() * 95}%`,
                      width: i % 2 === 0 ? 3 : 1.5,
                      height: i % 2 === 0 ? 3 : 1.5,
                      backgroundColor: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#00f3ff' : '#e0f',
                      opacity: 0.75
                    }}
                  />
                ))}
              </View>

              {/* 3D Rocket Model SVG */}
              <Animated.View style={{ transform: [{ scale: glowPulse }, { translateY: engineVibe }], zIndex: 10, alignSelf: 'center', bottom: 30, position: 'absolute', overflow: 'visible' }}>
                <View style={{ width: 340, height: 340, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                  <Svg width="340" height="340" viewBox="0 0 600 450" style={{ overflow: 'visible' }}>
                    {/* Transform scale to represent it nicely in the modal view */}
                    <G transform="scale(1.25) translate(-65, -45)">
                      <Defs>
                        {/* Matte Carbon / Dark Metallic */}
                        <SvgLinearGradient id="modalRocketCarbon" x1="0%" y1="0%" x2="100%" y2="100%">
                          <Stop offset="0%" stopColor="#2d3748" />
                          <Stop offset="50%" stopColor="#1a202c" />
                          <Stop offset="100%" stopColor="#0a0f1d" />
                        </SvgLinearGradient>
                        {/* Crimson Red Armor Panels */}
                        <SvgLinearGradient id="modalRocketCrimson" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="#ef4444" />
                          <Stop offset="50%" stopColor="#dc2626" />
                          <Stop offset="100%" stopColor="#7f1d1d" />
                        </SvgLinearGradient>
                        {/* Amber/Orange Cockpit Glass */}
                        <SvgLinearGradient id="modalRocketAmber" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="#fef08a" />
                          <Stop offset="40%" stopColor="#f97316" />
                          <Stop offset="100%" stopColor="#9a3412" />
                        </SvgLinearGradient>
                        {/* Fire Orange/Red Exhaust Flame */}
                        <SvgLinearGradient id="modalRocketFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="#ef4444" opacity={0.95} />
                          <Stop offset="50%" stopColor="#f97316" opacity={0.75} />
                          <Stop offset="100%" stopColor="transparent" />
                        </SvgLinearGradient>
                        <Filter id="modalRocketOrangeGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <FeGaussianBlur stdDeviation="8" result="blur" />
                          <FeMerge>
                            <FeMergeNode in="blur" />
                            <FeMergeNode in="SourceGraphic" />
                          </FeMerge>
                        </Filter>
                      </Defs>

                      {/* Pedestal Cyber Laser Ring under rocket - Glowing Dangerous Orange */}
                      <Ellipse cx="300" cy="285" rx="140" ry="25" fill="none" stroke="#f97316" strokeWidth={3} filter="url(#modalRocketOrangeGlow)" />
                      <Ellipse cx="300" cy="285" rx="90" ry="16" fill="none" stroke="#ef4444" strokeWidth={1.5} />

                      {/* Crimson Red side wing attachments with warning marks */}
                      {/* Left Wing */}
                      <Path d="M245 130 C200 170 160 190 160 245 L240 225 Z" fill="url(#modalRocketCrimson)" stroke="#ef4444" strokeWidth={1.5} />
                      <Polygon points="175,205 230,195 228,218 170,225" fill="#f97316" opacity={0.7} />
                      <Line x1="170" y1="230" x2="230" y2="220" stroke="#fff" strokeWidth={1} opacity={0.4} />

                      {/* Right Wing */}
                      <Path d="M355 130 C400 170 440 190 440 245 L360 225 Z" fill="url(#modalRocketCrimson)" stroke="#ef4444" strokeWidth={1.5} />
                      <Polygon points="425,205 370,195 372,218 430,225" fill="#f97316" opacity={0.7} />
                      <Line x1="430" y1="230" x2="370" y2="220" stroke="#fff" strokeWidth={1} opacity={0.4} />

                      {/* Main Rocket Body (Teardrop layout with carbon metal gradient) */}
                      <Path d="M300 -50 C215 95 230 215 245 255 L300 275 L355 255 C370 215 385 95 300 -50 Z" fill="url(#modalRocketCarbon)" stroke="#ef4444" strokeWidth={1} />
                      
                      {/* Specular curved lighting highlights along rocket center edge */}
                      <Path d="M300 -48 C225 95 238 205 252 245" fill="none" stroke="#ffffff" strokeWidth={3.5} opacity={0.5} strokeLinecap="round" />
                      <Path d="M300 -50 C245 95 258 205 272 245" fill="none" stroke="#f97316" strokeWidth={1.5} opacity={0.6} />

                      {/* Amber Windshield glass visor (Holographic details) */}
                      <Path d="M300 5 C265 95 265 175 265 195 H335 C335 175 335 95 300 5 Z" fill="url(#modalRocketAmber)" stroke="#f97316" strokeWidth={1.5} />
                      <Path d="M295 28 A 22 22 0 0 1 318 70" fill="none" stroke="#ffffff" strokeWidth={3.5} opacity={0.6} />
                      
                      {/* Core reactor node */}
                      <Rect x="282" y="155" width="36" height="30" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth={2} />
                      <Circle cx="300" cy="170" r="5" fill="#f97316" filter="url(#modalRocketOrangeGlow)" />

                      {/* Dark iron exhaust bells nozzle connectors */}
                      <Path d="M260 255 H340 L330 267 H270 Z" fill="#1a202c" stroke="#475569" strokeWidth={1} />

                      <Rect x="245" y="218" width="45" height="32" rx="10" fill="#2d3748" stroke="#ef4444" strokeWidth={2.5} />
                      <Circle cx="267" cy="234" r="11" fill="#0f172a" />
                      
                      <Rect x="310" y="218" width="45" height="32" rx="10" fill="#2d3748" stroke="#ef4444" strokeWidth={2.5} />
                      <Circle cx="333" cy="234" r="11" fill="#0f172a" />

                      {/* Bottom stabilizer fin */}
                      <Polygon points="293,238 307,238 300,280" fill="url(#modalRocketCrimson)" stroke="#ef4444" strokeWidth={1} />

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
                fill="url(#modalRocketFlameGrad)" 
                filter="url(#modalRocketOrangeGlow)" 
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
                filter="url(#modalRocketOrangeGlow)" 
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
                fill="url(#modalRocketFlameGrad)" 
                filter="url(#modalRocketOrangeGlow)" 
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
                filter="url(#modalRocketOrangeGlow)" 
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
                filter="url(#modalRocketOrangeGlow)" 
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
                filter="url(#modalRocketOrangeGlow)" 
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
                </View>
              </Animated.View>

              {/* Sparks Particles */}
              {particles.map((p, index) => (
                <Animated.View
                  key={`rocket-spark-${index}`}
                  style={{
                    position: 'absolute',
                    width: index % 2 === 0 ? 8 : 4,
                    height: index % 2 === 0 ? 8 : 4,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#ef4444' : '#fbbf24',
                    opacity: p.opacity,
                    transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                    shadowColor: '#ef4444',
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    zIndex: 15
                  }}
                />
              ))}

              {/* SCAN SWEEP LASER */}
              <Animated.View style={{ position: 'absolute', width: 90, height: 360, zIndex: 45, opacity: scanOpacity, transform: [{ translateX: scanX }, { rotate: '-18deg' }] }} pointerEvents="none">
                <LinearGradient colors={['transparent', 'rgba(239,68,68,0.4)', 'rgba(251,191,36,0.2)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>

              {/* LEVEL REWARD BANNER */}
              <Animated.View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: bannerOpacity, transform: [{ translateY: bannerY }], zIndex: 60 }} pointerEvents="none">
                <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 3, color: '#ef4444', textTransform: 'uppercase' }}>LEVEL 10 REWARD</Text>
                <View style={{ marginTop: 5, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 2, borderColor: 'rgba(239,68,68,0.85)', shadowColor: '#ef4444', shadowOpacity: 0.65, shadowRadius: 28 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: '#ef4444', textShadowRadius: 10 }}>CYBER ROCKET</Text>
                </View>
              </Animated.View>

              {/* Platform background shadow */}
              <Animated.View style={{
                marginTop: 15,
                width: 270,
                height: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                opacity: glowPulse,
                transform: [{ scale: glowPulse }],
                alignSelf: 'center',
                bottom: 12,
                position: 'absolute'
              }} />
            </View>
          ) : (
            <View style={[styles.video, { backgroundColor: '#1a0b2e', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fbbf24', fontSize: 28, fontWeight: '900' }}>🎉</Text>
              <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '700', marginTop: 12 }}>{levelName} Unlocked!</Text>
            </View>
          )}

          {/* DYNAMIC REWARD DISTRIBUTION SUMMARY OVERLAY */}
          {showSummary && (
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(5, 2, 15, 0.94)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999,
              padding: 20
            }}>
              <View style={{
                width: '92%',
                backgroundColor: 'rgba(26, 15, 46, 0.72)',
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: 'rgba(251, 191, 36, 0.45)',
                padding: 22,
                alignItems: 'center',
                shadowColor: '#fbbf24',
                shadowOpacity: 0.25,
                shadowRadius: 20,
              }}>
                {/* Header Title */}
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                  {levelName} Unlocked!
                </Text>
                <Text style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18, fontWeight: '600' }}>
                  2x Pool Reward Coins Distributed
                </Text>

                {/* List of Senders Rewards */}
                <View style={{ width: '100%', maxHeight: 220, marginBottom: 20 }}>
                  {summaryData.map((item, idx) => {
                    const isTop3 = item.rank <= 3;
                    const themedBorder = item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#cbd5e1' : item.rank === 3 ? '#b45309' : 'rgba(255,255,255,0.08)';
                    return (
                      <View key={item.uid} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 12,
                        marginVertical: 4,
                        borderWidth: 1.2,
                        borderColor: themedBorder
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 18, marginRight: 8 }}>{item.avatar}</Text>
                          <View>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{item.name}</Text>
                            <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '500' }}>Sent: {item.contribution.toLocaleString()}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <GoldenCoin size={14} />
                            <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '900' }}>+{item.coinsWon.toLocaleString()}</Text>
                          </View>
                          {isTop3 && (
                            <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700', marginTop: 1 }}>
                              +{item.expWon.toLocaleString()} EXP
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Store Unlocked Notification */}
                <View style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(251, 191, 36, 0.08)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.25)',
                  marginBottom: 20,
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#fef08a', fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
                    🎁 Top 3 Senders unlocked profile Frame & Entrance Effect!
                  </Text>
                </View>

                {/* Continue/Close Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowSummary(false);
                    onComplete();
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#fbbf24',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#fbbf24',
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                  }}
                >
                  <Text style={{ color: '#1e1b4b', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' }}>
                    Collect & Continue
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrapper: {
    width: '85%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  carWrapper: {
    width: '95%',
    height: 500,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 243, 255, 0.4)',
    backgroundColor: '#04010d',
  },
  carStage: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    flex: 1,
  },
});
