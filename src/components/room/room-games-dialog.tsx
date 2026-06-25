import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, RefreshCw, Lock } from 'lucide-react-native';
import { useGamesConfig } from '../../hooks/use-games-config';
import { GameThumbnailSvg } from '../games/game-svgs';
import { Image } from 'expo-image';

// Local 3D game thumbnails from web app
const GAME_THUMBNAILS: Record<string, any> = {
  'carrom': require('../../../assets/images/games/carrom.jpg'),
  'ludo': require('../../../assets/images/games/ludo.png'),
  'chess': require('../../../assets/images/games/chess.jpg'),
  'fruit-party': require('../../../assets/images/games/fruit-party.jpg'),
  'forest-party': require('../../../assets/images/games/forest-party.jpg'),
};

// Games that are available in the native app (matching web app)
const AVAILABLE_GAME_IDS = [
  'carrom', 'chess', 'ludo', 'fruit-party',
  'forest-party', 'roulette', 'teen-patti',
];

interface RoomGamesDialogProps {
  visible: boolean;
  onClose: () => void;
  onSelectGame: (gameId: string, gameTitle?: string, gameCoverUrl?: string) => void;
  roomId?: string;
  canManage?: boolean;
}

export function RoomGamesDialog({ visible, onClose, onSelectGame, roomId, canManage }: RoomGamesDialogProps) {
  const insets = useSafeAreaInsets();
  const { games: configGames, loading } = useGamesConfig();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const GAME_TITLES: Record<string, string> = {
    'carrom': 'Carrom',
    'chess': 'Chess',
    'ludo': 'Ludo',
    'fruit-party': 'Fruit Party',
    'forest-party': 'Forest Party',
    'roulette': 'Roulette',
    'teen-patti': 'Teen Patti',
  };

  const gameList = React.useMemo(() => {
    const baseList = AVAILABLE_GAME_IDS.map(id => ({
      id,
      title: GAME_TITLES[id] || id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      slug: id,
      coverUrl: '',
      cost: 0,
      imageHint: id,
    }));

    if (configGames.length === 0) return baseList;

    const firestoreMap = new Map<string, any>();
    configGames.forEach(g => {
      if (g.id) firestoreMap.set(g.id, g);
      if (g.slug && g.slug !== g.id) firestoreMap.set(g.slug, g);
    });

    return baseList.map(base => {
      const remote = firestoreMap.get(base.id) || firestoreMap.get(base.slug);
      if (remote) {
        return {
          ...base,
          title: GAME_TITLES[base.id] || base.title,
          coverUrl: remote.coverUrl || base.coverUrl,
          cost: remote.cost ?? base.cost,
        };
      }
      return base;
    });
  }, [configGames]);

  // Reset selection when dialog closes
  useEffect(() => {
    if (!visible) setSelectedId(null);
  }, [visible]);

  const RESTRICTED_GAMES = ['ludo', 'chess', 'carrom'];

  const handleSelect = (gameId: string) => {
    if (RESTRICTED_GAMES.includes(gameId) && !canManage) {
      Alert.alert('Admin Only', 'Only room owner or admin can start this game.');
      return;
    }
    const game = gameList.find(g => g.id === gameId || g.slug === gameId);
    setSelectedId(gameId);
    setTimeout(() => {
      onSelectGame(gameId, game?.title, game?.coverUrl);
      onClose();
    }, 100);
  };

  const getGradientColor = (id: string) => {
    const map: Record<string, [string, string]> = {
      'carrom': ['#f59e0b', '#d97706'],
      'chess': ['#6366f1', '#4338ca'],
      'ludo': ['#ec4899', '#be185d'],
      'fruit-party': ['#10b981', '#047857'],
      'forest-party': ['#22c55e', '#15803d'],
      'roulette': ['#ef4444', '#b91c1c'],
      'teen-patti': ['#8b5cf6', '#6d28d9'],
    };
    return map[id] || ['#3b82f6', '#1d4ed8'];
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>

        <View style={{
          backgroundColor: '#0c0c14',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingBottom: insets.bottom + 16,
          maxHeight: '80%',
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99 }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.08)',
          }}>
            <View>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>GAMES</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 2, textTransform: 'uppercase' }}>
                {loading ? 'Loading...' : `${gameList.length} Games Available`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Games Grid */}
          <ScrollView
            style={{ paddingHorizontal: 16, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, fontSize: 12 }}>Loading games...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingBottom: 16 }}>
                {gameList.map(g => {
                  const gameId = g.id || g.slug;
                  const isSelected = selectedId === gameId;
                  const isRestricted = RESTRICTED_GAMES.includes(gameId) && !canManage;
                  const [c1, c2] = getGradientColor(gameId);
                  return (
                    <TouchableOpacity
                      key={gameId}
                      onPress={() => handleSelect(gameId)}
                      style={{
                        alignItems: 'center',
                        gap: 4,
                        width: '22%',
                        opacity: isRestricted ? 0.4 : (isSelected ? 0.7 : 1),
                        transform: [{ scale: isSelected ? 0.92 : 1 }],
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: 1.5,
                        borderColor: isSelected ? c1 : 'rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        shadowColor: c1,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isSelected ? 0.8 : 0.3,
                        shadowRadius: 6,
                        elevation: isSelected ? 8 : 3,
                      }}>
                        {GAME_THUMBNAILS[gameId] ? (
                          <Image cachePolicy="memory-disk" source={GAME_THUMBNAILS[gameId]}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (g as any).coverUrl ? (
                          <Image cachePolicy="memory-disk" source={{ uri: (g as any).coverUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <GameThumbnailSvg gameId={gameId} size={48} />
                        )}
                        {isRestricted && (
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={16} color="rgba(255,255,255,0.8)" />
                          </View>
                        )}
                      </View>
                      <Text style={{
                        color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                        fontSize: 9,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: -0.3,
                        textAlign: 'center',
                      }} numberOfLines={1}>
                        {g.title}
                      </Text>
                      {(g as any).cost > 0 && (
                        <Text style={{ color: '#f59e0b', fontSize: 8, fontWeight: '700' }}>🪙 {(g as any).cost}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
