import React, { memo } from 'react';
import { View, Text, ViewStyle } from 'react-native';

interface ChatMessageBubbleProps {
  bubbleId?: string | null;
  bubbleMediaUrl?: string | null;
  isMe: boolean;
  children: React.ReactNode;
  showTail?: boolean;
}

const STYLE_CONFIGS: Record<string, { bg: string; border: string; tailColor: string; decorator: string }> = {
  'heart-bubble': { bg: '#ec4899', border: '#ffffff', tailColor: '#ec4899', decorator: '💖' },
  'love-bubble': { bg: '#dc2626', border: '#ffffff', tailColor: '#dc2626', decorator: '❤️' },
  'evil-bubble': { bg: '#6441A5', border: '#9333ea', tailColor: '#6441A5', decorator: '😈' },
  'candy-bubble': { bg: '#ff9a9e', border: '#ffffff', tailColor: '#ff9a9e', decorator: '🍬' },
  'taurus-2025': { bg: '#EDDE5D', border: '#ffffff', tailColor: '#EDDE5D', decorator: '🐂' },
  'cricket-2025': { bg: '#10b981', border: '#6ee7b7', tailColor: '#10b981', decorator: '🏏' },
  'neon-cyber': { bg: '#000000', border: '#00ffff', tailColor: '#00ffff', decorator: '💠' },
  'royal-gold': { bg: '#D4AF37', border: '#fef3c7', tailColor: '#D4AF37', decorator: '👑' },
  'ice-crystal': { bg: '#67e8f9', border: '#ffffff', tailColor: '#67e8f9', decorator: '❄️' },
  'default-premium': { bg: '#8b5cf6', border: '#ffffff', tailColor: '#8b5cf6', decorator: '⭐' },
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
        <View
          className="rounded-2xl border-2 px-4 py-2"
          style={{ backgroundColor: config.bg, borderColor: config.border, shadowColor: config.border, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}
        >
          <View className="flex-row items-start gap-1">
            <Text className="text-[10px]">{config.decorator}</Text>
            <View className="flex-1 flex-wrap">{children}</View>
          </View>
        </View>
        {isMe && showTail && (
          <View style={{ width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: config.tailColor, marginBottom: 8 }} />
        )}
      </View>
    </View>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';
