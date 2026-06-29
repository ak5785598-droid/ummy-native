import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatMessageBubbleProps {
  bubbleId?: string | null;
  bubbleMediaUrl?: string | null;
  isMe: boolean;
  children: React.ReactNode;
  showTail?: boolean;
}

const STYLE_CONFIGS: Record<string, { colors: string[]; border: string; tailColor: string; decorator: string }> = {
  'heart-bubble': { colors: ['#ec4899', '#f43f5e'], border: 'rgba(255,255,255,0.4)', tailColor: '#f43f5e', decorator: '💖' },
  'love-bubble': { colors: ['#dc2626', '#ef4444'], border: 'rgba(255,255,255,0.3)', tailColor: '#ef4444', decorator: '💌' },
  'evil-bubble': { colors: ['#2a0845', '#6441A5'], border: '#9333ea', tailColor: '#6441A5', decorator: '😈' },
  'candy-bubble': { colors: ['#ff9a9e', '#fecfef'], border: '#ffffff', tailColor: '#ff9a9e', decorator: '🍭' },
  'taurus-2025': { colors: ['#F09819', '#EDDE5D'], border: 'rgba(255,255,255,0.5)', tailColor: '#EDDE5D', decorator: '♉' },
  'cricket-2025': { colors: ['#0f766e', '#10b981'], border: '#6ee7b7', tailColor: '#10b981', decorator: '🏏' },
  'neon-cyber': { colors: ['#000000', '#0f172a'], border: '#00ffff', tailColor: '#00ffff', decorator: '✨' },
  'royal-gold': { colors: ['#BF953F', '#FCF6BA', '#B38728'], border: '#fef3c7', tailColor: '#B38728', decorator: '👑' },
  'ice-crystal': { colors: ['#67e8f9', '#3b82f6'], border: '#ffffff', tailColor: '#3b82f6', decorator: '❄️' },
  'default-premium': { colors: ['#6366f1', '#a855f7'], border: 'rgba(255,255,255,0.3)', tailColor: '#a855f7', decorator: '⭐' },
};

export const ChatMessageBubble = memo(({ bubbleId, bubbleMediaUrl, isMe, children, showTail = true }: ChatMessageBubbleProps) => {
  if (!bubbleId || bubbleId === 'None') {
    return (
      <View className={`px-4 py-1.5 rounded-full max-w-[85%] min-w-[50px] mb-2 border ${isMe ? 'bg-[#150029]/80 border-purple-500/30 self-end' : 'bg-black/40 border-white/10 self-start'}`}>
        {children}
      </View>
    );
  }

  const config = STYLE_CONFIGS[bubbleId] || STYLE_CONFIGS['default-premium'];

  return (
    <View className={`max-w-[85%] mb-2 ${isMe ? 'self-end' : 'self-start'}`}>
      <View className="flex-row items-end gap-0.5">
        {!isMe && showTail && (
          <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 0, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: config.tailColor, marginBottom: 8 }} />
        )}
        
        <LinearGradient
          colors={config.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: config.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            shadowColor: config.tailColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4,
            minWidth: 60,
          }}
        >
          <View className="flex-row items-center gap-1.5">
            <View className="flex-1 flex-wrap pr-4">{children}</View>
            <Text className="text-sm absolute right-0.5 -top-1" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
              {config.decorator}
            </Text>
          </View>
        </LinearGradient>

        {isMe && showTail && (
          <View style={{ width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: config.tailColor, marginBottom: 8 }} />
        )}
      </View>
    </View>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';
