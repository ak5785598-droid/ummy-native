import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface LootLevelAnimationProps {
  visible: boolean;
  videoUrl?: string;
  levelName?: string;
  onComplete: () => void;
}

export function LootLevelAnimation({ visible, videoUrl, levelName, onComplete }: LootLevelAnimationProps) {
  const videoRef = useRef<any>(null);
  const [status, setStatus] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    // Auto-complete after 4 seconds as fallback
    timerRef.current = setTimeout(() => {
      onComplete();
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onComplete]);

  const handlePlaybackStatusUpdate = (playbackStatus: any) => {
    if (playbackStatus.isLoaded) {
      setStatus(playbackStatus);
    }
    if (playbackStatus.didJustFinish || playbackStatus.isLoaded && playbackStatus.durationMillis && playbackStatus.positionMillis >= playbackStatus.durationMillis - 200) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onComplete();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onComplete}>
      <View style={styles.container}>
        <View style={styles.videoWrapper}>
          {videoUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              useNativeControls={false}
            />
          ) : (
            <View style={[styles.video, { backgroundColor: '#1a0b2e', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fbbf24', fontSize: 28, fontWeight: '900' }}>🎉</Text>
              <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '700', marginTop: 12 }}>{levelName} Unlocked!</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrapper: {
    width: '85%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  video: {
    flex: 1,
  },
});
