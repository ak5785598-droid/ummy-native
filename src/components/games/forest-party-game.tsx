import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, Animated, Easing } from 'react-native';
import { X, Volume2, VolumeX, RotateCcw, TrendingUp, Zap } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, getDoc } from '@/firebase/firestore-compat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ForestPartyGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; myPrize?: number; myWager?: number }) => void;
  isMuted?: boolean;
}

const ANIMALS = [
  { id: 'chicken',  emoji: '🐔', multiplier: 5,  label: 'x5',  color: '#f97316' },
  { id: 'panda',    emoji: '🐼', multiplier: 5,  label: 'x5',  color: '#6b7280' },
  { id: 'koala',    emoji: '🐨', multiplier: 5,  label: 'x5',  color: '#8b5cf6' },
  { id: 'polar',    emoji: '🐻‍❄️', multiplier: 5,  label: 'x5',  color: '#06b6d4' },
  { id: 'fox',      emoji: '🦊', multiplier: 10, label: 'x10', color: '#f97316' },
  { id: 'bear',     emoji: '🐻', multiplier: 15, label: 'x15', color: '#84cc16' },
  { id: 'tiger',    emoji: '🐯', multiplier: 25, label: 'x25', color: '#ef4444' },
  { id: 'lion',     emoji: '🦁', multiplier: 45, label: 'x45', color: '#eab308' },
];

const CHIPS = [100, 500, 1000, 5000, 10000, 50000];
const SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7];

const ANIMAL_POSITIONS = [
  { top: '2%',  left: '50%', transform: [{ translateX: -44 }] },
  { top: '15%', right: '2%', transform: [{ translateY: -22 }] },
  { top: '50%', right: '0%',  transform: [{ translateY: -44 }] },
  { bottom: '15%', right: '2%', transform: [{ translateY: 22 }] },
  { bottom: '2%', left: '50%', transform: [{ translateX: -44 }] },
  { bottom: '15%', left: '2%', transform: [{ translateY: 22 }] },
  { top: '50%', left: '0%', transform: [{ translateY: -44 }] },
  { top: '15%', left: '2%', transform: [{ translateY: -22 }] },
];

export function ForestPartyGame({ onClose, roomId, onRoundEnd, isMuted }: ForestPartyGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const firestore = useFirestore();

  const [gameState, setGameState] = useState<'launching' | 'betting' | 'spinning' | 'result'>('launching');
  const [timeLeft, setTimeLeft] = useState(25);
  const [selectedChip, setSelectedChip] = useState(1000);
  const [myBets, setMyBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>(['chicken', 'lion', 'fox', 'bear', 'tiger']);
  const [winnerData, setWinnerData] = useState<{ emoji: string; win: number; multiplier: number } | null>(null);
  const [localCoins, setLocalCoins] = useState(0);
  const [droppedChips, setDroppedChips] = useState<{ id: number; animalId: string; label: string; x: number; y: number }[]>([]);
  const spinTimerRef = useRef<any>(null);

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
    const iv = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(iv);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (gameState === 'spinning') {
      Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'betting' && timeLeft > 0 && timeLeft < 10) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.setValue(0.6);
    }
  }, [gameState, timeLeft]);

  const handlePlaceBet = (animalId: string) => {
    if (gameState !== 'betting' || !currentUser) return;
    if (localCoins < selectedChip) return;

    setLocalCoins(p => p - selectedChip);
    if (firestore) {
      try { updateDoc(doc(firestore, 'users', currentUser.uid), { coins: increment(-selectedChip) }); } catch {}
    }

    const chip = { id: Date.now(), animalId, label: formatChipLabel(selectedChip), x: (Math.random() * 24) - 12, y: (Math.random() * 16) - 8 };
    setDroppedChips(prev => [...prev, chip]);
    setMyBets(prev => ({ ...prev, [animalId]: (prev[animalId] || 0) + selectedChip }));
  };

  const handleRepeat = () => {
    if (gameState !== 'betting' || Object.keys(lastBets).length === 0) return;
    const totalCost = Object.values(lastBets).reduce((s, v) => s + v, 0);
    if (localCoins < totalCost) return;

    setLocalCoins(p => p - totalCost);
    if (firestore && currentUser) {
      try { updateDoc(doc(firestore, 'users', currentUser.uid), { coins: increment(-totalCost) }); } catch {}
    }

    const newDrops: typeof droppedChips = [];
    Object.entries(lastBets).forEach(([animalId, amount]) => {
      for (let i = 0; i < Math.ceil(amount / selectedChip); i++) {
        newDrops.push({ id: Date.now() + Math.random(), animalId, label: formatChipLabel(selectedChip), x: (Math.random() * 24) - 12, y: (Math.random() * 16) - 8 });
      }
    });
    setDroppedChips(prev => [...prev, ...newDrops]);
    setMyBets(prev => {
      const merged = { ...prev };
      Object.entries(lastBets).forEach(([k, v]) => { merged[k] = (merged[k] || 0) + v; });
      return merged;
    });
  };

  const startSpin = async () => {
    setGameState('spinning');
    let winningId = ANIMALS[Math.floor(Math.random() * ANIMALS.length)].id;
    if (firestore) {
      try {
        const oracleSnap = await getDoc(doc(firestore, 'gameOracle', 'forest-party'));
        if (oracleSnap.exists() && (oracleSnap.data() as any).isActive) {
          const forced = (oracleSnap.data() as any).forcedResult;
          if (ANIMALS.some(a => a.id === forced)) winningId = forced;
          updateDoc(doc(firestore, 'gameOracle', 'forest-party'), { isActive: false }).catch(() => {});
        }
      } catch {}
    }

    const targetIdx = ANIMALS.findIndex(a => a.id === winningId);
    const totalSteps = (SEQUENCE.length * 6) + targetIdx;
    let currentStep = 0;
    let speed = 50;

    const runChase = () => {
      setHighlightIdx(SEQUENCE[currentStep % SEQUENCE.length]);
      if (currentStep < totalSteps) {
        const remaining = totalSteps - currentStep;
        if (remaining < 12) speed += 50;
        else if (remaining < 24) speed += 20;
        currentStep++;
        spinTimerRef.current = setTimeout(runChase, speed);
      } else {
        setTimeout(() => finalizeResult(winningId), 600);
      }
    };
    runChase();
  };

  const finalizeResult = (id: string) => {
    const winItem = ANIMALS.find(a => a.id === id);
    const winAmount = (myBets[id] || 0) * (winItem?.multiplier || 0);

    setHistory(prev => [id, ...prev].slice(0, 15));
    setWinnerData({ emoji: winItem?.emoji || '🏆', win: winAmount, multiplier: winItem?.multiplier || 0 });
    setGameState('result');

    if (winAmount > 0 && currentUser && firestore && userProfile) {
      try {
        updateDoc(doc(firestore, 'users', currentUser.uid), { coins: increment(winAmount) });
        addDoc(collection(firestore, 'globalGameWins'), {
          gameId: 'forest-party', roomId: roomId || null, userId: currentUser.uid, username: userProfile.username || 'Guest',
          avatarUrl: userProfile.avatarUrl || null, amount: winAmount, betAmount: myBets[id] || 0, timestamp: new Date(),
        });
      } catch {}
      setLocalCoins(p => p + winAmount);
    }

    if (onRoundEnd) {
      onRoundEnd({ resultText: `${winItem?.emoji || '🏆'} ${winItem?.id?.toUpperCase() || 'WIN'} x${winItem?.multiplier || 0}!`, resultEmoji: winItem?.emoji || '🏆', myPrize: winAmount, myWager: myBets[id] || 0 });
    }

    setTimeout(() => {
      setWinnerData(null);
      setLastBets({ ...myBets });
      setMyBets({});
      setHighlightIdx(null);
      setDroppedChips([]);
      setGameState('betting');
      setTimeLeft(25);
    }, 4000);
  };

  useEffect(() => { return () => clearTimeout(spinTimerRef.current); }, []);

  const totalBet = Object.values(myBets).reduce((s, v) => s + v, 0);

  if (gameState === 'launching') {
    return <LaunchingScreen />;
  }

  const showResult = gameState === 'result' && winnerData;

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
            🌲 Forest Party
          </Text>
          <Text style={{ color: 'rgba(234,182,118,0.6)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Spin & Win
          </Text>
        </View>
      </View>

      {/* Wheel Area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10, paddingBottom: 140, marginTop: 20 }}>
        <View style={{ width: SCREEN_WIDTH - 48, height: SCREEN_WIDTH - 48, maxWidth: 300, maxHeight: 300, position: 'relative' }}>
          {/* Connecting lines */}
          {ANIMALS.map((_, i) => {
            const angle = (i * 45) - 90;
            return (
              <View key={`line-${i}`} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 6, height: '42%',
                backgroundColor: 'rgba(234,182,118,0.15)',
                transformOrigin: 'top center',
                transform: [{ rotate: `${angle}deg` }],
              }} />
            );
          })}

          {/* Center Clock */}
          <View style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: '#2d1810',
            borderWidth: 5, borderColor: '#eab676',
            transform: [{ translateX: -45 }, { translateY: -45 }],
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#eab676', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
          }}>
            {gameState === 'spinning' ? (
              <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                <Text style={{ fontSize: 32 }}>🎲</Text>
              </Animated.View>
            ) : (
              <>
                <Animated.Text style={{ color: timeLeft < 10 ? '#ef4444' : '#eab676', fontSize: 28, fontWeight: '900', opacity: pulseAnim }}>
                  {timeLeft}
                </Animated.Text>
                <Text style={{ color: 'rgba(234,182,118,0.7)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {timeLeft < 10 ? 'Hurry!' : 'Bet Now'}
                </Text>
              </>
            )}
            <View style={{
              position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
              borderRadius: 51, borderWidth: 3, borderColor: 'rgba(234,182,118,0.25)',
            }} />
          </View>

          {/* Animal Circles */}
          {ANIMALS.map((animal, i) => {
            const isHighlighted = highlightIdx === i;
            const betAmount = myBets[animal.id] || 0;
            const animalChips = droppedChips.filter(c => c.animalId === animal.id);

            return (
              <TouchableOpacity
                key={animal.id}
                activeOpacity={0.8}
                onPress={() => handlePlaceBet(animal.id)}
                style={[{
                  position: 'absolute', width: 68, height: 68, borderRadius: 34,
                  backgroundColor: animal.color,
                  borderWidth: isHighlighted ? 5 : 3,
                  borderColor: isHighlighted ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: isHighlighted ? '#fbbf24' : animal.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isHighlighted ? 0.9 : 0.5,
                  shadowRadius: isHighlighted ? 24 : 10,
                  elevation: isHighlighted ? 18 : 6,
                  transform: isHighlighted ? [{ scale: 1.2 }] : [{ scale: 1 }],
                  zIndex: isHighlighted ? 50 : 10,
                }, ANIMAL_POSITIONS[i] as any]}
              >
                <Text style={{ fontSize: 30, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>{animal.emoji}</Text>

                {/* Multiplier badge */}
                <View style={{
                  position: 'absolute', bottom: -8,
                  backgroundColor: '#1a1a2e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
                  borderWidth: 2, borderColor: animal.color,
                }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>{animal.label}</Text>
                </View>

                {/* Dropped chips */}
                {animalChips.slice(0, 3).map((chip, ci) => (
                  <View key={chip.id} style={{
                    position: 'absolute',
                    top: -10 + ci * 7 + chip.y,
                    right: -6 + chip.x * 0.5,
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: '#22c55e',
                    borderWidth: 2, borderColor: 'white',
                    alignItems: 'center', justifyContent: 'center',
                    elevation: 4,
                  }}>
                    <Text style={{ color: 'white', fontSize: 7, fontWeight: '900' }}>{chip.label}</Text>
                  </View>
                ))}

                {/* Bet amount badge */}
                {betAmount > 0 && (
                  <View style={{
                    position: 'absolute', top: -12,
                    backgroundColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
                    elevation: 6,
                  }}>
                    <Text style={{ color: '#1a1a2e', fontSize: 10, fontWeight: '900' }}>{formatChipLabel(betAmount)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer: Chips + Repeat */}
      <View style={{ position: 'absolute', bottom: 36, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 12, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CHIPS.map(value => (
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

      {/* History Bar - below chips bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 8, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(234,182,118,0.5)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>History</Text>
            {history.map((id, i) => {
              const a = ANIMALS.find(x => x.id === id);
              return (
                <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: a?.color || '#333', alignItems: 'center', justifyContent: 'center', opacity: 1 - (i * 0.08), elevation: 2 }}>
                  <Text style={{ fontSize: 16 }}>{a?.emoji}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Result Overlay */}
      {showResult && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: '#1a1a2e', borderRadius: 32, padding: 48, alignItems: 'center', borderWidth: 3, borderColor: winnerData!.win > 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)', elevation: 20 }}>
            <Animated.Text style={{ fontSize: 80, marginBottom: 16, transform: [{ scale: scaleAnim }] }}>{winnerData!.emoji}</Animated.Text>
            {winnerData!.win > 0 ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Zap size={24} color="#fbbf24" />
                  <Text style={{ color: '#fbbf24', fontSize: 36, fontWeight: '900', textShadowColor: '#fbbf24', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                    +{winnerData!.win.toLocaleString()}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' }}>
                  {winnerData!.multiplier}x Multiplier!
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>You Won!</Text>
              </>
            ) : (
              <>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: '900', marginBottom: 4 }}>Try Again!</Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No bet on this one</Text>
              </>
            )}
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
        🌲
      </Animated.Text>
      <Text style={{ color: '#eab676', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 12, textShadowColor: 'rgba(234,182,118,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
        Forest Party
      </Text>
      <View style={{ width: 180, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: '60%', backgroundColor: '#eab676', borderRadius: 99, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-180, 180] }) }] }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 12 }}>
        Entering the Forest...
      </Text>
    </View>
  );
}

function formatChipLabel(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}`;
}
