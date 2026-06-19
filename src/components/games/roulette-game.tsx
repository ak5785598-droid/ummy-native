import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Easing } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
const SvgText = require('react-native-svg').Text as any;
import { X, Volume2, VolumeX, RotateCcw, TrendingUp, Zap } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, getDoc } from '@/firebase/firestore-compat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouletteGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; myPrize?: number; myWager?: number }) => void;
  isMuted?: boolean;
}

const COLORS = {
  red: '#dc2626',
  black: '#1e293b',
  green: '#059669',
  bg: '#1e1b4b',
  card: '#ffffff',
  border: '#e2e8f0',
  muted: '#94a3b8',
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
const BETTING_TIME = 15;
const SPIN_DURATION = 5000;

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

function WheelSVG({ resultIdx, spinning, size }: { resultIdx: number; spinning: boolean; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const segmentAngle = 360 / ROULETTE_NUMBERS.length;

  const rotation = spinning
    ? resultIdx * segmentAngle + 360 * 12
    : resultIdx * segmentAngle;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-rotation} origin={`${cx}, ${cy}`}>
          {ROULETTE_NUMBERS.map((item, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const midAngle = startAngle + segmentAngle / 2;
            const d = describeArc(cx, cy, r, startAngle, endAngle);
            const labelPos = polarToCartesian(cx, cy, r * 0.72, midAngle);
            return (
              <G key={i}>
                <Path d={d} fill={item.color} stroke="rgba(255,255,255,0.4)" strokeWidth={0.8} />
                <SvgText
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size > 280 ? 12 : 10}
                  fontWeight="900"
                  fill="white"
                >
                  {String(item.n)}
                </SvgText>
              </G>
            );
          })}
        </G>
        <Circle cx={cx} cy={cy} r={r * 0.32} fill={COLORS.bg} stroke={COLORS.gold} strokeWidth={3} />
        <Circle cx={cx} cy={cy} r={r * 0.26} fill={COLORS.gold} />
        <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight="900" fill={COLORS.bg}>🎰</SvgText>
      </Svg>

      {/* Pointer */}
      <View style={{
        position: 'absolute', top: -4, left: cx - 10,
        width: 0, height: 0,
        borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 18,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: COLORS.gold,
        shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 8,
      }} />
    </View>
  );
}

export function RouletteGame({ onClose, roomId, onRoundEnd, isMuted }: RouletteGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const firestore = useFirestore();

  const [gameState, setGameState] = useState<'launching' | 'betting' | 'spinning' | 'result'>('launching');
  const [timeLeft, setTimeLeft] = useState(BETTING_TIME);
  const [selectedChip, setSelectedChip] = useState(1000);
  const [myBets, setMyBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([14, 31, 22, 0, 17, 5, 29, 8]);
  const [localCoins, setLocalCoins] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultIdx, setResultIdx] = useState(0);
  const spinTimerRef = useRef<any>(null);
  const betTimerRef = useRef<any>(null);

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => setGameState('betting'), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (userProfile?.wallet?.coins !== undefined) setLocalCoins(userProfile.wallet.coins);
  }, [userProfile?.wallet?.coins]);

  useEffect(() => {
    if (gameState !== 'betting') return;
    if (timeLeft <= 0) { startSpin(); return; }
    betTimerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(betTimerRef.current);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (gameState === 'spinning') {
      Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    } else {
      rotateAnim.setValue(0);
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

  const handlePlaceBet = (betId: string) => {
    if (gameState !== 'betting' || !currentUser) return;
    if (localCoins < selectedChip) return;
    setLocalCoins(p => p - selectedChip);
    if (firestore) {
      try { updateDoc(doc(firestore, 'users', currentUser.uid), { coins: increment(-selectedChip) }); } catch {}
    }
    setMyBets(prev => ({ ...prev, [betId]: (prev[betId] || 0) + selectedChip }));
  };

  const handleRepeat = () => {
    if (gameState !== 'betting' || Object.keys(lastBets).length === 0) return;
    const totalCost = Object.values(lastBets).reduce((s, v) => s + v, 0);
    if (localCoins < totalCost) return;
    setLocalCoins(p => p - totalCost);
    if (firestore && currentUser) {
      try { updateDoc(doc(firestore, 'users', currentUser.uid), { coins: increment(-totalCost) }); } catch {}
    }
    setMyBets(prev => {
      const merged = { ...prev };
      Object.entries(lastBets).forEach(([k, v]) => { merged[k] = (merged[k] || 0) + v; });
      return merged;
    });
  };

  const startSpin = useCallback(async () => {
    clearInterval(betTimerRef.current);
    setGameState('spinning');
    setSpinning(true);

    let finalIdx = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    if (firestore) {
      try {
        const oracleSnap = await getDoc(doc(firestore, 'gameOracle', 'roulette'));
        if (oracleSnap.exists() && (oracleSnap.data() as any).isActive) {
          const forced = (oracleSnap.data() as any).forcedResult;
          if (typeof forced === 'number' && forced >= 0 && forced <= 36) {
            finalIdx = ROULETTE_NUMBERS.findIndex(r => r.n === forced);
            if (finalIdx < 0) finalIdx = 0;
          }
          updateDoc(doc(firestore, 'gameOracle', 'roulette'), { isActive: false }).catch(() => {});
        }
      } catch {}
    }

    setResultIdx(finalIdx);
    setWinningNumber(ROULETTE_NUMBERS[finalIdx].n);

    spinTimerRef.current = setTimeout(() => {
      setSpinning(false);
      finalizeResult(ROULETTE_NUMBERS[finalIdx].n);
    }, SPIN_DURATION);
  }, [firestore, myBets, localCoins]);

  const finalizeResult = (num: number) => {
    let totalWin = 0;
    BET_TYPES.forEach(bt => {
      const betAmt = myBets[bt.id] || 0;
      if (betAmt > 0 && bt.check(num)) {
        totalWin += betAmt * bt.payout;
      }
    });

    if (totalWin > 0 && currentUser && firestore) {
      try { updateDoc(doc(firestore, 'users', currentUser.uid), { coins: increment(totalWin) }); } catch {}
      try { addDoc(collection(firestore, 'globalGameWins'), { gameId: 'roulette', roomId: roomId || null, userId: currentUser.uid, username: userProfile?.username || 'Guest', amount: totalWin, betAmount: totalBet, timestamp: new Date() }); } catch {}
      setLocalCoins(p => p + totalWin);
    }

    const numInfo = ROULETTE_NUMBERS.find(r => r.n === num);
    const colorName = num === 0 ? 'GREEN' : numInfo?.color === COLORS.red ? 'RED' : 'BLACK';
    if (num === 0) {
      setResultMessage(`🎯 ${num} GREEN! PAYOUT 36:1`);
    } else if (totalWin > 0) {
      setResultMessage(`🎉 ${num} ${colorName}! +${totalWin.toLocaleString()}`);
    } else {
      setResultMessage(`❌ ${num} ${colorName}!`);
    }

    if (onRoundEnd) {
      onRoundEnd({ resultText: `${num} ${colorName}`, resultEmoji: totalWin > 0 ? '🎉' : '🎯', myPrize: totalWin, myWager: totalBet });
    }

    setHistory(prev => [num, ...prev].slice(0, 20));
    setGameState('result');

    setTimeout(() => {
      setResultMessage(null);
      setWinningNumber(null);
      setLastBets({ ...myBets });
      setMyBets({});
      setGameState('betting');
      setTimeLeft(BETTING_TIME);
    }, 4500);
  };

  useEffect(() => { return () => { clearTimeout(spinTimerRef.current); clearInterval(betTimerRef.current); }; }, []);

  const totalBet = Object.values(myBets).reduce((s, v) => s + v, 0);

  if (gameState === 'launching') {
    return <LaunchingScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A1128', borderRadius: 0 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.4, backgroundColor: '#1a0f2e' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.3, backgroundColor: '#0f172a' }} />
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 0, paddingBottom: 0, zIndex: 50 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(234,182,118,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
          <Text style={{ color: '#eab676', fontSize: 14, fontWeight: '900' }}>🪙 {localCoins.toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, textShadowColor: 'rgba(234,182,118,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
            🎰 Roulette
          </Text>
          <Text style={{ color: 'rgba(234,182,118,0.6)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            European Style
          </Text>
        </View>
      </View>

      {/* Wheel */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10, paddingBottom: 140, marginTop: 20 }}>
        <WheelSVG resultIdx={resultIdx} spinning={spinning} size={Math.min(SCREEN_WIDTH - 64, 300)} />
      </View>

      {/* Bet Types — absolute floating row */}
      <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, zIndex: 50 }}>
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
                    minWidth: 56, height: 44, borderRadius: 12,
                    backgroundColor: bgColor,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 10, paddingVertical: 4,
                    opacity: gameState === 'betting' ? 1 : 0.5,
                    elevation: isActive ? 4 : 0,
                    borderWidth: 2,
                    borderColor: isColored ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{ fontSize: 12, marginBottom: 1 }}>{bt.icon}</Text>
                  <Text style={{ color: isColored ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900' }}>{bt.label}</Text>
                  <Text style={{ color: isColored ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontSize: 7, fontWeight: '700' }}>x{bt.payout}</Text>
                  {betAmt > 0 && (
                    <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.gold, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, elevation: 4 }}>
                      <Text style={{ color: COLORS.bg, fontSize: 7, fontWeight: '900' }}>{formatChipLabel(betAmt)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Chips — absolute at bottom */}
      <View style={{ position: 'absolute', bottom: 36, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 12, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CHIP_OPTIONS.map(value => (
              <TouchableOpacity
                key={value}
                onPress={() => setSelectedChip(value)}
                style={{
                  paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24,
                  backgroundColor: selectedChip === value ? '#22c55e' : 'rgba(255,255,255,0.06)',
                  borderWidth: 2, borderColor: selectedChip === value ? '#22c55e' : 'rgba(255,255,255,0.12)',
                  elevation: selectedChip === value ? 4 : 0,
                }}
              >
                <Text style={{ color: selectedChip === value ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '900' }}>
                  {formatChipLabel(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* History Bar — absolute at very bottom */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 8, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(234,182,118,0.5)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>History</Text>
            {history.map((num, i) => {
              const info = ROULETTE_NUMBERS.find(r => r.n === num);
              return (
                <View key={i} style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: info?.color || COLORS.black,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
                  opacity: 1 - (i * 0.05),
                  elevation: 2,
                }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '900' }}>{num}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Result Overlay */}
      {gameState === 'result' && resultMessage && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: '#1a1a2e', borderRadius: 32, padding: 48, alignItems: 'center', borderWidth: 3, borderColor: winningNumber === 0 ? '#22c55e' : resultMessage.includes('🎉') ? '#fbbf24' : 'rgba(255,255,255,0.1)', elevation: 20 }}>
            <Animated.Text style={{ fontSize: 80, marginBottom: 16, transform: [{ scale: scaleAnim }] }}>
              {resultMessage.includes('🎉') ? '🎉' : resultMessage.includes('🎯') ? '🎯' : '❌'}
            </Animated.Text>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(234,182,118,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
              {resultMessage}
            </Text>
          </View>
        </View>
      )}
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
    <View style={{ flex: 1, backgroundColor: '#0A1128', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ fontSize: 72, marginBottom: 20, opacity: pulseAnim, transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        🎰
      </Animated.Text>
      <Text style={{ color: '#eab676', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 12, textShadowColor: 'rgba(234,182,118,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
        Roulette
      </Text>
      <View style={{ width: 180, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: '60%', backgroundColor: '#eab676', borderRadius: 99, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-180, 180] }) }] }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 12 }}>
        Spinning the Wheel...
      </Text>
    </View>
  );
}

function formatChipLabel(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}`;
}
