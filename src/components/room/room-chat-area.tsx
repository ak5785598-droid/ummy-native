import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Languages } from 'lucide-react-native';
import { Message } from '../../lib/types';
import { useTranslation } from '../../hooks/use-translation';
import { Image } from 'expo-image';

interface RoomChatAreaProps {
  messages: Message[];
  chatClearedAt?: any;
  onMessagePress?: (message: Message) => void;
  onAvatarPress?: (userId: string) => void;
  onImagePress?: (url: string) => void;
  targetLanguage: string;
  sourceLanguage?: string;
}

export function RoomChatArea({ messages, chatClearedAt, onMessagePress, onAvatarPress, onImagePress, targetLanguage, sourceLanguage }: RoomChatAreaProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  const { translateMessage, translating } = useTranslation();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const filteredMessages = useMemo(() => messages.filter(msg => {
    if (!chatClearedAt) return true;
    const clearedTime = chatClearedAt?.toMillis?.() || chatClearedAt?.seconds * 1000 || 0;
    const msgTime = msg.timestamp?.toMillis?.() || msg.timestamp?.seconds * 1000 || 0;
    return msgTime > clearedTime;
  }), [messages, chatClearedAt]);

  const handleTranslate = async (msgId: string, content: string) => {
    if (translatedTexts[msgId]) {
      const copy = { ...translatedTexts };
      delete copy[msgId];
      setTranslatedTexts(copy);
      return;
    }

    const result = await translateMessage(content, msgId, targetLanguage, sourceLanguage);
    if (result) {
      setTranslatedTexts(prev => ({ ...prev, [msgId]: result }));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {filteredMessages.map((msg) => (
          <ChatMessageRow
            key={msg.id}
            message={msg}
            onPress={() => onMessagePress?.(msg)}
            onAvatarPress={() => onAvatarPress?.(msg.senderId)}
            onTranslate={() => handleTranslate(msg.id, msg.content || msg.text || '')}
            translationText={translatedTexts[msg.id]}
            isTranslating={!!translating[msg.id]}
            onImagePress={onImagePress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface ChatMessageRowProps {
  message: Message;
  onPress?: () => void;
  onAvatarPress?: () => void;
  onImagePress?: (url: string) => void;
  onTranslate?: () => void;
  translationText?: string;
  isTranslating?: boolean;
}

const ChatMessageRow = React.memo(function ChatMessageRow({ message, onPress, onAvatarPress, onImagePress, onTranslate, translationText, isTranslating }: ChatMessageRowProps) {
  if (message.type === 'system') {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemBadge}>
          <Text style={styles.systemText}>{message.content || message.text}</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'entrance') {
    return (
      <View style={styles.entranceRow}>
        <Text style={styles.entranceText}>✨ {message.senderName} entered the room</Text>
      </View>
    );
  }

  if (message.type === 'gift') {
    return (
      <TouchableOpacity onPress={onPress} style={styles.msgRow}>
        <TouchableOpacity onPress={onAvatarPress}>
          <Image cachePolicy="memory-disk" source={{ uri: message.senderAvatar || 'https://picsum.photos/100' }} style={styles.avatar} />
        </TouchableOpacity>
        <View style={styles.msgContentWrapper}>
          <Text style={styles.giftSenderName}>{message.senderName}</Text>
          <View style={styles.giftMessageBubble}>
            <View style={styles.giftInnerRow}>
              <Text style={styles.giftEmoji}>🎁</Text>
              <Text style={styles.giftText}>{message.text || `sent ${message.giftName}`}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (message.type === 'emoji') {
    return (
      <View style={styles.emojiRow}>
        <Text style={styles.emojiDisplay}>{message.content || message.text}</Text>
      </View>
    );
  }

  if (message.type === 'mic_invite') {
    return (
      <View style={styles.systemRow}>
        <View style={styles.inviteBadge}>
          <Text style={styles.inviteText}>🎤 {message.inviterName} invited you to seat #{message.targetSeatIndex}</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.msgRow}>
      <TouchableOpacity onPress={onAvatarPress}>
        <Image cachePolicy="memory-disk" source={{ uri: message.senderAvatar || 'https://picsum.photos/100' }} style={styles.avatar} />
      </TouchableOpacity>
      <View style={styles.msgContentWrapper}>
        <View style={styles.nameHeaderRow}>
          <Text style={styles.senderName}>{message.senderName}</Text>
          {onTranslate && message.type === 'text' && (message.content || message.text) && (
            <TouchableOpacity onPress={onTranslate} style={styles.translateBtn} disabled={isTranslating}>
              {isTranslating ? (
                <ActivityIndicator size="small" color="#c084fc" />
              ) : (
                <Languages size={10} color={translationText ? '#c084fc' : 'rgba(255,255,255,0.4)'} />
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.textMessageBubble}>
          {message.imageUrl ? (
            <TouchableOpacity onPress={() => onImagePress?.(message.imageUrl!)}>
              <Image cachePolicy="memory-disk" source={{ uri: message.imageUrl }} style={styles.uploadedImage} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.messageText}>{message.content || message.text}</Text>
          )}
        </View>

        {!!translationText && (
          <View style={styles.translationBubble}>
            <Text style={styles.translationText}>{translationText}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
    maxWidth: '78%',
    paddingHorizontal: 8,
  },
  systemRow: {
    alignItems: 'flex-start',
    marginLeft: 32,
    marginVertical: 4,
  },
  systemBadge: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '85%',
  },
  systemText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    textAlign: 'center',
  },
  entranceRow: {
    alignItems: 'center',
    marginVertical: 2,
  },
  entranceText: {
    color: 'rgba(251,191,36,0.8)',
    fontSize: 10,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
    marginTop: 2,
  },
  msgContentWrapper: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  translateBtn: {
    padding: 2,
  },
  textMessageBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderTopLeftRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: 'white',
    fontSize: 11,
    lineHeight: 15,
  },
  uploadedImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  translationBubble: {
    marginTop: 4,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 12,
    borderTopLeftRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.25)',
    alignSelf: 'flex-start',
  },
  translationText: {
    color: '#e9d5ff',
    fontSize: 11,
    lineHeight: 15,
  },
  giftSenderName: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  giftMessageBubble: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 16,
    borderTopLeftRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(245,158,11,0.25)',
    alignSelf: 'flex-start',
  },
  giftInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  giftEmoji: {
    fontSize: 11,
  },
  giftText: {
    color: 'white',
    fontSize: 11,
  },
  emojiRow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  emojiDisplay: {
    fontSize: 28,
  },
  inviteBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  inviteText: {
    color: '#93c5fd',
    fontSize: 10,
    textAlign: 'center',
  },
});
