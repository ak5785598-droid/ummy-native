import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { Film } from 'lucide-react-native';
import { Image } from 'expo-image';

interface MovieSyncBannerProps {
  visible: boolean;
  movieTitle?: string;
  posterPath?: string;
  startedByName?: string;
  onJoin: () => void;
  onDismiss: () => void;
}

export function MovieSyncBanner({ visible, movieTitle, posterPath, startedByName, onJoin, onDismiss }: MovieSyncBannerProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(140);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(slideAnim, { toValue: -160, duration: 400, useNativeDriver: true }).start(() => {
          onDismiss();
        });
      }, 15000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
      <TouchableOpacity onPress={onJoin} style={styles.banner} activeOpacity={0.8}>
        <View style={styles.poster}>
          {posterPath ? (
            <Image cachePolicy="memory-disk" source={{ uri: `https://image.tmdb.org/t/p/w92${posterPath}` }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Film size={10} color="rgba(255,255,255,0.3)" />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.text} numberOfLines={1}>
            {movieTitle || 'Movie'} started — Tap to watch
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: 140,
    backgroundColor: 'rgba(88,28,135,0.5)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  poster: {
    width: 24,
    height: 32,
    borderRadius: 5,
    backgroundColor: 'rgba(88,28,135,0.6)',
    overflow: 'hidden',
    marginRight: 6,
  },
  info: {
    flex: 1,
  },
  text: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
});
