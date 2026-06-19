import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, ScrollView } from 'react-native';

interface CaptionData {
  uid: string;
  name: string;
  text: string;
  emotion?: string;
  timestamp: any;
}

interface CaptionsOverlayProps {
  captions: CaptionData[];
  visible: boolean;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#22c55e',
  sad: '#60a5fa',
  angry: '#ef4444',
  surprised: '#f59e0b',
};

function CaptionRow({ caption, index }: { caption: CaptionData; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View className="px-3 py-1.5 rounded-lg mb-1" style={{ opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.6)', borderLeftWidth: 3, borderLeftColor: EMOTION_COLORS[caption.emotion || ''] || '#8b5cf6' }}>
      <Text className="text-white/50 text-[9px] font-bold uppercase tracking-wider">{caption.name}</Text>
      <Text className="text-white text-xs font-medium">{caption.text}</Text>
    </Animated.View>
  );
}

export function CaptionsOverlay({ captions, visible }: CaptionsOverlayProps) {
  if (!visible || captions.length === 0) return null;

  return (
    <View className="absolute bottom-20 left-2 right-20 z-40" pointerEvents="none">
      <ScrollView showsVerticalScrollIndicator={false}>
        {captions.slice(-5).map((c, i) => (
          <CaptionRow key={`${c.uid}-${c.timestamp?.toMillis?.() || i}`} caption={c} index={i} />
        ))}
      </ScrollView>
    </View>
  );
}
