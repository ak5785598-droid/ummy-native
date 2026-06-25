import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Alert } from 'react-native';
import { X, Gift } from 'lucide-react-native';
import { doc, increment, serverTimestamp } from '@/firebase/firestore-compat';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '../../firebase/provider';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';

const LOOT_POOL = [
  { label: '100 Coins', value: 100, emoji: '🪙' },
  { label: '250 Coins', value: 250, emoji: '💰' },
  { label: '500 Coins', value: 500, emoji: '💎' },
  { label: '1000 Coins', value: 1000, emoji: '👑' },
  { label: '2500 Coins', value: 2500, emoji: '🌟' },
];

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface RoomGoldenChestDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

export function RoomGoldenChestDialog({ visible, onClose, roomId }: RoomGoldenChestDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [state, setState] = React.useState<'closed' | 'shaking' | 'open' | 'cooldown'>('closed');
  const [reward, setReward] = React.useState<typeof LOOT_POOL[0] | null>(null);
  const [cooldownLeft, setCooldownLeft] = React.useState(0);

  const userRef = useMemoFirebase(
    () => (!firestore || !user?.uid ? null : doc(firestore, 'users', user.uid)),
    [firestore, user?.uid]
  );
  const { data: userData } = useDoc<any>(userRef);

  useEffect(() => {
    if (!visible || !userData) return;
    const lastOpen = userData?.lastRoomChestOpen?.toDate?.()?.getTime?.() || 0;
    const now = Date.now();
    const diff = now - lastOpen;
    if (diff < COOLDOWN_MS) {
      setState('cooldown');
      setCooldownLeft(Math.ceil((COOLDOWN_MS - diff) / 1000));
    } else {
      setState('closed');
      setReward(null);
    }
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
  }, [visible, userData]);

  useEffect(() => {
    if (state !== 'cooldown') return;
    const interval = setInterval(() => {
      setCooldownLeft((t) => {
        if (t <= 1) {
          setState('closed');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state === 'closed' && visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0.3);
    }
  }, [state, visible]);

  const handleOpen = async () => {
    if (!firestore || !user?.uid || state !== 'closed') return;
    setState('shaking');

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(async () => {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.6, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      const win = LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)];
      setReward(win);
      setState('open');

      try {
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          'wallet.coins': increment(win.value),
          lastRoomChestOpen: serverTimestamp(),
        });
        updateDocumentNonBlocking(
          doc(firestore, 'users', user.uid, 'profile', user.uid),
          { 'wallet.coins': increment(win.value) }
        );
      } catch (e) {
        Alert.alert('Error', 'Failed to open chest');
      }
    });
  };

  const cdHours = Math.floor(cooldownLeft / 3600);
  const cdMins = Math.floor((cooldownLeft % 3600) / 60);
  const cdSecs = cooldownLeft % 60;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#1e293b', borderRadius: 32, width: '100%', padding: 32, alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 10 }}>
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Golden Chest</Text>

          <Animated.View
            style={{
              width: 100,
              height: 100,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              transform: [{ translateX: shakeAnim }],
              backgroundColor: state === 'open' ? 'rgba(251,191,36,0.3)' : 'rgba(234,179,8,0.15)',
              borderWidth: 2,
              borderColor: state === 'open' ? '#fbbf24' : '#d97706',
              shadowColor: '#fbbf24',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: glowAnim,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {state === 'open' && reward ? (
              <Text style={{ fontSize: 48 }}>{reward.emoji}</Text>
            ) : (
              <Gift size={48} color={state === 'shaking' ? '#fbbf24' : '#d97706'} />
            )}
          </Animated.View>

          {state === 'open' && reward && (
            <View style={{ marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ color: '#fbbf24', fontSize: 28, fontWeight: '900' }}>+{reward.value}</Text>
              <Text style={{ color: '#fcd34d', fontSize: 12, fontWeight: 'bold' }}>{reward.label}</Text>
            </View>
          )}

          {state === 'cooldown' && (
            <View style={{ marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Opens in</Text>
              <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '900' }}>
                {cdHours > 0 ? `${cdHours}h ` : ''}{cdMins}m {cdSecs}s
              </Text>
            </View>
          )}

          {state === 'closed' && (
            <TouchableOpacity
              onPress={handleOpen}
              style={{
                backgroundColor: '#d97706',
                borderRadius: 20,
                paddingHorizontal: 40,
                paddingVertical: 14,
                width: '100%',
                alignItems: 'center',
                shadowColor: '#fbbf24',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Open Chest</Text>
            </TouchableOpacity>
          )}

          {state === 'shaking' && (
            <View style={{ backgroundColor: 'rgba(217,119,6,0.5)', borderRadius: 20, paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', fontSize: 15 }}>Opening...</Text>
            </View>
          )}

          {state === 'cooldown' && (
            <View style={{ backgroundColor: 'rgba(148,163,184,0.15)', borderRadius: 20, paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontWeight: 'bold', fontSize: 15 }}>On Cooldown</Text>
            </View>
          )}

          {state === 'open' && (
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Claim & Close</Text>
            </TouchableOpacity>
          )}

          {state === 'cooldown' && (
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12, padding: 8 }}>
              <Text style={{ color: '#64748b', fontSize: 12 }}>Close</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            opacity: flashAnim,
            pointerEvents: 'none',
          }}
        />
      </View>
    </Modal>
  );
}
