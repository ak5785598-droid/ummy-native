import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { X, Mic, Check, Ban } from 'lucide-react-native';
import { RoomParticipant } from '../../lib/types';
import { UserRow } from './room-user-list-row';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

interface RoomUserListProps {
  visible: boolean;
  onClose: () => void;
  participants: RoomParticipant[];
  roomId?: string;
  ownerId?: string;
  moderatorIds?: string[];
  onUserPress?: (uid: string) => void;
}

function LiveMicRequestRow({
  p,
  roomId,
  onUserPress
}: {
  p: any;
  roomId?: string;
  onUserPress?: (uid: string) => void;
}) {
  const firestore = useFirestore();
  const { profile } = useUserProfile(p.uid);
  const liveName = profile?.username || profile?.name || p.name || p.username || 'User';
  const liveAvatar = profile?.avatarUrl || p.avatarUrl;

  const handleAccept = async () => {
    if (!firestore || !roomId) return;
    try {
      await updateDoc(doc(firestore, 'chatRooms', roomId, 'participants', p.uid), {
        seatIndex: p.requestedSeatIndex || 1,
        isMuted: false,
        isRequestingMic: false,
      });
      Alert.alert('Accepted', `${liveName} was added to the mic seat.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept request.');
    }
  };

  const handleReject = async () => {
    if (!firestore || !roomId) return;
    try {
      await updateDoc(doc(firestore, 'chatRooms', roomId, 'participants', p.uid), {
        isRequestingMic: false,
      });
    } catch (e) {}
  };

  return (
    <TouchableOpacity
      onPress={() => onUserPress?.(p.uid)}
      className="flex-row items-center justify-between py-3 border-b border-white/5"
    >
      <View className="flex-row items-center flex-1 mr-3">
        <Image
          cachePolicy="memory-disk"
          source={{ uri: toCDN(liveAvatar) || 'https://picsum.photos/100' }}
          className="w-10 h-10 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="text-white text-sm font-bold">{liveName}</Text>
          <Text className="text-yellow-400 text-[10px] font-semibold">Requested Mic Seat</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={handleAccept}
          className="bg-emerald-600 px-3 py-1.5 rounded-full flex-row items-center gap-1"
        >
          <Check size={12} color="white" />
          <Text className="text-white text-[11px] font-bold">Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReject}
          className="bg-rose-600/20 border border-rose-500/30 px-2.5 py-1.5 rounded-full"
        >
          <X size={12} color="#f87171" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function RoomUserList({
  visible, onClose, participants, roomId, ownerId, moderatorIds, onUserPress
}: RoomUserListProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');

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

  const micRequests = useMemo(() => {
    if (!participants) return [];
    return participants.filter(p => (p as any).isRequestingMic || (p as any).hasMicRequest);
  }, [participants]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] pb-10 max-h-[70vh]">
          {/* Header Tabs */}
          <View className="flex-row items-center justify-between px-6 pt-6 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={() => setActiveTab('users')}
                className={`pb-1 ${activeTab === 'users' ? 'border-b-2 border-yellow-400' : ''}`}
              >
                <Text className={`text-base font-bold ${activeTab === 'users' ? 'text-yellow-400' : 'text-white/40'}`}>
                  Users ({sorted.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('requests')}
                className={`pb-1 flex-row items-center gap-1.5 ${activeTab === 'requests' ? 'border-b-2 border-yellow-400' : ''}`}
              >
                <Text className={`text-base font-bold ${activeTab === 'requests' ? 'text-yellow-400' : 'text-white/40'}`}>
                  Mic Requests ({micRequests.length})
                </Text>
                {micRequests.length > 0 && (
                  <View className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 pt-2" showsVerticalScrollIndicator={false}>
            {activeTab === 'users' ? (
              sorted.map((p) => (
                <UserRow
                  key={p.uid}
                  p={p}
                  isOwner={p.uid === ownerId}
                  isModerator={!!(moderatorIds?.includes(p.uid) && p.uid !== ownerId)}
                  onPress={onUserPress}
                />
              ))
            ) : (
              micRequests.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Mic size={32} color="rgba(255,255,255,0.2)" />
                  <Text className="text-white/40 text-xs font-semibold mt-2">No mic seat requests right now</Text>
                </View>
              ) : (
                micRequests.map((p) => (
                  <LiveMicRequestRow
                    key={p.uid}
                    p={p}
                    roomId={roomId}
                    onUserPress={onUserPress}
                  />
                ))
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

