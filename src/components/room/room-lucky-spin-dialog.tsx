import React, { useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Alert } from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, increment, writeBatch } from '@/firebase/firestore-compat';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '../../firebase/provider';

const REWARDS = [
  { label: 'x1', value: 1, color: '#64748b' },
  { label: 'x2', value: 2, color: '#22c55e' },
  { label: 'x5', value: 5, color: '#3b82f6' },
  { label: 'x10', value: 10, color: '#8b5cf6' },
  { label: 'x20', value: 20, color: '#f59e0b' },
  { label: 'x50', value: 50, color: '#ef4444' },
  { label: 'x3', value: 3, color: '#06b6d4' },
  { label: 'x25', value: 25, color: '#ec4899' },
];

const SPIN_COST = 100;
const SEGMENT = 360 / REWARDS.length;

interface RoomLuckySpinDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

export function RoomLuckySpinDialog({ visible, onClose, roomId }: RoomLuckySpinDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const winGlow = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState<typeof REWARDS[0] | null>(null);
  const [winIdx, setWinIdx] = React.useState<number | null>(null);
  const [lastNetChange, setLastNetChange] = React.useState(0);

  const userRef = useMemoFirebase(
    () => (!firestore || !user?.uid ? null : doc(firestore, 'users', user.uid, 'profile', user.uid)),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userRef);
  const coins = profile?.wallet?.coins || 0;
  const canAfford = coins >= SPIN_COST;

  useEffect(() => {
    if (result && winIdx !== null) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(winGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(winGlow, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      const t = setTimeout(() => winGlow.setValue(0), 2500);
      return () => clearTimeout(t);
    }
  }, [result, winIdx]);

  const handleSpin = async () => {
    if (!firestore || !user?.uid || spinning) return;

    if (!canAfford) {
      Alert.alert('Insufficient Coins', `You need ${SPIN_COST} coins to spin. You have ${coins.toLocaleString()}.`);
      return;
    }

    setSpinning(true);
    setResult(null);
    setWinIdx(null);

    const selectedIdx = Math.floor(Math.random() * REWARDS.length);
    const win = REWARDS[selectedIdx];
    const extraSpins = 3 + Math.floor(Math.random() * 5);
    const targetDeg = 360 * extraSpins + selectedIdx * SEGMENT + SEGMENT / 2;

    Animated.timing(spinAnim, {
      toValue: targetDeg,
      duration: 3000,
      useNativeDriver: true,
    }).start(async () => {
      try {
        const batch = writeBatch(firestore);
        const netChange = win.value - SPIN_COST;
        batch.update(doc(firestore, 'users', user.uid), { 'wallet.coins': increment(netChange) });
        batch.update(doc(firestore, 'users', user.uid, 'profile', user.uid), { 'wallet.coins': increment(netChange) });
        await batch.commit();
        setWinIdx(selectedIdx);
        setLastNetChange(netChange);
        setResult(win);
      } catch (e) {
        Alert.alert('Error', 'Spin failed');
      }
      setSpinning(false);
    });
  };

  const rotate = spinAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#1e293b', borderRadius: 32, width: '100%', padding: 24, alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 10 }}>
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>Lucky Spin</Text>
          <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>x1 - x50 Multiplier</Text>
          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '600', marginBottom: 16 }}>
            Balance: {coins.toLocaleString()} coins
          </Text>

          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: '#0f172a',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                transform: [{ rotate }],
                width: '100%',
                height: '100%',
                position: 'absolute',
              }}
            >
              {REWARDS.map((r, i) => {
                const angle = i * SEGMENT;
                const isWinning = i === winIdx;
                return (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      transform: [{ rotate: `${angle}deg` }],
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 12,
                        backgroundColor: r.color + '40',
                        borderWidth: isWinning ? 2 : 0,
                        borderColor: isWinning ? '#fbbf24' : 'transparent',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: '900' }}>{r.label}</Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>

            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#7c3aed',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderWidth: 2,
                borderColor: 'white',
              }}
            >
              <Sparkles size={18} color="white" />
            </View>
          </View>

          {result && (
            <Animated.Text
              style={{
                color: '#fbbf24',
                fontSize: 20,
                fontWeight: '900',
                marginBottom: 12,
                opacity: winGlow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
                textShadowColor: 'rgba(251,191,36,0.5)',
                textShadowRadius: 10,
              }}
            >
              You won x{result.value}! {lastNetChange >= 0 ? `+${lastNetChange}` : lastNetChange} coins
            </Animated.Text>
          )}

          <TouchableOpacity onPress={handleSpin} disabled={spinning || !canAfford} activeOpacity={0.8}>
            <LinearGradient
              colors={!canAfford ? ['#475569', '#334155'] : ['#f59e0b', '#d97706']}
              style={{
                borderRadius: 20,
                paddingHorizontal: 40,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: spinning ? 0.6 : 1,
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                {spinning ? 'Spinning...' : !canAfford ? 'Not Enough Coins' : `Spin (${SPIN_COST} coins)`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
