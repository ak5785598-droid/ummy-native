import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Crown, Mic, MicOff, Shield } from 'lucide-react-native';
import { RoomParticipant } from '../../lib/types';
import { Image } from 'expo-image';

interface RoomUserListProps {
  visible: boolean;
  onClose: () => void;
  participants: RoomParticipant[];
  ownerId?: string;
  moderatorIds?: string[];
  onUserPress?: (uid: string) => void;
}

export function RoomUserList({
  visible, onClose, participants, ownerId, moderatorIds, onUserPress
}: RoomUserListProps) {
  const sorted = useMemo(() => {
    if (!participants) return [];
    return [...participants].sort((a, b) => {
      if (a.uid === ownerId) return -1;
      if (b.uid === ownerId) return 1;
      if (moderatorIds?.includes(a.uid) && !moderatorIds?.includes(b.uid)) return -1;
      if (!moderatorIds?.includes(a.uid) && moderatorIds?.includes(b.uid)) return 1;
      return (b.seatIndex || 0) - (a.seatIndex || 0);
    });
  }, [participants, ownerId, moderatorIds]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] pb-10 max-h-[70vh]">
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
            <Text className="text-white text-lg font-bold">
              Users ({sorted.length})
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-2" showsVerticalScrollIndicator={false}>
            {sorted.map((p) => (
              <TouchableOpacity
                key={p.uid}
                onPress={() => onUserPress?.(p.uid)}
                className="flex-row items-center py-3 border-b border-white/5"
              >
                <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white text-sm font-bold">{p.name}</Text>
                    {p.uid === ownerId && (
                      <Crown size={14} color="#fbbf24" />
                    )}
                    {moderatorIds?.includes(p.uid) && p.uid !== ownerId && (
                      <Shield size={14} color="#60a5fa" />
                    )}
                  </View>
                  <Text className="text-white/50 text-[10px]">
                    Seat {p.seatIndex || 'Audience'}
                  </Text>
                </View>
                {p.seatIndex > 0 && (
                  p.isMuted ? (
                    <MicOff size={16} color="#ef4444" />
                  ) : (
                    <Mic size={16} color="#22c55e" />
                  )
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
