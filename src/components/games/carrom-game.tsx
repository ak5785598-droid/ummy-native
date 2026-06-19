import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, PanResponder, Animated as RNAnimated } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate } from 'react-native-reanimated';
import { X, Plus, Volume2, VolumeX, ChevronUp } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useCarromEngine } from '../../hooks/use-carrom-engine';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CarromGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string }) => void;
  isMuted?: boolean;
}

export function CarromGame({ onClose, roomId, onRoundEnd, isMuted: isMutedProp }: CarromGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const {
    gameState, initializeGame, selectMode, joinArena, startMatch, updateStriker, strike,
  } = useCarromEngine(roomId || 'lobby', currentUser?.uid || null);

  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);
  const [isStriking, setIsStriking] = useState(false);
  const powerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { initializeGame(); }, [initializeGame]);

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
  if (gameState.status === 'mode_select') return <ModeSelect onSelect={(mode) => selectMode(mode)} />;
  if (gameState.status === 'lobby') {
    return <LobbyScreen gameState={gameState} currentUser={currentUser} userProfile={userProfile}
      onJoin={() => joinArena(userProfile)} onStart={startMatch} onClose={onClose} />;
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, zIndex: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.5 }}>Carrom Live</Text>
        </View>
      </View>

      {/* Board */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <CarromBoard
          gameState={gameState} isMyTurn={isMyTurn} angle={angle} setAngle={setAngle}
          isStriking={isStriking} updateStriker={updateStriker} boardSize={Math.min(SCREEN_WIDTH - 32, SCREEN_HEIGHT * 0.42)}
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
                          <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
                        ) : (
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{p.username[0]}</Text>
                        )}
                      </View>
                      <Text style={{ color: 'white', fontSize: 8, fontWeight: '700', marginTop: 2 }}>{p.username}</Text>
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
                        <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
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
    progress.value = withSpring(100, { duration: 2500 });
    scale.value = withSpring(1, { duration: 800 });
  }, []);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` as any }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: interpolate(scale.value, [0.8, 1], [0, 1], Extrapolate.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: '#1A0B2E', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Animated.View style={[{ marginBottom: 48 }, logoStyle]}>
        <Text style={{ fontSize: 64, fontWeight: '900' }}>🎯</Text>
      </Animated.View>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', marginBottom: 24, letterSpacing: -0.5 }}>
        Syncing Arena
      </Text>
      <View style={{ width: '100%', maxWidth: 280 }}>
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Animated.View style={[{ height: '100%', borderRadius: 99, overflow: 'hidden' }, barStyle]}>
            <View style={{ flex: 1, backgroundColor: '#fbbf24' }} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.4)' }} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ── Mode Select ──
function ModeSelect({ onSelect }: { onSelect: (mode: 'freestyle' | 'professional') => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#00897B', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <View style={{ width: '100%', maxWidth: 220, backgroundColor: 'rgba(0,105,92,0.8)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20 }}>Select Mode</Text>
        <TouchableOpacity onPress={() => onSelect('freestyle')} style={{ width: '100%', backgroundColor: '#FFB300', paddingVertical: 10, borderRadius: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F57F17' }} activeOpacity={0.8}>
          <Text style={{ color: 'black', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>Freestyle</Text>
        </TouchableOpacity>
        <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 10, borderRadius: 16, alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>Coming Soon</Text>
        </View>
      </View>
    </View>
  );
}

// ── Lobby Screen ──
function LobbyScreen({ gameState, currentUser, userProfile, onJoin, onStart, onClose }: {
  gameState: any; currentUser: any; userProfile: any; onJoin: () => void; onStart: () => void; onClose: () => void;
}) {
  const isAdmin = gameState.players[0]?.uid === currentUser?.uid;
  const canStart = gameState.players.length >= 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#006064', alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 48 }}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}><X size={20} color="white" /></TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Carrom Arena</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ width: '100%', maxWidth: 320, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 48, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 32 }}>Waiting for players</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 48 }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const p = gameState.players[i];
            return (
              <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                {p ? (
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#4D2C19', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fbbf24', overflow: 'hidden', shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 }}>
                      {p.avatarUrl ? (
                        <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl }} style={{ width: '100%', height: '100%' }} />
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

        {isAdmin ? (
          <TouchableOpacity onPress={onStart} disabled={!canStart} style={{ width: '100%', paddingVertical: 20, borderRadius: 24, alignItems: 'center', backgroundColor: canStart ? '#FF6D00' : 'rgba(255,255,255,0.05)', borderBottomWidth: 4, borderBottomColor: canStart ? '#E65100' : 'transparent', opacity: canStart ? 1 : 0.3 }} activeOpacity={0.8}>
            <Text style={{ color: canStart ? 'white' : 'rgba(255,255,255,0.1)', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Start Match</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Host starting soon...</Text>
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

  const half = boardSize / 2;
  const frameW = 14;
  const innerSize = boardSize - frameW * 2;

  return (
    <View style={{
      width: boardSize, height: boardSize, borderRadius: 32,
      borderWidth: frameW, borderColor: '#3D2616',
      overflow: 'hidden', position: 'relative',
      shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 20,
    }}>
      {/* Board Surface — wood gradient layers */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8C99B' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F5D4B2' }} />
      {/* Wood grain lines */}
      {[0.2, 0.4, 0.6, 0.8].map((pct, i) => (
        <View key={i} style={{ position: 'absolute', top: `${pct * 100}%`, left: 0, right: 0, height: 1, backgroundColor: 'rgba(139,90,43,0.12)' }} />
      ))}
      {[0.15, 0.35, 0.55, 0.75, 0.95].map((pct, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left: `${pct * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(139,90,43,0.08)' }} />
      ))}

      {/* Center circle */}
      <View style={{ position: 'absolute', top: half - boardSize * 0.08, left: half - boardSize * 0.08, width: boardSize * 0.16, height: boardSize * 0.16, borderRadius: boardSize * 0.08, borderWidth: 2, borderColor: '#B8860B' }} />
      {/* Inner circle */}
      <View style={{ position: 'absolute', top: half - boardSize * 0.16, left: half - boardSize * 0.16, width: boardSize * 0.32, height: boardSize * 0.32, borderRadius: boardSize * 0.16, borderWidth: 1, borderColor: '#B8860B', opacity: 0.5 }} />

      {/* Diagonal lines to corners */}
      {[{ x1: frameW, y1: frameW }, { x1: boardSize - frameW, y1: frameW }, { x1: frameW, y1: boardSize - frameW }, { x1: boardSize - frameW, y1: boardSize - frameW }].map((corner, i) => {
        const dx = corner.x1 - half;
        const dy = corner.y1 - half;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={`diag${i}`} style={{
            position: 'absolute', top: half, left: half, width: len * 0.45, height: 1,
            backgroundColor: 'rgba(184,134,11,0.3)',
            transformOrigin: '0 0', transform: [{ rotate: `${angleDeg}deg` }],
          }} />
        );
      })}

      {/* Corner pockets — arc style */}
      {[
        { top: -2, left: -2 },
        { top: -2, right: -2 },
        { bottom: -2, left: -2 },
        { bottom: -2, right: -2 },
      ].map((pos, i) => (
        <View key={`pocket${i}`} style={[{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 6 }, pos as any]} />
      ))}

      {/* Pieces */}
      {gameState.pieces.map((piece: any) => {
        if (piece.isPocketed) return null;
        const isStrikerPiece = piece.id === 'striker';
        const radius = isStrikerPiece ? 0.055 : 0.035;
        const size = innerSize * radius * 2;
        const x = (piece.position.x / 100) * innerSize - size / 2;
        const y = (piece.position.y / 100) * innerSize - size / 2;

        return (
          <View key={piece.id} style={{
            position: 'absolute', left: x + frameW, top: y + frameW,
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: piece.type === 'black' ? '#1a1a1a' : piece.type === 'queen' ? '#e11d48' : isStrikerPiece ? '#f0f0f0' : 'white',
            borderWidth: isStrikerPiece ? 2 : 1,
            borderColor: isStrikerPiece ? '#999' : piece.type === 'queen' ? '#fda4af' : piece.type === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
          }}>
            {/* Inner ring */}
            <View style={{ position: 'absolute', top: size * 0.1, left: size * 0.1, right: size * 0.1, bottom: size * 0.1, borderRadius: size * 0.4, borderWidth: 0.5, borderColor: piece.type === 'black' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
            {/* Striker inner dot */}
            {isStrikerPiece && <View style={{ position: 'absolute', top: '50%', left: '50%', width: 4, height: 4, borderRadius: 2, backgroundColor: '#999', transform: [{ translateX: -2 }, { translateY: -2 }] }} />}
            {/* Queen crown */}
            {piece.type === 'queen' && <Text style={{ fontSize: size * 0.35, textAlign: 'center', marginTop: -1 }}>👑</Text>}
          </View>
        );
      })}

      {/* Aiming Line */}
      {isMyTurn && !isStriking && (
        <View style={{
          position: 'absolute', bottom: boardSize * 0.15 + frameW,
          left: (gameState.strikerPos || 50) / 100 * innerSize + frameW,
          width: 2, height: boardSize * 0.5,
          transformOrigin: 'bottom center',
          transform: [{ rotate: `${angle}deg` }],
        }}>
          {/* Gradient line (bottom solid → top transparent) */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, width: 2, height: '100%', backgroundColor: 'rgba(255,255,255,0.7)' }} />
          <View style={{ position: 'absolute', bottom: '50%', left: 0, width: 2, height: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          {/* Arrow head */}
          <View style={{ position: 'absolute', top: -4, left: -4, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.8)' }} />
        </View>
      )}

      {/* Striker position touch area */}
      {isMyTurn && !isStriking && (
        <View
          style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 48, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }}
          {...panResponder.panHandlers}
        >
          <View style={{
            position: 'absolute',
            left: `${gameState.strikerPos || 50}%`,
            top: '50%', width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'white', borderWidth: 2, borderColor: '#fbbf24',
            transform: [{ translateX: -16 }, { translateY: -16 }],
            shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
          }} />
        </View>
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
