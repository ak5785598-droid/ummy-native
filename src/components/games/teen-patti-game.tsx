import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Easing, Image } from 'react-native';
import { X, Volume2, VolumeX, TrendingUp, Zap, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, getDoc, writeBatch } from '@/firebase/firestore-compat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TeenPattiGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; resultImage?: any; myPrize?: number; myWager?: number }) => void;
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
  { id: 'WOLF', label: 'Wolf', emoji: '🐺', image: require('../../../assets/images/games/wolf.png'), color: '#4b4b4f', gradient: ['#2d2d30', '#4b4b4f'] },
  { id: 'LION', label: 'Lion', emoji: '🦁', image: require('../../../assets/images/games/lion.png'), color: '#1db88f', gradient: ['#0f766e', '#1db88f'] },
  { id: 'FISH', label: 'Fish', emoji: '🐟', image: require('../../../assets/images/games/fish.png'), color: '#2c4f7c', gradient: ['#1e3a5f', '#2c4f7c'] },
];

const CARD_VALUES = ['A', 'J', 'Q', 'K', '10', '9', '8', '7'];
const CARD_SUITS = ['♠', '♥', '♦', '♣'];

export function TeenPattiGame({ onClose, roomId, onRoundEnd, isMuted }: TeenPattiGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const firestore = useFirestore();
  const router = useRouter();

  const handleGoToWallet = () => {
    router.push('/wallet');
  };

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

  const bgScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => setGameState('betting'), 1500);
    
    // Slow breathing / zoom animation for background image
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScaleAnim, {
          toValue: 1.05,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bgScaleAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

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

  const handlePlaceBet = async (factionId: string) => {
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
        const batch = writeBatch(firestore);
        const profileRef = doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid);
        batch.set(profileRef, {
          'wallet.coins': increment(winAmount),
          'stats.dailyGameWins': increment(winAmount),
        }, { merge: true });
        batch.set(doc(firestore, 'users', currentUser.uid), { 'wallet.coins': increment(winAmount) }, { merge: true });
        batch.commit().catch(() => {});
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
    const winnerImage = FACTIONS.find(f => f.id === winId)?.image;
    if (onRoundEnd) {
      onRoundEnd({
        resultText: `${winnerLabel} Wins!`,
        resultEmoji: winnerEmoji,
        resultImage: winnerImage || null,
        myPrize: winAmount,
        myWager: myBets[winId] || 0
      });
    }
  };

  useEffect(() => { return () => { clearTimeout(spinTimerRef.current); clearInterval(betTimerRef.current); }; }, []);

  if (gameState === 'launching') {
    return <LaunchingScreen />;
  }

  const isResult = gameState === 'result';
  const totalBet = Object.values(myBets).reduce((s, v) => s + v, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#3b0764', borderRadius: 0, overflow: 'hidden' }}>
      <Animated.Image
        source={require('../../../assets/images/games/teen-patti-bg.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: -320,
          right: 320,
          height: SCREEN_HEIGHT * 0.5,
          opacity: 0.45,
          resizeMode: 'contain',
          transform: [{ scale: bgScaleAnim }],
        }}
      />
      {/* Bottom fade-out gradient */}
      <LinearGradient
        colors={['transparent', '#3b0764']}
        style={{
          position: 'absolute',
          top: (SCREEN_HEIGHT * 0.5) - 30,
          left: 0,
          right: 0,
          height: 80,
        }}
      />

      {/* Floating History Bar */}
      <View style={{ position: 'absolute', top: 56, left: 0, right: 0, paddingHorizontal: 16, zIndex: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 4, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' }}>
              <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>History</Text>
            </View>
            {history.map((id, i) => {
              const f = FACTIONS.find(x => x.id === id);
              return (
                <View key={i} style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: f?.color || '#333',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                  shadowColor: i === 0 ? '#fbbf24' : '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.4,
                  shadowRadius: 2,
                  opacity: 1 - (i * 0.1),
                  elevation: 2,
                  overflow: 'hidden',
                }}>
                  {f?.image ? (
                    <Image source={f.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  ) : (
                    <Text style={{ fontSize: 13 }}>{f?.emoji}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Countdown / Round State Badge */}
      <View style={{ alignItems: 'center', marginTop: 108, zIndex: 40 }}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <LinearGradient
            colors={['#2e1049', '#0f021a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 2,
              borderColor: '#fbbf24',
              borderRadius: 99,
              paddingHorizontal: 22,
              paddingVertical: 7,
              shadowColor: '#fbbf24',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 13, color: '#fbbf24' }}>⏳</Text>
            <Text style={{
              color: '#ffffff',
              fontSize: 12,
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              textShadowColor: 'rgba(251,191,36,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              {gameState === 'reveal' ? (
                <Text style={{ color: '#fbbf24' }}>🎰 Revealing...</Text>
              ) : gameState === 'result' ? (
                winnerId ? <Text style={{ color: '#10b981' }}>🏆 {FACTIONS.find(f => f.id === winnerId)?.label} Wins!</Text> : 'Round Over'
              ) : (
                <>
                  <Text style={{ color: '#ffffff' }}>Bet: </Text>
                  <Text style={{ color: '#fbbf24', fontSize: 13.5, fontWeight: '900' }}>{timeLeft}s</Text>
                </>
              )}
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Faction Cards Area */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginTop: 20, gap: 10, zIndex: 30 }}>
        {FACTIONS.map((f) => {
          const isWinner = winnerId === f.id;
          const pot = totalPots[f.id] || 0;
          const myBet = myBets[f.id] || 0;
          return (
            <View key={f.id} style={{ flex: 1, alignItems: 'center' }}>
              {/* Premium Gold-bordered Faction Tag */}
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderWidth: 1,
                borderColor: isWinner ? '#fbbf24' : 'rgba(251,191,36,0.3)',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 3,
                marginBottom: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 3,
              }}>
                <Text style={{
                  color: isWinner ? '#fbbf24' : '#ffffff',
                  fontSize: 10,
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>{f.label}</Text>
              </View>

              {/* Velvet Table Felt Card Holder Tray */}
              <View style={{
                width: '100%',
                height: 94,
                borderRadius: 18,
                backgroundColor: isWinner ? 'rgba(251,191,36,0.22)' : 'rgba(15, 10, 25, 0.65)',
                borderWidth: 2,
                borderColor: isWinner ? '#fbbf24' : 'rgba(251,191,36,0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                shadowColor: isWinner ? '#fbbf24' : '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isWinner ? 0.6 : 0.25,
                shadowRadius: 12,
                elevation: isWinner ? 12 : 3,
              }}>
                {[0, 1, 2].map((ci) => {
                  const isFlipped = flippedCards[`${f.id}_${ci}`];
                  const card = cardReveal[f.id]?.[ci];
                  const isRed = card?.suit === '♥' || card?.suit === '♦';
                  return (
                    <View key={ci} style={{
                      width: 32,
                      height: 52,
                      borderRadius: 6,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.35,
                      shadowRadius: 3,
                      elevation: 4,
                    }}>
                      {isFlipped ? (
                        <View style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#ffffff',
                          borderRadius: 6,
                          borderWidth: 1.2,
                          borderColor: '#fbbf24',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: isRed ? '#dc2626' : '#111827', lineHeight: 14 }}>{card?.value}</Text>
                          <Text style={{ fontSize: 11, color: isRed ? '#dc2626' : '#111827', lineHeight: 12 }}>{card?.suit}</Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={['#dc2626', '#7f1d1d']}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 6,
                            borderWidth: 1.2,
                            borderColor: '#fde047',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 13, color: '#fde047', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>🔱</Text>
                        </LinearGradient>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Gold-trimmed Stats Capsule */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginTop: 6,
                backgroundColor: 'rgba(0,0,0,0.65)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 99,
                borderWidth: 0.8,
                borderColor: 'rgba(251,191,36,0.3)',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8.5, fontWeight: '700' }}>
                  Pot: <Text style={{ color: '#ffffff' }}>{pot >= 1000000 ? `${(pot/1000000).toFixed(1)}M` : pot >= 1000 ? `${(pot/1000).toFixed(0)}K` : pot}</Text>
                </Text>
                <Text style={{ color: '#fbbf24', fontSize: 8.5, fontWeight: '900' }}>
                  | Me: {myBet >= 1000000 ? `${(myBet/1000000).toFixed(1)}M` : myBet >= 1000 ? `${(myBet/1000).toFixed(0)}K` : myBet}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Faction Banners / Betting Buttons */}
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 12, zIndex: 30, transform: [{ translateY: -28 }] }}>
        {FACTIONS.map((f) => (
          <TouchableOpacity
            key={f.id}
            activeOpacity={0.8}
            onPress={() => handlePlaceBet(f.id)}
            disabled={gameState !== 'betting'}
            style={{ alignItems: 'center', opacity: gameState !== 'betting' ? 0.7 : 1 }}
          >
            <View style={{
              width: 92,
              height: 112,
              borderRadius: 24,
              backgroundColor: f.color,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: winnerId === f.id ? '#fbbf24' : 'rgba(255,255,255,0.18)',
              overflow: 'hidden',
              shadowColor: winnerId === f.id ? '#fbbf24' : '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: winnerId === f.id ? 16 : 8,
            }}>
              {f.image ? (
                <Image source={f.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              ) : (
                <LinearGradient
                  colors={(winnerId === f.id ? ['#fbbf24', '#d97706'] : f.gradient) as [string, string, ...string[]]}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ fontSize: 44 }}>{f.emoji}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: '900',
              marginTop: 8,
              textTransform: 'uppercase',
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 0, height: 1.5 },
              textShadowRadius: 2
            }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>


      {/* Balance & Total Bet Row - Positioned above chips footer */}
      <View style={{ position: 'absolute', bottom: 102, left: 0, right: 0, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        {/* Premium Playing Card Styled Balance Badge */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#ffffff',
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: '#fbbf24',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}>
          {/* Mini Cards Graphic */}
          <View style={{ flexDirection: 'row', marginRight: 2 }}>
            {/* Card Back (Red) */}
            <View style={{ width: 14, height: 20, borderRadius: 2, backgroundColor: '#dc2626', borderWidth: 0.8, borderColor: '#fef08a', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 9, color: '#fef08a', fontWeight: '900', lineHeight: 10 }}>A</Text>
            </View>
            {/* Card Front (White Hearts) */}
            <View style={{ width: 14, height: 20, borderRadius: 2, backgroundColor: '#ffffff', borderWidth: 0.8, borderColor: '#fbbf24', marginLeft: -6, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: -1, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 }}>
              <Text style={{ fontSize: 9, color: '#dc2626', fontWeight: '900', lineHeight: 10 }}>♥</Text>
            </View>
          </View>

          <Text style={{ color: '#111827', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
            🪙 <Text style={{ color: '#b45309' }}>{localCoins.toLocaleString()}</Text>
          </Text>

          <TouchableOpacity 
            onPress={handleGoToWallet}
            style={{ 
              marginLeft: 4, 
              backgroundColor: 'rgba(251, 191, 36, 0.2)', 
              borderRadius: 6, 
              width: 18, 
              height: 18, 
              alignItems: 'center', 
              justifyContent: 'center',
              borderWidth: 0.8,
              borderColor: 'rgba(251, 191, 36, 0.6)'
            }}
          >
            <Plus size={10} color="#b45309" strokeWidth={3.5} />
          </TouchableOpacity>
        </View>
        
        {/* Premium Total Bet Capsule */}
        {totalBet > 0 && (
          <LinearGradient
            colors={['rgba(251, 191, 36, 0.2)', 'rgba(251, 191, 36, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: 'rgba(251,191,36,0.3)',
            }}
          >
            <TrendingUp size={12} color="#fbbf24" />
            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Bet: {totalBet.toLocaleString()}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Footer - Premium Wooden/Gold card strip */}
      <View style={{
        backgroundColor: '#1b072b',
        paddingHorizontal: 6,
        paddingBottom: 14,
        paddingTop: 10,
        zIndex: 50,
        borderTopWidth: 2,
        borderTopColor: '#fbbf24',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          paddingVertical: 6,
          overflow: 'visible',
          width: '100%',
        }}>
          {CHIPS.map(chip => {
            const isActive = selectedChip === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setSelectedChip(chip.value)}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: chip.color,
                  borderWidth: 2.2,
                  borderColor: isActive ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isActive ? [{ scale: 1.06 }] : [{ scale: 1 }],
                  shadowColor: chip.color,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isActive ? 0.85 : 0.3,
                  shadowRadius: 6,
                  elevation: isActive ? 8 : 3,
                  overflow: 'visible',
                }}
              >
                {/* Outer ring dashes representing professional casino chip stripes */}
                <View style={{
                  position: 'absolute',
                  inset: 1.5,
                  borderRadius: 24.5,
                  borderWidth: 1.2,
                  borderColor: 'rgba(255,255,255,0.35)',
                  borderStyle: 'dashed',
                }} />
                
                {/* Inner white full cover circle with card suits pattern */}
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.2,
                  borderColor: chip.color,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 1,
                  elevation: 1.5,
                  position: 'relative',
                }}>
                  {/* Card suit watermarks in cross positions */}
                  <Text style={{ position: 'absolute', top: 1.2, color: chip.color, fontSize: 6.8, fontWeight: '900', lineHeight: 8 }}>♠</Text>
                  <Text style={{ position: 'absolute', left: 2, color: chip.color, fontSize: 6.8, fontWeight: '900', lineHeight: 8 }}>♥</Text>
                  <Text style={{ position: 'absolute', right: 2, color: chip.color, fontSize: 6.8, fontWeight: '900', lineHeight: 8 }}>♦</Text>
                  <Text style={{ position: 'absolute', bottom: 1.2, color: chip.color, fontSize: 6.8, fontWeight: '900', lineHeight: 8 }}>♣</Text>
                  
                  {/* Main Value label in center */}
                  <Text style={{ color: chip.color, fontSize: 10, fontWeight: '900', backgroundColor: '#ffffff', paddingHorizontal: 2.5, zIndex: 10 }}>{chip.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
