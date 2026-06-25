import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { Image } from 'expo-image';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '../../firebase/provider';
import { doc, collection, query, orderBy, serverTimestamp } from '@/firebase/firestore-compat';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';

const BUILTIN_EMOJIS = [
  { id: '__angry__', label: 'Angry' },
  { id: '__love_handshake__', label: 'Love Handshake' },
  { id: '__love_show__', label: 'Love Show' },
  { id: '__thinking__', label: 'Thinking' },
  { id: '__cry__', label: 'Cry' },
  { id: '__writing__', label: 'Writing' },
  { id: '__run__', label: 'Run' },
  { id: '__frustration__', label: 'Frustration' },
  { id: '__irritation__', label: 'Irritation' },
];

interface RoomEmojiPickerDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

export function RoomEmojiPickerDialog({ visible, onClose, roomId }: RoomEmojiPickerDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const customEmojisQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customEmojis'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: customEmojis } = useCollection<any>(customEmojisQuery);

  const emojis = useMemo(() => {
    const custom = customEmojis
      ? customEmojis.map((c: any) => ({
          id: c.id || c.name?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(),
          label: c.name,
          imageUrl: c.imageUrl,
          animationUrl: c.animationUrl,
        }))
      : [];
    return [...BUILTIN_EMOJIS, ...custom];
  }, [customEmojis]);

  const handleSendEmoji = (emojiId: string) => {
    if (!firestore || !roomId || !user) return;
    const pRef = doc(firestore, 'chatRooms', roomId, 'participants', user.uid);
    updateDocumentNonBlocking(pRef, { activeEmoji: emojiId, updatedAt: serverTimestamp() });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback>
            <View className="bg-black/95 rounded-t-[40px] overflow-hidden border-t border-yellow-500/30" style={{ shadowColor: '#eab308', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 40, elevation: 10 }}>
              <View className="items-center mt-4 mb-2">
                <View className="w-12 h-1.5 bg-white/20 rounded-full" />
              </View>

              <View className="p-4 pb-0 items-center">
                <Text className="text-2xl font-black italic tracking-widest text-yellow-500 uppercase">Emojis</Text>
              </View>

              <View style={{ height: 340 }}>
                {emojis.length === 0 ? (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-white/40">No custom emojis yet</Text>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 48 }}>
                    <View className="flex-row flex-wrap justify-between">
                      {emojis.map((item: any) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleSendEmoji(item.id)}
                          className="items-center mb-10 w-[30%] active:scale-90"
                          activeOpacity={0.7}
                        >
                          <View className="h-16 w-16 items-center justify-center shadow-2xl">
                            {item.id === '__angry__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>😠</Text>
                              </View>
                            ) : item.id === '__love_handshake__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 30 }}>🤝</Text>
                              </View>
                            ) : item.id === '__love_show__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>❤️</Text>
                              </View>
                            ) : item.id === '__thinking__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>🤔</Text>
                              </View>
                            ) : item.id === '__cry__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#64B5F6', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>😢</Text>
                              </View>
                            ) : item.id === '__writing__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>✍️</Text>
                              </View>
                            ) : item.id === '__run__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>🏃</Text>
                              </View>
                            ) : item.id === '__frustration__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFEBEE', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>😤</Text>
                              </View>
                            ) : item.id === '__irritation__' ? (
                              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36 }}>😒</Text>
                              </View>
                            ) : item.imageUrl ? (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={{ width: 64, height: 64 }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                              />
                            ) : (
                              <Text className="text-4xl">😎</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
