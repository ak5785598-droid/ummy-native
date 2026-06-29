import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Users } from 'lucide-react-native';
import { useFirestore } from '../../firebase/provider';
import { collection, query, orderBy, onSnapshot } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

interface RoomFollowersDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

export function RoomFollowersDialog({ visible, onClose, roomId }: RoomFollowersDialogProps) {
  const firestore = useFirestore();
  const [followers, setFollowers] = useState<{ uid: string; name: string; avatarUrl: string }[]>([]);

  useEffect(() => {
    if (!firestore || !roomId || !visible) return;
    const q = query(collection(firestore, 'chatRooms', roomId, 'followers'), orderBy('followedAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setFollowers(snap.docs.map((d: any) => ({ uid: d.id, name: d.data().name || 'User', avatarUrl: d.data().avatarUrl || 'https://picsum.photos/100' })));
    }, (error: any) => {});
    return () => unsub();
  }, [firestore, roomId, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] max-h-[70%] pb-6">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2"><Users size={16} color="rgba(255,255,255,0.6)" /><Text className="text-white text-base font-bold">Followers ({followers.length})</Text></View>
            <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <ScrollView className="px-4 pt-2" showsVerticalScrollIndicator={false}>
            {followers.length === 0 ? <Text className="text-white/40 text-sm text-center py-10">No followers yet</Text> : followers.map(f => (
              <View key={f.uid} className="flex-row items-center py-3 border-b border-white/5">
                <Image cachePolicy="memory-disk" source={{ uri: toCDN(f.avatarUrl) }} className="w-10 h-10 rounded-full bg-slate-700" />
                <Text className="text-white text-sm font-bold ml-3 flex-1">{f.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
