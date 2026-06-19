import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { X, Volume2, VolumeX } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useLudoEngine } from '../../hooks/use-ludo-engine';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LudoGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string }) => void;
  isMuted?: boolean;
}

// ── 52-cell main path mapped to [row, col] on 15×15 grid ──
const PATH_COORDS: [number, number][] = [
  // Red arm right (row 6)
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // Up (col 6)
  [5,6],[4,6],[3,6],[2,6],[1,6],
  // Right (row 1)
  [1,7],[1,8],[1,9],[1,10],[1,11],[1,12],
  // Down (col 13)
  [2,13],[3,13],[4,13],[5,13],[6,13],
  // Left (row 7)
  [7,13],[7,12],[7,11],[7,10],[7,9],[7,8],
  // Down (col 7)
  [8,7],[9,7],[10,7],[11,7],[12,7],[13,7],
  // Left (row 13)
  [13,6],[13,5],[13,4],[13,3],[13,2],[13,1],
  // Up (col 1)
  [12,1],[11,1],[10,1],[9,1],[8,1],
  // Right (row 8) — last 3 cells complete the circuit
  [8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[8,8],[8,9],
];

// Home stretch for each color (positions 53-57)
const HOME_STRETCH: Record<string, [number, number][]> = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

// Start positions for each color (position 1 on the path)
const COLOR_START_INDEX: Record<string, number> = {
  red: 0,
  green: 15,
  yellow: 28,
  blue: 41,
};

// Home base positions (inside the colored quadrants)
const HOME_BASE: Record<string, [number, number][]> = {
  red:    [[2,2],[2,4],[4,2],[4,4]],
  green:  [[2,10],[2,12],[4,10],[4,12]],
  yellow: [[10,10],[10,12],[12,10],[12,12]],
  blue:   [[10,2],[10,4],[12,2],[12,4]],
};

const COLOR_HEX: Record<string, string> = {
  red: '#EF4444', green: '#22C55E', yellow: '#EAB308', blue: '#3B82F6',
};

const COLOR_DARK: Record<string, string> = {
  red: '#DC2626', green: '#16A34A', yellow: '#CA8A04', blue: '#2563EB',
};

const BOARD_COLORS = {
  red: '#ED1C24', green: '#00A651', blue: '#2E3192', yellow: '#F9ED32',
  redLight: '#FCA5A5', greenLight: '#86EFAC', blueLight: '#93C5FD', yellowLight: '#FDE047',
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
function DiceDots({ value, size = 8 }: { value: number; size?: number }) {
  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: '#1e293b' };
  const abs = (t?: number, l?: number, b?: number, r?: number): any => ({
    position: 'absolute' as const,
    ...(t !== undefined ? { top: t } : {}),
    ...(l !== undefined ? { left: l } : {}),
    ...(b !== undefined ? { bottom: b } : {}),
    ...(r !== undefined ? { right: r } : {}),
  });
  const mid = (v: number): any => ({ position: 'absolute' as const, top: '50%' as const, transform: [{ translateY: -v / 2 }] });

  if (value === 1) return <View style={abs(8,8,8,8)}><View style={[dot, { alignSelf: 'center' }]} /></View>;
  if (value === 2) return <><View style={abs(8,undefined,undefined,8)}><View style={dot} /></View><View style={abs(undefined,8,8)}><View style={dot} /></View></>;
  if (value === 3) return <><View style={abs(8,undefined,undefined,8)}><View style={dot} /></View><View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -size/2 }, { translateY: -size/2 }] }}><View style={dot} /></View><View style={abs(undefined,8,8)}><View style={dot} /></View></>;
  if (value === 4) return <><View style={abs(8,undefined,undefined,8)}><View style={dot} /></View><View style={abs(8,8)}><View style={dot} /></View><View style={abs(undefined,8,8)}><View style={dot} /></View><View style={abs(undefined,undefined,8,8)}><View style={dot} /></View></>;
  if (value === 5) return <><View style={abs(8,undefined,undefined,8)}><View style={dot} /></View><View style={abs(8,8)}><View style={dot} /></View><View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -size/2 }, { translateY: -size/2 }] }}><View style={dot} /></View><View style={abs(undefined,8,8)}><View style={dot} /></View><View style={abs(undefined,undefined,8,8)}><View style={dot} /></View></>;
  return <><View style={abs(8,undefined,undefined,8)}><View style={dot} /></View><View style={abs(8,8)}><View style={dot} /></View><View style={{ position: 'absolute', top: '33%', left: 8 }}><View style={dot} /></View><View style={{ position: 'absolute', top: '33%', right: 8 }}><View style={dot} /></View><View style={abs(undefined,8,8)}><View style={dot} /></View><View style={abs(undefined,undefined,8,8)}><View style={dot} /></View></>;
}

export function LudoGame({ onClose, roomId, onRoundEnd, isMuted }: LudoGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const { gameState, isLoading, joinLobby, rollDice, movePiece } = useLudoEngine(roomId || 'lobby', currentUser?.uid || null);

  const [isLaunching, setIsLaunching] = useState(true);
  const diceAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => setIsLaunching(false), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!gameState && !isLoading && !isLaunching) {
      joinLobby(userProfile);
    }
  }, [gameState, isLoading, isLaunching]);

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

  // Bounce animation for TAP
  useEffect(() => {
    if (isMyTurn && !gameState?.diceRolled) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -8, duration: 400, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      bounceAnim.setValue(0);
    }
  }, [isMyTurn, gameState?.diceRolled]);

  const handleRollDice = useCallback(() => {
    if (!isMyTurn || gameState?.diceRolled) return;
    // Dice shake animation
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

  // ── Launching Screen ──
  if (isLaunching || isLoading || !gameState) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1a4a', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ rotate: diceAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <Text style={{ fontSize: 64 }}>🎲</Text>
        </Animated.View>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', marginTop: 24, letterSpacing: -0.5 }}>
          Synchronizing Arena
        </Text>
        <View style={{ width: 200, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', marginTop: 16 }}>
          <Animated.View style={{ height: '100%', backgroundColor: '#fbbf24', borderRadius: 99, width: '60%' }} />
        </View>
      </View>
    );
  }

  // ── Ended Screen ──
  if (gameState.status === 'ended') {
    const iWon = gameState.winner === currentUser?.uid;
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1a4a', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 72, marginBottom: 16 }}>{iWon ? '🏆' : '😢'}</Text>
        <Text style={{ color: '#fbbf24', fontSize: 32, fontWeight: '900', marginBottom: 8 }}>
          {iWon ? 'YOU WIN!' : 'GAME OVER'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
          {iWon ? 'Congratulations, Champion!' : 'Better luck next time!'}
        </Text>
        <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#fbbf24', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 99, shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
          <Text style={{ color: '#0a1a4a', fontWeight: '900', fontSize: 16 }}>BACK TO ROOM</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const boardSize = Math.min(SCREEN_WIDTH - 24, 380);
  const cellSize = boardSize / 15;

  const piecesOnBoard = gameState.pieces.map((piece: any) => {
    const coord = piecePosition(piece, myColor || '');
    return { piece, coord };
  }).filter(p => p.coord);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a1a4a', borderRadius: 24, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, zIndex: 40 }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5, fontStyle: 'italic' }}>
          Ludo • Multiplayer
        </Text>
      </View>

      {/* Board Area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: boardSize, height: boardSize, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#D1D5DB', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 50, elevation: 20 }}>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {/* Row 0-5: Red Home (0-5,0-5) | Green Path (0-5,6-8) | Green Home (0-5,9-14) */}
            <View style={{ flex: 6, flexDirection: 'row' }}>
              {/* Red Home 6x6 */}
              <View style={{ flex: 6, backgroundColor: BOARD_COLORS.red, padding: 6 }}>
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 8 }}>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignContent: 'center' }}>
                    {[0,1,2,3].map(i => {
                      const piece = gameState.pieces.find((p: any) => p.color === 'red' && parseInt(p.id.split('_')[1]) === i);
                      return (
                        <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BOARD_COLORS.red, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              {/* Green Path col 6-8 */}
              <View style={{ flex: 3 }}>
                {Array.from({ length: 6 }).map((_, r) => (
                  <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                    {[6,7,8].map(c => {
                      const isGreenEntry = (r === 0 && c === 7) || (r === 1 && c === 7) || (r === 2 && c === 7) || (r === 3 && c === 7) || (r === 4 && c === 7);
                      const isSafe = SAFE_POSITIONS.some(sp => {
                        const startIdx = COLOR_START_INDEX.green;
                        const pathIdx = (startIdx + sp - 1) % PATH_COORDS.length;
                        return PATH_COORDS[pathIdx]?.[0] === r && PATH_COORDS[pathIdx]?.[1] === c;
                      });
                      return (
                        <View key={c} style={{ flex: 1, backgroundColor: isGreenEntry ? BOARD_COLORS.greenLight : 'white', borderWidth: 0.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                          {isSafe && <Text style={{ fontSize: 10 }}>⭐</Text>}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
              {/* Green Home 6x6 */}
              <View style={{ flex: 6, backgroundColor: BOARD_COLORS.green, padding: 6 }}>
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 8 }}>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignContent: 'center' }}>
                    {[0,1,2,3].map(i => (
                      <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BOARD_COLORS.green, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Row 6-8: Red Path (row 6) | Center (6-8,6-8) | Yellow Path (row 8) */}
            <View style={{ flex: 3, flexDirection: 'row' }}>
              {/* Red Path row 6 */}
              <View style={{ flex: 6 }}>
                {[6,7,8].map(r => (
                  <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                    {Array.from({ length: 6 }).map((_, c) => {
                      const isRedEntry = r === 6 && c >= 0 && c <= 4;
                      const isSafe = SAFE_POSITIONS.some(sp => {
                        const startIdx = COLOR_START_INDEX.red;
                        const pathIdx = (startIdx + sp - 1) % PATH_COORDS.length;
                        return PATH_COORDS[pathIdx]?.[0] === r && PATH_COORDS[pathIdx]?.[1] === c;
                      });
                      return (
                        <View key={c} style={{ flex: 1, backgroundColor: isRedEntry ? BOARD_COLORS.redLight : 'white', borderWidth: 0.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                          {isSafe && <Text style={{ fontSize: 10 }}>⭐</Text>}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
              {/* Center 3x3 */}
              <View style={{ flex: 3, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Conic gradient approximation with 4 triangles */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  {/* Top-left (Red) */}
                  <View style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '50%', backgroundColor: BOARD_COLORS.red }} />
                  {/* Top-right (Green) */}
                  <View style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', backgroundColor: BOARD_COLORS.green }} />
                  {/* Bottom-left (Blue) */}
                  <View style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', backgroundColor: BOARD_COLORS.blue }} />
                  {/* Bottom-right (Yellow) */}
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: '50%', height: '50%', backgroundColor: BOARD_COLORS.yellow }} />
                </View>
                <Text style={{ fontSize: 24, zIndex: 10 }}>🏆</Text>
              </View>
              {/* Yellow Path row 8 */}
              <View style={{ flex: 6 }}>
                {[6,7,8].map(r => (
                  <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                    {Array.from({ length: 6 }).map((_, c) => {
                      const isYellowEntry = r === 8 && c >= 0 && c <= 4;
                      return (
                        <View key={c} style={{ flex: 1, backgroundColor: isYellowEntry ? BOARD_COLORS.yellowLight : 'white', borderWidth: 0.5, borderColor: '#e5e7eb' }} />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Row 9-14: Blue Home (9-14,0-5) | Blue Path (9-14,6-8) | Yellow Home (9-14,9-14) */}
            <View style={{ flex: 6, flexDirection: 'row' }}>
              {/* Blue Home 6x6 */}
              <View style={{ flex: 6, backgroundColor: BOARD_COLORS.blue, padding: 6 }}>
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 8 }}>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignContent: 'center' }}>
                    {[0,1,2,3].map(i => (
                      <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BOARD_COLORS.blue, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              {/* Blue Path col 6-8 */}
              <View style={{ flex: 3 }}>
                {Array.from({ length: 6 }).map((_, r) => (
                  <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
                    {[6,7,8].map(c => {
                      const isBlueEntry = c === 7 && r >= 1 && r <= 5;
                      return (
                        <View key={c} style={{ flex: 1, backgroundColor: isBlueEntry ? BOARD_COLORS.blueLight : 'white', borderWidth: 0.5, borderColor: '#e5e7eb' }} />
                      );
                    })}
                  </View>
                ))}
              </View>
              {/* Yellow Home 6x6 */}
              <View style={{ flex: 6, backgroundColor: BOARD_COLORS.yellow, padding: 6 }}>
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 8 }}>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignContent: 'center' }}>
                    {[0,1,2,3].map(i => (
                      <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BOARD_COLORS.yellow, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Pieces Overlay — rendered on top of the board */}
          {piecesOnBoard.map(({ piece, coord }, idx) => {
            const [r, c] = coord as [number, number];
            const isClickable = movablePieces.some(mp => mp.id === piece.id);
            const cellX = (c / 15) * boardSize + (cellSize / 2);
            const cellY = (r / 15) * boardSize + (cellSize / 2);
            const pieceSize = cellSize * 0.7;
            return (
              <TouchableOpacity
                key={piece.id}
                activeOpacity={0.7}
                onPress={() => isClickable && handleMovePiece(piece.id)}
                style={{
                  position: 'absolute',
                  left: cellX - pieceSize / 2,
                  top: cellY - pieceSize / 2,
                  width: pieceSize,
                  height: pieceSize,
                  borderRadius: pieceSize / 2,
                  backgroundColor: COLOR_HEX[piece.color] || '#999',
                  borderWidth: isClickable ? 3 : 2,
                  borderColor: isClickable ? '#fbbf24' : 'rgba(255,255,255,0.9)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: isClickable ? '#fbbf24' : '#000',
                  shadowOffset: { width: 0, height: isClickable ? 0 : 1 },
                  shadowOpacity: isClickable ? 0.8 : 0.3,
                  shadowRadius: isClickable ? 12 : 4,
                  elevation: isClickable ? 10 : 4,
                  zIndex: isClickable ? 100 : idx + 10,
                }}
              >
                <View style={{ width: pieceSize * 0.4, height: pieceSize * 0.4, borderRadius: pieceSize * 0.2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                {piece.position >= 58 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Player Avatars at Corners */}
      {gameState.players.map((p: any) => {
        const posStyle = p.color === 'red' ? { top: 60, left: 4 }
          : p.color === 'green' ? { top: 60, right: 4 }
          : p.color === 'blue' ? { bottom: 140, left: 4 }
          : { bottom: 140, right: 4 };
        const isActive = gameState.turn === p.uid;
        return (
          <View key={p.uid} style={[styles.playerAvatar, posStyle, { borderColor: COLOR_HEX[p.color], opacity: isActive ? 1 : 0.5 }]}>
            {p.avatarUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
            ) : (
              <View style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: COLOR_HEX[p.color], alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>{p.username[0]}</Text>
              </View>
            )}
            {isActive && <View style={styles.activeGlow} />}
          </View>
        );
      })}

      {/* Bottom Controls */}
      <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
        {/* Status */}
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>
          {isMyTurn ? (gameState.diceRolled ? `Rolled ${gameState.dice} — Tap a piece` : 'Your Turn — Roll the Dice!') : "Opponent's Turn"}
        </Text>

        {/* Dice + Turn Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {/* Dice */}
          <Animated.View style={{
            width: 100, height: 100, borderRadius: 20, backgroundColor: 'white',
            borderWidth: 8, borderColor: isMyTurn ? '#22D3EE' : '#D1D5DB',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
            transform: [{ scale: diceAnim }],
          }}>
            {isMyTurn && !gameState.diceRolled ? (
              <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#22D3EE' }}>TAP</Text>
              </Animated.View>
            ) : gameState?.dice ? (
              <DiceDots value={gameState.dice} size={10} />
            ) : (
              <Text style={{ fontSize: 40, fontWeight: '900', color: '#94A3B8' }}>?</Text>
            )}
          </Animated.View>

          {/* Turn Badge */}
          {isMyTurn && (
            <View style={{ backgroundColor: '#22D3EE', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 }}>
              <Text style={{ color: '#0a1a4a', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>YOUR TURN</Text>
            </View>
          )}
        </View>
      </View>
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
  playerAvatar: {
    position: 'absolute' as const,
    width: 56, height: 56, borderRadius: 14,
    borderWidth: 3, borderStyle: 'solid' as const,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 10,
    zIndex: 20, overflow: 'hidden' as const,
  },
  activeGlow: {
    position: 'absolute' as const, top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 18, borderWidth: 2, borderColor: '#fbbf24',
    shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12,
  },
};
