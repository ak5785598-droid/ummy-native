import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Easing, Image } from 'react-native';
import Svg, { G, Path, Circle, Stop } from 'react-native-svg';
const SvgText = require('react-native-svg').Text as any;
import { X, Volume2, VolumeX, RotateCcw, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, onSnapshot, getDoc, runTransaction, setDoc, writeBatch } from '@/firebase/firestore-compat';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouletteGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; myPrize?: number; myWager?: number }) => void;
  isMuted?: boolean;
}

const COLORS = {
  red: '#dc2626',
  black: '#0f172a',
  green: '#10b981',
  bg: '#090714',
  gold: '#fbbf24',
};

const ROULETTE_NUMBERS: { n: number; color: string }[] = [
  { n: 0, color: COLORS.green },
  ...[32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26].map(n => ({
    n,
    color: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) ? COLORS.red : COLORS.black,
  })),
];

const BET_TYPES = [
  { id: 'zero',      label: '0',           payout: 36, check: (n: number) => n === 0, icon: '🎯' },
  { id: 'red',       label: 'RED',         payout: 2,  check: (n: number) => [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n), icon: '🔴' },
  { id: 'black',     label: 'BLACK',       payout: 2,  check: (n: number) => [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(n), icon: '⚫' },
  { id: 'odd',       label: 'ODD',         payout: 2,  check: (n: number) => n !== 0 && n % 2 === 1, icon: '1️⃣' },
  { id: 'even',      label: 'EVEN',        payout: 2,  check: (n: number) => n !== 0 && n % 2 === 0, icon: '2️⃣' },
  { id: '1-12',      label: '1–12',        payout: 3,  check: (n: number) => n >= 1 && n <= 12, icon: '📊' },
  { id: '13-24',     label: '13–24',       payout: 3,  check: (n: number) => n >= 13 && n <= 24, icon: '📈' },
  { id: '25-36',     label: '25–36',       payout: 3,  check: (n: number) => n >= 25 && n <= 36, icon: '📉' },
];

const CHIP_OPTIONS = [100, 500, 1000, 5000, 10000, 50000];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function RouletteGame({ onClose, roomId, onRoundEnd, isMuted: initialMuted }: RouletteGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const firestore = useFirestore();
  const router = useRouter();

  const handleGoToWallet = () => {
    router.push('/wallet');
  };

  const [gameState, setGameState] = useState<'launching' | 'betting' | 'spinning' | 'result'>('launching');
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedChip, setSelectedChip] = useState(1000);
  const [myBets, setMyBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([14, 31, 22, 0, 17, 5, 29, 8]);
  const [localCoins, setLocalCoins] = useState(0);
  const [isMuted, setIsMuted] = useState(initialMuted || false);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [syncedRotation, setSyncedRotation] = useState<number>(0);

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const wheelRotationAnim = useRef(new Animated.Value(0)).current;

  const spinInitiatedRef = useRef(false);
  const myBetsRef = useRef(myBets);
  myBetsRef.current = myBets;

  const WHEEL_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
  const CENTER_SIZE = WHEEL_SIZE * 0.32;

  // Sync coins
  useEffect(() => {
    if (userProfile?.wallet?.coins !== undefined) setLocalCoins(userProfile.wallet.coins);
  }, [userProfile?.wallet?.coins]);

  // Entrance loader
  useEffect(() => {
    const t = setTimeout(() => setGameState('betting'), 2000);
    return () => clearTimeout(t);
  }, []);

  // Spin/Pulse indicators
  useEffect(() => {
    if (gameState === 'spinning') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'betting' && timeLeft > 0 && timeLeft <= 5) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.setValue(0.6);
    }
  }, [gameState, timeLeft]);

  // Real-time ticking countdown timer based on synced roundStartTime
  useEffect(() => {
    if (gameState !== 'betting' || !roundStartTime) return;

    const updateTimer = () => {
      const elapsed = Date.now() - roundStartTime;
      const remaining = Math.max(0, 15 - Math.floor(elapsed / 1000));
      setTimeLeft(remaining);
    };

    updateTimer(); // Initial call
    const iv = setInterval(updateTimer, 1000);
    return () => clearInterval(iv);
  }, [gameState, roundStartTime]);

  // Handle local state driver transitions (multiplayer-friendly logic)
  useEffect(() => {
    if (!firestore || gameState !== 'betting' || timeLeft > 0 || spinInitiatedRef.current) return;
    spinInitiatedRef.current = true;

    const targetDocName = `roulette_${roomId || 'global'}`;
    const roundDocRef = doc(firestore, 'games', targetDocName);

    (async () => {
      let targetNum = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)].n;
      try {
        const oracleSnap = await getDoc(doc(firestore, 'gameOracle', 'roulette'));
        if (oracleSnap.exists() && (oracleSnap.data() as any).isActive) {
          const forced = (oracleSnap.data() as any).forcedResult;
          if (typeof forced === 'number' && forced >= 0 && forced <= 36) {
            targetNum = forced;
          }
          updateDoc(doc(firestore, 'gameOracle', 'roulette'), { isActive: false }).catch(() => {});
        }
      } catch {}

      const targetIdx = ROULETTE_NUMBERS.findIndex(r => r.n === targetNum);
      const rotationStep = 360 / ROULETTE_NUMBERS.length;
      const extraSpins = 5 + Math.floor(Math.random() * 5);
      const newRotation = syncedRotation + (extraSpins * 360) + (targetIdx * rotationStep);

      // Perform spin status write
      runTransaction(firestore, async (tx: any) => {
        const snap = await tx.get(roundDocRef);
        if (snap.exists() && snap.data()?.status !== 'betting') return;
        tx.set(roundDocRef, {
          status: 'spinning',
          winningNumber: targetNum,
          rotation: newRotation,
          updatedAt: new Date()
        }, { merge: true });
      }).catch(() => { spinInitiatedRef.current = false; });

      // After 5s spin duration, trigger result state
      setTimeout(() => {
        runTransaction(firestore, async (tx: any) => {
          const snap = await tx.get(roundDocRef);
          if (!snap.exists() || snap.data()?.status !== 'spinning') return;
          tx.set(roundDocRef, {
            status: 'result',
            winningNumber: targetNum,
            updatedAt: new Date()
          }, { merge: true });
        }).catch(() => {});
      }, 5000);

      // After 10s total, reset to betting
      setTimeout(() => {
        runTransaction(firestore, async (tx: any) => {
          const snap = await tx.get(roundDocRef);
          if (!snap.exists() || snap.data()?.status !== 'result') return;
          tx.set(roundDocRef, {
            status: 'betting',
            winningNumber: null,
            history: [targetNum, ...(snap.data()?.history || [])].slice(0, 15),
            roundStartTime: Date.now(),
            updatedAt: new Date()
          }, { merge: true });
        }).catch(() => {});
        spinInitiatedRef.current = false;
      }, 10000);

    })();
  }, [gameState, timeLeft, firestore, roomId, syncedRotation]);

  // Real-time Firestore Sync (Locks state globally with room players)
  useEffect(() => {
    if (!firestore) return;
    const targetDoc = `roulette_${roomId || 'global'}`;
    const ref = doc(firestore, 'games', targetDoc);

    const unsub = onSnapshot(ref, (snap: any) => {
      const exists = snap.exists();
      if (!exists) {
        // Correct initialization using setDoc for specific ID
        setDoc(ref, {
          status: 'betting',
          winningNumber: null,
          rotation: 0,
          history: [14, 31, 22, 0, 17, 5, 29, 8],
          roundStartTime: Date.now(),
          updatedAt: new Date()
        }).catch(() => {});
        return;
      }

      const data = snap.data() as any;
      const status = data.status || 'betting';

      // Self-heal: If fields are missing in an existing doc
      if (data.status === undefined || data.roundStartTime === undefined) {
        updateDoc(ref, {
          status: data.status || 'betting',
          winningNumber: data.winningNumber || null,
          rotation: data.rotation || 0,
          history: data.history || [14, 31, 22, 0, 17, 5, 29, 8],
          roundStartTime: data.roundStartTime || Date.now(),
          updatedAt: new Date()
        }).catch(() => {});
        return;
      }

      setGameState(status);
      if (data.history) setHistory(data.history);

      // Handle timer countdown
      if (data.roundStartTime) {
        setRoundStartTime(data.roundStartTime);
      }

      // Sync wheel rotation with smooth physics rotation
      if (data.rotation !== undefined && data.rotation !== null) {
        setSyncedRotation(data.rotation);
        Animated.timing(wheelRotationAnim, {
          toValue: data.rotation,
          duration: status === 'spinning' ? 5000 : 0,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }

      // Sync winning number & finalize local winnings when transitioning to result status
      if (status === 'result' && data.winningNumber !== undefined && data.winningNumber !== null) {
        setWinningNumber(data.winningNumber);
        finalizeResult(data.winningNumber);
      }

      // Clear bets on transition back to betting state
      if (status === 'betting') {
        setWinningNumber(null);
        setResultMessage(null);
      }
    });

    return () => unsub();
  }, [firestore, roomId]);

  const handlePlaceBet = async (betId: string) => {
    if (gameState !== 'betting' || !currentUser || !firestore) return;
    try {
      const profileRef = doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid);
      const snap = await getDoc(profileRef);
      const freshCoins = snap.exists() ? ((snap.data() as any)?.wallet?.coins ?? (userProfile?.wallet?.coins ?? 0)) : (userProfile?.wallet?.coins ?? 0);
      if (freshCoins < selectedChip) return;
      const batch = writeBatch(firestore);
      const deductData = { 'wallet.coins': increment(-selectedChip) };
      batch.set(profileRef, deductData, { merge: true });
      batch.set(doc(firestore, 'users', currentUser.uid), deductData, { merge: true });
      await batch.commit();
      setLocalCoins(p => p - selectedChip);
    } catch {}
    setMyBets(prev => ({ ...prev, [betId]: (prev[betId] || 0) + selectedChip }));
  };

  const handleRepeat = async () => {
    if (gameState !== 'betting' || Object.keys(lastBets).length === 0 || !currentUser || !firestore) return;
    const totalCost = Object.values(lastBets).reduce((s, v) => s + v, 0);
    try {
      const profileRef = doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid);
      const snap = await getDoc(profileRef);
      const freshCoins = snap.exists() ? ((snap.data() as any)?.wallet?.coins ?? (userProfile?.wallet?.coins ?? 0)) : (userProfile?.wallet?.coins ?? 0);
      if (freshCoins < totalCost) return;
      const batch = writeBatch(firestore);
      const deductData = { 'wallet.coins': increment(-totalCost) };
      batch.set(profileRef, deductData, { merge: true });
      batch.set(doc(firestore, 'users', currentUser.uid), deductData, { merge: true });
      await batch.commit();
      setLocalCoins(p => p - totalCost);
    } catch {}
    setMyBets(prev => {
      const merged = { ...prev };
      Object.entries(lastBets).forEach(([k, v]) => { merged[k] = (merged[k] || 0) + v; });
      return merged;
    });
  };

  const finalizeResult = (num: number) => {
    let totalWin = 0;
    BET_TYPES.forEach(bt => {
      const betAmt = myBetsRef.current[bt.id] || 0;
      if (betAmt > 0 && bt.check(num)) {
        totalWin += betAmt * bt.payout;
      }
    });

    const totalBet = Object.values(myBetsRef.current).reduce((s, v) => s + v, 0);

    // Credit winnings
    if (totalWin > 0 && currentUser && firestore) {
      try {
        const batch = writeBatch(firestore);
        const winData = { 'wallet.coins': increment(totalWin) };
        batch.set(doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid), winData, { merge: true });
        batch.set(doc(firestore, 'users', currentUser.uid), winData, { merge: true });
        batch.commit().catch(() => {});
      } catch {}
      addDoc(collection(firestore, 'globalGameWins'), {
        gameId: 'roulette',
        roomId: roomId || null,
        userId: currentUser.uid,
        username: userProfile?.username || 'Guest',
        amount: totalWin,
        betAmount: totalBet,
        timestamp: new Date()
      }).catch(() => {});
      setLocalCoins(p => p + totalWin);
    }

    const numInfo = ROULETTE_NUMBERS.find(r => r.n === num);
    const colorName = num === 0 ? 'GREEN' : numInfo?.color === COLORS.red ? 'RED' : 'BLACK';
    
    if (num === 0) {
      setResultMessage(`🎯 ${num} GREEN!`);
    } else if (totalWin > 0) {
      setResultMessage(`🎉 ${num} ${colorName}! +${totalWin.toLocaleString()}`);
    } else {
      setResultMessage(`❌ ${num} ${colorName}!`);
    }

    if (onRoundEnd) {
      onRoundEnd({ resultText: `${num} ${colorName}`, resultEmoji: totalWin > 0 ? '🎉' : '🎯', myPrize: totalWin, myWager: totalBet });
    }

    // Save betting details for repeat logic
    setLastBets({ ...myBetsRef.current });
    setMyBets({});
  };

  const totalBet = Object.values(myBets).reduce((s, v) => s + v, 0);

  if (gameState === 'launching') {
    return <LaunchingScreen />;
  }

  // Svg properties
  const cx = WHEEL_SIZE / 2;
  const cy = WHEEL_SIZE / 2;
  const r = WHEEL_SIZE / 2 - 12;
  const segmentAngle = 360 / ROULETTE_NUMBERS.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#090714', overflow: 'hidden', paddingTop: 0 }}>
      {/* Background Roulette Image (Semi-transparent theme overlay - sized to cover 65% of screen height) */}
      <Image
        source={require('../../../assets/images/games/roulette.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT * 0.65,
          opacity: 0.55,
          resizeMode: 'cover',
        }}
      />
      {/* Smooth bottom fade-out transition */}
      <LinearGradient
        colors={['transparent', '#090714']}
        style={{
          position: 'absolute',
          top: (SCREEN_HEIGHT * 0.65) - 120,
          left: 0,
          right: 0,
          height: 120,
        }}
      />

      {/* Top Header - Floating Game History */}
      <View style={{ position: 'absolute', top: 32, left: 0, right: 0, paddingHorizontal: 16, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 4, borderWidth: 1, borderColor: 'rgba(234,182,118,0.15)' }}>
              <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>History</Text>
            </View>
            {history.map((num, i) => {
              const info = ROULETTE_NUMBERS.find(r => r.n === num);
              return (
                <View key={i} style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: info?.color || COLORS.black,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
                  opacity: 1 - (i * 0.05),
                  elevation: 2,
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>{num}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Wheel Area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10, paddingBottom: 140, marginTop: 20 }}>
        {/* Neon backlighting glow container */}
        <View style={{
          width: WHEEL_SIZE + 44,
          height: WHEEL_SIZE + 44,
          borderRadius: (WHEEL_SIZE + 44) / 2,
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          borderWidth: 2,
          borderColor: 'rgba(167, 139, 250, 0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#8b5cf6',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 10,
        }}>
          {/* Polished Mahogany Wood Frame Outer Ring */}
          <LinearGradient
            colors={['#5c2514', '#2d0f06', '#3f150a', '#5c2514', '#2d0f06']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: WHEEL_SIZE + 28,
              height: WHEEL_SIZE + 28,
              borderRadius: (WHEEL_SIZE + 28) / 2,
              borderWidth: 2,
              borderColor: 'rgba(251, 191, 36, 0.45)', // outer gold ring accent on wood
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              elevation: 12,
            }}
          >
            {/* Dark wood bevel contrast */}
            <View style={{
              width: WHEEL_SIZE + 16,
              height: WHEEL_SIZE + 16,
              borderRadius: (WHEEL_SIZE + 16) / 2,
              backgroundColor: '#1c0803',
              borderWidth: 1.5,
              borderColor: '#0f0402',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Golden Outer Wheel Track Bezel */}
              <View style={{
                width: WHEEL_SIZE + 6,
                height: WHEEL_SIZE + 6,
                borderRadius: (WHEEL_SIZE + 6) / 2,
                backgroundColor: '#111827',
                borderWidth: 3,
                borderColor: '#d97706', // gold border
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#fbbf24',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              }}>
                
                {/* Unified Wheel Container to lock absolute coordinate systems */}
                <View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                  
                  {/* Animated Spin Wheel */}
                  <Animated.View style={{
                    position: 'absolute',
                    width: WHEEL_SIZE,
                    height: WHEEL_SIZE,
                    transform: [{
                      rotate: wheelRotationAnim.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}>
                    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                      {/* Outer depth track filled with premium solid dark track background */}
                      <Circle cx={cx} cy={cy} r={r} fill="#0f0c1b" stroke="#fbbf24" strokeWidth={2.5} />
                      
                      <G rotation={-90} origin={`${cx}, ${cy}`}>
                        {ROULETTE_NUMBERS.map((item, i) => {
                          const startAngle = i * segmentAngle;
                          const endAngle = (i + 1) * segmentAngle;
                          const midAngle = startAngle + segmentAngle / 2;
                          const d = describeArc(cx, cy, r, startAngle, endAngle);
                          const labelPos = polarToCartesian(cx, cy, r * 0.76, midAngle);
                          return (
                            <G key={i}>
                              <Path d={d} fill={item.color} stroke="#fbbf24" strokeWidth={0.6} opacity={0.92} />
                              <SvgText
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={10}
                                fontWeight="900"
                                fill="#ffffff"
                                transform={`rotate(${midAngle + 90} ${labelPos.x} ${labelPos.y})`}
                              >
                                {String(item.n)}
                              </SvgText>
                            </G>
                          );
                        })}
                      </G>

                      {/* Golden division spokes separating numbers */}
                      {ROULETTE_NUMBERS.map((_, i) => {
                        const angle = (i * segmentAngle - 90) * (Math.PI / 180);
                        const spokeX = cx + Math.cos(angle) * r;
                        const spokeY = cy + Math.sin(angle) * r;
                        const innerSpokeX = cx + Math.cos(angle) * (r * 0.45);
                        const innerSpokeY = cy + Math.sin(angle) * (r * 0.45);
                        return (
                          <Path
                            key={`spoke-${i}`}
                            d={`M ${innerSpokeX} ${innerSpokeY} L ${spokeX} ${spokeY}`}
                            stroke="#fbbf24"
                            strokeWidth={1.2}
                            opacity={0.65}
                          />
                        );
                      })}

                      {/* Track metallic pin deflectors */}
                      {[...Array(8)].map((_, i) => {
                        const angle = (i * 45) * (Math.PI / 180);
                        const pinRadius = r - 15;
                        const pinX = cx + Math.cos(angle) * pinRadius;
                        const pinY = cy + Math.sin(angle) * pinRadius;
                        return (
                          <G key={`pin-${i}`}>
                            <Circle cx={pinX} cy={pinY} r={3.5} fill="#e5e7eb" stroke="#fbbf24" strokeWidth={1} />
                            <Circle cx={pinX} cy={pinY} r={1.5} fill="#ffffff" />
                          </G>
                        );
                      })}
                      
                      {/* Concentric detail rings for cylindrical 3D depth */}
                      <Circle cx={cx} cy={cy} r={r * 0.88} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.45} />
                      <Circle cx={cx} cy={cy} r={r * 0.7} fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.35} />
                      
                      {/* Golden Inner Ring Border */}
                      <Circle cx={cx} cy={cy} r={r * 0.45} fill="none" stroke="#fbbf24" strokeWidth={3.5} />
                    </Svg>
                  </Animated.View>

                  {/* Glossy varnished glass cover overlay (Semi-transparent shine reflection) */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: WHEEL_SIZE,
                      height: WHEEL_SIZE,
                      borderRadius: WHEEL_SIZE / 2,
                      zIndex: 25,
                      overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.03)', 'transparent', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.8, y: 0.8 }}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  </View>

                  {/* Center Countdown Hub */}
                  <View style={{
                    position: 'absolute',
                    width: CENTER_SIZE,
                    height: CENTER_SIZE,
                    borderRadius: CENTER_SIZE / 2,
                    backgroundColor: '#0a0915',
                    borderWidth: 3,
                    borderColor: '#fbbf24',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#fbbf24',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    zIndex: 30,
                    elevation: 12,
                  }}>
                    {gameState === 'betting' ? (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '900' }}>{timeLeft}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '900', textTransform: 'uppercase' }}>Seconds</Text>
                      </View>
                    ) : gameState === 'spinning' ? (
                      <Animated.View style={{ transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                        <RotateCcw size={22} color="#fbbf24" />
                      </Animated.View>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '900' }}>
                          {winningNumber !== null ? winningNumber : '🏆'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '900', textTransform: 'uppercase' }}>Win</Text>
                      </View>
                    )}
                  </View>

                  {/* Golden Pointer Indicator (Downward Pointing Triangle at top of cylinder) */}
                  <View style={{
                    position: 'absolute',
                    top: -6,
                    left: (WHEEL_SIZE / 2) - 11,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 11,
                    borderRightWidth: 11,
                    borderTopWidth: 20,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: '#fbbf24',
                    zIndex: 50,
                    shadowColor: '#fbbf24',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                  }} />

                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Balance & Total Bet Row - Positioned right above the Red/Black cards */}
      <View style={{ position: 'absolute', bottom: 136, left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        {/* Premium Balance Capsule */}
        <LinearGradient
          colors={['rgba(251, 191, 36, 0.25)', 'rgba(217, 119, 6, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 99,
            borderWidth: 1.2,
            borderColor: 'rgba(251, 191, 36, 0.35)',
            shadowColor: '#fbbf24',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <View style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: '#10b981',
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 2,
          }} />
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
            🪙 <Text style={{ color: '#fbbf24' }}>{localCoins.toLocaleString()}</Text>
          </Text>
          <TouchableOpacity 
            onPress={handleGoToWallet}
            style={{ 
              marginLeft: 4, 
              backgroundColor: 'rgba(251, 191, 36, 0.2)', 
              borderRadius: 8, 
              width: 18, 
              height: 18, 
              alignItems: 'center', 
              justifyContent: 'center',
              borderWidth: 0.8,
              borderColor: 'rgba(251, 191, 36, 0.4)'
            }}
          >
            <Plus size={10} color="#fbbf24" strokeWidth={3.5} />
          </TouchableOpacity>
        </LinearGradient>
        
        {/* Premium Total Bet Capsule */}
        {totalBet > 0 && (
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.25)', 'rgba(30, 64, 175, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              borderWidth: 1.2,
              borderColor: 'rgba(96, 165, 250, 0.35)',
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
              BET: <Text style={{ color: '#3b82f6' }}>🪙 {totalBet.toLocaleString()}</Text>
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Bet Options Row */}
      <View style={{ position: 'absolute', bottom: 74, left: 0, right: 0, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {BET_TYPES.map(bt => {
              const isActive = (myBets[bt.id] || 0) > 0;
              const betAmt = myBets[bt.id] || 0;
              const bgColor =
                bt.id === 'red' ? COLORS.red :
                bt.id === 'black' ? COLORS.black :
                bt.id === 'zero' ? COLORS.green :
                isActive ? '#3b82f6' : 'rgba(255,255,255,0.06)';
              const isColored = bt.id === 'red' || bt.id === 'black' || bt.id === 'zero' || isActive;
              return (
                <TouchableOpacity
                  key={bt.id}
                  onPress={() => handlePlaceBet(bt.id)}
                  disabled={gameState !== 'betting'}
                  style={{
                    minWidth: 72, height: 52, borderRadius: 16,
                    backgroundColor: bgColor,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 10, paddingVertical: 4,
                    opacity: gameState === 'betting' ? 1 : 0.5,
                    elevation: isActive ? 8 : 0,
                    borderWidth: 2,
                    borderColor: isActive ? '#fbbf24' : isColored ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.09)',
                    shadowColor: isActive ? '#fbbf24' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isActive ? 0.6 : 0.2,
                    shadowRadius: isActive ? 6 : 2,
                  }}
                >
                  <Text style={{ fontSize: 14, marginBottom: 1 }}>{bt.icon}</Text>
                  <Text style={{ color: isColored ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900' }}>{bt.label}</Text>
                  <Text style={{ color: isColored ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '700' }}>x{bt.payout}</Text>
                  {betAmt > 0 && (
                    <View style={{ position: 'absolute', top: 3, right: 3, backgroundColor: COLORS.gold, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#ffffff' }}>
                      <Text style={{ color: COLORS.bg, fontSize: 8, fontWeight: '900' }}>{formatChipLabel(betAmt)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Chip Selection Panel */}
      <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, paddingHorizontal: 12, zIndex: 50 }}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 10, paddingLeft: 4 }}>
            {CHIP_OPTIONS.map(value => {
              const isSelected = selectedChip === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setSelectedChip(value)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                    borderWidth: isSelected ? 2.5 : 1.5,
                    borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.18)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: isSelected ? '#fbbf24' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.75 : 0.25,
                    shadowRadius: isSelected ? 6 : 2,
                    elevation: 5,
                  }}
                >
                  {/* Dotted Inner Ring simulating poker chip detail */}
                  <View style={{
                    position: 'absolute',
                    top: 3, left: 3, right: 3, bottom: 3,
                    borderRadius: 19,
                    borderWidth: 1,
                    borderColor: isSelected ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.1)',
                    borderStyle: 'dashed',
                  }} />
                  <Text style={{
                    color: isSelected ? '#090714' : 'rgba(255,255,255,0.85)',
                    fontSize: 10,
                    fontWeight: '900',
                  }}>
                    {formatChipLabel(value)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function LaunchingScreen() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#090714', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ fontSize: 72, marginBottom: 20, opacity: pulseAnim, transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        🎰
      </Animated.Text>
      <Text style={{ color: '#fbbf24', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 12, textShadowColor: 'rgba(234,182,118,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
        Roulette
      </Text>
      <View style={{ width: 180, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: '60%', backgroundColor: '#fbbf24', borderRadius: 99, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-180, 180] }) }] }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 12 }}>
        Entering Room...
      </Text>
    </View>
  );
}

function formatChipLabel(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}`;
}
