import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, Animated, Easing, Image } from 'react-native';
import { HelpCircle, Volume2, VolumeX, BarChart3, ChevronDown, X, RotateCcw, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc, increment, addDoc, collection, getDoc, writeBatch } from '@/firebase/firestore-compat';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ForestPartyGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string; resultImage?: any; myPrize?: number; myWager?: number }) => void;
  isMuted?: boolean;
}

const ANIMALS = [
  { id: 'rabbit', emoji: 'ðŸ°', image: require('../../../assets/images/games/rabbit.png'), multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'cat',    emoji: 'ðŸ±', image: require('../../../assets/images/games/cat.png'),    multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'dog',    emoji: 'ðŸ¶', image: require('../../../assets/images/games/dog.png'),    multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'sheep',  emoji: 'ðŸ‘', image: require('../../../assets/images/games/sheep.png'),  multiplier: 5,  label: 'win 5 times',  color: '#06b6d4', bg: '#083344' },
  { id: 'panda',  emoji: 'ðŸ¼', image: require('../../../assets/images/games/panda.png'),  multiplier: 10, label: 'win 10 times', color: '#06b6d4', bg: '#083344' },
  { id: 'bear',   emoji: 'ðŸ»', image: require('../../../assets/images/games/bear.png'),   multiplier: 15, label: 'win 15 times', color: '#06b6d4', bg: '#083344' },
  { id: 'tiger',  emoji: 'ðŸ¯', image: require('../../../assets/images/games/tiger.png'),  multiplier: 25, label: 'win 25 times', color: '#06b6d4', bg: '#083344' },
  { id: 'lion',   emoji: 'ðŸ¦', image: require('../../../assets/images/games/lion.png'),   multiplier: 45, label: 'win 45 times', color: '#06b6d4', bg: '#083344' },
];

const CHIPS = [100, 500, 1000, 5000, 10000, 50000, 100000];
const CHIP_STYLES: Record<number, { colors: string[]; text: string; border: string }> = {
  100:    { colors: ['#1e40af', '#3b82f6'], text: 'white', border: '#93c5fd' }, // Blue
  500:    { colors: ['#9d174d', '#ec4899'], text: 'white', border: '#fbcfe8' }, // Pink
  1000:   { colors: ['#701a75', '#d946ef'], text: 'white', border: '#f5d0fe' }, // Purple
  5000:   { colors: ['#065f46', '#10b981'], text: 'white', border: '#a7f3d0' }, // Green
  10000:  { colors: ['#b45309', '#f59e0b'], text: 'white', border: '#fef08a' }, // Orange/Gold
  50000:  { colors: ['#991b1b', '#ef4444'], text: 'white', border: '#fca5a5' }, // Crimson
  100000: { colors: ['#111827', '#374151'], text: 'white', border: '#9ca3af' }, // Silver/Gray
};
const SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7];

const WHEEL_SIZE = SCREEN_WIDTH * 0.85;
const CENTER_SIZE = WHEEL_SIZE * 0.32;
const ANIMAL_BOX = 64;
const ANIMAL_DISTANCE = (WHEEL_SIZE / 2) - (ANIMAL_BOX / 2) + 4;

const ANIMAL_POSITIONS = ANIMALS.map((_, i) => {
  const angle = (i * 45 - 90) * (Math.PI / 180);
  return {
    top: (WHEEL_SIZE / 2) + Math.sin(angle) * ANIMAL_DISTANCE - ANIMAL_BOX / 2,
    left: (WHEEL_SIZE / 2) + Math.cos(angle) * ANIMAL_DISTANCE - ANIMAL_BOX / 2,
  };
});

export function ForestPartyGame({ onClose, roomId, onRoundEnd, isMuted }: ForestPartyGameProps) {
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
  const [history, setHistory] = useState<string[]>(['rabbit', 'dog', 'panda', 'rabbit', 'sheep', 'cat', 'rabbit', 'tiger']);
  const [winnerData, setWinnerData] = useState<{ id: string; win: number; multiplier: number } | null>(null);
  const [shiningGroup, setShiningGroup] = useState<'none' | 'left' | 'right'>('none');
  const [localCoins, setLocalCoins] = useState(0);
  const [droppedChips, setDroppedChips] = useState<{ id: string; animalId: string; label: string }[]>([]);
  const spinTimerRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const playSoundEffect = async (type: 'tick' | 'spin' | 'win') => {
    if (isMuted) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }
      let url = '';
      if (type === 'tick') {
        url = 'https://github.com/wesbos/JavaScript30/raw/master/01%20-%20JavaScript%20Drum%20Kit/sounds/tink.wav';
      } else if (type === 'spin') {
        url = 'https://github.com/wesbos/JavaScript30/raw/master/01%20-%20JavaScript%20Drum%20Kit/sounds/hihat.wav';
      } else if (type === 'win') {
        url = 'https://github.com/wesbos/JavaScript30/raw/master/01%20-%20JavaScript%20Drum%20Kit/sounds/openhat.wav';
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

  const handlePlaceBet = async (animalId: string) => {
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
    setDroppedChips(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, animalId, label: formatChipLabel(selectedChip) }]);
    setMyBets(prev => ({ ...prev, [animalId]: (prev[animalId] || 0) + selectedChip }));
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
    Object.entries(lastBets).forEach(([animalId, amount]) => {
      for (let i = 0; i < Math.ceil(amount / selectedChip); i++) {
        newDrops.push({ id: `${Date.now()}-${Math.random()}-${i}`, animalId, label: formatChipLabel(selectedChip) });
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

    let winningId = ANIMALS[Math.floor(Math.random() * ANIMALS.length)].id;
    if (firestore) {
      try {
        const oracleSnap = await getDoc(doc(firestore, 'gameOracle', 'forest-party'));
        if (oracleSnap.exists() && (oracleSnap.data() as any).isActive) {
          const forced = (oracleSnap.data() as any).forcedResult;
          if (ANIMALS.some(a => a.id === forced)) winningId = forced;
          updateDoc(doc(firestore, 'gameOracle', 'forest-party'), { isActive: false }).catch(() => {});
          groupType = 'none';
        }
      } catch {}
    }

    if (groupType === 'left') {
      // Wild animals (Left)
      const leftIds = ['panda', 'bear', 'tiger', 'lion'];
      winningId = leftIds[Math.floor(Math.random() * leftIds.length)];
    } else if (groupType === 'right') {
      // Cute animals (Right)
      const rightIds = ['rabbit', 'cat', 'dog', 'sheep'];
      winningId = rightIds[Math.floor(Math.random() * rightIds.length)];
    }

    const targetIdx = ANIMALS.findIndex(a => a.id === winningId);
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
      ? ['panda', 'bear', 'tiger', 'lion']
      : groupType === 'right'
        ? ['rabbit', 'cat', 'dog', 'sheep']
        : [id];

    let winAmount = 0;
    winningIds.forEach(wid => {
      const winItem = ANIMALS.find(a => a.id === wid);
      winAmount += (myBets[wid] || 0) * (winItem?.multiplier || 0);
    });

    const winItem = ANIMALS.find(a => a.id === id);
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
          gameId: 'forest-party', roomId: roomId || null, userId: currentUser.uid, username: userProfile.username || 'Guest',
          avatarUrl: userProfile.avatarUrl || null, amount: winAmount, betAmount: totalWagerForGroup, timestamp: new Date(),
        });
      } catch {}
      setLocalCoins(p => p + winAmount);
    }

    if (onRoundEnd) {
      if (groupType === 'left') {
        onRoundEnd({
          resultText: 'Wild Mix!',
          resultEmoji: 'ðŸ¼ðŸ»ðŸ¯ðŸ¦',
          resultImage: require('../../../assets/images/games/wild_mix.png'),
          myPrize: winAmount,
          myWager: totalWagerForGroup
        });
      } else if (groupType === 'right') {
        onRoundEnd({
          resultText: 'Cute Mix!',
          resultEmoji: 'ðŸ°ðŸ±ðŸ¶ðŸ‘',
          resultImage: require('../../../assets/images/games/cute_mix.png'),
          myPrize: winAmount,
          myWager: totalWagerForGroup
        });
      } else {
        onRoundEnd({
          resultText: `${winItem?.emoji || 'ðŸ†'} ${winItem?.id?.toUpperCase() || 'WIN'} x${winItem?.multiplier || 0}!`,
          resultEmoji: winItem?.emoji || 'ðŸ†',
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
    <View style={{ flex: 1, backgroundColor: '#022c22', overflow: 'hidden', paddingTop: 38 }}>
      {/* Background Jungle Image (Semi-transparent foliage overlay) */}
      <Image
        source={require('../../../assets/images/games/forest-party.jpg')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.85,
          resizeMode: 'cover',
        }}
      />
      {/* Floating Winning History (With light transparent background capsule) */}
      <View style={{
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: -6,
        marginBottom: 4,
        zIndex: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
      }}>
        {history.map((id, i) => {
          const a = ANIMALS.find(x => x.id === id);
          const isLatest = i === 0;
          return (
            <View key={i} style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: '#ffffff',
              borderWidth: isLatest ? 1.8 : 1,
              borderColor: isLatest ? '#eab308' : 'rgba(255,255,255,0.2)',
              overflow: 'hidden',
              opacity: 1 - (i * 0.08),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 1.5,
              elevation: 2,
            }}>
              {a?.image && (
                <Image source={a.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              )}
            </View>
          );
        })}
      </View>

      {/* Left Mix (Wild Mix) Badge - Positioned just above Wager Panel on left side */}
      <View style={{
        position: 'absolute',
        bottom: 150,
        left: 16,
        width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff',
        borderWidth: shiningGroup === 'left' ? 2.5 : 0, borderColor: '#eab308',
        overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
        zIndex: 40,
      }}>
        <Image source={require('../../../assets/images/games/wild_mix.png')} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
      </View>

      {/* Right Mix (Cute Mix) Badge - Positioned just above Wager Panel on right side */}
      <View style={{
        position: 'absolute',
        bottom: 150,
        right: 16,
        width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff',
        borderWidth: shiningGroup === 'right' ? 2.5 : 0, borderColor: '#eab308',
        overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
        zIndex: 40,
      }}>
        <Image source={require('../../../assets/images/games/cute_mix.png')} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
      </View>

      {/* Wheel Area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 15, transform: [{ translateY: -25 }] }}>

        {/* Floating shadow/glow effect under the wheel */}
        <View style={{
          position: 'absolute',
          width: WHEEL_SIZE - 20,
          height: WHEEL_SIZE - 20,
          borderRadius: (WHEEL_SIZE - 20) / 2,
          backgroundColor: 'rgba(0,0,0,0.4)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 10,
          zIndex: 0,
        }} />

        <View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, position: 'absolute', zIndex: 20, elevation: 20 }}>
          {/* Wooden Helm Outer Rim (Brown/Wooden styling) */}
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: WHEEL_SIZE / 2, borderWidth: 14,
            borderColor: '#854d0e', // Rich wood brown
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
          }} />

          {/* Wooden Inner Ring */}
          <View style={{
            position: 'absolute', top: 22, left: 22, right: 22, bottom: 22,
            borderRadius: (WHEEL_SIZE - 44) / 2, borderWidth: 6,
            borderColor: '#a16207', // Lighter wood accent
          }} />

          {/* Wooden Spokes with Extended Handles (Helm handles extending out) */}
          {ANIMALS.map((_, i) => {
            const angle = i * 45 - 90;
            return (
              <React.Fragment key={`spoke-group-${i}`}>
                {/* Main connecting spoke */}
                <View style={{
                  position: 'absolute', top: WHEEL_SIZE / 2 - 5, left: WHEEL_SIZE / 2,
                  width: WHEEL_SIZE / 2 - 12, height: 10,
                  backgroundColor: '#854d0e',
                  transformOrigin: 'left center',
                  transform: [{ rotate: `${angle}deg` }],
                }} />
                {/* Helm handle extending outside the outer rim */}
                <View style={{
                  position: 'absolute', top: WHEEL_SIZE / 2 - 7.5, left: WHEEL_SIZE / 2,
                  width: WHEEL_SIZE / 2 + 16, height: 15,
                  backgroundColor: '#713f12',
                  borderRadius: 6,
                  transformOrigin: 'left center',
                  transform: [{ rotate: `${angle}deg` }],
                  zIndex: -1, // Sits behind the outer rim
                }} />
              </React.Fragment>
            );
          })}

          {/* Animal boxes */}
          {ANIMALS.map((animal, i) => {
            const isHighlighted = highlightIdx === i;
            const isItemInWinningGroup = shiningGroup === 'left'
              ? ['panda', 'bear', 'tiger', 'lion'].includes(animal.id)
              : shiningGroup === 'right'
                ? ['rabbit', 'cat', 'dog', 'sheep'].includes(animal.id)
                : false;
            const showActiveHighlight = isHighlighted || (gameState === 'result' && isItemInWinningGroup);
            const betAmount = myBets[animal.id] || 0;
            const animalChips = droppedChips.filter(c => c.animalId === animal.id);

            return (
              <View
                key={animal.id}
                style={[{
                  position: 'absolute',
                  width: ANIMAL_BOX,
                  height: ANIMAL_BOX,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: showActiveHighlight ? 50 : 10,
                }, ANIMAL_POSITIONS[i] as any]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePlaceBet(animal.id)}
                  style={{
                    width: ANIMAL_BOX,
                    height: ANIMAL_BOX,
                    borderRadius: ANIMAL_BOX / 2,
                    backgroundColor: '#ffffff',
                    borderWidth: showActiveHighlight ? 3 : 0,
                    borderColor: showActiveHighlight ? '#fff' : 'transparent',
                    overflow: 'hidden',
                    shadowColor: '#4ade80',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: showActiveHighlight ? 0.9 : 0.4,
                    shadowRadius: showActiveHighlight ? 12 : 4,
                    elevation: showActiveHighlight ? 10 : 3,
                    transform: showActiveHighlight ? [{ scale: 1.15 }] : [{ scale: 1 }],
                  }}
                >
                  {/* Full cover animal image */}
                  <Image source={animal.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                </TouchableOpacity>

                {/* Win Multiplier Banner - OUTSIDE the circle and shifted below to overlap the bottom edge */}
                <View style={{
                  position: 'absolute',
                  bottom: -11,
                  backgroundColor: '#7f1d1d',
                  paddingHorizontal: 4,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  borderWidth: 0.8,
                  borderColor: '#f59e0b',
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 1,
                  minWidth: 54,
                }}>
                  <Text 
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      color: '#fef08a', 
                      fontSize: 7.2, 
                      fontWeight: '900', 
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    {animal.label}
                  </Text>
                </View>

                {/* Dropped chips */}
                {animalChips.slice(0, 3).map((chip, ci) => (
                  <View key={chip.id} style={{
                    position: 'absolute', top: 2 + ci * 6, right: 6,
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
                    position: 'absolute', top: 4, left: 6,
                    backgroundColor: '#f1c40f', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
                    elevation: 4,
                    zIndex: 30,
                  }}>
                    <Text style={{ color: '#064e3b', fontSize: 8, fontWeight: '900' }}>{formatChipLabel(betAmount)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Center circle (Countdown & Status styled exactly like close-up screenshot) */}
        <View style={{
          width: CENTER_SIZE * 1.15, height: CENTER_SIZE * 1.15, borderRadius: (CENTER_SIZE * 1.15) / 2,
          backgroundColor: '#a16207', // Lighter wooden outer ring
          borderWidth: 5, borderColor: '#713f12', // Dark wood border
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,
          zIndex: 60,
        }}>
          {/* Middle Dark Brown Ring with Golden Dashes */}
          <View style={{
            width: '88%', height: '88%', borderRadius: (CENTER_SIZE * 1.15 * 0.88) / 2,
            backgroundColor: '#451a03',
            borderWidth: 2, borderColor: '#eab308',
            borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Inner Golden Border & Lighter Gradient Background Circle */}
            <View style={{
              width: '88%', height: '88%', borderRadius: (CENTER_SIZE * 1.15 * 0.88 * 0.88) / 2,
              borderWidth: 1.5, borderColor: '#f59e0b',
              overflow: 'hidden',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <LinearGradient
                colors={['#fffbeb', '#fed7aa', '#f97316']} // Cream to rich orange gradient
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 2 }}
              >
                {gameState === 'betting' ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Animated.Text style={{
                      fontSize: 28,
                      fontWeight: '900',
                      color: '#3f2305', // Dark brown text for countdown
                      transform: [{ scale: timeLeft < 10 ? pulseAnim : 1 }]
                    }}>
                      {timeLeft}
                    </Animated.Text>
                    <Text style={{ color: '#7c2d12', fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Seconds
                    </Text>
                  </View>
                ) : isSpinning ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Animated.View style={{
                      transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                    }}>
                      <Svg width={30} height={30} viewBox="0 0 100 100">
                        {/* Outer Rim */}
                        <Circle cx="50" cy="50" r="35" stroke="#854d0e" strokeWidth="8" fill="none" />
                        {/* Inner Rim */}
                        <Circle cx="50" cy="50" r="22" stroke="#a16207" strokeWidth="3" fill="none" />
                        {/* Center Hub */}
                        <Circle cx="50" cy="50" r="10" fill="#713f12" stroke="#eab308" strokeWidth="2" />
                        {/* Spokes and Handles */}
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                          <G key={angle} transform={`rotate(${angle} 50 50)`}>
                            {/* Spoke line */}
                            <Line x1="50" y1="50" x2="50" y2="10" stroke="#854d0e" strokeWidth="5" />
                            {/* Handle Knob */}
                            <Circle cx="50" cy="8" r="4.5" fill="#713f12" stroke="#eab308" strokeWidth="1" />
                          </G>
                        ))}
                      </Svg>
                    </Animated.View>
                    <Text style={{ color: '#3f2305', fontSize: 6.5, fontWeight: '900', textTransform: 'uppercase', marginTop: 3 }}>
                      Spinning...
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {winnerData ? (
                      <>
                        <Text style={{ fontSize: 24 }}>
                          {ANIMALS.find(f => f.id === winnerData.id)?.emoji || 'ðŸ†'}
                        </Text>
                        <Text style={{ color: '#3f2305', fontSize: 8, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 }}>
                          Win!
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: '#3f2305', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Forest</Text>
                    )}
                  </View>
                )}
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Pointer at top */}
        <View style={{
          position: 'absolute', top: -10,
          width: 0, height: 0,
          borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 16,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#eab308',
          zIndex: 70,
        }} />
      </View>

      {/* Wager Panel (Styled as a premium wooden board with dangling jungle vines) */}
      <LinearGradient
        colors={['#271201', '#3b1c02', '#221001']} // Darker, rich mahogany bark wood colors
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
          zIndex: 50,
          borderTopWidth: 5,
          borderTopColor: '#5c2d0c', // Dark wood border rim
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 12,
        }}
      >
        {/* Coin balance and Repeat Bet */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: -10, marginRight: -10 }}>
          <LinearGradient
            colors={['#fed7aa', '#d97706']} // Light wood gradient (Oak/Pine wood tones)
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 20, // Capsule shape
              paddingHorizontal: 14,
              paddingVertical: 5.5,
              gap: 6,
              borderWidth: 1.8,
              borderColor: '#713f12', // Dark wood border rim
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 13, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>ðŸª™</Text>
            <Text style={{
              color: '#3f2305', // Dark charcoal/brown text for readability
              fontSize: 14,
              fontWeight: '900',
              textShadowColor: 'rgba(255,255,255,0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 1,
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
                backgroundColor: '#713f12', // Dark wood background for button
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
                borderWidth: 0.5,
                borderColor: 'rgba(255, 255, 255, 0.4)',
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
                borderRadius: 20,
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
          Choose the amount of wager then choose animal
        </Text>

        {/* Wager buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: -10 }}>
          {CHIPS.map(value => {
            const style = CHIP_STYLES[value] || { colors: ['#047857', '#064e3b'], text: 'white', border: 'rgba(255,255,255,0.2)' };
            const isSelected = selectedChip === value;

            return (
              <TouchableOpacity
                key={value}
                onPress={() => setSelectedChip(value)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: isSelected ? '#ffffff' : '#f59e0b', // Glowing white when selected, shiny gold otherwise
                  shadowColor: isSelected ? '#ffffff' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSelected ? 0.8 : 0.4,
                  shadowRadius: isSelected ? 6 : 3,
                  elevation: 5,
                }}
              >
                <LinearGradient
                  colors={style.colors as [string, string, ...string[]]}
                  style={{
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Inner dashed ring to look like a premium poker chip */}
                  <View style={{
                    width: '82%',
                    height: '82%',
                    borderRadius: 18,
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: style.text,
                      fontSize: 10,
                      fontWeight: '900',
                      textShadowColor: 'rgba(0,0,0,0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}>
                      {formatChipLabel(value)}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

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
    <View style={{ flex: 1, backgroundColor: '#022c22', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ fontSize: 72, marginBottom: 20, opacity: pulseAnim, transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        ðŸŒ²
      </Animated.Text>
      <Text style={{ color: '#eab308', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 12, textShadowColor: 'rgba(234,179,8,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
        Forest Party
      </Text>
      <View style={{ width: 180, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: '60%', backgroundColor: '#eab308', borderRadius: 99, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [-180, 180] }) }] }} />
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
