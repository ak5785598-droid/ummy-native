import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { doc, increment } from '@/firebase/firestore-compat';
import { useFirestore, useUser } from '../../firebase/provider';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RAIN_DURATION = 30;
const COIN_PER_TAP = 10;

interface LuckyRainOverlayProps {
  visible: boolean;
  roomId?: string;
  coinAmount?: number;
  onComplete?: () => void;
}

interface RainCoin {
  id: number;
  startX: number;
  side: 'left' | 'right';
  delay: number;
  yPos: Animated.Value;
  xPos: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  tapped: boolean;
}

interface PopText {
  id: number;
  x: number;
  y: number;
  anim: Animated.Value;
}

export function LuckyRainOverlay({ visible, roomId, coinAmount = 0, onComplete }: LuckyRainOverlayProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [timeLeft, setTimeLeft] = useState(RAIN_DURATION);
  const [collected, setCollected] = useState(0);
  const [coins, setCoins] = useState<RainCoin[]>([]);
  const [pops, setPops] = useState<PopText[]>([]);
  const popIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!visible) {
      setTimeLeft(RAIN_DURATION);
      setCollected(0);
      setCoins([]);
      setPops([]);
      return;
    }

    const generated: RainCoin[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      startX: i % 2 === 0 ? 40 + Math.random() * 60 : SCREEN_WIDTH - 80 - Math.random() * 60,
      side: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right',
      delay: i * 200,
      yPos: new Animated.Value(-50),
      xPos: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
      tapped: false,
    }));
    setCoins(generated);

    generated.forEach((coin) => {
      const driftX = coin.side === 'left' ? 30 + Math.random() * 40 : -(30 + Math.random() * 40);
      Animated.sequence([
        Animated.delay(coin.delay),
        Animated.parallel([
          Animated.timing(coin.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(coin.yPos, { toValue: 450, duration: 2500, useNativeDriver: true }),
          Animated.timing(coin.xPos, { toValue: driftX, duration: 2500, useNativeDriver: true }),
          Animated.loop(
            Animated.timing(coin.rotate, { toValue: 1, duration: 400, useNativeDriver: true }),
            { iterations: 6 }
          ),
        ]),
        Animated.timing(coin.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [visible]);

  useEffect(() => {
    if (visible && timeLeft === 0) {
      const t = setTimeout(() => onComplete?.(), 1500);
      return () => clearTimeout(t);
    }
  }, [timeLeft, visible, onComplete]);

  const handleTapCoin = useCallback(
    (coin: RainCoin) => {
      if (coin.tapped) return;
      coin.tapped = true;

      Animated.parallel([
        Animated.timing(coin.yPos, { toValue: -50, duration: 400, useNativeDriver: true }),
        Animated.timing(coin.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      setCollected((c) => c + COIN_PER_TAP);

      if (firestore && user?.uid) {
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          'wallet.coins': increment(COIN_PER_TAP),
        });
        updateDocumentNonBlocking(
          doc(firestore, 'users', user.uid, 'profile', user.uid),
          { 'wallet.coins': increment(COIN_PER_TAP) }
        );
      }

      const pid = popIdRef.current++;
      const anim = new Animated.Value(1);
      setPops((prev) => [...prev, { id: pid, x: coin.startX, y: 200, anim }]);
      Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        if (mountedRef.current) setPops((prev) => prev.filter((p) => p.id !== pid));
      });
    },
    [firestore, user]
  );

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        pointerEvents: 'box-none',
        zIndex: 50,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(251,191,36,0.2)',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: 'rgba(251,191,36,0.4)',
          }}
        >
          <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '900', textAlign: 'center' }}>
            🌧️ TAP THE COINS!
          </Text>
          <Text style={{ color: '#fcd34d', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 }}>
            +{COIN_PER_TAP} per coin • {timeLeft}s left
          </Text>
        </View>
      </View>

      {coins.map((coin) => (
        <TouchableOpacity
          key={coin.id}
          activeOpacity={1}
          onPress={() => handleTapCoin(coin)}
          style={{
            position: 'absolute',
            left: coin.startX,
            top: 0,
            pointerEvents: coin.tapped ? 'none' : 'auto',
            zIndex: 10,
          }}
        >
          <Animated.View
            style={{
              transform: [
                { translateY: coin.yPos },
                { translateX: coin.xPos },
                {
                  rotate: coin.rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: coin.opacity,
            }}
          >
            <Text style={{ fontSize: 28 }}>🪙</Text>
          </Animated.View>
        </TouchableOpacity>
      ))}

      {pops.map((p) => (
        <Animated.View
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            opacity: p.anim,
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
              { scale: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.4, 1] }) },
            ],
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 }}>
            +{COIN_PER_TAP}
          </Text>
        </Animated.View>
      ))}

      <View
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(251,191,36,0.15)',
            borderRadius: 16,
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: 'rgba(251,191,36,0.3)',
          }}
        >
          <Text style={{ color: '#fbbf24', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
            +{collected} Lucky Coins!
          </Text>
          {timeLeft === 0 && (
            <Text style={{ color: '#fcd34d', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
              Rain finished!
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
