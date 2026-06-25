import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Easing, ScrollView } from 'react-native';
import { X, Volume2, VolumeX, Crown, Swords, Clock } from 'lucide-react-native';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useChessEngine } from '../../hooks/use-chess-engine';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  parseFen, boardToFen, legalMoves, makeMove,
  getGameStatus, pieceToUnicode, getInitialBoard,
  Board, Piece, PieceColor, PieceType,
} from '../../lib/chess-engine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

function sortCapturedPieces(pieces: Piece[]): Piece[] {
  return [...pieces].sort((a, b) => {
    const va = a?.type ? (PIECE_VALUES[a.type] ?? 0) : 0;
    const vb = b?.type ? (PIECE_VALUES[b.type] ?? 0) : 0;
    return vb - va;
  });
}

function pieceToShadow(type: PieceType): string {
  return type === 'k' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
}

interface ChessGameProps {
  onClose: () => void;
  roomId?: string;
  onRoundEnd?: (data: { resultText: string; resultEmoji: string }) => void;
  isMuted?: boolean;
  isAdmin?: boolean;
}

export function ChessGame({ onClose, roomId, onRoundEnd, isMuted: isMutedProp, isAdmin }: ChessGameProps) {
  const { user: currentUser } = useUser();
  const { profile: userProfile } = useUserProfile(currentUser?.uid);
  const { gameState, isLoading, startMatch, startGame, makeMove: engineMove, endGame } = useChessEngine(roomId || 'lobby', currentUser?.uid || null);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);

  const [isLaunching, setIsLaunching] = useState(true);
  const [localLobbyMode, setLocalLobbyMode] = useState<'classic' | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const t = setTimeout(() => setIsLaunching(false), 5000);
    return () => clearTimeout(t);
  }, []);

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

  // Lobby countdown timer when both white and black players exist (2 players)
  useEffect(() => {
    if (!gameState || gameState.status !== 'lobby') {
      setCountdown(30);
      return;
    }

    const numPlayers = (gameState.white ? 1 : 0) + (gameState.black ? 1 : 0);
    if (numPlayers < 2) {
      setCountdown(30);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-start triggered only by the white player (host)
          const isHost = gameState.white?.uid === currentUser?.uid;
          if (isHost) {
            startGame();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.white, gameState?.black, currentUser?.uid, startGame]);

  // Cleanup unmount: if overlay is closed while playing/lobby, set game to ended
  useEffect(() => {
    return () => {
      if (gameState?.status === 'playing' || gameState?.status === 'lobby') {
        endGame('ended');
      }
    };
  }, [gameState?.status, endGame]);

  const board = useMemo(() => {
    if (!gameState?.fen) return getInitialBoard();
    return parseFen(gameState.fen);
  }, [gameState?.fen]);

  const myColor: PieceColor | null = useMemo(() => {
    if (!currentUser?.uid || !gameState) return null;
    if (gameState.white?.uid === currentUser.uid) return 'w';
    if (gameState.black?.uid === currentUser.uid) return 'b';
    return null;
  }, [currentUser?.uid, gameState]);

  const isMyTurn = gameState?.status === 'playing' && myColor === gameState?.turn;
  const opponentColor: PieceColor | null = myColor === 'w' ? 'b' : myColor === 'b' ? 'w' : null;

  const selectedMoves = useMemo(() => {
    if (!selectedSquare || !board) return [];
    const row = 8 - parseInt(selectedSquare[1]);
    const col = selectedSquare.charCodeAt(0) - 97;
    return legalMoves(board, row, col);
  }, [selectedSquare, board]);

  // Track captured pieces from FEN
  useEffect(() => {
    if (!gameState?.fen) return;
    const currentBoard = parseFen(gameState.fen);
    const initialBoard = getInitialBoard();

    const wCaptures: Piece[] = [];
    const bCaptures: Piece[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const init = initialBoard[r][c];
        const curr = currentBoard[r][c];
        if (init && !curr) {
          if (init.color === 'w') bCaptures.push(init);
          else wCaptures.push(init);
        }
      }
    }

    setCapturedByWhite(sortCapturedPieces(wCaptures));
    setCapturedByBlack(sortCapturedPieces(bCaptures));
  }, [gameState?.fen]);

  const findKing = useCallback((b: Board, color: PieceColor): [number, number] | null => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === 'k' && p.color === color) return [r, c];
      }
    }
    return null;
  }, []);

  const isInCheck = useMemo(() => {
    if (!board || !opponentColor) return false;
    const king = findKing(board, gameState?.turn || 'w');
    if (!king) return false;
    const [kr, kc] = king;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === opponentColor) {
          const moves = legalMoves(board, r, c);
          if (moves.some(([mr, mc]) => mr === kr && mc === kc)) return true;
        }
      }
    }
    return false;
  }, [board, gameState?.turn, opponentColor, findKing]);

  // Bot move logic for Chess
  useEffect(() => {
    if (!gameState || !gameState.isBotMode || gameState.status !== 'playing' || gameState.turn !== 'b') return;

    const timer = setTimeout(() => {
      const moves: { from: [number, number]; to: [number, number] }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.color === 'b') {
            const legals = legalMoves(board, r, c);
            legals.forEach(([tr, tc]) => {
              moves.push({ from: [r, c], to: [tr, tc] });
            });
          }
        }
      }

      if (moves.length === 0) {
        const status = getGameStatus(board, 'b');
        if (status === 'checkmate' || status === 'stalemate') {
          endGame(status, status === 'checkmate' ? gameState.white?.uid : undefined);
        }
        return;
      }

      // Prioritize captures, or select a random move
      let chosenMove = moves[Math.floor(Math.random() * moves.length)];
      const captureMoves = moves.filter(m => board[m.to[0]][m.to[1]] !== null);
      if (captureMoves.length > 0 && Math.random() < 0.7) {
        chosenMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }

      const { from: [sr, sc], to: [tr, tc] } = chosenMove;
      const newBoard = makeMove(board, sr, sc, tr, tc);
      if (newBoard) {
        const fromCoord = `${String.fromCharCode(97 + sc)}${8 - sr}`;
        const toCoord = `${String.fromCharCode(97 + tc)}${8 - tr}`;
        const newFen = boardToFen(newBoard, 'w');
        const status = getGameStatus(newBoard, 'w');

        setLastMove({ from: fromCoord, to: toCoord });
        engineMove(newFen);

        if (status === 'checkmate' || status === 'stalemate') {
          endGame(status, status === 'checkmate' ? 'bot' : undefined);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState?.turn, gameState?.status, gameState?.isBotMode, board, engineMove, endGame]);

  const handleSquarePress = (r: number, c: number) => {
    if (!isMyTurn) return;

    const coord = `${String.fromCharCode(97 + c)}${8 - r}`;
    const piece = board[r][c];

    if (selectedSquare) {
      const sr = 8 - parseInt(selectedSquare[1]);
      const sc = selectedSquare.charCodeAt(0) - 97;
      const isLegal = legalMoves(board, sr, sc).some(([mr, mc]) => mr === r && mc === c);

      if (isLegal) {
        const newBoard = makeMove(board, sr, sc, r, c);
        if (newBoard) {
          const newFen = boardToFen(newBoard, gameState.turn === 'w' ? 'b' : 'w');
          const status = getGameStatus(newBoard, gameState.turn === 'w' ? 'b' : 'w');

          setLastMove({ from: selectedSquare, to: coord });
          engineMove(newFen);

          if (status === 'checkmate' || status === 'stalemate') {
            endGame(status, status === 'checkmate' ? currentUser?.uid : undefined);
          }
        }
        setSelectedSquare(null);
        return;
      }

      if (piece && piece.color === myColor) {
        setSelectedSquare(coord);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === myColor) {
      setSelectedSquare(coord);
    }
  };

  if (isLaunching || isLoading) {
    return <LoadingScreen />;
  }

  // ── Early Fullscreen Mode Selection ──
  if ((!gameState || ['ended', 'checkmate', 'stalemate', 'draw', 'resigned'].includes(gameState.status)) && !localLobbyMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../../../assets/images/games/chess.jpg')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }}
          contentFit="cover"
        />
        <View style={{
          width: '85%',
          backgroundColor: '#334155',
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
            onPress={() => {
              setLocalLobbyMode('classic');
              startMatch(userProfile);
            }}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 25,
              backgroundColor: '#fbbf24',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#fbbf24',
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 3,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>CLASSIC CHESS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setLocalLobbyMode('classic');
              startMatch(userProfile, true);
            }}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 25,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#fbbf24',
            }}
          >
            <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>🤖 PLAY WITH ROBOT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (gameState.status === 'lobby') {
    return (
      <LobbyScreen
        gameState={gameState}
        currentUser={currentUser}
        userProfile={userProfile}
        onJoin={() => startMatch(userProfile)}
        onStart={startGame}
        onClose={onClose}
        countdown={countdown}
        isAdmin={isAdmin}
      />
    );
  }

  if (gameState.status === 'checkmate' || gameState.status === 'stalemate' || gameState.status === 'draw' || gameState.status === 'resigned') {
    const iWon = gameState.winner === currentUser?.uid;
    return <EndedScreen status={gameState.status} iWon={iWon} onClose={onClose} />;
  }

  const boardSize = Math.min(SCREEN_WIDTH - 32, 380);
  const squareSize = boardSize / 8;
  const legalMoveSet = new Set(selectedMoves.map(([r, c]) => `${r},${c}`));

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: 24, overflow: 'hidden' }}>
      {/* Players Row (DPs side-by-side on both sides under header) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 36, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        {/* Left Player (White) */}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <PlayerBadgeCompact
            label={gameState.white?.username || 'White'}
            isMe={gameState.white?.uid === currentUser?.uid}
            isActive={gameState.turn === 'w'}
            isWhite={true}
          />
          {/* Captured by Black (White pieces captured) */}
          <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', gap: 2 }}>
            {capturedByBlack.map((p, i) => (
              <Text key={i} style={{ fontSize: 12, opacity: 0.5, color: '#94a3b8' }}>{pieceToUnicode(p)}</Text>
            ))}
          </View>
        </View>

        {/* VS / Turn Indicator */}
        <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isMyTurn ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isMyTurn ? '#22c55e' : '#ef4444' }} />
            <Text style={{ color: isMyTurn ? '#22c55e' : '#ef4444', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isMyTurn ? `Your Turn (${timeLeft}s)` : `Their Turn (${timeLeft}s)`}
            </Text>
          </View>
          {isInCheck && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
              <Crown size={10} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '900' }}>CHECK</Text>
            </View>
          )}
        </View>

        {/* Right Player (Black) */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <PlayerBadgeCompact
            label={gameState.black?.username || 'Black'}
            isMe={gameState.black?.uid === currentUser?.uid}
            isActive={gameState.turn === 'b'}
            isWhite={false}
          />
          {/* Captured by White (Black pieces captured) */}
          <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', gap: 2, justifyContent: 'flex-end' }}>
            {capturedByWhite.map((p, i) => (
              <Text key={i} style={{ fontSize: 12, opacity: 0.5, color: '#94a3b8' }}>{pieceToUnicode(p)}</Text>
            ))}
          </View>
        </View>
      </View>

      {/* Board */}
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginTop: 10 }}>
        {/* Rank labels + Board */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 14, marginRight: 2 }}>
            {RANKS.map((rank, i) => (
              <View key={rank} style={{ height: squareSize, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '700' }}>{rank}</Text>
              </View>
            ))}
          </View>

          <View style={{
            width: boardSize, height: boardSize,
            borderWidth: 3, borderColor: '#334155', borderRadius: 4,
            overflow: 'hidden', elevation: 10,
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
          }}>
            {Array.from({ length: 8 }).map((_, r) => (
              <View key={r} style={{ flexDirection: 'row', flex: 1 }}>
                {Array.from({ length: 8 }).map((_, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const coord = `${String.fromCharCode(97 + c)}${8 - r}`;
                  const isSelected = selectedSquare === coord;
                  const isLastMove = lastMove && (lastMove.from === coord || lastMove.to === coord);
                  const isLegalMove = legalMoveSet.has(`${r},${c}`);
                  const piece = board[r][c];
                  const hasEnemy = piece && piece.color !== myColor;
                  const isCapture = isLegalMove && hasEnemy;
                  const isKingInCheck = isInCheck && piece?.type === 'k' && piece.color === gameState?.turn;

                  return (
                    <TouchableOpacity
                      key={c}
                      activeOpacity={0.7}
                      onPress={() => handleSquarePress(r, c)}
                      style={{
                        flex: 1,
                        backgroundColor: isSelected
                          ? 'rgba(250,204,21,0.7)'
                          : isKingInCheck
                          ? 'rgba(239,68,68,0.5)'
                          : isLastMove
                          ? 'rgba(250,204,21,0.3)'
                          : isDark ? '#006B3F' : '#E8F5E9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isLegalMove && !hasEnemy && (
                        <View style={{
                          width: squareSize * 0.28, height: squareSize * 0.28,
                          borderRadius: squareSize * 0.14,
                          backgroundColor: 'rgba(0,107,63,0.4)',
                        }} />
                      )}
                      {isCapture && (
                        <View style={{
                          width: squareSize * 0.88, height: squareSize * 0.88,
                          borderRadius: squareSize * 0.44,
                          borderWidth: 3, borderColor: 'rgba(239,68,68,0.7)',
                          position: 'absolute',
                        }} />
                      )}
                      {piece ? (
                        <Text style={{
                          fontSize: squareSize * 0.76,
                          lineHeight: squareSize * 0.88,
                          textShadowColor: pieceToShadow(piece.type),
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2,
                        }}>
                          {pieceToUnicode(piece)}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* File labels */}
        <View style={{ flexDirection: 'row', width: boardSize, marginTop: 3, marginLeft: 16 }}>
          {FILES.map(l => (
            <View key={l} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '700' }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Game controls (e.g. Resign button) */}
      <View style={{ paddingHorizontal: 16, marginTop: 2, marginBottom: 8, alignItems: 'center' }}>
        <TouchableOpacity 
          onPress={() => endGame('resigned', currentUser?.uid || '')}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 4, 
            backgroundColor: 'rgba(239, 68, 68, 0.12)', 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: 'rgba(239, 68, 68, 0.4)',
            shadowColor: '#ef4444',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2
          }}
        >
          <X size={11} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
            Resign
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Lobby Screen ──
function LobbyScreen({ gameState, currentUser, userProfile, onJoin, onStart, onClose, countdown, isAdmin }: {
  gameState: any;
  currentUser: any;
  userProfile: any;
  onJoin: () => void;
  onStart: () => void;
  onClose: () => void;
  countdown: number;
  isAdmin?: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);

  const hasOpponent = gameState.black && gameState.white;

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 40 }}>
        <TouchableOpacity onPress={onClose}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>
          Chess
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* VS Card */}
      <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Players */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 28 }}>
          {/* White */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fbbf24', elevation: 6 }}>
              <Text style={{ fontSize: 36, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>♔</Text>
            </View>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginTop: 8, maxWidth: 80, textAlign: 'center' }}>{gameState.white?.username || 'Waiting...'}</Text>
            <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '900' }}>WHITE</Text>
          </View>

          <Animated.View style={{ opacity: pulseAnim, transform: [{ scale: scaleAnim }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Swords size={20} color="#fbbf24" />
              <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '900' }}>VS</Text>
              <Swords size={20} color="#fbbf24" />
            </View>
          </Animated.View>

          {/* Black */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: gameState.black ? '#1a1a1a' : 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: gameState.black ? '#fbbf24' : 'rgba(255,255,255,0.08)', borderStyle: gameState.black ? 'solid' : 'dashed', elevation: gameState.black ? 6 : 0 }}>
              <Text style={{ fontSize: 36 }}>{gameState.black ? '♚' : '?'}</Text>
            </View>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginTop: 8, maxWidth: 80, textAlign: 'center' }}>{gameState.black?.username || 'Open'}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900' }}>BLACK</Text>
          </View>
        </View>

        {!hasOpponent ? (
          gameState.white && gameState.white.uid !== currentUser?.uid ? (
            <TouchableOpacity onPress={onJoin}
              style={{ width: '100%', backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#15803d', elevation: 4 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Join as Black</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
              <Animated.View style={{ opacity: pulseAnim }}>
                <Clock size={14} color="rgba(255,255,255,0.4)" />
              </Animated.View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                Waiting for Opponent...
              </Text>
            </View>
          )
        ) : (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '800', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
              Game starting automatically in {countdown}s
            </Text>
            
            {isAdmin ? (
              <TouchableOpacity onPress={onStart}
                style={{ width: '100%', backgroundColor: '#fbbf24', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#b8860b', elevation: 4 }}>
                <Text style={{ color: '#0f172a', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Start Match</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: '100%', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' }}>Waiting for Admin to start...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Ended Screen ──
function EndedScreen({ status, iWon, onClose }: { status: string; iWon: boolean; onClose: () => void }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -10, duration: 500, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ])).start();
  }, []);

  const emoji = status === 'checkmate' ? (iWon ? '👑' : '💀') : status === 'resigned' ? '🏳️' : '🤝';
  const title = status === 'checkmate' ? (iWon ? 'CHECKMATE!' : 'CHECKMATED') : status === 'stalemate' ? 'STALEMATE' : status === 'resigned' ? 'RESIGNED' : 'DRAW';
  const color = iWon ? '#fbbf24' : status === 'stalemate' ? '#94a3b8' : '#ef4444';

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Animated.Text style={{ fontSize: 72, marginBottom: 16, transform: [{ translateY: bounceAnim }] }}>{emoji}</Animated.Text>
      <Text style={{ color, fontSize: 32, fontWeight: '900', marginBottom: 8, textShadowColor: color, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>{title}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700', marginBottom: 32 }}>
        {iWon ? 'You won the match' : status === 'stalemate' ? 'Nobody wins' : 'Better luck next time'}
      </Text>
      <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#fbbf24', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16, borderBottomWidth: 3, borderBottomColor: '#b8860b', elevation: 4 }}>
        <Text style={{ color: '#0f172a', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Back to Room</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Player Badge (compact) ──
function PlayerBadgeCompact({ label, isMe, isActive, isWhite }: {
  label: string;
  isMe: boolean;
  isActive: boolean;
  isWhite: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: isWhite ? '#f5f5f5' : '#1a1a1a',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5, borderColor: isActive ? '#fbbf24' : 'rgba(255,255,255,0.1)',
        elevation: isActive ? 4 : 0,
      }}>
        <Text style={{ fontSize: 18, color: isWhite ? '#000' : '#fff' }}>{isWhite ? '♔' : '♚'}</Text>
      </View>
      <View>
        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
          {label}{isMe ? ' (You)' : ''}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700' }}>
          {isWhite ? 'WHITE' : 'BLACK'}
        </Text>
      </View>
    </View>
  );
}

// ── Loading Screen ──
function LoadingScreen() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
    ])).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: false }).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../../../assets/images/games/chess.jpg')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }}
        contentFit="cover"
      />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)' }} />

      <Animated.View style={{ marginBottom: 24, zIndex: 10, opacity: pulseAnim, transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.95, 1.05] }) }] }}>
        <Image
          source={require('../../../assets/images/games/chess.jpg')}
          style={{ width: 140, height: 140, borderRadius: 24, borderWidth: 4, borderColor: '#fbbf24' }}
          contentFit="cover"
        />
      </Animated.View>

      <Text style={{ color: 'white', fontSize: 32, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5, zIndex: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 6 }}>
        CHESS
      </Text>

      <View style={{ width: '100%', maxWidth: 220, zIndex: 10 }}>
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
          <Animated.View style={{
            height: '100%',
            borderRadius: 99,
            overflow: 'hidden',
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
          }}>
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
