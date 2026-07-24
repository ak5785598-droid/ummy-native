import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

const GAME_IMAGES: Record<string, any> = {
  'fruit-party': require('../../../assets/images/games/fruit-party.jpg'),
  'forest-party': require('../../../assets/images/games/forest-party.jpg'),
  'roulette': require('../../../assets/images/games/roulette.png'),
  'teen-patti': require('../../../assets/images/games/teen-patti.png'),
  'ludo': require('../../../assets/images/games/ludo.png'),
  'carrom': require('../../../assets/images/games/carrom.jpg'),
  'chess': require('../../../assets/images/games/chess.jpg'),
};

const GAME_NAMES: Record<string, string> = {
  'fruit-party': 'Fruit Party',
  'forest-party': 'Forest Party',
  'roulette': 'Roulette',
  'teen-patti': 'Teen Patti',
  'ludo': 'Ludo',
  'carrom': 'Carrom',
  'chess': 'Chess',
};

const FALLBACK_IMAGE = require('../../../assets/images/games/game-controller.jpg');

interface GameMiniCardProps {
  gameId: string;
  onPress: () => void;
}

export function GameMiniCard({ gameId, onPress }: GameMiniCardProps) {
  const image = GAME_IMAGES[gameId] || FALLBACK_IMAGE;
  const name = GAME_NAMES[gameId] || 'Game';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.card}
    >
      <Image source={image} style={styles.gameImage} contentFit="cover" />
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 160,
    right: 12,
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  gameImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  name: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    color: 'white',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 1,
  },
});
