import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, Animated, Easing, Image } from 'react-native';
import { HelpCircle, Volume2, VolumeX, BarChart3, ChevronDown, X, RotateCcw, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, getDoc, writeBatch } from '@/firebase/firestore-compat';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FruitPartyGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; resultImage?: any; myPrize?: number; myWager?: number }) => void;
  isMuted?: boolean;
}

const FRUITS = [
  { id: 'pineapple', emoji: String.fromCodePoint(0x1F34D), image: require('../../../assets/images/games/pineapple.png'), multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'cherry',    emoji: String.fromCodePoint(0x1F352), image: require('../../../assets/images/games/cherry.png'),    multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'banana',    emoji: String.fromCodePoint(0x1F34C), image: require('../../../assets/images/games/banana.png'),    multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'watermelon',emoji: String.fromCodePoint(0x1F349), image: require('../../../assets/images/games/watermelon.png'),multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'skewers',   emoji: String.fromCodePoint(0x1F362), image: require('../../../assets/images/games/skewers.png'),   multiplier: 10, label: 'win 10 times', color: '#06b6d4', bg: '#083344' },
  { id: 'burrito',   emoji: String.fromCodePoint(0x1F32F), image: require('../../../assets/images/games/burrito.png'),   multiplier: 15, label: 'win 15 times', color: '#06b6d4', bg: '#083344' },
  { id: 'pizza',     emoji: String.fromCodePoint(0x1F355), image: require('../../../assets/images/games/pizza.png'),     multiplier: 25, label: 'win 25 times', color: '#06b6d4', bg: '#083344' },
  { id: 'chicken',   emoji: String.fromCodePoint(0x1F357), image: require('../../../assets/images/games/chicken.png'),   multiplier: 45, label: 'win 45 times', color: '#06b6d4', bg: '#083344' },
];

const CHIPS = [100, 500, 1000, 5000, 10000, 50000, 100000];
const SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7];

const WHEEL_SIZE = SCREEN_WIDTH * 0.82;
const CENTER_SIZE = WHEEL_SIZE * 0.32;
const FRUIT_BOX = 64;
const FRUIT_DISTANCE = (WHEEL_SIZE / 2) - (FRUIT_BOX / 2) + 4;

const FRUIT_POSITIONS = FRUITS.map((_, i) => {
  const angle = (i * 45 - 90) * (Math.PI / 180);
  return {
    top: (WHEEL_SIZE / 2) + Math.sin(angle) * FRUIT_DISTANCE - FRUIT_BOX / 2,
    left: (WHEEL_SIZE / 2) + Math.cos(angle) * FRUIT_DISTANCE - FRUIT_BOX / 2,
  };
});

export function FruitPartyGame({ onClose, roomId, onRoundEnd, isMuted }: FruitPartyGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const firestore = useFirestore();
  const router = useRouter();

  const handleGoToWallet = () => {
    onClose();
    router.push('/wallet');
  };

  const [gameState, setGameState] = useState<'launching' | 'betting' | 'spinning' | 'result'>('launching');
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedChip, setSelectedChip] = useState(1000);
  const [myBets, setMyBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>(['watermelon', 'banana', 'strawberry', 'peach', 'cherry', 'orange', 'cherry', 'lemon']);
  const [winnerData, setWinnerData] = useState<{ id: string; win: number; multiplier: number } | null>(null);
  const [shiningGroup, setShiningGroup] = useState<'none' | 'left' | 'right'>('none');
  const [localCoins, setLocalCoins] = useState(0);
  const [droppedChips, setDroppedChips] = useState<{ id: string; fruitId: string; label: string }[]>([]);
  const spinTimerRef = useRef<any>(null);
  const wheelRotate = useRef(new Animated.Value(0)).current;

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const soundRef = useRef<Audio.Sound | null>(null);

  const playSoundEffect = async (type: 'tick' | 'spin' | 'win') => {
    if (isMuted) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }
      let url = '';
      if (type === 'tick') {
        url = 'https://github.com/wesbos/JavaScript30/raw/master/01%20-%20JavaScript%20Drum%20Kit/sounds/tink.wav'; // Crisp tick
      } else if (type === 'spin') {
        url = 'https://github.com/wesbos/JavaScript30/raw/master/01%20-%20JavaScript%20Drum%20Kit/sounds/hihat.wav'; // Spin/ticking click
      } else if (type === 'win') {
        url = 'https://github.com/wesbos/JavaScript30/raw/master/01%20-%20JavaScript%20Drum%20Kit/sounds/openhat.wav'; // Open hat celebratory jingle
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: type === 'tick' ? 0.35 : 0.75 }
      );
      soundRef.current = sound;
    } catch (e) {
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

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
    if (timeLeft <= 5 && timeLeft > 0) {
      playSoundEffect('tick');
    }
    const iv = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(iv);
  }, [gameState, timeLeft]);

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
    if (gameState === 'betting' && timeLeft > 0 && timeLeft < 10) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.setValue(0.6);
    }
  }, [gameState, timeLeft]);

  const handlePlaceBet = async (fruitId: string) => {
    if (gameState !== 'betting' || !currentUser || !firestore) return;
    try {
      const profileRef = doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid);
      const snap = await getDoc(profileRef);
      const freshCoins = snap.exists() ? ((snap.data() as any)?.wallet?.coins ?? (userProfile?.wallet?.coins ?? 0)) : (userProfile?.wallet?.coins ?? 0);
      if (freshCoins < selectedChip) { handleGoToWallet(); return; }
      const batch = writeBatch(firestore);
      const deductData = { 'wallet.coins': increment(-selectedChip) };
      batch.set(profileRef, deductData, { merge: true });
      batch.set(doc(firestore, 'users', currentUser.uid), deductData, { merge: true });
      await batch.commit();
      setLocalCoins(p => p - selectedChip);
    } catch {}
    setDroppedChips(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, fruitId, label: formatChipLabel(selectedChip) }]);
    setMyBets(prev => ({ ...prev, [fruitId]: (prev[fruitId] || 0) + selectedChip }));
  };

  const handleRepeat = async () => {
    if (gameState !== 'betting' || Object.keys(lastBets).length === 0 || !currentUser || !firestore) return;
    const totalCost = Object.values(lastBets).reduce((s, v) => s + v, 0);
    try {
      const profileRef = doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid);
      const snap = await getDoc(profileRef);
      const freshCoins = snap.exists() ? ((snap.data() as any)?.wallet?.coins ?? (userProfile?.wallet?.coins ?? 0)) : (userProfile?.wallet?.coins ?? 0);
      if (freshCoins < totalCost) { handleGoToWallet(); return; }
      const batch = writeBatch(firestore);
      const deductData = { 'wallet.coins': increment(-totalCost) };
      batch.set(profileRef, deductData, { merge: true });
      batch.set(doc(firestore, 'users', currentUser.uid), deductData, { merge: true });
      await batch.commit();
      setLocalCoins(p => p - totalCost);
    } catch {}
    const newDrops: typeof droppedChips = [];
    Object.entries(lastBets).forEach(([fruitId, amount]) => {
      for (let i = 0; i < Math.ceil(amount / selectedChip); i++) {
        newDrops.push({ id: `${Date.now()}-${Math.random()}-${i}`, fruitId, label: formatChipLabel(selectedChip) });
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
    playSoundEffect('spin');
    setGameState('spinning');

    // 5% chance of a group (Mix) win
    let groupType: 'none' | 'left' | 'right' = 'none';
    const chance = Math.random();
    if (chance < 0.025) groupType = 'left';
    else if (chance < 0.05) groupType = 'right';

    let winningId = FRUITS[Math.floor(Math.random() * FRUITS.length)].id;
    if (firestore) {
      try {
        const oracleSnap = await getDoc(doc(firestore, 'gameOracle', 'fruit-party'));
        if (oracleSnap.exists() && (oracleSnap.data() as any).isActive) {
          const forced = (oracleSnap.data() as any).forcedResult;
          if (FRUITS.some(a => a.id === forced)) winningId = forced;
          updateDoc(doc(firestore, 'gameOracle', 'fruit-party'), { isActive: false }).catch(() => {});
          groupType = 'none'; // Overridden by admin panel
        }
      } catch {}
    }

    // Force winningId to be inside the selected group
    if (groupType === 'left') {
      const leftIds = ['skewers', 'burrito', 'pizza', 'chicken'];
      winningId = leftIds[Math.floor(Math.random() * leftIds.length)];
    } else if (groupType === 'right') {
      const rightIds = ['pineapple', 'cherry', 'banana', 'watermelon'];
      winningId = rightIds[Math.floor(Math.random() * rightIds.length)];
    }

    const targetIdx = FRUITS.findIndex(a => a.id === winningId);
    const totalSteps = (SEQUENCE.length * 6) + targetIdx;
    let currentStep = 0;
    let speed = 50;

    const runChase = () => {
      const activeIdx = SEQUENCE[currentStep % SEQUENCE.length];
      setHighlightIdx(activeIdx);
      if (currentStep < totalSteps) {
        const remaining = totalSteps - currentStep;
        if (remaining < 12) speed += 50;
        else if (remaining < 24) speed += 20;
        currentStep++;
        spinTimerRef.current = setTimeout(runChase, speed);
      } else {
        setTimeout(() => finalizeResult(winningId, groupType), 600);
      }
    };
    runChase();
  };

  const finalizeResult = (id: string, groupType: 'none' | 'left' | 'right' = 'none') => {
    playSoundEffect('win');
    setShiningGroup(groupType);
    
    const winningIds = groupType === 'left'
      ? ['skewers', 'burrito', 'pizza', 'chicken']
      : groupType === 'right'
        ? ['pineapple', 'cherry', 'banana', 'watermelon']
        : [id];

    let winAmount = 0;
    winningIds.forEach(wid => {
      const winItem = FRUITS.find(a => a.id === wid);
      winAmount += (myBets[wid] || 0) * (winItem?.multiplier || 0);
    });

    const winItem = FRUITS.find(a => a.id === id);
    setHistory(prev => [id, ...prev].slice(0, 15));
    setWinnerData({ id, win: winAmount, multiplier: winItem?.multiplier || 0 });
    setGameState('result');

    const totalWagerForGroup = winningIds.reduce((sum, wid) => sum + (myBets[wid] || 0), 0);

    if (winAmount > 0 && currentUser && firestore && userProfile) {
      try {
        const batch = writeBatch(firestore);
        const winData = { 'wallet.coins': increment(winAmount) };
        batch.set(doc(firestore, 'users', currentUser.uid, 'profile', currentUser.uid), winData, { merge: true });
        batch.set(doc(firestore, 'users', currentUser.uid), winData, { merge: true });
        batch.commit().catch(() => {});
        addDoc(collection(firestore, 'globalGameWins'), {
          gameId: 'fruit-party', roomId: roomId || null, userId: currentUser.uid, username: userProfile.username || 'Guest',
          avatarUrl: userProfile.avatarUrl || null, amount: winAmount, betAmount: totalWagerForGroup, timestamp: new Date(),
        });
      } catch {}
      setLocalCoins(p => p + winAmount);
    }

    if (onRoundEnd) {
      if (groupType === 'left') {
        onRoundEnd({
          resultText: 'Non-veg Mix!',
          resultEmoji: String.fromCodePoint(0x1F362) + String.fromCodePoint(0x1F32F) + String.fromCodePoint(0x1F355) + String.fromCodePoint(0x1F357),
          resultImage: require('../../../assets/images/games/nonveg_mix.png'),
          myPrize: winAmount,
          myWager: totalWagerForGroup
        });
      } else if (groupType === 'right') {
        onRoundEnd({
          resultText: 'Fruit Mix!',
          resultEmoji: String.fromCodePoint(0x1F34D) + String.fromCodePoint(0x1F352) + String.fromCodePoint(0x1F34C) + String.fromCodePoint(0x1F349),
          resultImage: require('../../../assets/images/games/fruit_mix.png'),
          myPrize: winAmount,
          myWager: totalWagerForGroup
        });
      } else {
        onRoundEnd({
          resultText: `${winItem?.emoji || String.fromCodePoint(0x1F3C6)} ${winItem?.id?.toUpperCase() || 'WIN'} x${winItem?.multiplier || 0}!`,
          resultEmoji: winItem?.emoji || String.fromCodePoint(0x1F3C6),
          resultImage: winItem?.image,
          myPrize: winAmount,
          myWager: totalWagerForGroup
        });
      }
    }

    setTimeout(() => {
      setWinnerData(null);
      setShiningGroup('none');
      setLastBets({ ...myBets });
      setMyBets({});
      setHighlightIdx(null);
      setDroppedChips([]);
      setGameState('betting');
      setTimeLeft(30);
    }, 5000);
  };

  useEffect(() => { return () => clearTimeout(spinTimerRef.current); }, []);

  const totalBet = Object.values(myBets).reduce((s, v) => s + v, 0);

  if (gameState === 'launching') return <LaunchingScreen />;

  const showResult = gameState === 'result' && winnerData;
  const isSpinning = gameState === 'spinning';

  return (
    <View style={{ flex: 1, backgroundColor: '#311082', overflow: 'hidden' }}>
      {/* Background Party Image (Semi-transparent theme overlay) */}
      <Image
        source={require('../../../assets/images/games/fruit-party.jpg')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.35,
          resizeMode: 'cover',
        }}
      />
      {/* Wheel Area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 15 }}>
        

        {/* Side Icons (Non-veg Mix on Left, Fruit Mix on Right) */}
        <View style={{
          position: 'absolute',
          left: (SCREEN_WIDTH - WHEEL_SIZE) / 2 - 20,
          top: (SCREEN_HEIGHT / 2) - (WHEEL_SIZE / 2) - 225,
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: '#111827',
          borderWidth: shiningGroup === 'left' ? 3 : 0,
          borderColor: shiningGroup === 'left' ? '#f1c40f' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          elevation: shiningGroup === 'left' ? 12 : 5,
          overflow: 'hidden',
          shadowColor: '#f1c40f',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shiningGroup === 'left' ? 0.9 : 0,
          shadowRadius: shiningGroup === 'left' ? 10 : 0,
          transform: shiningGroup === 'left' ? [{ scale: 1.25 }] : [{ scale: 1 }],
        }}>
          <Image source={require('../../../assets/images/games/nonveg_mix.png')} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>

        <View style={{
          position: 'absolute',
          right: (SCREEN_WIDTH - WHEEL_SIZE) / 2 - 20,
          top: (SCREEN_HEIGHT / 2) - (WHEEL_SIZE / 2) - 225,
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: '#111827',
          borderWidth: shiningGroup === 'right' ? 3 : 0,
          borderColor: shiningGroup === 'right' ? '#f1c40f' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          elevation: shiningGroup === 'right' ? 12 : 5,
          overflow: 'hidden',
          shadowColor: '#f1c40f',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shiningGroup === 'right' ? 0.9 : 0,
          shadowRadius: shiningGroup === 'right' ? 10 : 0,
          transform: shiningGroup === 'right' ? [{ scale: 1.25 }] : [{ scale: 1 }],
        }}>
          <Image source={require('../../../assets/images/games/fruit_mix.png')} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
        

        {/* Ferris Wheel Stand (A-Frame Svg) */}
        <View style={{
          position: 'absolute',
          top: '72%',
          bottom: 0,
          width: 120,
          alignSelf: 'center',
          zIndex: 1,
          elevation: 1,
        }}>
          <Svg width="100%" height="100%" viewBox="0 0 120 150" preserveAspectRatio="none">
            {/* Left Leg */}
            <Path d="M60 0 L20 150" stroke="#f1c40f" strokeWidth={10} strokeLinecap="round" />
            {/* Right Leg */}
            <Path d="M60 0 L100 150" stroke="#f1c40f" strokeWidth={10} strokeLinecap="round" />
            {/* Crossbar */}
            <Path d="M40 75 L80 75" stroke="#f1c40f" strokeWidth={8} strokeLinecap="round" />
          </Svg>
        </View>

        {/* Base Platform (3D Deck) */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: 12,
          backgroundColor: '#9333ea',
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          zIndex: 8,
        }} />

        <View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, position: 'absolute', zIndex: 20, elevation: 20 }}>
          {/* Golden outer ring */}
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: WHEEL_SIZE / 2, borderWidth: 12,
            borderColor: '#f1c40f',
            shadowColor: '#f1c40f', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12,
          }} />

          {/* Glowing Light Bulbs on Rim */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 - 90 + 22.5) * (Math.PI / 180);
            const radius = (WHEEL_SIZE / 2) - 20; // Inward offset of -20
            const bulbTop = (WHEEL_SIZE / 2) + Math.sin(angle) * radius - 7;
            const bulbLeft = (WHEEL_SIZE / 2) + Math.cos(angle) * radius - 7;
            return (
              <View key={i} style={{
                position: 'absolute',
                top: bulbTop,
                left: bulbLeft,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: i % 2 === 0 ? '#fff' : '#fda4af',
                shadowColor: '#fff',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 5,
                elevation: 5,
                zIndex: 5,
              }} />
            );
          })}

          <View style={{
            position: 'absolute', top: 18, left: 18, right: 18, bottom: 18,
            borderRadius: (WHEEL_SIZE - 36) / 2, borderWidth: 9,
            borderColor: 'rgba(241, 196, 15, 0.75)',
          }} />

          {/* Spokes */}
          {FRUITS.map((_, i) => {
            const angle = i * 45 - 90;
            return (
              <View key={`spoke-${i}`} style={{
                position: 'absolute', top: WHEEL_SIZE / 2 - 4, left: WHEEL_SIZE / 2,
                width: WHEEL_SIZE / 2 - 14, height: 8,
                backgroundColor: 'rgba(241, 196, 15, 0.75)',
                transformOrigin: 'left center',
                transform: [{ rotate: `${angle}deg` }],
              }} />
            );
          })}

          {/* Food boxes */}
          {FRUITS.map((fruit, i) => {
            const isHighlighted = highlightIdx === i;
            const isItemInWinningGroup = shiningGroup === 'left'
              ? ['skewers', 'burrito', 'pizza', 'chicken'].includes(fruit.id)
              : shiningGroup === 'right'
                ? ['pineapple', 'cherry', 'banana', 'watermelon'].includes(fruit.id)
                : false;
            const showActiveHighlight = isHighlighted || (gameState === 'result' && isItemInWinningGroup);
            const betAmount = myBets[fruit.id] || 0;
            const fruitChips = droppedChips.filter(c => c.fruitId === fruit.id);

            return (
              <TouchableOpacity
                key={fruit.id}
                activeOpacity={0.8}
                onPress={() => handlePlaceBet(fruit.id)}
                style={{
                  position: 'absolute',
                  top: FRUIT_POSITIONS[i].top,
                  left: FRUIT_POSITIONS[i].left,
                  width: FRUIT_BOX, height: FRUIT_BOX, borderRadius: 14,
                  backgroundColor: '#111827',
                  borderWidth: showActiveHighlight ? 3 : 0,
                  borderColor: showActiveHighlight ? '#fff' : 'transparent',
                  alignItems: 'center', justifyContent: 'space-between',
                  overflow: 'hidden',
                  shadowColor: '#00e5ff',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: showActiveHighlight ? 0.9 : 0.4,
                  shadowRadius: showActiveHighlight ? 12 : 4,
                  elevation: showActiveHighlight ? 10 : 3,
                  transform: showActiveHighlight ? [{ scale: 1.15 }] : [{ scale: 1 }],
                  zIndex: showActiveHighlight ? 50 : 10,
                }}
              >
                {/* Background Image filling the card */}
                <Image
                  source={fruit.image}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                  contentFit="cover"
                />

                {/* Empty spacer to align the banner at bottom */}
                <View style={{ flex: 1 }} />

                {/* Integrated Win Multiplier Banner */}
                <View style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  width: '100%',
                  paddingVertical: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.15)',
                }}>
                  <Text style={{
                    color: 'white', fontSize: 8, fontWeight: '900', textTransform: 'uppercase'
                  }}>
                    {fruit.label}
                  </Text>
                </View>

                {/* Dropped chips */}
                {fruitChips.slice(0, 3).map((chip, ci) => (
                  <View key={chip.id} style={{
                    position: 'absolute', top: -4 + ci * 6, right: 2,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: '#eab308', borderWidth: 1.5, borderColor: 'white',
                    alignItems: 'center', justifyContent: 'center', elevation: 4,
                    zIndex: 30,
                  }}>
                    <Text style={{ color: 'white', fontSize: 6, fontWeight: '900' }}>{chip.label}</Text>
                  </View>
                ))}

                {/* Total bet badge */}
                {betAmount > 0 && (
                  <View style={{
                    position: 'absolute', top: 2, left: 2,
                    backgroundColor: '#f1c40f', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
                    elevation: 4,
                    zIndex: 30,
                  }}>
                    <Text style={{ color: '#1a0533', fontSize: 8, fontWeight: '900' }}>{formatChipLabel(betAmount)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center circle (Premium Metallic Countdown & Logo display) */}
        <View style={{
          width: CENTER_SIZE * 0.88, height: CENTER_SIZE * 0.88, borderRadius: (CENTER_SIZE * 0.88) / 2,
          backgroundColor: '#100529',
          borderWidth: 3, borderColor: '#f1c40f',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#f1c40f', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14, elevation: 12,
          zIndex: 60,
          overflow: 'hidden',
        }}>
          {gameState === 'betting' ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Animated.Text style={{
                fontSize: 28, fontWeight: '900', color: '#f1c40f',
                textShadowColor: 'rgba(241,196,15,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
                transform: [{ scale: timeLeft < 10 ? pulseAnim : 1 }]
              }}>
                {timeLeft}
              </Animated.Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Seconds
              </Text>
            </View>
          ) : isSpinning ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Animated.Text style={{
                fontSize: 26, fontWeight: '900', color: '#f1c40f',
                transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              }}>
                {String.fromCodePoint(0x1F3A1)}
              </Animated.Text>
              <Text style={{ color: '#00e5ff', fontSize: 6, fontWeight: '900', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 }}>
                Spinning...
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {winnerData ? (
                <>
                  <Text style={{ fontSize: 24 }}>
                    {FRUITS.find(f => f.id === winnerData.id)?.emoji || '🏆'}
                  </Text>
                  <Text style={{ color: '#00ffcc', fontSize: 8, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 }}>
                    Win!
                  </Text>
                </>
              ) : (
                <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>Party!</Text>
              )}
            </View>
          )}
        </View>

        {/* Pointer triangle at top */}
        <View style={{
          position: 'absolute', top: -10,
          width: 0, height: 0,
          borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 16,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#f1c40f',
          zIndex: 70,
        }} />
      </View>

      {/* Wager Panel */}
      <View style={{
        backgroundColor: '#7C3AED',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
        zIndex: 50,
      }}>
        {/* Coin balance and Repeat Bet */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: -10, marginRight: -10 }}>
          <LinearGradient
            colors={['#FFE885', '#FFD700', '#D97706']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 5,
              gap: 6,
              borderWidth: 1.5,
              borderColor: '#FFF5C0',
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 5,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 13, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>{String.fromCodePoint(0x1FA99)}</Text>
            <Text style={{
              color: 'white',
              fontSize: 14,
              fontWeight: '900',
              textShadowColor: 'rgba(0,0,0,0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              {localCoins.toLocaleString()}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGoToWallet}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
                borderWidth: 0.5,
                borderColor: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900', marginTop: -1 }}>+</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Repeat button next to Coin Capsule */}
          {Object.keys(lastBets).length > 0 && (
            <TouchableOpacity
              onPress={handleRepeat}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 5.5,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                gap: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 3,
              }}
            >
              <RotateCcw size={12} color="white" />
              <Text style={{ color: 'white', fontSize: 10, fontWeight: '950', textTransform: 'uppercase' }}>Repeat Bet</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instruction */}
        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', textAlign: 'left', marginBottom: 8, marginLeft: -10 }}>
          Choose the amount of wager then choose food
        </Text>

        {/* Wager buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 6, marginBottom: 6, marginLeft: -10 }}>
          {CHIPS.map(value => (
            <TouchableOpacity
              key={value}
              onPress={() => setSelectedChip(value)}
              style={{
                width: 48, height: 42, borderRadius: 10,
                overflow: 'hidden',
                borderWidth: selectedChip === value ? 2 : 1,
                borderColor: selectedChip === value ? '#FFF5C0' : 'rgba(255,255,255,0.2)',
                shadowColor: selectedChip === value ? '#FFD700' : 'transparent',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: selectedChip === value ? 0.7 : 0,
                shadowRadius: 6,
                elevation: selectedChip === value ? 5 : 0,
              }}
            >
              <LinearGradient
                colors={selectedChip === value 
                  ? ['#FFE885', '#FFD700', '#F59E0B']
                  : ['#6B21A8', '#4C1D95']
                }
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 10, marginBottom: -1 }}>{String.fromCodePoint(0x1FA99)}</Text>
                <Text style={{
                  color: selectedChip === value ? '#4C1D95' : 'white',
                  fontSize: 9,
                  fontWeight: '900',
                  textShadowColor: selectedChip === value ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  {formatChipLabel(value)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Winning History Bar */}
      <View style={{
        backgroundColor: '#2e0854',
        paddingHorizontal: 12, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 2,
        borderTopColor: '#f1c40f',
      }}>
        <View style={{ marginRight: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, marginBottom: 1 }}>🏆</Text>
          <Text style={{
            color: '#FFD700',
            fontSize: 9,
            fontWeight: '900',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 11,
            textShadowColor: 'rgba(255,215,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            Winning{"\n"}History
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingRight: 10 }}>
            {history.map((id, i) => {
              const a = FRUITS.find(x => x.id === id);
              const isLatest = i === 0;
              return (
                <View key={i} style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: '#ffffff',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: 1 - (i * 0.06),
                  borderWidth: isLatest ? 2 : 1.5,
                  borderColor: isLatest ? '#f1c40f' : 'rgba(255,215,0,0.3)',
                  overflow: 'hidden',
                  shadowColor: isLatest ? '#f1c40f' : 'transparent',
                  shadowOffset: { width: 0, height: isLatest ? 2 : 0 },
                  shadowOpacity: isLatest ? 0.8 : 0,
                  shadowRadius: isLatest ? 4 : 0,
                  elevation: isLatest ? 4 : 2,
                }}>
                  {a?.image ? (
                    <Image source={a.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  ) : (
                    <Text style={{ fontSize: 16 }}>{a?.emoji}</Text>
                  )}
                </View>
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
    <View style={{ flex: 1, backgroundColor: '#311082', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ fontSize: 72, marginBottom: 20, opacity: pulseAnim, transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        {String.fromCodePoint(0x1F3A1)}
      </Animated.Text>
      <Text style={{ color: '#FFD700', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 12, textShadowColor: 'rgba(255,215,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
        Fruit Party
      </Text>
      <View style={{ width: 180, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: '60%', backgroundColor: '#FFD700', borderRadius: 99, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-180, 180] }) }] }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 12 }}>
        Entering the Party...
      </Text>
    </View>
  );
}

function formatChipLabel(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}`;
}
