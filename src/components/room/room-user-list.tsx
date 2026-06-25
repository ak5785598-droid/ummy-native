import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { RoomParticipant } from '../../lib/types';
import { UserRow } from './room-user-list-row';

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
              <UserRow
                key={p.uid}
                p={p}
                isOwner={p.uid === ownerId}
                isModerator={!!(moderatorIds?.includes(p.uid) && p.uid !== ownerId)}
                onPress={onUserPress}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
