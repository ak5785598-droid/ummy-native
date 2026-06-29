import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, PanResponder, Animated as RNAnimated } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate } from 'react-native-reanimated';
import { X, Plus, Volume2, VolumeX, ChevronUp } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useCarromEngine } from '../../hooks/use-carrom-engine';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Path, G, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CarromGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string }) => void;
  isMuted?: boolean;
  isAdmin?: boolean;
}

export function CarromGame({ onClose, roomId, onRoundEnd, isMuted: isMutedProp, isAdmin }: CarromGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const {
    gameState, initializeGame, selectMode, joinArena, startMatch, updateStriker, strike,
  } = useCarromEngine(roomId || 'lobby', currentUser?.uid || null);

  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);
  const [isStriking, setIsStriking] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const powerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    const interval = setInterval(() => {
      const now = Date.now();
      const turnStart = gameState.turnStartTime ? (gameState.turnStartTime.seconds ? gameState.turnStartTime.seconds * 1000 : new Date(gameState.turnStartTime).getTime()) : now;
      const elapsed = Math.floor((now - turnStart) / 1000);
      setTimeLeft(Math.max(0, 30 - elapsed));
    }, 500);

    return () => clearInterval(interval);
  }, [gameState?.turn, gameState?.turnStartTime, gameState?.status]);

  useEffect(() => { initializeGame(); }, [initializeGame]);

  const handleSelectMode = async (mode: 'freestyle' | 'professional', isBot: boolean = false) => {
    await selectMode(mode, 0, isBot, userProfile);
  };

  // Carrom Bot automated moves
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || gameState.turn !== 'bot') return;

    const isHost = gameState.players[0]?.uid === currentUser?.uid;
    if (!isHost) return;

    let innerTimer1: ReturnType<typeof setTimeout>;
    let innerTimer2: ReturnType<typeof setTimeout>;

    const timer = setTimeout(async () => {
      const randomPos = Math.floor(Math.random() * 40) + 30; // 30-70
      const randomAngle = Math.floor(Math.random() * 40) - 20; // -20 to 20
      const randomPower = Math.floor(Math.random() * 50) + 40; // 40-90%

      await updateStriker(randomPos);
      
      innerTimer1 = setTimeout(async () => {
        setIsStriking(true);
        await strike(randomAngle, randomPower / 10);
        innerTimer2 = setTimeout(() => {
          setIsStriking(false);
          setPower(0);
        }, 2000);
      }, 1000);
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (innerTimer1) clearTimeout(innerTimer1);
      if (innerTimer2) clearTimeout(innerTimer2);
    };
  }, [gameState?.turn, gameState?.status, strike, updateStriker, currentUser?.uid]);

  // Lobby countdown timer when players >= 2
  useEffect(() => {
    if (!gameState || gameState.status !== 'lobby') {
      setCountdown(30);
      return;
    }

    const numPlayers = gameState.players ? gameState.players.length : 0;
    if (numPlayers < 2) {
      setCountdown(30);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const isHost = gameState.players[0]?.uid === currentUser?.uid;
          if (isHost) {
            startMatch();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.players?.length, currentUser?.uid, startMatch]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => { if (powerIntervalRef.current) clearInterval(powerIntervalRef.current); };
  }, []);

  const startPower = useCallback(() => {
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    let p = 0;
    powerIntervalRef.current = setInterval(() => {
      p = Math.min(100, p + 2);
      setPower(p);
      if (p >= 100) { clearInterval(powerIntervalRef.current!); powerIntervalRef.current = null; }
    }, 25);
  }, []);

  const stopPower = useCallback(() => {
    if (powerIntervalRef.current) { clearInterval(powerIntervalRef.current); powerIntervalRef.current = null; }
  }, []);

  if (!gameState || gameState.status === 'loading') return <LoadingScreen />;
  if (gameState.status === 'mode_select') return <ModeSelect onSelect={handleSelectMode} />;
  if (gameState.status === 'lobby') {
    return <LobbyScreen gameState={gameState} currentUser={currentUser} userProfile={userProfile}
      onJoin={() => joinArena(userProfile)} onStart={startMatch} onClose={onClose} countdown={countdown} isAdmin={isAdmin} />;
  }
  if (gameState.status === 'ended') {
    const won = gameState.winner === currentUser?.uid;
    return (
      <View style={{ flex: 1, backgroundColor: '#004D40', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 72, marginBottom: 16 }}>{won ? '🏆' : '😢'}</Text>
        <Text style={{ color: '#fbbf24', fontSize: 32, fontWeight: '900', marginBottom: 8 }}>
          {won ? 'YOU WIN!' : 'GAME OVER'}
        </Text>
        {gameState.prize ? (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Prize: 🪙 {gameState.prize}</Text>
        ) : null}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 32, backgroundColor: '#fbbf24', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 99, shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
          <Text style={{ color: '#004D40', fontWeight: '900', fontSize: 16 }}>BACK TO ROOM</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── PLAYING ──
  const isMyTurn = gameState.turn === currentUser?.uid;

  return (
    <View style={{ flex: 1, backgroundColor: '#004D40', borderRadius: 24, overflow: 'hidden' }}>
      {/* Ambient Glow */}
      <View style={{ position: 'absolute', top: '15%', left: '10%', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(0,229,255,0.04)' }} pointerEvents="none" />
      <View style={{ position: 'absolute', bottom: '20%', right: '10%', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(59,130,246,0.04)' }} pointerEvents="none" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, zIndex: 40, marginLeft: -40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.5 }}>Carrom Live</Text>
        </View>
      </View>

      {/* Board */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <CarromBoard
          gameState={gameState} isMyTurn={isMyTurn} angle={angle} setAngle={setAngle}
          isStriking={isStriking} updateStriker={updateStriker} boardSize={Math.min(SCREEN_WIDTH - 80, SCREEN_HEIGHT * 0.36)}
        />
      </View>

      {/* Controls */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 32, zIndex: 40 }}>
        {isMyTurn ? (
          <View>
            {/* Power Bar */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 6 }}>
                Power: {power}%
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPressIn={startPower}
                onPressOut={stopPower}
                style={{ height: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}
              >
                <View style={{ height: '100%', width: `${power}%`, borderRadius: 99, overflow: 'hidden' }}>
                  {/* Gradient fill via overlapping views */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: power < 40 ? '#22c55e' : power < 70 ? '#eab308' : '#ef4444' }} />
                  {/* Glow */}
                  <View style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 3, backgroundColor: power < 40 ? 'rgba(34,197,94,0.4)' : power < 70 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.4)' }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Controls Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Players */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {gameState.players.slice(0, 2).map((p: any, i: number) => {
                  const isActive = gameState.turn === p.uid;
                  return (
                    <View key={i} style={{ alignItems: 'center', opacity: isActive ? 1 : 0.4 }}>
                      <View style={[styles.avatarCircle, {
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: isActive ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                        borderWidth: 2, borderColor: isActive ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                      }]}>
                        {p.avatarUrl ? (
                          <Image cachePolicy="memory-disk" source={{ uri: toCDN(p.avatarUrl) }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
                        ) : (
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{p.username[0]}</Text>
                        )}
                      </View>
                      <Text style={{ color: 'white', fontSize: 8, fontWeight: '700', marginTop: 2 }}>
                        {p.username}{isActive ? ` (${timeLeft}s)` : ''}
                      </Text>
                      <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '900' }}>{p.score}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Strike Button */}
              <TouchableOpacity
                onPress={() => {
                  setIsStriking(true);
                  strike(angle, power / 10);
                  setTimeout(() => { setIsStriking(false); setPower(0); }, 2000);
                }}
                disabled={isStriking}
                style={{
                  backgroundColor: '#00e5ff', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 99,
                  shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: isStriking ? 0.2 : 0.6, shadowRadius: isStriking ? 8 : 24,
                  elevation: isStriking ? 4 : 12, opacity: isStriking ? 0.5 : 1,
                  transform: [{ scale: isStriking ? 0.95 : 1 }],
                }}
              >
                <Text style={{ color: '#004D40', fontWeight: '900', fontSize: 16, letterSpacing: 1 }}>
                  {isStriking ? '...' : 'STRIKE'}
                </Text>
              </TouchableOpacity>

              {/* Score indicators */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <View style={styles.scoreBadge}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }} />
                  <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>10</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>50</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
              Enemy is Aiming
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {gameState.players.map((p: any, i: number) => {
                const isActive = gameState.turn === p.uid;
                return (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <View style={[styles.avatarCircle, {
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: isActive ? '#ef4444' : 'rgba(255,255,255,0.1)',
                      borderWidth: 2, borderColor: isActive ? '#ef4444' : 'rgba(255,255,255,0.1)',
                    }]}>
                      {p.avatarUrl ? (
                        <Image cachePolicy="memory-disk" source={{ uri: toCDN(p.avatarUrl) }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                      ) : (
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{p.username[0]}</Text>
                      )}
                    </View>
                    {isActive && (
                      <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>!</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Loading Screen ──
function LoadingScreen() {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    progress.value = withTiming(100, { duration: 5000 });
    scale.value = withSpring(1, { duration: 800 });
  }, []);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` as any }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: interpolate(scale.value, [0.8, 1], [0, 1], Extrapolate.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: '#004D40', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../../../assets/images/games/carrom.jpg')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
      />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 77, 64, 0.75)' }} />

      <Animated.View style={[{ marginBottom: 24, zIndex: 10 }, logoStyle]}>
        <Image
          source={require('../../../assets/images/games/carrom.jpg')}
          style={{ width: 140, height: 140, borderRadius: 24, borderWidth: 4, borderColor: '#fbbf24' }}
          contentFit="cover"
        />
      </Animated.View>
      
      <Text style={{ color: 'white', fontSize: 32, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5, zIndex: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 6 }}>
        CARROM
      </Text>

      <View style={{ width: '100%', maxWidth: 220, zIndex: 10 }}>
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
          <Animated.View style={[{ height: '100%', borderRadius: 99, overflow: 'hidden' }, barStyle]}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: '100%' }}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ── Mode Select ──
function ModeSelect({ onSelect }: { onSelect: (mode: 'freestyle' | 'professional', isBot?: boolean) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#00897B', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <View style={{ width: '100%', maxWidth: 220, backgroundColor: 'rgba(0,105,92,0.8)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20 }}>Select Mode</Text>
        <TouchableOpacity onPress={() => onSelect('freestyle')} style={{ width: '100%', backgroundColor: '#FFB300', paddingVertical: 10, borderRadius: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F57F17', marginBottom: 12 }} activeOpacity={0.8}>
          <Text style={{ color: 'black', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>Freestyle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSelect('freestyle', true)} style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 10, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFB300' }} activeOpacity={0.8}>
          <Text style={{ color: '#FFB300', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>🤖 Play with Robot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Lobby Screen ──
function LobbyScreen({ gameState, currentUser, userProfile, onJoin, onStart, onClose, countdown, isAdmin }: {
  gameState: any; currentUser: any; userProfile: any; onJoin: () => void; onStart: () => void; onClose: () => void; countdown: number; isAdmin?: boolean;
}) {
  const canStart = gameState.players.length >= 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#006064', alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 48 }}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}><X size={20} color="white" /></TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Carrom Arena</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ width: '100%', maxWidth: 320, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 48, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 32 }}>
          {!canStart ? 'Waiting for players to join...' : `Game starting automatically in ${countdown}s`}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 48 }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const p = gameState.players[i];
            return (
              <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                {p ? (
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#4D2C19', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fbbf24', overflow: 'hidden', shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 }}>
                      {p.avatarUrl ? (
                        <Image cachePolicy="memory-disk" source={{ uri: toCDN(p.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 20 }}>{p.username[0]}</Text>
                      )}
                    </View>
                    <View style={{ backgroundColor: '#00E676', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, marginTop: -8 }}>
                      <Text style={{ color: 'white', fontSize: 6, fontWeight: '900' }}>READY</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={onJoin} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={24} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                )}
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700', textTransform: 'uppercase' }}>{p?.username || 'Open'}</Text>
              </View>
            );
          })}
        </View>

        {canStart && (
          isAdmin ? (
            <TouchableOpacity onPress={onStart} style={{ width: '100%', paddingVertical: 20, borderRadius: 24, alignItems: 'center', backgroundColor: '#FF6D00', borderBottomWidth: 4, borderBottomColor: '#E65100', elevation: 4 }} activeOpacity={0.8}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Start Match</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: '100%', paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' }}>Waiting for Admin to start...</Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

// ── Carrom Board ──
function CarromBoard({ gameState, isMyTurn, angle, setAngle, isStriking, updateStriker, boardSize }: {
  gameState: any; isMyTurn: boolean; angle: number; setAngle: (a: number) => void;
  isStriking: boolean; updateStriker: (pos: number) => void; boardSize: number;
}) {
  const aimRef = useRef({ isMyTurn, isStriking });
  aimRef.current = { isMyTurn, isStriking };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (!aimRef.current.isMyTurn || aimRef.current.isStriking) return;
        const newAngle = Math.atan2(gestureState.dx, -gestureState.dy) * 180 / Math.PI;
        setAngle(Math.max(-45, Math.min(45, newAngle)));
      },
    })
  ).current;

  const [localStrikerPos, setLocalStrikerPos] = useState(gameState.strikerPos || 50);
  const localStrikerPosRef = useRef(gameState.strikerPos || 50);
  localStrikerPosRef.current = localStrikerPos;

  useEffect(() => {
    setLocalStrikerPos(gameState.strikerPos || 50);
  }, [gameState.strikerPos]);

  const trajectory = useMemo(() => {
    if (!isMyTurn || isStriking) return null;
    
    const x0 = localStrikerPos;
    const y0 = 85;
    const rad = angle * Math.PI / 180;
    const vx = Math.sin(rad);
    const vy = -Math.cos(rad);

    let closestT = Infinity;
    let hitPiece: any = null;

    const STRIKER_R = 5.5;
    const PIECE_R = 3.5;
    const COLLISION_DIST = STRIKER_R + PIECE_R;

    gameState.pieces.forEach((p: any) => {
      if (p.id === 'striker' || p.isPocketed) return;

      const dx = p.position.x - x0;
      const dy = p.position.y - y0;

      const projection = dx * vx + dy * vy;
      if (projection < 0) return;

      const distSq = (dx * dx + dy * dy) - projection * projection;
      const limitSq = COLLISION_DIST * COLLISION_DIST;

      if (distSq <= limitSq) {
        const halfCord = Math.sqrt(limitSq - distSq);
        const t = projection - halfCord;
        if (t > 0 && t < closestT) {
          closestT = t;
          hitPiece = p;
        }
      }
    });

    let wallT = Infinity;
    let wallNormal = { x: 0, y: 0 };
    const minCoord = STRIKER_R;
    const maxCoord = 100 - STRIKER_R;

    if (vx > 0) {
      const t = (maxCoord - x0) / vx;
      if (t > 0 && t < wallT) { wallT = t; wallNormal = { x: -1, y: 0 }; }
    } else if (vx < 0) {
      const t = (minCoord - x0) / vx;
      if (t > 0 && t < wallT) { wallT = t; wallNormal = { x: 1, y: 0 }; }
    }

    if (vy > 0) {
      const t = (maxCoord - y0) / vy;
      if (t > 0 && t < wallT) { wallT = t; wallNormal = { x: 0, y: -1 }; }
    } else if (vy < 0) {
      const t = (minCoord - y0) / vy;
      if (t > 0 && t < wallT) { wallT = t; wallNormal = { x: 0, y: 1 }; }
    }

    const finalT = Math.min(closestT, wallT);
    const endX = x0 + (finalT === Infinity ? 50 : finalT) * vx;
    const endY = y0 + (finalT === Infinity ? 50 : finalT) * vy;

    let pieceDirection = null;
    let strikerBounceDir = null;

    if (closestT < wallT && hitPiece) {
      const dx = hitPiece.position.x - endX;
      const dy = hitPiece.position.y - endY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        pieceDirection = { x: dx / len, y: dy / len };
        const nx = dx / len;
        const ny = dy / len;
        const dot = vx * nx + vy * ny;
        strikerBounceDir = {
          x: vx - dot * nx,
          y: vy - dot * ny
        };
        const bLen = Math.sqrt(strikerBounceDir.x * strikerBounceDir.x + strikerBounceDir.y * strikerBounceDir.y);
        if (bLen > 0) {
          strikerBounceDir.x /= bLen;
          strikerBounceDir.y /= bLen;
        }
      }
    } else if (wallT < Infinity) {
      strikerBounceDir = {
        x: vx * (wallNormal.x !== 0 ? -1 : 1),
        y: vy * (wallNormal.y !== 0 ? -1 : 1)
      };
    }

    return {
      startX: x0,
      startY: y0,
      endX,
      endY,
      hitPiece,
      pieceDirection,
      strikerBounceDir
    };
  }, [localStrikerPos, angle, gameState.pieces, isMyTurn, isStriking]);

  const initialStrikerPos = useRef(50);
  const strikerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        initialStrikerPos.current = localStrikerPosRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!aimRef.current.isMyTurn || aimRef.current.isStriking) return;
        const deltaPercent = (gestureState.dx / innerSize) * 100;
        const newPos = initialStrikerPos.current + deltaPercent;
        const clampedPos = Math.max(22, Math.min(78, newPos));
        setLocalStrikerPos(clampedPos);
      },
      onPanResponderRelease: () => {
        if (!aimRef.current.isMyTurn || aimRef.current.isStriking) return;
        updateStriker(localStrikerPosRef.current);
      },
    })
  ).current;
  const frameW = 14;
  const innerSize = boardSize - frameW * 2;

  return (
    <View 
      style={{
        width: boardSize, height: boardSize, borderRadius: 24,
        borderWidth: frameW, borderColor: '#2b1b11', // Rich mahogany wood frame
        overflow: 'hidden', position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
      }}
    >
      {/* Invisible overlay for aiming gestures (siblings to avoid touch block) */}
      {isMyTurn && !isStriking && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
          }}
          {...panResponder.panHandlers}
        />
      )}
      {/* SVG Canvas for High-Fidelity Vector Board Markings */}
      <Svg width={innerSize} height={innerSize} viewBox="0 0 1000 1000" style={{ position: 'absolute', top: -2, left: -2 }}>
        <Defs>
          {/* Wood veneer surface gradient */}
          <RadialGradient id="woodSurface" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#F9DFBE" />
            <Stop offset="70%" stopColor="#F0CE9E" />
            <Stop offset="100%" stopColor="#E0B784" />
          </RadialGradient>
        </Defs>

        {/* Plywood Background */}
        <Circle cx="500" cy="500" r="700" fill="url(#woodSurface)" />

        {/* Subtle Wood grain lines */}
        {[150, 300, 450, 600, 750, 900].map((y, i) => (
          <Path key={`grain-h-${i}`} d={`M 0,${y} C 300,${y - 10} 700,${y + 15} 1000,${y}`} fill="none" stroke="rgba(102,68,34,0.05)" strokeWidth="1.5" />
        ))}
        {[150, 300, 450, 600, 750, 900].map((x, i) => (
          <Path key={`grain-v-${i}`} d={`M ${x},0 C ${x - 15},300 ${x + 10},700 ${x},1000`} fill="none" stroke="rgba(102,68,34,0.04)" strokeWidth="1" />
        ))}

        {/* Double Baselines (Broad Shaded Tracks for striker placement) */}
        {/* Bottom Track */}
        <Rect x="220" y="815" width="560" height="70" fill="rgba(43,27,17,0.06)" rx="4" />
        <Line x1="220" y1="815" x2="780" y2="815" stroke="#2d2319" strokeWidth="3" />
        <Line x1="220" y1="885" x2="780" y2="885" stroke="#2d2319" strokeWidth="4" />

        {/* Top Track */}
        <Rect x="220" y="115" width="560" height="70" fill="rgba(43,27,17,0.06)" rx="4" />
        <Line x1="220" y1="185" x2="780" y2="185" stroke="#2d2319" strokeWidth="3" />
        <Line x1="220" y1="115" x2="780" y2="115" stroke="#2d2319" strokeWidth="4" />

        {/* Left Track */}
        <Rect x="115" y="220" width="70" height="560" fill="rgba(43,27,17,0.06)" rx="4" />
        <Line x1="185" y1="220" x2="185" y2="780" stroke="#2d2319" strokeWidth="3" />
        <Line x1="115" y1="220" x2="115" y2="780" stroke="#2d2319" strokeWidth="4" />

        {/* Right Track */}
        <Rect x="815" y="220" width="70" height="560" fill="rgba(43,27,17,0.06)" rx="4" />
        <Line x1="815" y1="220" x2="815" y2="780" stroke="#2d2319" strokeWidth="3" />
        <Line x1="885" y1="220" x2="885" y2="780" stroke="#2d2319" strokeWidth="4" />

        {/* Base Strike Circles (Red filled, black outlines, sized to fit the track width) */}
        {/* Bottom Baseline circles */}
        <Circle cx="200" cy="850" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        <Circle cx="800" cy="850" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        {/* Top Baseline circles */}
        <Circle cx="200" cy="150" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        <Circle cx="800" cy="150" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        {/* Left Baseline circles */}
        <Circle cx="150" cy="200" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        <Circle cx="150" cy="800" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        {/* Right Baseline circles */}
        <Circle cx="850" cy="200" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />
        <Circle cx="850" cy="800" r="35" fill="#b91c1c" stroke="#2d2319" strokeWidth="2.5" />

        {/* Corner Loop Arcs with Arrowheads (connecting outer lines) */}
        {/* Top-Left */}
        <Path d="M 200,115 A 62,62 0 1,0 115,200" fill="none" stroke="#2d2319" strokeWidth="2.5" />
        <Path d="M 200,115 L 208,111 L 208,119 Z" fill="#2d2319" />
        <Path d="M 115,200 L 111,208 L 119,208 Z" fill="#2d2319" />

        {/* Top-Right */}
        <Path d="M 800,115 A 62,62 0 1,1 885,200" fill="none" stroke="#2d2319" strokeWidth="2.5" />
        <Path d="M 800,115 L 792,111 L 792,119 Z" fill="#2d2319" />
        <Path d="M 885,200 L 881,208 L 889,208 Z" fill="#2d2319" />

        {/* Bottom-Left */}
        <Path d="M 200,885 A 62,62 0 1,1 115,800" fill="none" stroke="#2d2319" strokeWidth="2.5" />
        <Path d="M 200,885 L 208,881 L 208,889 Z" fill="#2d2319" />
        <Path d="M 115,800 L 111,792 L 119,792 Z" fill="#2d2319" />

        {/* Bottom-Right */}
        <Path d="M 800,885 A 62,62 0 1,0 885,800" fill="none" stroke="#2d2319" strokeWidth="2.5" />
        <Path d="M 800,885 L 792,881 L 792,889 Z" fill="#2d2319" />
        <Path d="M 885,800 L 881,792 L 889,792 Z" fill="#2d2319" />

        {/* Diagonal Corner-to-Center Lines */}
        <Line x1="110" y1="110" x2="330" y2="330" stroke="#2d2319" strokeWidth="1.5" />
        <Line x1="890" y1="110" x2="670" y2="330" stroke="#2d2319" strokeWidth="1.5" />
        <Line x1="110" y1="890" x2="330" y2="670" stroke="#2d2319" strokeWidth="1.5" />
        <Line x1="890" y1="890" x2="670" y2="670" stroke="#2d2319" strokeWidth="1.5" />

        {/* Center detailed circle ornament (8-spoke wheel) */}
        <Circle cx="500" cy="500" r="160" fill="none" stroke="#2d2319" strokeWidth="3" />
        <Circle cx="500" cy="500" r="148" fill="none" stroke="#2d2319" strokeWidth="1" strokeDasharray="6,4" />
        <Circle cx="500" cy="500" r="136" fill="none" stroke="#2d2319" strokeWidth="1" />
        <Circle cx="500" cy="500" r="100" fill="none" stroke="#2d2319" strokeWidth="2" />
        <Circle cx="500" cy="500" r="80" fill="none" stroke="#2d2319" strokeWidth="1" />
        <Circle cx="500" cy="500" r="30" fill="none" stroke="#2d2319" strokeWidth="1.5" />
        
        {/* Center red point */}
        <Circle cx="500" cy="500" r="14" fill="#b91c1c" stroke="#2d2319" strokeWidth="1.5" />

        {/* 8 Radiating Arrows from Center Wheel */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const xStart = 500 + Math.cos(rad) * 30;
          const yStart = 500 + Math.sin(rad) * 30;
          const xEnd = 500 + Math.cos(rad) * 136;
          const yEnd = 500 + Math.sin(rad) * 136;
          
          // Arrowhead offsets
          const arrowLength = 12;
          const arrowWidth = 5;
          const xHeadL = xEnd - arrowLength * Math.cos(rad) + arrowWidth * Math.sin(rad);
          const yHeadL = yEnd - arrowLength * Math.sin(rad) - arrowWidth * Math.cos(rad);
          const xHeadR = xEnd - arrowLength * Math.cos(rad) - arrowWidth * Math.sin(rad);
          const yHeadR = yEnd - arrowLength * Math.sin(rad) + arrowWidth * Math.cos(rad);

          return (
            <G key={`spoke-${i}`}>
              <Line x1={xStart} y1={yStart} x2={xEnd} y2={yEnd} stroke="#2d2319" strokeWidth="1.5" />
              <Path d={`M ${xEnd},${yEnd} L ${xHeadL},${yHeadL} L ${xHeadR},${yHeadR} Z`} fill="#2d2319" />
            </G>
          );
        })}

        {/* Aiming Trajectory Projection */}
        {trajectory && (
          <G>
            {/* Primary line from striker to point of impact */}
            <Line
              x1={trajectory.startX * 10}
              y1={trajectory.startY * 10}
              x2={trajectory.endX * 10}
              y2={trajectory.endY * 10}
              stroke="#ef4444"
              strokeWidth="5"
              strokeDasharray="10,8"
              opacity="0.9"
            />
            {/* Ghost striker circle at impact point */}
            <Circle
              cx={trajectory.endX * 10}
              cy={trajectory.endY * 10}
              r="55"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3.5"
              strokeDasharray="4,4"
              opacity="0.8"
            />
            <Circle
              cx={trajectory.endX * 10}
              cy={trajectory.endY * 10}
              r="10"
              fill="#ef4444"
              opacity="0.9"
            />

            {/* Target piece prediction line */}
            {trajectory.hitPiece && trajectory.pieceDirection && (
              <G>
                <Line
                  x1={trajectory.hitPiece.position.x * 10}
                  y1={trajectory.hitPiece.position.y * 10}
                  x2={(trajectory.hitPiece.position.x + trajectory.pieceDirection.x * 20) * 10}
                  y2={(trajectory.hitPiece.position.y + trajectory.pieceDirection.y * 20) * 10}
                  stroke="#22c55e"
                  strokeWidth="4.5"
                  strokeDasharray="6,6"
                  opacity="0.95"
                />
                {/* Arrowhead or circle dot on target trajectory */}
                <Circle
                  cx={(trajectory.hitPiece.position.x + trajectory.pieceDirection.x * 20) * 10}
                  cy={(trajectory.hitPiece.position.y + trajectory.pieceDirection.y * 20) * 10}
                  r="6.5"
                  fill="#22c55e"
                />
              </G>
            )}

            {/* Striker bounce/deflection line */}
            {trajectory.strikerBounceDir && (
              <G>
                <Line
                  x1={trajectory.endX * 10}
                  y1={trajectory.endY * 10}
                  x2={(trajectory.endX + trajectory.strikerBounceDir.x * 15) * 10}
                  y2={(trajectory.endY + trajectory.strikerBounceDir.y * 15) * 10}
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray="6,6"
                  opacity="0.95"
                />
                <Circle
                  cx={(trajectory.endX + trajectory.strikerBounceDir.x * 15) * 10}
                  cy={(trajectory.endY + trajectory.strikerBounceDir.y * 15) * 10}
                  r="6"
                  fill="#3b82f6"
                />
              </G>
            )}
          </G>
        )}
      </Svg>

      {/* Pockets (rendered in absolute layer) */}
      {[
        { top: 4, left: 4 },
        { top: 4, right: 4 },
        { bottom: 4, left: 4 },
        { bottom: 4, right: 4 },
      ].map((pos, i) => (
        <View key={`pocket${i}`} style={[{
          position: 'absolute', width: 22, height: 22, borderRadius: 11,
          backgroundColor: '#1C1917', borderWidth: 2, borderColor: '#3D2616',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 5
        }, pos as any]} />
      ))}

      {/* Pieces — High fidelity glossy wooden style pieces */}
      {gameState.pieces.map((piece: any) => {
        if (piece.isPocketed) return null;
        const isStrikerPiece = piece.id === 'striker';
        const radius = isStrikerPiece ? 0.045 : 0.035;
        const size = innerSize * radius * 2;
        const xVal = isStrikerPiece ? (isMyTurn && !isStriking ? localStrikerPos : (gameState.strikerPos ?? 50)) : piece.position.x;
        const x = (xVal / 100) * innerSize - size / 2;
        const yVal = (isStrikerPiece && !isStriking) ? 85 : piece.position.y;
        const y = (yVal / 100) * innerSize - size / 2;

        return (
          <View key={piece.id} style={{
            position: 'absolute', left: x - 2, top: y - 2,
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: piece.type === 'black' ? '#2A1F18' : piece.type === 'queen' ? '#B91C1C' : isStrikerPiece ? '#FAFAFA' : '#EED6B3',
            borderWidth: 1.5,
            borderColor: piece.type === 'black' ? '#0F0906' : piece.type === 'queen' ? '#6B0A0A' : isStrikerPiece ? '#EF4444' : '#8C603E',
            shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
            alignItems: 'center', justifyContent: 'center'
          }}>
            {/* Core Glossy Highlight */}
            <View style={{
              position: 'absolute', top: 1, left: 1, right: 1, height: size * 0.35,
              borderTopLeftRadius: size / 2, borderTopRightRadius: size / 2,
              backgroundColor: 'rgba(255,255,255,0.18)'
            }} />
            
            {/* Inner Ring detail */}
            <View style={{
              width: size * 0.6, height: size * 0.6, borderRadius: (size * 0.6) / 2,
              borderWidth: 1, borderColor: piece.type === 'black' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              alignItems: 'center', justifyContent: 'center'
            }}>
              {isStrikerPiece && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#EF4444' }} />}
            </View>

            {piece.type === 'queen' && <Text style={{ fontSize: size * 0.4, textAlign: 'center', position: 'absolute' }}>👑</Text>}
          </View>
        );
      })}



      {/* Invisible Striker position touch area spanning the baseline */}
      {isMyTurn && !isStriking && (
        <View
          style={{
            position: 'absolute',
            bottom: innerSize * 0.15 - 65 + 2,
            left: '12%',
            right: '12%',
            height: 130,
            backgroundColor: 'transparent',
            zIndex: 100,
          }}
          {...strikerPanResponder.panHandlers}
        />
      )}
    </View>
  );
}

// ── Styles ──
const styles = {
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  avatarCircle: {
    overflow: 'hidden' as const,
  },
  scoreBadge: {
    width: 32, height: 24, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6, alignItems: 'center' as const, justifyContent: 'center' as const,
    flexDirection: 'row' as const, gap: 2,
  },
};
