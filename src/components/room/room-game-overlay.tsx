import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, PanResponder, Animated, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Move, HelpCircle, Volume2, VolumeX, Grid3X3, X, Trophy } from 'lucide-react-native';
import { useFirestore } from '../../firebase/provider';
import { collection, query, orderBy, limit, getDocs } from '@/firebase/firestore-compat';
import { FruitPartyGame } from '../games/fruit-party-game';
import { ForestPartyGame } from '../games/forest-party-game';
import { LudoGame } from '../games/ludo-game';
import { CarromGame } from '../games/carrom-game';
import { ChessGame } from '../games/chess-game';
import { RouletteGame } from '../games/roulette-game';
import { TeenPattiGame } from '../games/teen-patti-game';
import { GoldenCoin } from '../GoldenCoin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TALL_GAMES = ['roulette', 'teen-patti', 'fruit-party', 'forest-party'];

const GAME_RULES: Record<string, { title: string; rules: string[] }> = {
  'fruit-party': {
    title: 'Fruit Party',
    rules: [
      'Select a chip value and tap a fruit to place your bet.',
      'You have 25 seconds to place bets each round.',
      'After the timer, the wheel spins and highlights a fruit.',
      'If your bet matches, you win bet amount x multiplier.',
      'Fruits have different multipliers: x5, x10, x15, x25, x45.',
      'You can bet on multiple fruits in one round.',
      'Use Repeat button to replay your last round\'s bets.',
    ],
  },
  'forest-party': {
    title: 'Forest Party',
    rules: [
      'Select a chip value and tap an animal to place your bet.',
      'You have 25 seconds to place bets each round.',
      'After the timer, the wheel spins and highlights an animal.',
      'If your bet matches, you win bet amount x multiplier.',
      'Animals have different multipliers: x5, x10, x15, x25, x45.',
      'You can bet on multiple animals in one round.',
    ],
  },
  'ludo': {
    title: 'Ludo',
    rules: [
      'Roll the dice by tapping the dice button.',
      'Move your tokens along the path based on dice value.',
      'Land on opponent tokens to capture them back to start.',
      'Get a 6 to release a token from home or get an extra turn.',
      'First to get all 4 tokens home wins.',
      'Safe squares protect your tokens from capture.',
    ],
  },
  'carrom': {
    title: 'Carrom',
    rules: [
      'Drag the striker and release to flick it.',
      'Aim to pot your coins into the pockets.',
      'Red queen gives extra points but must be covered.',
      'First to pot all their coins wins.',
      'Potting opponent\'s coins gives them advantage.',
      'Use spin to curve the striker\'s path.',
    ],
  },
  'chess': {
    title: 'Chess',
    rules: [
      'Each piece moves differently across the board.',
      'Tap a piece to see its valid moves highlighted.',
      'Capture opponent pieces by moving to their square.',
      'Protect your King from check and checkmate.',
      'Pawns promote to any piece when reaching the far end.',
      'Special moves: Castling and En Passant.',
    ],
  },
  'roulette': {
    title: 'Roulette',
    rules: [
      'Select a chip and tap a bet type to place your bet.',
      'Bet types: Red, Black, Odd, Even, 1-12, 13-24, 25-36, or exact number (0).',
      'After 15 seconds the wheel spins.',
      'Red/Black/Odd/Even pay 2x, ranges pay 3x, exact number pays 36x.',
      'You can place multiple bets per round.',
      '0 (Green) beats all other bets and pays 36x.',
    ],
  },
  'teen-patti': {
    title: 'Teen Patti',
    rules: [
      'Choose a chip value and bet on Wolf, Lion, or Fish.',
      'You have 20 seconds to place bets.',
      'Three cards are dealt to each faction and revealed one by one.',
      'The faction with the best hand wins.',
      'Winning bet pays 1.95x your bet amount.',
      'You can split bets across multiple factions.',
    ],
  },
};

const GAME_THEMES: Record<string, { bg: string; border: string; headerBg?: string }> = {
  'fruit-party': { bg: '#311082', border: '#a855f7', headerBg: 'transparent' },
  'forest-party': { bg: '#064e3b', border: '#059669', headerBg: 'transparent' },
  'roulette': { bg: '#090714', border: '#fbbf24', headerBg: 'transparent' },
  'teen-patti': { bg: '#3b0764', border: '#fbbf24', headerBg: 'transparent' },
  'ludo': { bg: '#1e1b4b', border: '#4f46e5', headerBg: 'transparent' },
  'carrom': { bg: '#1c1917', border: '#78716c', headerBg: 'transparent' },
  'chess': { bg: '#18181b', border: '#52525b', headerBg: 'transparent' },
};

interface RoundPopupData {
  resultText: string;
  resultEmoji: string;
  resultImage?: any;
  myPrize: number;
  myWager: number;
  winners: Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
    amount: number;
    betAmount?: number;
    rank: number;
  }>;
}

interface RoomGameOverlayProps {
  visible: boolean;
  gameId: string | null;
  onClose: () => void;
  roomId?: string;
  isAdmin?: boolean;
}

export function RoomGameOverlay({ visible, gameId, onClose, roomId, isAdmin }: RoomGameOverlayProps) {
  const firestore = useFirestore();
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showWinnerList, setShowWinnerList] = useState(false);
  const [winnerListData, setWinnerListData] = useState<any[]>([]);
  const [roundPopup, setRoundPopup] = useState<RoundPopupData | null>(null);
  const [popupCountdown, setPopupCountdown] = useState(5);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (e, gestureState) => {
        // Drag vertically only
        pan.y.setValue(gestureState.dy);
      },
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        if (gestureState.dy > 120) {
          // Swipe down to dismiss
          Animated.timing(pan.y, {
            toValue: 800,
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            onClose();
          });
        } else {
          // Snap back up
          Animated.spring(pan.y, {
            toValue: 0,
            useNativeDriver: false,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!visible) {
      pan.setValue({ x: 0, y: 0 });
      setRoundPopup(null);
      setShowRules(false);
      setShowWinnerList(false);
    }
  }, [visible]);

  useEffect(() => {
    if (roundPopup) {
      setPopupCountdown(5);
      const countTimer = setInterval(() => {
        setPopupCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countTimer);
            setRoundPopup(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countTimer);
    }
  }, [roundPopup]);

  const handleRoundEnd = useCallback(async (data: { resultText: string; resultEmoji: string; resultImage?: any; myPrize?: number; myWager?: number }) => {
    setRoundPopup({ resultText: data.resultText, resultEmoji: data.resultEmoji, resultImage: data.resultImage, myPrize: data.myPrize || 0, myWager: data.myWager || 0, winners: [] });

    if (!firestore || !gameId) return;

    setTimeout(async () => {
      try {
        const q = query(
          collection(firestore, 'globalGameWins'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const all: any[] = [];
        snap.forEach((d: any) => all.push({ id: d.id, ...d.data() }));

        const now = Date.now();
        const recent = all.filter(w => {
          if (w.gameId !== gameId) return false;
          if (!w.timestamp) return false;
          const ts = w.timestamp?.toDate?.() ?? new Date(w.timestamp);
          const age = now - ts.getTime();
          return age < 600000;
        });

        const seen = new Map<string, any>();
        recent.forEach(w => {
          const existing = seen.get(w.userId);
          if (!existing || (w.amount || 0) > (existing.amount || 0)) {
            seen.set(w.userId, w);
          }
        });
        const sorted = Array.from(seen.values())
          .sort((a, b) => (b.amount || 0) - (a.amount || 0))
          .slice(0, 3)
          .map((w, i) => ({ ...w, rank: i + 1 }));

        setRoundPopup(prev => prev ? { ...prev, winners: sorted } : null);
      } catch (e) {}
    }, 5000);
  }, [firestore, gameId]);

  const fetchWinnerList = useCallback(async () => {
    if (!firestore || !gameId) return;
    try {
      const q = query(
        collection(firestore, 'globalGameWins'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const all: any[] = [];
      snap.forEach((d: any) => all.push({ id: d.id, ...d.data() }));
      const filtered = all.filter(w => w.gameId === gameId);
      setWinnerListData(filtered);
      setShowWinnerList(true);
    } catch (e) {}
  }, [firestore, gameId]);

  const isTall = gameId !== null && TALL_GAMES.includes(gameId);
  const rules = gameId ? GAME_RULES[gameId] : null;

  const theme = gameId ? GAME_THEMES[gameId] : null;
  const containerBg = theme?.bg || '#0d9488';
  const borderColor = theme?.border || '#5eead4';
  const gameProps = { onClose, roomId, onRoundEnd: handleRoundEnd, isMuted, isAdmin };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View
          style={[
            s.container,
            isTall && { height: '76%' },
            { backgroundColor: containerBg, borderColor: borderColor },
            { transform: pan.getTranslateTransform() },
          ]}
        >
          <View style={[
            s.header,
            (gameId === 'forest-party' || gameId === 'fruit-party' || gameId === 'roulette' || gameId === 'teen-patti' || gameId === 'ludo' || gameId === 'carrom' || gameId === 'chess') ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              backgroundColor: 'transparent',
            } : (theme?.headerBg ? { backgroundColor: theme.headerBg } : null),
            { alignItems: 'center' }
          ]}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity
                {...panResponder.panHandlers}
                activeOpacity={1}
                style={s.headerBtn}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Move size={13} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={s.headerBtn} onPress={() => setShowRules(true)}>
                <HelpCircle size={13} color="white" />
              </TouchableOpacity>
            </View>

            {/* Centered Game Title */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>
                {gameId === 'fruit-party' ? 'Fruit Party' : (rules?.title || 'Game')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity style={s.headerBtn} onPress={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX size={13} color="#ef4444" /> : <Volume2 size={13} color="white" />}
              </TouchableOpacity>
              <TouchableOpacity style={s.headerBtn} onPress={fetchWinnerList}>
                <Grid3X3 size={13} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={s.headerBtn} onPress={onClose}>
                <X size={13} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {roundPopup && (
            <View style={s.roundPopupOverlay}>
              <View style={s.roundPopupContent}>
                {/* Timer */}
                <View style={s.popupTimerBadge}>
                  <Text style={s.popupTimerText}>{popupCountdown}s</Text>
                </View>

                {/* Center: Winning emoji card overflowing at top */}
                <View style={s.popupEmojiArea}>
                  <View style={s.popupEmojiGlow} />
                  {gameId === 'roulette' ? (
                    <View style={{
                      width: 90,
                      height: 90,
                      borderRadius: 45,
                      backgroundColor: (() => {
                        const num = parseInt(roundPopup.resultText.replace(/[^0-9]/g, ''), 10);
                        if (isNaN(num) || num === 0) return '#10b981';
                        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                        return redNumbers.includes(num) ? '#dc2626' : '#1e293b';
                      })(),
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3.5,
                      borderColor: '#fbbf24',
                      zIndex: 10,
                      shadowColor: '#fbbf24',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                      elevation: 10,
                    }}>
                      <Text style={{ color: 'white', fontSize: 32, fontWeight: '900' }}>
                        {roundPopup.resultText.split(' ')[0]}
                      </Text>
                    </View>
                  ) : roundPopup.resultImage ? (
                    <View style={{
                      width: 90,
                      height: 90,
                      borderRadius: 45,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: '#FFD700',
                      overflow: 'hidden',
                      zIndex: 10,
                      shadowColor: '#FFD700',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                      elevation: 10,
                    }}>
                      <Image source={roundPopup.resultImage} style={{ width: '100%', height: '100%', borderRadius: 45, resizeMode: 'cover' }} cachePolicy="memory-disk" />
                    </View>
                  ) : (
                    <Text style={s.popupWinEmoji}>{roundPopup.resultEmoji}</Text>
                  )}
                </View>
 
                {/* Top section: centered stats (Mascot removed) */}
                <View style={[s.popupTopSection, { justifyContent: 'center', alignItems: 'center' }]}>
                  <View style={{ alignItems: 'flex-start', paddingHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' }}>
                        {gameId === 'roulette' ? 'Winning Number:  ' : gameId === 'teen-patti' ? 'Winning Faction:  ' : 'Winning Food:  '}
                      </Text>
                      <View style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: gameId === 'roulette' ? (() => {
                          const num = parseInt(roundPopup.resultText.replace(/[^0-9]/g, ''), 10);
                          if (isNaN(num) || num === 0) return '#10b981';
                          const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                          return redNumbers.includes(num) ? '#dc2626' : '#1e293b';
                        })() : '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: '#fbbf24',
                        overflow: 'hidden',
                      }}>
                        {gameId === 'roulette' ? (
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: '900' }}>
                            {roundPopup.resultText.split(' ')[0]}
                          </Text>
                        ) : roundPopup.resultImage ? (
                           <Image source={roundPopup.resultImage} style={{ width: '100%', height: '100%', borderRadius: 13, resizeMode: 'cover' }} cachePolicy="memory-disk" />
                        ) : (
                          <Text style={{ fontSize: 14 }}>{roundPopup.resultEmoji}</Text>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={s.popupStatLabel}>Prize:  </Text>
                      <GoldenCoin size={13} />
                      <Text style={s.popupStatValueGold}>{roundPopup.myPrize.toLocaleString()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Text style={s.popupStatLabel}>Your Wager:  </Text>
                      <GoldenCoin size={13} />
                      <Text style={s.popupStatValueGold}>{roundPopup.myWager.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={s.popupDivider}>
                  <View style={s.popupDividerLine} />
                  <Text style={s.popupDividerText}>Top Winners</Text>
                  <View style={s.popupDividerLine} />
                </View>

                {/* Winners podium */}
                {roundPopup.winners.length > 0 ? (
                  <View style={s.popupPodium}>
                    {/* #2 */}
                    <View style={s.popupWinnerPodium}>
                      {roundPopup.winners[1] ? (
                        <>
                          <View style={s.podiumRankBadge2}>
                            <Text style={s.podiumRankText}>2</Text>
                          </View>
                          {roundPopup.winners[1]?.avatarUrl ? (
                            <Image source={{ uri: roundPopup.winners[1].avatarUrl }} style={s.podiumAvatar2} contentFit="cover" cachePolicy="memory-disk" />
                          ) : (
                            <View style={[s.podiumAvatar2, s.avatarPH]}><Text style={{ fontSize: 20 }}>👤</Text></View>
                          )}
                          <Text style={s.podiumName} numberOfLines={1}>{roundPopup.winners[1]?.username}</Text>
                          <Text style={s.podiumAmount}>🪙 {roundPopup.winners[1]?.amount?.toLocaleString()}</Text>
                        </>
                      ) : <View style={s.podiumAvatar2} />}
                    </View>

                    {/* #1 Center */}
                    <View style={s.popupWinnerPodiumCenter}>
                      {roundPopup.winners[0] ? (
                        <>
                          <Text style={s.podiumCrown}>👑</Text>
                          <View style={s.podiumRankBadge1}>
                            <Text style={s.podiumRankText}>1</Text>
                          </View>
                          {roundPopup.winners[0]?.avatarUrl ? (
                            <Image source={{ uri: roundPopup.winners[0].avatarUrl }} style={s.podiumAvatar1} contentFit="cover" cachePolicy="memory-disk" />
                          ) : (
                            <View style={[s.podiumAvatar1, s.avatarPH]}><Text style={{ fontSize: 28 }}>👤</Text></View>
                          )}
                          <Text style={s.podiumNameCenter} numberOfLines={1}>{roundPopup.winners[0]?.username}</Text>
                          <Text style={s.podiumAmountCenter}>🪙 {roundPopup.winners[0]?.amount?.toLocaleString()}</Text>
                        </>
                      ) : <View style={s.podiumAvatar1} />}
                    </View>

                    {/* #3 */}
                    <View style={s.popupWinnerPodium}>
                      {roundPopup.winners[2] ? (
                        <>
                          <View style={s.podiumRankBadge3}>
                            <Text style={s.podiumRankText}>3</Text>
                          </View>
                          {roundPopup.winners[2]?.avatarUrl ? (
                            <Image source={{ uri: roundPopup.winners[2].avatarUrl }} style={s.podiumAvatar2} contentFit="cover" cachePolicy="memory-disk" />
                          ) : (
                            <View style={[s.podiumAvatar2, s.avatarPH]}><Text style={{ fontSize: 20 }}>👤</Text></View>
                          )}
                          <Text style={s.podiumName} numberOfLines={1}>{roundPopup.winners[2]?.username}</Text>
                          <Text style={s.podiumAmount}>🪙 {roundPopup.winners[2]?.amount?.toLocaleString()}</Text>
                        </>
                      ) : <View style={s.podiumAvatar2} />}
                    </View>
                  </View>
                ) : (
                  <Text style={s.noWinnerText}>No winner for this round</Text>
                )}
              </View>
            </View>
          )}

          <View style={s.gameContent}>
            {gameId === 'fruit-party' && <FruitPartyGame {...gameProps} />}
            {gameId === 'forest-party' && <ForestPartyGame {...gameProps} />}
            {gameId === 'ludo' && <LudoGame {...gameProps} />}
            {gameId === 'carrom' && <CarromGame {...gameProps} />}
            {gameId === 'chess' && <ChessGame {...gameProps} />}
            {gameId === 'roulette' && <RouletteGame {...gameProps} />}
            {gameId === 'teen-patti' && <TeenPattiGame {...gameProps} />}
          </View>
        </Animated.View>

        {showRules && rules && (
          <Modal visible={showRules} transparent animationType="slide" onRequestClose={() => setShowRules(false)}>
            <View style={s.modalOverlay}>
              <View style={s.rulesContainer}>
                <View style={s.rulesHeader}>
                  <Text style={s.rulesTitle}>{rules.title} - How to Play</Text>
                  <TouchableOpacity onPress={() => setShowRules(false)} style={s.rulesCloseBtn}>
                    <X size={22} color="white" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={s.rulesScroll} showsVerticalScrollIndicator={false}>
                  {rules.rules.map((rule, i) => (
                    <View key={i} style={s.ruleRow}>
                      <View style={s.ruleNumber}>
                        <Text style={s.ruleNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={s.ruleText}>{rule}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {showWinnerList && (
          <Modal visible={showWinnerList} transparent animationType="slide" onRequestClose={() => setShowWinnerList(false)}>
            <View style={s.modalOverlay}>
              <View style={s.winnerListContainer}>
                <View style={s.winnerListHeader}>
                  <Trophy size={20} color="#fbbf24" />
                  <Text style={s.winnerListTitle}>Recent Winners</Text>
                  <TouchableOpacity onPress={() => setShowWinnerList(false)}>
                    <X size={22} color="white" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={s.winnerListScroll} showsVerticalScrollIndicator={false}>
                  {winnerListData.length === 0 ? (
                    <Text style={s.noWinnersText}>No winners yet in this room</Text>
                  ) : (
                    winnerListData.map((w, i) => (
                      <View key={w.id || i} style={s.winnerRow}>
                        <Text style={s.winnerRank}>#{i + 1}</Text>
                        {w.avatarUrl ? (
                          <Image source={{ uri: w.avatarUrl }} style={s.winnerListAvatar} contentFit="cover" cachePolicy="memory-disk" />
                        ) : (
                          <View style={[s.winnerListAvatar, s.avatarPlaceholderSmall]}>
                            <Text style={{ fontSize: 14 }}>👤</Text>
                          </View>
                        )}
                        <View style={s.winnerInfo}>
                          <Text style={s.winnerName} numberOfLines={1}>{w.username}</Text>
                        </View>
                        <Text style={s.winnerAmount}>+{w.amount?.toLocaleString()} 🪙</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '60%',
    marginBottom: 60,
    backgroundColor: '#0d9488',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  headerBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  gameContent: {
    flex: 1,
  },

  roundPopupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  roundPopupContent: {
    width: '100%',
    height: '55%',
    backgroundColor: '#0c0624',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    elevation: 20,
  },
  popupTimerBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
  },
  popupTimerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  popupTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  popupMascotArea: {
    width: 70,
    alignItems: 'center',
  },
  popupMascotEmoji: {
    fontSize: 56,
  },
  popupEmojiArea: {
    position: 'absolute',
    top: -45,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  popupEmojiGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  popupWinEmoji: {
    fontSize: 72,
    zIndex: 2,
  },
  popupStatsArea: {
    flex: 1,
    paddingLeft: 8,
  },
  popupStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  popupStatValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  popupStatValueGold: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '900',
  },
  popupDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  popupDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#fbbf24',
  },
  popupDividerText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  popupPodium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
  },
  popupWinnerPodium: {
    alignItems: 'center',
    width: '28%',
  },
  popupWinnerPodiumCenter: {
    alignItems: 'center',
    width: '34%',
  },
  podiumCrown: {
    fontSize: 22,
    marginBottom: 2,
  },
  podiumAvatar1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fbbf24',
    marginBottom: 6,
  },
  podiumAvatar2: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#94a3b8',
    marginBottom: 4,
  },
  avatarPH: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderSmall: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankBadge1: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  podiumRankBadge2: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  podiumRankBadge3: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#b45309',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  podiumRankText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
  },
  podiumName: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  podiumNameCenter: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  podiumAmount: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  podiumAmountCenter: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  noWinnerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rulesContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  rulesTitle: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  rulesCloseBtn: {
    padding: 4,
  },
  rulesScroll: {
    padding: 16,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  ruleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ruleNumberText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '900',
  },
  ruleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  winnerListContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  winnerListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  winnerListTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  winnerListScroll: {
    padding: 12,
  },
  noWinnersText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  winnerRank: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '900',
    width: 30,
  },
  winnerListAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  winnerAmount: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '900',
  },
});
