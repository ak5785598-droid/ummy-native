import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Vibration } from 'react-native';
import { X, Volume2 } from 'lucide-react-native';
import { useFirestore, useUser } from '../../firebase/provider';
import { collection, addDoc, serverTimestamp } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';

const SOUNDS = [
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'fail', emoji: '😢', label: 'Fail' },
  { id: 'crickets', emoji: '🦗', label: 'Crickets' },
  { id: 'hype', emoji: '🔥', label: 'Hype' },
  { id: 'applause', emoji: '👏', label: 'Applause' },
  { id: 'airhorn', emoji: '📯', label: 'Air Horn' },
];

interface RoomSoundboardProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

export function RoomSoundboard({ visible, onClose, roomId }: RoomSoundboardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const handlePlaySound = async (sfxId: string) => {
    if (!firestore || !roomId || !user?.uid || !userProfile) return;
    try {
      await addDoc(collection(firestore, 'chatRooms', roomId, 'messages'), {
        text: `triggered ${sfxId}`,
        senderId: user.uid,
        senderName: userProfile.username,
        senderAvatar: userProfile.avatarUrl,
        type: 'emoji',
        isSfx: true,
        sfxId: sfxId,
        timestamp: serverTimestamp(),
      });
      Vibration.vibrate(50);
    } catch (e) { console.error('[Soundboard] Send error:', e); }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] pb-6">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2"><Volume2 size={16} color="rgba(255,255,255,0.6)" /><Text className="text-white text-base font-bold">Soundboard</Text></View>
            <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <ScrollView className="px-4 pt-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-3">
              {SOUNDS.map(s => (
                <TouchableOpacity key={s.id} onPress={() => handlePlaySound(s.id)} className="w-[45%] bg-white/5 rounded-2xl p-4 items-center border border-white/10">
                  <Text className="text-3xl mb-1">{s.emoji}</Text>
                  <Text className="text-white text-xs font-bold">{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
