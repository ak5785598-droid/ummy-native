import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { X, Volume2, VolumeX, Plus } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useLudoEngine } from '../../hooks/use-ludo-engine';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 24, 380);
const BOARD_BORDER_WIDTH = 4;
const INNER_BOARD_SIZE = BOARD_SIZE - (BOARD_BORDER_WIDTH * 2);
const CELL_SIZE = INNER_BOARD_SIZE / 15;

function getAlignedCoords(r: number, c: number, offsetX = 0, offsetY = 0) {
  return {
    x: (c / 15) * INNER_BOARD_SIZE + (CELL_SIZE / 2) + offsetX,
    y: (r / 15) * INNER_BOARD_SIZE + (CELL_SIZE / 2) + offsetY,
  };
}

interface LudoGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string }) => void;
  isMuted?: boolean;
  isAdmin?: boolean;
}


// ── 52-cell main path mapped to [row, col] on 15×15 grid ──
const PATH_COORDS: [number, number][] = [
  // Left arm / Red start and path going clockwise
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7], // top middle crossover
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14], // right middle crossover
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7], // bottom middle crossover
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0], // left middle crossover
  [6,0]
];

// Home stretch for each color (positions 53-57)
const HOME_STRETCH: Record<string, [number, number][]> = {
  blue:   [[7,1],[7,2],[7,3],[7,4],[7,5]],
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

// Start positions for each color (position 1 on the path)
const COLOR_START_INDEX: Record<string, number> = {
  blue: 0,
  red: 13,
  green: 26,
  yellow: 39,
};

// Home base positions (inside the colored quadrants)
const HOME_BASE: Record<string, [number, number][]> = {
  blue:   [[1.7, 1.7], [1.7, 3.3], [3.3, 1.7], [3.3, 3.3]],
  red:    [[1.7, 10.7], [1.7, 12.3], [3.3, 10.7], [3.3, 12.3]],
  green:  [[10.7, 10.7], [10.7, 12.3], [12.3, 10.7], [12.3, 12.3]],
  yellow: [[10.7, 1.7], [10.7, 3.3], [12.3, 1.7], [12.3, 3.3]],
};

const COLOR_HEX: Record<string, string> = {
  red: '#ff3f34', green: '#10b981', yellow: '#ffa502', blue: '#0fbcf9',
};

const COLOR_DARK: Record<string, string> = {
  red: '#c0392b', green: '#065f46', yellow: '#b45309', blue: '#1d4ed8',
};

const BOARD_COLORS = {
  red: '#ff4757', green: '#2ed573', blue: '#1e90ff', yellow: '#ffa502',
  redLight: 'rgba(255, 71, 87, 0.25)', greenLight: 'rgba(46, 213, 115, 0.25)', blueLight: 'rgba(30, 144, 255, 0.25)', yellowLight: 'rgba(255, 165, 2, 0.25)',
};

// Safe squares (star positions) on the main path
const SAFE_POSITIONS = [1, 9, 14, 22, 27, 35, 40, 48];

function piecePosition(piece: any, myColor: string): [number, number] | null {
  if (piece.position === 0) {
    const bases = HOME_BASE[piece.color];
    const idx = parseInt(piece.id.split('_')[1]);
    return bases[idx];
  }
  if (piece.position >= 58) return [7, 7];
  if (piece.position >= 53) {
    const stretch = HOME_STRETCH[piece.color];
    return stretch[piece.position - 53];
  }
  const startIdx = COLOR_START_INDEX[piece.color];
  const pathIdx = (startIdx + piece.position - 1) % PATH_COORDS.length;
  return PATH_COORDS[pathIdx];
}

// ── Dice Dots Component ──
function DiceDots({ value, size = 6 }: { value: number; size?: number }) {
  const activeCells = useMemo(() => {
    switch (value) {
      case 1: return [4];
      case 2: return [0, 8];
      case 3: return [0, 4, 8];
      case 4: return [0, 2, 6, 8];
      case 5: return [0, 2, 4, 6, 8];
      case 6: return [0, 2, 3, 5, 6, 8];
      default: return [];
    }
  }, [value]);

  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: '#1e293b' };

  return (
    <View style={{ width: '82%', height: '82%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: 9 }).map((_, idx) => {
        const isActive = activeCells.includes(idx);
        return (
          <View key={idx} style={{ width: '33.3%', height: '33.3%', alignItems: 'center', justifyContent: 'center' }}>
            {isActive && <View style={dot} />}
          </View>
        );
      })}
    </View>
  );
}

interface AnimatedLudoPieceProps {
  piece: any;
  coord: [number, number];
  boardSize: number;
  cellSize: number;
  innerBoardSize: number;
  boardBorderWidth: number;
  offsetX: number;
  offsetY: number;
  isClickable: boolean;
  arrowAnim: Animated.Value;
  handleMovePiece: (id: string) => void;
  idx: number;
  myColor: string;
  movablePieces: any[];
}

function AnimatedLudoPiece({
  piece,
  coord,
  boardSize,
  cellSize,
  innerBoardSize,
  boardBorderWidth,
  offsetX,
  offsetY,
  isClickable,
  arrowAnim,
  handleMovePiece,
  idx,
  myColor,
  movablePieces,
}: AnimatedLudoPieceProps) {
  const { x: targetX, y: targetY } = getAlignedCoords(coord[0], coord[1], offsetX, offsetY);

  const animPos = useRef(new Animated.ValueXY({ x: targetX, y: targetY })).current;
  const prevPositionRef = useRef(piece.position);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const prevPos = prevPositionRef.current;
    prevPositionRef.current = piece.position;

    if (prevPos !== piece.position) {
      if (piece.position > prevPos && prevPos >= 0) {
        const steps: { x: number; y: number }[] = [];
        const startStep = prevPos === 0 ? 1 : prevPos + 1;
        
        for (let p = startStep; p <= piece.position; p++) {
          const tempPiece = { ...piece, position: p };
          const c = piecePosition(tempPiece, myColor);
          if (c) {
            const isLast = p === piece.position;
            steps.push(getAlignedCoords(c[0], c[1], isLast ? offsetX : 0, isLast ? offsetY : 0));
          }
        }

        if (steps.length > 0) {
          isAnimatingRef.current = true;
          const animations = steps.map(step =>
            Animated.timing(animPos, {
              toValue: { x: step.x, y: step.y },
              duration: 220,
              useNativeDriver: true,
            })
          );
          Animated.sequence(animations).start(() => {
            isAnimatingRef.current = false;
          });
          return;
        }
      }

      animPos.setValue({ x: targetX, y: targetY });
    } else if (!isAnimatingRef.current) {
      animPos.setValue({ x: targetX, y: targetY });
    }
  }, [piece.position, targetX, targetY, myColor, offsetX, offsetY]);

  const pieceSize = coord[0] === 7 && coord[1] === 7 ? cellSize * 0.65 : cellSize * 0.82;

  const PIECE_EMOJIS: Record<string, string> = {
    red: '🐻',
    green: '🐼',
    blue: '🐱',
    yellow: '🦁',
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: pieceSize,
        height: pieceSize,
        transform: [
          { translateX: animPos.x },
          { translateY: animPos.y },
          { translateX: -pieceSize / 2 },
          { translateY: -pieceSize / 2 }
        ],
        zIndex: isClickable ? 100 : idx + 10,
      }}
    >
      {isClickable && (
        <Animated.View style={{ position: 'absolute', top: -32, alignSelf: 'center', transform: [{ translateY: arrowAnim }], zIndex: 120 }}>
          <Text style={{ fontSize: 22, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 }}>👇</Text>
        </Animated.View>
      )}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => isClickable && handleMovePiece(piece.id)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: pieceSize / 2,
          backgroundColor: COLOR_HEX[piece.color] || '#999',
          borderWidth: 2,
          borderColor: isClickable ? '#ffd700' : '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.4,
          shadowRadius: 3.5,
          elevation: 5,
        }}
      >
        <View style={{
          width: '84%',
          height: '84%',
          borderRadius: (pieceSize * 0.84) / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.4)',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: pieceSize * 0.48 }}>
            {PIECE_EMOJIS[piece.color] || '⚪'}
          </Text>
        </View>
        {piece.position >= 58 && (
          <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'white' }}>
            <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function LudoGame({ onClose, roomId, onRoundEnd, isMuted, isAdmin }: LudoGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const { gameState, isLoading, joinLobby, startGame, leaveLobby, rollDice, movePiece, resetGame } = useLudoEngine(roomId || 'lobby', currentUser?.uid || null);

  const [isLaunching, setIsLaunching] = useState(true);
  const [localLobbyMode, setLocalLobbyMode] = useState<'quick' | 'classic' | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

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

  const diceAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const launchProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(launchProgress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();
    const t = setTimeout(() => setIsLaunching(false), 5000);
    return () => clearTimeout(t);
  }, []);

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
          // Auto-start triggered only by the host (players[0])
          const isHost = gameState.players[0]?.uid === currentUser?.uid;
          if (isHost) {
            startGame();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.players?.length, currentUser?.uid, startGame]);


  // Arrow bobbing animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: -10, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const hasJoined = useMemo(() => {
    return gameState?.players.some((p: any) => p.uid === currentUser?.uid) || false;
  }, [gameState?.players, currentUser?.uid]);

  const myColor = useMemo(() => {
    if (!currentUser?.uid || !gameState) return null;
    const me = gameState.players.find((p: any) => p.uid === currentUser.uid);
    return me?.color || null;
  }, [currentUser?.uid, gameState]);

  const isMyTurn = gameState?.status === 'playing' && gameState?.turn === currentUser?.uid;

  const movablePieces = useMemo(() => {
    if (!isMyTurn || !gameState?.diceRolled || !gameState?.dice) return [];
    return gameState.pieces.filter((p: any) => {
      if (p.ownerUid !== currentUser?.uid) return false;
      if (p.position === 0 && gameState.dice !== 6) return false;
      if (p.position >= 58) return false;
      if (p.position + gameState.dice > 58) return false;
      return true;
    });
  }, [gameState?.pieces, gameState?.dice, gameState?.diceRolled, isMyTurn, currentUser?.uid]);

  const handleRollDice = useCallback(() => {
    if (!isMyTurn || gameState?.diceRolled) return;
    Animated.sequence([
      Animated.timing(diceAnim, { toValue: 1.2, duration: 80, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: 1.1, duration: 80, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    rollDice();
  }, [isMyTurn, gameState?.diceRolled, rollDice, diceAnim]);

  const handleMovePiece = useCallback((pieceId: string) => {
    movePiece(pieceId);
  }, [movePiece]);

  // Handle Mode Selection
  const handleSelectMode = (mode: 'quick' | 'classic', isBot: boolean = false) => {
    setLocalLobbyMode(mode);
    joinLobby(userProfile, mode, isBot);
  };

  // Ludo Bot automated moves
  useEffect(() => {
    if (!gameState || !gameState.isBotMode || gameState.status !== 'playing' || gameState.turn !== 'bot') return;

    const isHost = gameState.players[0]?.uid === currentUser?.uid;
    if (!isHost) return;

    if (!gameState.diceRolled) {
      const timer = setTimeout(() => {
        rollDice();
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        const botPieces = gameState.pieces.filter((p: any) => {
          if (p.ownerUid !== 'bot') return false;
          if (p.position === 0 && gameState.dice !== 6) return false;
          if (p.position >= 58) return false;
          if (p.position + gameState.dice > 58) return false;
          return true;
        });

        if (botPieces.length > 0) {
          let chosenPiece = botPieces[0];
          
          const capturePiece = botPieces.find(p => {
            const dest = p.position === 0 ? 1 : p.position + (gameState.dice || 0);
            if (dest >= 1 && dest <= 52) {
              const startIdx = COLOR_START_INDEX[p.color];
              const pathIdx = (startIdx + dest - 1) % PATH_COORDS.length;
              const [targetR, targetC] = PATH_COORDS[pathIdx];
              
              return gameState.pieces.some(other => {
                if (other.ownerUid === 'bot') return false;
                const otherCoord = piecePosition(other, myColor || '');
                return otherCoord && otherCoord[0] === targetR && otherCoord[1] === targetC && other.position >= 1 && other.position <= 52;
              });
            }
            return false;
          });

          if (capturePiece) {
            chosenPiece = capturePiece;
          } else {
            chosenPiece = botPieces.reduce((prev, curr) => curr.position > prev.position ? curr : prev, botPieces[0]);
          }

          movePiece(chosenPiece.id);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.turn, gameState?.diceRolled, gameState?.isBotMode, rollDice, movePiece, currentUser?.uid]);

  // ── Launching / Loading Screen (Screen 1 style) ──
  if (isLaunching || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1a4a', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../../../assets/images/games/ludo.png')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 26, 74, 0.75)' }} />

        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Image
            source={require('../../../assets/images/games/ludo.png')}
            style={{ width: 140, height: 140, borderRadius: 24, borderWidth: 4, borderColor: '#fbbf24' }}
            contentFit="cover"
          />
          <Text style={{ color: 'white', fontSize: 36, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 6 }}>
            LUDO
          </Text>
          <View style={{ width: 220, height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
            <Animated.View
              style={{
                height: '100%',
                width: launchProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                borderRadius: 99,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: '100%', height: '100%' }}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }

  const boardSize = BOARD_SIZE;
  const cellSize = CELL_SIZE;
  const innerBoardSize = INNER_BOARD_SIZE;
  const boardBorderWidth = BOARD_BORDER_WIDTH;

  // ── Early Fullscreen Mode Selection ──
  if (!isLaunching && !isLoading && (!gameState || gameState.status === 'ended') && !localLobbyMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../../../assets/images/games/ludo.png')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }}
          contentFit="cover"
        />
        <View style={{
          width: '85%',
          backgroundColor: '#7c3aed',
          borderRadius: 24,
          borderWidth: 3,
          borderColor: '#fbbf24',
          padding: 24,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 15,
          elevation: 10,
        }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 24, letterSpacing: 0.5 }}>Select Mode</Text>
          
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectMode('quick')}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 25,
              backgroundColor: '#fbbf24',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              shadowColor: '#fbbf24',
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ color: '#7c3aed', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>QUICK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectMode('classic')}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 25,
              backgroundColor: '#e2e8f0',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ color: '#475569', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>CLASSIC</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectMode('quick', true)}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 25,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#fbbf24',
              marginTop: 14,
            }}
          >
            <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>🤖 PLAY WITH ROBOT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Lobby View (Screen 3 & 4 style) ──
  if (gameState?.status === 'lobby') {
    const modeLabel = (gameState.mode || 'quick') === 'quick' ? 'Quick Mode' : 'Classic Mode';
    const numPlayers = gameState.players ? gameState.players.length : 0;
    const canStart = numPlayers >= 2;

    return (
      <View style={{ flex: 1, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../../../assets/images/games/ludo.png')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }}
          contentFit="cover"
        />

        <View style={{ width: '90%', backgroundColor: '#5b21b6', borderRadius: 24, borderWidth: 3, borderColor: '#fbbf24', padding: 20, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 20 }}>{modeLabel}</Text>

          {/* Lobby Slots */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const player = gameState.players[idx];
              return (
                <View key={idx} style={{ alignItems: 'center', gap: 6 }}>
                  {player ? (
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: COLOR_HEX[player.color], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {player.avatarUrl ? (
                        <Image source={{ uri: toCDN(player.avatarUrl) }} style={{ width: '100%', height: '100%' }} cachePolicy="memory-disk" />
                      ) : (
                        <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>{player.username[0]}</Text>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={hasJoined}
                      onPress={() => joinLobby(userProfile, (gameState.mode as 'quick' | 'classic') || 'quick')}
                      style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}
                    >
                      <Plus color="white" size={24} />
                    </TouchableOpacity>
                  )}
                  <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, maxWidth: 64, textAlign: 'center' }}>
                    {player ? player.username : `Empty`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Waiting Text / Start Preparing Countdown */}
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 24, textAlign: 'center' }}>
            {!canStart ? 'Waiting for players to join...' : `Game starting automatically in ${countdown}s`}
          </Text>

          {/* Action Buttons */}
          {!hasJoined ? (
            <TouchableOpacity
              onPress={() => joinLobby(userProfile, (gameState.mode as 'quick' | 'classic') || 'quick')}
              style={{ width: '100%', height: 50, borderRadius: 25, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>JOIN GAME</Text>
            </TouchableOpacity>
          ) : (
            <>
              {canStart && (
                isAdmin ? (
                  <TouchableOpacity
                    onPress={startGame}
                    style={{ width: '100%', height: 50, borderRadius: 25, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                  >
                    <Text style={{ color: '#5b21b6', fontSize: 16, fontWeight: '900' }}>START</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: '100%', paddingVertical: 14, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' }}>Waiting for Admin to start...</Text>
                  </View>
                )
              )}

              <TouchableOpacity
                onPress={leaveLobby}
                style={{ width: '100%', height: 50, borderRadius: 25, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>LEAVE</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Ended Screen ──
  if (gameState?.status === 'ended') {
    const rankings = gameState?.finishedRankings || [];
    const sortedPlayers = [...(gameState?.players || [])].map(p => {
      const progress = (gameState?.pieces || [])
        .filter((piece: any) => piece.ownerUid === p.uid)
        .reduce((sum: number, piece: any) => sum + piece.position, 0);
      const rankIdx = rankings.indexOf(p.uid);
      return { player: p, progress, rank: rankIdx !== -1 ? rankIdx : 99 };
    }).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.progress - a.progress;
    });

    const first = sortedPlayers[0];
    const second = sortedPlayers[1];
    const third = sortedPlayers[2];
    const fourth = sortedPlayers[3];

    const iWon = gameState.winner === currentUser?.uid;

    return (
      <View style={{ flex: 1, backgroundColor: '#090d1f', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {/* Shiny Background Elements */}
        <LinearGradient
          colors={['#1e1b4b', '#090d1f']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        
        {/* Winner Announcement Header */}
        <Text style={{ color: '#ffd700', fontSize: 13, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          {iWon ? '✨ Victory! ✨' : 'Match Ended'}
        </Text>
        <Text style={{ color: 'white', fontSize: 26, fontWeight: '900', marginBottom: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 }}>
          {first ? `${first.player.username} Won!` : 'Game Over'}
        </Text>

        {/* Podium Row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: 260, marginBottom: 24, paddingHorizontal: 10 }}>
          {/* 2nd Place */}
          {second && (
            <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#cbd5e1', overflow: 'hidden', backgroundColor: '#1e293b', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}>
                {second.player.avatarUrl ? (
                  <Image source={{ uri: toCDN(second.player.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{second.player.username[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={{ color: 'white', fontSize: 11, fontWeight: '700', marginTop: 6, width: 70, textAlign: 'center' }}>
                {second.player.username}
              </Text>
              <Text style={{ color: '#a1a1aa', fontSize: 9, fontWeight: '600', marginBottom: 6 }}>
                {second.progress} pts
              </Text>
              <LinearGradient
                colors={['#94a3b8', '#475569']}
                style={{ width: '100%', height: 75, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 }}
              >
                <Text style={{ color: 'white', fontSize: 24, fontWeight: '900' }}>2</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>ND</Text>
              </LinearGradient>
            </View>
          )}

          {/* 1st Place (Center - Tallest) */}
          {first && (
            <View style={{ flex: 1.2, alignItems: 'center', zIndex: 10, marginHorizontal: 4 }}>
              <Text style={{ fontSize: 24, top: 4, zIndex: 12 }}>👑</Text>
              <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#ffd700', overflow: 'hidden', backgroundColor: '#1e293b', shadowColor: '#ffd700', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}>
                {first.player.avatarUrl ? (
                  <Image source={{ uri: toCDN(first.player.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>{first.player.username[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={{ color: '#ffd700', fontSize: 13, fontWeight: '900', marginTop: 6, width: 85, textAlign: 'center' }}>
                {first.player.username}
              </Text>
              <Text style={{ color: '#fcd34d', fontSize: 10, fontWeight: '700', marginBottom: 6 }}>
                {first.progress} pts
              </Text>
              <LinearGradient
                colors={['#fbbf24', '#b45309']}
                style={{ width: '100%', height: 110, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 }}
              >
                <Text style={{ color: 'white', fontSize: 32, fontWeight: '900' }}>1</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>ST</Text>
              </LinearGradient>
            </View>
          )}

          {/* 3rd Place */}
          {third && (
            <View style={{ flex: 0.9, alignItems: 'center', marginHorizontal: 4 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: '#d97706', overflow: 'hidden', backgroundColor: '#1e293b', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}>
                {third.player.avatarUrl ? (
                  <Image source={{ uri: toCDN(third.player.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{third.player.username[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={{ color: 'white', fontSize: 11, fontWeight: '700', marginTop: 6, width: 65, textAlign: 'center' }}>
                {third.player.username}
              </Text>
              <Text style={{ color: '#a1a1aa', fontSize: 9, fontWeight: '600', marginBottom: 6 }}>
                {third.progress} pts
              </Text>
              <LinearGradient
                colors={['#b45309', '#78350f']}
                style={{ width: '100%', height: 55, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }}
              >
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>3</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>RD</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* 4th Place List Row (If exists) */}
        {fourth && (
          <View style={{ width: '90%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 'bold' }}>4th</Text>
              <View style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1e293b' }}>
                {fourth.player.avatarUrl ? (
                  <Image source={{ uri: toCDN(fourth.player.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{fourth.player.username[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{fourth.player.username}</Text>
            </View>
            <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: '600' }}>{fourth.progress} pts</Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={resetGame}
          style={{ width: '85%', height: 50, borderRadius: 25, overflow: 'hidden', marginTop: 10, shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
        >
          <LinearGradient
            colors={['#ffd700', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#090d1f', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>PLAY AGAIN</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={{ marginTop: 16, padding: 8 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' }}>
            Back to Room
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const piecesOnBoard = gameState?.pieces ? gameState.pieces.map((piece: any) => {
    const coord = piecePosition(piece, myColor || '');
    return { piece, coord };
  }).filter(p => p.coord) : [];


  return (
    <View style={{ flex: 1, backgroundColor: '#0a1a4a', borderRadius: 24, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 34, paddingBottom: 8, zIndex: 40 }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5, fontStyle: 'italic', marginLeft: -30 }}>
          Ludo • {(gameState?.mode || 'quick').toUpperCase()}
        </Text>
      </View>

      {/* Board Area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -25 }}>
        {/* Wooden Frame */}
        <View style={{
          padding: 8,
          backgroundColor: '#8b5a2b', // Rich wooden outer base
          borderRadius: 28,
          borderWidth: 6,
          borderColor: '#5c3a21', // Darker wood edge
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.7,
          shadowRadius: 20,
          elevation: 15,
        }}>
          {/* Main Board Grid container */}
          <View style={{ width: boardSize, height: boardSize, borderRadius: 20, overflow: 'visible', borderWidth: 4, borderColor: '#ffd700', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, position: 'relative', backgroundColor: '#0f172a' }}>
            <View style={{ flex: 1, flexDirection: 'column', borderRadius: 16, overflow: 'hidden' }}>
              {/* Row 0-5: Blue Home (0-5,0-5) | Red Path (0-5,6-8) | Red Home (0-5,9-14) */}
              <View style={{ flex: 6, flexDirection: 'row' }}>
                {/* Blue Home 6x6 */}
                <LinearGradient
                  colors={['#1e3c72', '#2a5298']}
                  style={{ flex: 6, borderWidth: 3, borderColor: BOARD_COLORS.blue, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}
                >
                  <View style={{ width: '92%', height: '92%', borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)' }} />
                </LinearGradient>
                {/* Red Path col 6-8 */}
                <View style={{ flex: 3 }}>
                  {Array.from({ length: 6 }).map((_, r) => (
                    <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                      {[6,7,8].map(c => {
                        const isRedStretch = c === 7 && r >= 1 && r <= 5;
                        const isRedStart = r === 1 && c === 8;
                        const isSafe = (r === 1 && c === 8) || (r === 2 && c === 6);
                        
                        let bgColor = '#131926';
                        if (isRedStretch) bgColor = BOARD_COLORS.red;
                        else if (isRedStart) bgColor = BOARD_COLORS.redLight;
                        
                        return (
                          <View key={c} style={{ flex: 1, backgroundColor: bgColor, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                            {isSafe && <Text style={{ fontSize: 11, color: '#fbbf24' }}>⭐</Text>}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
                {/* Red Home 6x6 */}
                <LinearGradient
                  colors={['#b22222', '#ff4757']}
                  style={{ flex: 6, borderWidth: 3, borderColor: BOARD_COLORS.red, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}
                >
                  <View style={{ width: '92%', height: '92%', borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)' }} />
                </LinearGradient>
              </View>
   
              {/* Row 6-8: Blue Path (row 6) | Center (6-8,6-8) | Green Path (row 8) */}
              <View style={{ flex: 3, flexDirection: 'row' }}>
                {/* Blue Path row 6 */}
                <View style={{ flex: 6 }}>
                  {[6,7,8].map(r => (
                    <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                      {Array.from({ length: 6 }).map((_, c) => {
                        const isBlueStretch = r === 7 && c >= 1 && c <= 5;
                        const isBlueStart = r === 6 && c === 1;
                        const isSafe = (r === 6 && c === 1) || (r === 8 && c === 2);
                        
                        let bgColor = '#131926';
                        if (isBlueStretch) bgColor = BOARD_COLORS.blue;
                        else if (isBlueStart) bgColor = BOARD_COLORS.blueLight;
                        
                        return (
                          <View key={c} style={{ flex: 1, backgroundColor: bgColor, borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' }}>
                            {isSafe && <Text style={{ fontSize: 11, color: '#fbbf24' }}>⭐</Text>}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
                {/* Center 3x3 */}
                <View style={{ flex: 3, backgroundColor: '#111827', borderWidth: 2, borderColor: '#fbbf24', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {/* 4 Diagonal Triangles */}
                  <View style={{ position: 'absolute', top: 0, left: 0, width: cellSize * 3, height: cellSize * 3 }}>
                    {/* Red triangle (Top) */}
                    <View style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTopWidth: (cellSize * 3) / 2, borderTopColor: BOARD_COLORS.red, borderLeftWidth: (cellSize * 3) / 2, borderLeftColor: 'transparent', borderRightWidth: (cellSize * 3) / 2, borderRightColor: 'transparent' }} />
                    {/* Green triangle (Right) */}
                    <View style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderRightWidth: (cellSize * 3) / 2, borderRightColor: BOARD_COLORS.green, borderTopWidth: (cellSize * 3) / 2, borderTopColor: 'transparent', borderBottomWidth: (cellSize * 3) / 2, borderBottomColor: 'transparent' }} />
                    {/* Yellow triangle (Bottom) */}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderBottomWidth: (cellSize * 3) / 2, borderBottomColor: BOARD_COLORS.yellow, borderLeftWidth: (cellSize * 3) / 2, borderLeftColor: 'transparent', borderRightWidth: (cellSize * 3) / 2, borderRightColor: 'transparent' }} />
                    {/* Blue triangle (Left) */}
                    <View style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderLeftWidth: (cellSize * 3) / 2, borderLeftColor: BOARD_COLORS.blue, borderTopWidth: (cellSize * 3) / 2, borderTopColor: 'transparent', borderBottomWidth: (cellSize * 3) / 2, borderBottomColor: 'transparent' }} />
                  </View>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#fbbf24', alignItems: 'center', justifyContent: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 }}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                  </View>
                </View>
                {/* Green Path row 8 */}
                <View style={{ flex: 6 }}>
                  {[6,7,8].map(r => (
                    <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                      {Array.from({ length: 6 }).map((_, colOffset) => {
                        const c = colOffset + 9;
                        const isGreenStretch = r === 7 && c >= 9 && c <= 13;
                        const isGreenStart = r === 8 && c === 13;
                        const isSafe = (r === 8 && c === 13) || (r === 6 && c === 12);
                        
                        let bgColor = '#131926';
                        if (isGreenStretch) bgColor = BOARD_COLORS.green;
                        else if (isGreenStart) bgColor = BOARD_COLORS.greenLight;
                        
                        return (
                          <View key={colOffset} style={{ flex: 1, backgroundColor: bgColor, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                            {isSafe && <Text style={{ fontSize: 11, color: '#fbbf24' }}>⭐</Text>}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
   
              {/* Row 9-14: Yellow Home (9-14,0-5) | Yellow Path (9-14,6-8) | Green Home (9-14,9-14) */}
              <View style={{ flex: 6, flexDirection: 'row' }}>
                {/* Yellow Home 6x6 */}
                <LinearGradient
                  colors={['#b45309', '#ffa502']}
                  style={{ flex: 6, borderWidth: 3, borderColor: BOARD_COLORS.yellow, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}
                >
                  <View style={{ width: '92%', height: '92%', borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)' }} />
                </LinearGradient>
                {/* Yellow Path col 6-8 */}
                <View style={{ flex: 3 }}>
                  {Array.from({ length: 6 }).map((_, rOffset) => {
                    const r = rOffset + 9;
                    return (
                      <View key={rOffset} style={{ flex: 1, flexDirection: 'row' }}>
                        {[6,7,8].map(c => {
                          const isYellowStretch = c === 7 && r >= 9 && r <= 13;
                          const isYellowStart = r === 13 && c === 6;
                          const isSafe = (r === 13 && c === 6) || (r === 12 && c === 8);
                          
                          let bgColor = '#131926';
                          if (isYellowStretch) bgColor = BOARD_COLORS.yellow;
                          else if (isYellowStart) bgColor = BOARD_COLORS.yellowLight;
                          
                          return (
                            <View key={c} style={{ flex: 1, backgroundColor: bgColor, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                              {isSafe && <Text style={{ fontSize: 11, color: '#fbbf24' }}>⭐</Text>}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
                {/* Green Home 6x6 */}
                <LinearGradient
                  colors={['#065f46', '#10b981']}
                  style={{ flex: 6, borderWidth: 3, borderColor: BOARD_COLORS.green, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}
                >
                  <View style={{ width: '92%', height: '92%', borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)' }} />
                </LinearGradient>
              </View>
            </View>

            {/* Base slots rendered absolutely for 100% perfect goti alignment */}
            {Object.entries(HOME_BASE).flatMap(([color, coords]) =>
              coords.map((coord, i) => {
                const [r, c] = coord;
                const cellX = (c / 15) * innerBoardSize + (cellSize / 2);
                const cellY = (r / 15) * innerBoardSize + (cellSize / 2);
                const slotSize = cellSize * 0.72;
                
                const darkSlotColor = color === 'blue' ? 'rgba(30, 144, 255, 0.45)'
                  : color === 'red' ? 'rgba(255, 71, 87, 0.45)'
                  : color === 'yellow' ? 'rgba(255, 165, 2, 0.45)'
                  : 'rgba(46, 213, 115, 0.45)';

                return (
                  <View
                    key={`${color}_slot_${i}`}
                    style={{
                      position: 'absolute',
                      left: cellX - slotSize / 2,
                      top: cellY - slotSize / 2,
                      width: slotSize,
                      height: slotSize,
                      borderRadius: slotSize / 2,
                      backgroundColor: darkSlotColor,
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.12)',
                    }}
                  />
                );
              })
            )}

            {/* Pieces Overlay with Multi-piece overlap resolution */}
            {(() => {
              // Group pieces by coordinate
              const coordGroups: Record<string, any[]> = {};
              piecesOnBoard.forEach(item => {
                const [r, c] = item.coord as [number, number];
                const key = `${r}_${c}`;
                if (!coordGroups[key]) coordGroups[key] = [];
                coordGroups[key].push(item);
              });

              const PIECE_EMOJIS: Record<string, string> = {
                red: '🐻',
                green: '🐼',
                blue: '🐱',
                yellow: '🦁',
              };

              return piecesOnBoard.map(({ piece, coord }, idx) => {
                const [r, c] = coord as [number, number];
                const isClickable = movablePieces.some(mp => mp.id === piece.id);
                
                let offsetX = 0;
                let offsetY = 0;
                const key = `${r}_${c}`;
                const group = coordGroups[key] || [];
                const groupIndex = group.findIndex(item => item.piece.id === piece.id);
                const count = group.length;
                
                if (count > 1 && groupIndex !== -1) {
                  const radius = cellSize * 0.22;
                  const angle = (groupIndex * 2 * Math.PI) / count;
                  offsetX = Math.cos(angle) * radius;
                  offsetY = Math.sin(angle) * radius;
                }

                return (
                  <AnimatedLudoPiece
                    key={piece.id}
                    piece={piece}
                    coord={coord as [number, number]}
                    boardSize={boardSize}
                    cellSize={cellSize}
                    innerBoardSize={innerBoardSize}
                    boardBorderWidth={boardBorderWidth}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    isClickable={isClickable}
                    arrowAnim={arrowAnim}
                    handleMovePiece={handleMovePiece}
                    idx={idx}
                    myColor={myColor || ''}
                    movablePieces={movablePieces}
                  />
                );
              });
            })()}

            {/* Corner Avatars & Usernames Badge Overlay on Board Coordinates */}
            {['red', 'green', 'yellow', 'blue'].map((color) => {
              const p = gameState?.players.find((player: any) => player.color === color);
              if (!p) return null;

              // Positioning avatars relative to the board boundaries (consistent with visual colors mapping)
              // Blue (top-left), Red (top-right), Yellow (bottom-left), Green (bottom-right)
              const posStyle = color === 'blue' ? { top: -42, left: -28 }
                : color === 'red' ? { top: -42, right: -12 }
                : color === 'yellow' ? { bottom: -42, left: -28 }
                : { bottom: -42, right: -12 };

              // Username capsule badge - now placed where the dice was (above or below the avatar)
              const capsuleStyle = [
                {
                  position: 'absolute' as const,
                  top: (color === 'blue' || color === 'red') ? 52 : -20,
                },
                (color === 'blue' || color === 'yellow') ? { left: 42 } : { right: 38 }
              ];

              const isCurrentTurn = gameState?.turn === p.uid;

              return (
                <View key={p.uid} style={[{ position: 'absolute', zIndex: 110, alignItems: 'center', justifyContent: 'center' }, posStyle]}>
                  {/* Username capsule badge */}
                  <View style={[{ position: 'absolute', backgroundColor: 'rgba(15, 23, 42, 0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: isCurrentTurn ? '#ffd700' : COLOR_HEX[color], alignItems: 'center', width: 85, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 }, capsuleStyle]}>
                    <Text numberOfLines={1} style={{ color: isCurrentTurn ? '#ffd700' : 'white', fontSize: 10, fontWeight: 'bold' }}>
                      {isCurrentTurn ? `${p.username} (${timeLeft}s)` : p.username}
                    </Text>
                  </View>

                  {/* Circular Avatar */}
                  <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3.5, borderColor: COLOR_HEX[color], backgroundColor: '#1e293b', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 6, elevation: 6 }}>
                    {p.avatarUrl ? (
                      <Image source={{ uri: toCDN(p.avatarUrl) }} style={{ width: '100%', height: '100%' }} cachePolicy="memory-disk" />
                    ) : (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>{p.username[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  {/* Speech-bubble card style Dice result overlay next to avatar (where name capsule was) */}
                  {isCurrentTurn && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleRollDice}
                      style={[
                        {
                          position: 'absolute',
                          width: 45,
                          height: 45,
                          borderRadius: 10,
                          backgroundColor: '#ffffff',
                          borderWidth: 1.5,
                          borderColor: '#e2e8f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 6,
                        },
                        color === 'blue' || color === 'yellow' ? { left: 34 } : { right: 62 }
                      ]}
                    >
                      {/* Speech Bubble Pointer Arrow */}
                      <View style={{
                        position: 'absolute',
                        top: 17,
                        width: 0,
                        height: 0,
                        borderStyle: 'solid',
                        borderTopWidth: 5,
                        borderTopColor: 'transparent',
                        borderBottomWidth: 5,
                        borderBottomColor: 'transparent',
                        ...(color === 'blue' || color === 'yellow'
                          ? { left: -6, borderRightWidth: 6, borderRightColor: '#ffffff' }
                          : { right: -6, borderLeftWidth: 6, borderLeftColor: '#ffffff' }
                        )
                      }} />
                      {isMyTurn && !gameState.diceRolled ? (
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#ff4757', letterSpacing: 0.5 }}>ROLL</Text>
                      ) : gameState?.diceRolled && gameState?.dice ? (
                        <DiceDots value={gameState.dice} size={6} />
                      ) : (
                        <Text style={{ fontSize: 20 }}>🎲</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = {
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
};

