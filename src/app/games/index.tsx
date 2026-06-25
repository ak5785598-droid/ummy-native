import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, Easing, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Sparkles, Dice6, Swords, Gift, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { doc, serverTimestamp, increment, writeBatch, getDoc } from '@/firebase/firestore-compat';

const { width } = Dimensions.get('window');
const DICE_SIZE = width * 0.25;

const GAMES = [
  { id: 'spin', name: 'Lucky Spin', icon: Sparkles, color: '#f59e0b', desc: 'Spin the wheel to win coins!' },
  { id: 'dice', name: 'Dice Duel', icon: Dice6, color: '#3b82f6', desc: 'Roll higher than your opponent' },
  { id: 'battle', name: 'Gift Battle', icon: Swords, color: '#ef4444', desc: '1v1 gift battle (coming soon)' },
  { id: 'chest', name: 'Golden Chest', icon: Gift, color: '#fbbf24', desc: 'Open daily chests for rewards' },
];

const DICE_FACES: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

export default function GamesScreen() {
  const router = useRouter();
  const [showSpin, setShowSpin] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [showChest, setShowChest] = useState(false);

  const handleGame = (id: string) => {
    switch (id) {
      case 'spin': setShowSpin(true); break;
      case 'dice': setShowDice(true); break;
      case 'chest': setShowChest(true); break;
      default: Alert.alert('Coming Soon', 'This game will be available soon!');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Mini Games</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap gap-3 mt-4">
          {GAMES.map(game => (
            <TouchableOpacity
              key={game.id}
              onPress={() => handleGame(game.id)}
              className="w-full bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: `${game.color}20` }}>
                  <game.icon size={28} color={game.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-slate-800">{game.name}</Text>
                  <Text className="text-sm text-slate-500">{game.desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <LuckySpin visible={showSpin} onClose={() => setShowSpin(false)} />
      <DiceDuel visible={showDice} onClose={() => setShowDice(false)} />
      <GoldenChest visible={showChest} onClose={() => setShowChest(false)} />
    </SafeAreaView>
  );
}

function LuckySpin({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile } = useUserProfile(user?.uid);
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useState(new Animated.Value(0))[0];
  const [result, setResult] = useState<number | null>(null);

  const segments = [2, 5, 10, 3, 50, 1, 20, 8];
  const segmentAngle = 360 / segments.length;

  const handleSpin = async () => {
    if (spinning || !firestore || !user?.uid) return;
    const cost = 100;
    if ((profile?.wallet?.coins || 0) < cost) return Alert.alert('Insufficient coins', 'You need 100 coins to spin');
    setSpinning(true); setResult(null);
    const targetIndex = Math.floor(Math.random() * segments.length);
    const targetAngle = 360 * 5 + targetIndex * segmentAngle;
    spinAnim.setValue(0);
    Animated.timing(spinAnim, { toValue: targetAngle, duration: 3000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(async () => {
      const multiplier = segments[targetIndex];
      const winAmount = cost * multiplier;
      try {
        const batch = writeBatch(firestore);
        batch.update(doc(firestore, 'users', user.uid, 'profile', user.uid), { 'wallet.coins': increment(winAmount - cost), updatedAt: serverTimestamp() });
        await batch.commit();
      } catch (e) {}
      setResult(winAmount); setSpinning(false);
    });
  };

  const rotation = spinAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <View className="bg-slate-900 rounded-3xl w-full p-6 items-center">
          <TouchableOpacity onPress={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full"><X size={18} color="white" /></TouchableOpacity>
          <Text className="text-white text-xl font-bold mb-1">Lucky Spin</Text>
          <Text className="text-white/50 text-sm mb-4">Cost: 100 coins</Text>
          <View className="w-64 h-64 rounded-full bg-slate-800 border-4 border-yellow-500 items-center justify-center mb-4 overflow-hidden">
            <Animated.View style={{ transform: [{ rotate: rotation }] }} className="w-full h-full items-center justify-center">
              <View className="flex-row flex-wrap w-full h-full">
                {segments.map((mult, i) => (
                  <View key={i} className="items-center justify-center" style={{ width: '50%', height: '50%', backgroundColor: i % 2 === 0 ? '#7c3aed' : '#6d28d9' }}>
                    <Text className="text-white text-lg font-black">x{mult}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
            <View className="absolute w-8 h-8 bg-yellow-500 rounded-full items-center justify-center"><Text className="text-black font-black">▶</Text></View>
          </View>
          {result !== null && (
            <View className="bg-green-500/20 rounded-2xl px-6 py-3 mb-3 border border-green-500/30">
              <Text className="text-green-400 text-lg font-bold">You won {result.toLocaleString()} coins!</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleSpin} disabled={spinning} className="bg-purple-600 rounded-2xl py-4 px-12 items-center mb-2">
            <Text className="text-white font-bold text-lg">{spinning ? 'Spinning...' : 'SPIN'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DiceDuel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile } = useUserProfile(user?.uid);

  const [rolling, setRolling] = useState(false);
  const [playerRoll, setPlayerRoll] = useState<number>(1);
  const [cpuRoll, setCpuRoll] = useState<number>(1);
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [bet, setBet] = useState(50);
  const [lastWon, setLastWon] = useState(0);

  const playerAnim = useRef(new Animated.Value(0)).current;
  const cpuAnim = useRef(new Animated.Value(0)).current;

  const BET_OPTIONS = [50, 100, 200, 500];

  const animateDice = (anim: Animated.Value, toValue: number, cb?: () => void) => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(cb);
  };

  const handleRoll = async () => {
    if (rolling || !firestore || !user?.uid) return;
    if ((profile?.wallet?.coins || 0) < bet) return Alert.alert('Insufficient coins', `You need ${bet} coins`);
    setRolling(true); setResult(null);

    const pRoll = Math.floor(Math.random() * 6) + 1;
    const cRoll = Math.floor(Math.random() * 6) + 1;

    animateDice(playerAnim, 0, () => setPlayerRoll(pRoll));
    animateDice(cpuAnim, 0, () => {
      setCpuRoll(cRoll);
      const w = pRoll > cRoll ? 'win' : pRoll < cRoll ? 'lose' : 'tie';
      setResult(w);
      setRolling(false);

      if (w === 'win') {
        const winAmount = bet * 2;
        setLastWon(winAmount);
        try {
          const batch = writeBatch(firestore);
          batch.update(doc(firestore, 'users', user.uid, 'profile', user.uid), { 'wallet.coins': increment(winAmount - bet), 'stats.dailyGameWins': increment(1), updatedAt: serverTimestamp() });
          batch.commit();
        } catch (e) {}
      } else if (w === 'lose') {
        try {
          const batch = writeBatch(firestore);
          batch.update(doc(firestore, 'users', user.uid, 'profile', user.uid), { 'wallet.coins': increment(-bet), updatedAt: serverTimestamp() });
          batch.commit();
        } catch (e) {}
      }
    });
  };

  const shakeInterpolate = (anim: Animated.Value) => anim.interpolate({
    inputRange: [0, 1], outputRange: [0, 30]
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/80 justify-center items-center px-4">
        <View className="bg-slate-900 rounded-3xl w-full p-6 items-center">
          <TouchableOpacity onPress={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full"><X size={18} color="white" /></TouchableOpacity>
          <Text className="text-white text-xl font-bold mb-1">Dice Duel</Text>
          <Text className="text-white/50 text-sm mb-6">Roll higher to win 2x your bet!</Text>

          <View className="flex-row items-center justify-center gap-8 mb-6">
            <Animated.View style={{ transform: [{ translateX: shakeInterpolate(playerAnim) }] }} className="items-center">
              <Text className="text-white/60 text-xs mb-2">You</Text>
              <Text className="text-6xl">{DICE_FACES[playerRoll]}</Text>
              <Text className="text-white text-lg font-bold mt-1">{playerRoll}</Text>
            </Animated.View>
            <Text className="text-3xl text-white/40 font-black">VS</Text>
            <Animated.View style={{ transform: [{ translateX: shakeInterpolate(cpuAnim) }] }} className="items-center">
              <Text className="text-white/60 text-xs mb-2">CPU</Text>
              <Text className="text-6xl">{DICE_FACES[cpuRoll]}</Text>
              <Text className="text-white text-lg font-bold mt-1">{cpuRoll}</Text>
            </Animated.View>
          </View>

          {result && (
            <View className={`rounded-2xl px-6 py-3 mb-4 border ${result === 'win' ? 'bg-green-500/20 border-green-500/30' : result === 'lose' ? 'bg-red-500/20 border-red-500/30' : 'bg-yellow-500/20 border-yellow-500/30'}`}>
              <Text className={`text-lg font-bold ${result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>
                {result === 'win' ? `You won ${lastWon.toLocaleString()} coins!` : result === 'lose' ? 'You lost!' : 'It\'s a tie!'}
              </Text>
            </View>
          )}

          <View className="flex-row gap-2 mb-4">
            {BET_OPTIONS.map(b => (
              <TouchableOpacity key={b} onPress={() => setBet(b)} className={`px-4 py-2 rounded-xl border ${bet === b ? 'bg-blue-500 border-blue-400' : 'border-white/20'}`}>
                <Text className={`font-bold ${bet === b ? 'text-white' : 'text-white/70'}`}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleRoll} disabled={rolling} className="bg-blue-600 rounded-2xl py-4 px-12 items-center w-full">
            <Text className="text-white font-bold text-lg">{rolling ? 'Rolling...' : 'Roll Dice'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} className="mt-3"><Text className="text-white/50 text-sm">Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function GoldenChest({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile } = useUserProfile(user?.uid);

  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [reward, setReward] = useState<{ coins: number; diamonds: number } | null>(null);
  const [cooldown, setCooldown] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!visible) { setOpened(false); setReward(null); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    checkCooldown();
  }, [visible]);

  const checkCooldown = async () => {
    if (!firestore || !user?.uid) return;
    const userRef = doc(firestore, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists) {
      const data = snap.data();
      const lastOpen = data.lastChestOpen?.toDate?.() || data.lastChestOpen;
      if (lastOpen) {
        const diff = Date.now() - new Date(lastOpen).getTime();
        setCooldown(diff < 86400000);
      }
    }
  };

  const handleOpen = async () => {
    if (opening || !firestore || !user?.uid) return;
    setOpening(true);
    const coinsReward = Math.floor(Math.random() * 500) + 100;
    const diamondReward = Math.floor(Math.random() * 20) + 5;
    setTimeout(async () => {
      try {
        const batch = writeBatch(firestore);
        batch.update(doc(firestore, 'users', user.uid, 'profile', user.uid), { 'wallet.coins': increment(coinsReward), 'wallet.diamonds': increment(diamondReward), lastChestOpen: serverTimestamp(), updatedAt: serverTimestamp() });
        await batch.commit();
      } catch (e) {}
      setReward({ coins: coinsReward, diamonds: diamondReward });
      setOpened(true);
      setOpening(false);
      setCooldown(true);
    }, 1500);
  };

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <View className="bg-slate-900 rounded-3xl w-full p-8 items-center">
          <TouchableOpacity onPress={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full"><X size={18} color="white" /></TouchableOpacity>

          {!opened ? (
            <>
              <Text className="text-white text-2xl font-bold mb-1">Golden Chest</Text>
              <Text className="text-white/50 text-sm mb-6">{cooldown ? 'Come back tomorrow!' : 'Open once every 24 hours'}</Text>

              <Animated.View style={{ transform: [{ scale }] }} className="mb-6">
                <TouchableOpacity onPress={handleOpen} disabled={opening || cooldown} className="items-center">
                  <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} className="w-40 h-40 rounded-3xl items-center justify-center shadow-2xl">
                    <Text className="text-6xl">{opening ? '🔓' : '📦'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {cooldown && <Text className="text-yellow-400 text-sm font-bold mb-4">Already claimed today</Text>}

              <TouchableOpacity onPress={handleOpen} disabled={opening || cooldown} className="bg-yellow-500 rounded-2xl py-4 px-12 items-center w-full">
                <Text className="text-black font-bold text-lg">{opening ? 'Opening...' : cooldown ? 'Locked' : 'Open Chest'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-white text-2xl font-bold mb-1">Congratulations!</Text>
              <Text className="text-white/50 text-sm mb-6">Your daily reward</Text>

              <View className="w-32 h-32 rounded-full bg-yellow-500/20 border-2 border-yellow-500 items-center justify-center mb-6">
                <Text className="text-5xl">🎉</Text>
              </View>

              {reward && (
                <View className="w-full gap-2 mb-6">
                  <View className="bg-yellow-500/10 rounded-2xl p-4 flex-row items-center justify-between border border-yellow-500/20">
                    <Text className="text-yellow-400 font-bold">Coins</Text>
                    <Text className="text-yellow-400 text-xl font-black">+{reward.coins.toLocaleString()}</Text>
                  </View>
                  <View className="bg-cyan-500/10 rounded-2xl p-4 flex-row items-center justify-between border border-cyan-500/20">
                    <Text className="text-cyan-400 font-bold">Diamonds</Text>
                    <Text className="text-cyan-400 text-xl font-black">+{reward.diamonds}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity onPress={onClose} className="bg-slate-800 rounded-2xl py-4 px-12 items-center w-full">
                <Text className="text-white font-bold text-lg">Collect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
