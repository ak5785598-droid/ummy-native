import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Easing } from 'react-native';
import { X, Volume2, VolumeX, TrendingUp, Zap } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, getDoc } from '@/firebase/firestore-compat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TeenPattiGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; myPrize?: number; myWager?: number }) => void;
  isMuted?: boolean;
}

const CHIPS = [
  { value: 10000,    label: '10K',  color: '#00E5FF' },
  { value: 100000,   label: '100K', color: '#2196F3' },
  { value: 300000,   label: '300K', color: '#9C27B0' },
  { value: 1000000,  label: '1M',   color: '#F44336' },
  { value: 2000000,  label: '2M',   color: '#795548' },
  { value: 5000000,  label: '5M',   color: '#FFD700' },
];

const FACTIONS = [
  { id: 'WOLF', label: 'Wolf', emoji: '🐺', color: '#4b4b4f', gradient: ['#2d2d30', '#4b4b4f'] },
  { id: 'LION', label: 'Lion', emoji: '🦁', color: '#1db88f', gradient: ['#0f766e', '#1db88f'] },
  { id: 'FISH', label: 'Fish', emoji: '🐟', color: '#2c4f7c', gradient: ['#1e3a5f', '#2c4f7c'] },
];

const CARD_VALUES = ['A', 'J', 'Q', 'K', '10', '9', '8', '7'];
const CARD_SUITS = ['♠', '♥', '♦', '♣'];

export function TeenPattiGame({ onClose, roomId, onRoundEnd, isMuted }: TeenPattiGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const firestore = useFirestore();

  const [gameState, setGameState] = useState<'launching' | 'betting' | 'reveal' | 'result'>('launching');
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedChip, setSelectedChip] = useState(10000);
  const [myBets, setMyBets] = useState<Record<string, number>>({ WOLF: 0, LION: 0, FISH: 0 });
  const [totalPots, setTotalPots] = useState<Record<string, number>>({ WOLF: 0, LION: 650000, FISH: 800000 });
  const [history, setHistory] = useState<string[]>(['WOLF', 'LION', 'FISH', 'WOLF']);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [cardReveal, setCardReveal] = useState<Record<string, { value: string; suit: string }[]>>({});
  const [totalWinAmount, setTotalWinAmount] = useState(0);
  const [localCoins, setLocalCoins] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const spinTimerRef = useRef<any>(null);
  const betTimerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => setGameState('betting'), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (userProfile?.wallet?.coins !== undefined) setLocalCoins(userProfile.wallet.coins);
  }, [userProfile?.wallet?.coins]);

  useEffect(() => {
    if (gameState !== 'betting') return;
    if (timeLeft <= 0) { startReveal(); return; }
    betTimerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(betTimerRef.current);
  }, [gameState, timeLeft]);

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

  const handlePlaceBet = (factionId: string) => {
    if (gameState !== 'betting' || !currentUser) return;
    if (localCoins < selectedChip) return;

    setLocalCoins(p => p - selectedChip);
    if (firestore) {
      try {
        const updateData = { 'wallet.coins': increment(-selectedChip) };
        updateDoc(doc(firestore, 'users', currentUser.uid), updateData);
        updateDoc(doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid), updateData);
      } catch {}
    }
    setMyBets(prev => ({ ...prev, [factionId]: (prev[factionId] || 0) + selectedChip }));
    setTotalPots(prev => ({ ...prev, [factionId]: (prev[factionId] || 0) + selectedChip }));
  };

  const startReveal = useCallback(async () => {
    clearInterval(betTimerRef.current);
    setGameState('reveal');

    const newCards: Record<string, { value: string; suit: string }[]> = {};
    FACTIONS.forEach(f => {
      newCards[f.id] = [
        { value: CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)], suit: CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)] },
        { value: CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)], suit: CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)] },
        { value: CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)], suit: CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)] },
      ];
    });
    setCardReveal(newCards);

    let winId = FACTIONS[Math.floor(Math.random() * FACTIONS.length)].id;
    if (firestore) {
      try {
        const oracleSnap = await getDoc(doc(firestore, 'gameOracle', 'teen-patti'));
        if (oracleSnap.exists() && (oracleSnap.data() as any).isActive) {
          const forced = (oracleSnap.data() as any).forcedResult;
          if (FACTIONS.some(f => f.id === forced)) winId = forced;
          updateDoc(doc(firestore, 'gameOracle', 'teen-patti'), { isActive: false }).catch(() => {});
        }
      } catch {}
    }

    FACTIONS.forEach((f, fi) => {
      [0, 1, 2].forEach((ci) => {
        setTimeout(() => {
          setFlippedCards(prev => ({ ...prev, [`${f.id}_${ci}`]: true }));
        }, (fi * 3 + ci) * 200);
      });
    });

    setTimeout(() => finalizeRound(winId), 2500);
  }, [firestore, myBets, localCoins]);

  const finalizeRound = (winId: string) => {
    setWinnerId(winId);
    setHistory(prev => [winId, ...prev].slice(0, 8));
    setGameState('result');

    const winAmount = Math.floor((myBets[winId] || 0) * 1.95);
    setTotalWinAmount(winAmount);

    if (winAmount > 0 && currentUser && firestore && userProfile) {
      try {
        const updateData = {
          'wallet.coins': increment(winAmount),
          'stats.dailyGameWins': increment(winAmount),
        };
        updateDoc(doc(firestore, 'users', currentUser.uid), updateData);
        updateDoc(doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid), updateData);
        addDoc(collection(firestore, 'globalGameWins'), {
          gameId: 'teen-patti',
          roomId: roomId || null,
          userId: currentUser.uid,
          username: userProfile.username || 'Guest',
          avatarUrl: userProfile.avatarUrl || null,
          amount: winAmount,
          betAmount: myBets[winId] || 0,
          timestamp: new Date(),
        });
      } catch {}
      setLocalCoins(p => p + winAmount);
    }

    setTimeout(() => {
      setMyBets({ WOLF: 0, LION: 0, FISH: 0 });
      setTotalPots({ WOLF: 0, LION: 650000, FISH: 800000 });
      setWinnerId(null);
      setGameState('betting');
      setTimeLeft(20);
      setCardReveal({});
      setFlippedCards({});
      setTotalWinAmount(0);
    }, 5000);

    const winnerEmoji = FACTIONS.find(f => f.id === winId)?.emoji || '🏆';
    const winnerLabel = FACTIONS.find(f => f.id === winId)?.label || 'Winner';
    if (onRoundEnd) {
      onRoundEnd({ resultText: `${winnerEmoji} ${winnerLabel} Wins!`, resultEmoji: winnerEmoji, myPrize: winAmount, myWager: myBets[winId] || 0 });
    }
  };

  useEffect(() => { return () => { clearTimeout(spinTimerRef.current); clearInterval(betTimerRef.current); }; }, []);

  if (gameState === 'launching') {
    return <LaunchingScreen />;
  }

  const isResult = gameState === 'result';
  const totalBet = Object.values(myBets).reduce((s, v) => s + v, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#581c87', borderRadius: 0 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.4, backgroundColor: '#3b0764' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.3, backgroundColor: '#581c87' }} />
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2, zIndex: 50 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1,
            textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12
          }}>🃏 Teen Patti</Text>
          <Animated.View style={{
            backgroundColor: '#4c1d95', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 24, paddingVertical: 4, marginTop: 4,
            opacity: pulseAnim,
          }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
              {gameState === 'reveal' ? '🎰 Revealing...' : gameState === 'result' ? (winnerId ? `🏆 ${FACTIONS.find(f => f.id === winnerId)?.label} Wins!` : 'Round Over') : `⏱ ${timeLeft}s`}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* History Bar */}
      <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 2, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(251,191,36,0.5)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>History</Text>
            {history.map((id, i) => {
              const f = FACTIONS.find(x => x.id === id);
              return (
                <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: f?.color || '#333', alignItems: 'center', justifyContent: 'center', opacity: 1 - (i * 0.1), elevation: 2 }}>
                  <Text style={{ fontSize: 14 }}>{f?.emoji}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Faction Cards Area */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingTop: 0, gap: 10 }}>
        {FACTIONS.map((f) => {
          const isWinner = winnerId === f.id;
          const pot = totalPots[f.id] || 0;
          const myBet = myBets[f.id] || 0;
          return (
            <View key={f.id} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{f.label}</Text>

              <View style={{
                width: '100%', height: 80, borderRadius: 16,
                backgroundColor: isWinner ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.4)',
                borderWidth: 2.5, borderColor: isWinner ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                shadowColor: isWinner ? '#fbbf24' : 'transparent',
                shadowOffset: { width: 0, height: 0 }, shadowOpacity: isWinner ? 0.6 : 0, shadowRadius: isWinner ? 20 : 0,
                elevation: isWinner ? 12 : 0,
              }}>
                {[0, 1, 2].map((ci) => {
                  const isFlipped = flippedCards[`${f.id}_${ci}`];
                  const card = cardReveal[f.id]?.[ci];
                  const isRed = card?.suit === '♥' || card?.suit === '♦';
                  return (
                    <View key={ci} style={{
                      width: 40, height: 56, borderRadius: 6,
                      backgroundColor: isFlipped ? 'white' : '#1e1b4b',
                      borderWidth: 2, borderColor: isFlipped ? '#e5e7eb' : '#fbbf24',
                      alignItems: 'center', justifyContent: 'center',
                      elevation: 3,
                    }}>
                      {isFlipped ? (
                        <>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: isRed ? '#dc2626' : '#111827' }}>{card?.value}</Text>
                          <Text style={{ fontSize: 12, color: isRed ? '#dc2626' : '#111827' }}>{card?.suit}</Text>
                        </>
                      ) : (
                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '900' }}>🃏</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={{ alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                  Pot: {pot.toLocaleString()}
                </Text>
                <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>
                  Me: {myBet.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Faction Banners */}
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20 }}>
        {FACTIONS.map((f) => (
          <TouchableOpacity
            key={f.id}
            activeOpacity={0.8}
            onPress={() => handlePlaceBet(f.id)}
            disabled={gameState !== 'betting'}
            style={{ alignItems: 'center', opacity: gameState !== 'betting' ? 0.6 : 1 }}
          >
            <View style={{
              width: 88, height: 104, borderRadius: 20,
              backgroundColor: f.color,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: winnerId === f.id ? '#fbbf24' : 'rgba(255,255,255,0.25)',
              overflow: 'hidden',
              shadowColor: winnerId === f.id ? '#fbbf24' : f.color,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: winnerId === f.id ? 0.8 : 0.4,
              shadowRadius: winnerId === f.id ? 24 : 12,
              elevation: winnerId === f.id ? 16 : 8,
            }}>
              <Text style={{ fontSize: 48, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>{f.emoji}</Text>
            </View>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Result Overlay */}
      {isResult && winnerId && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <View style={{
            backgroundColor: 'white', borderRadius: 32, padding: 48, alignItems: 'center',
            borderWidth: 3, borderColor: totalWinAmount > 0 ? '#22c55e' : '#e5e7eb',
            shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 24,
          }}>
            <Animated.Text style={{ fontSize: 80, marginBottom: 16, transform: [{ scale: scaleAnim }] }}>
              {FACTIONS.find(f => f.id === winnerId)?.emoji}
            </Animated.Text>
            <Text style={{ color: '#1e293b', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
              {FACTIONS.find(f => f.id === winnerId)?.label} Wins!
            </Text>
            {totalWinAmount > 0 ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Zap size={28} color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontSize: 40, fontWeight: '900', textShadowColor: '#22c55e', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                    +{totalWinAmount.toLocaleString()}
                  </Text>
                </View>
                <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '700', marginTop: 8 }}>Coins Won!</Text>
              </>
            ) : (
              <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '700', marginTop: 12 }}>Better luck next time!</Text>
            )}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={{
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingHorizontal: 12, paddingBottom: 20, paddingTop: 10, zIndex: 50,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 4 }}>
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '900', textShadowColor: 'rgba(251,191,36,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>{localCoins.toLocaleString()}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
          {CHIPS.map(chip => {
            const isActive = selectedChip === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setSelectedChip(chip.value)}
                style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: chip.color,
                  borderWidth: 2, borderColor: isActive ? 'white' : 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                  transform: isActive ? [{ scale: 1.15 }] : [{ scale: 1 }],
                  shadowColor: chip.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isActive ? 0.6 : 0.2, shadowRadius: isActive ? 10 : 4,
                  elevation: isActive ? 8 : 3,
                }}
              >
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {totalBet > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(251,191,36,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 }}>
            <TrendingUp size={14} color="#fbbf24" />
            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '700' }}>
              Total Bet: 🪙 {totalBet.toLocaleString()}
            </Text>
          </View>
        )}
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
    <View style={{ flex: 1, backgroundColor: '#1a0a2e', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ fontSize: 80, marginBottom: 24, opacity: pulseAnim, transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        🃏
      </Animated.Text>
      <Text style={{ color: '#fbbf24', fontSize: 36, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 16, textShadowColor: 'rgba(251,191,36,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
        Teen Patti
      </Text>
      <View style={{ width: 200, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: '60%', backgroundColor: '#fbbf24', borderRadius: 99, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-200, 200] }) }] }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 12 }}>
        Shuffling Cards...
      </Text>
    </View>
  );
}
