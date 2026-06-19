import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MessageCircle, Music, Gamepad2, PartyPopper } from 'lucide-react-native';
import { useUser, useFirestore } from '../../firebase/provider';
import { doc, setDoc, serverTimestamp, runTransaction } from '@/firebase/firestore-compat';
import { useRouter } from 'expo-router';

interface CreateRoomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'Chat', label: 'Chat', icon: MessageCircle, emoji: '💬' },
  { id: 'Music', label: 'Music', icon: Music, emoji: '🎵' },
  { id: 'Game', label: 'Game', icon: Gamepad2, emoji: '🎮' },
  { id: 'Party', label: 'Party', icon: PartyPopper, emoji: '🎉' },
];

export function CreateRoomSheet({ visible, onClose }: CreateRoomSheetProps) {
  const [roomName, setRoomName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Chat');
  const [isCreating, setIsCreating] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!roomName.trim() || !user?.uid || !firestore) return;
    
    setIsCreating(true);
    
    try {
      let roomNumber = String(Math.floor(100000 + Math.random() * 900000));
      
      try {
        await runTransaction(firestore, async (transaction) => {
          const counterRef = doc(firestore, 'appConfig', 'counters');
          const counterSnap = await transaction.get(counterRef);
          
          let nextNumber = 101;
          if (counterSnap.exists) {
            const current = counterSnap.data()?.roomCounter || 100;
            nextNumber = current + 1;
          }
          
          transaction.set(counterRef, { roomCounter: nextNumber }, { merge: true });
          roomNumber = String(nextNumber).padStart(4, '0');
        });
      } catch (e) {
        console.warn('[CreateRoom] Counter fallback:', e);
      }

      const roomRef = doc(firestore, 'chatRooms', user.uid);
      
      await setDoc(roomRef, {
        id: user.uid,
        name: roomName.trim(),
        title: roomName.trim(),
        description: '',
        roomNumber,
        ownerId: user.uid,
        moderatorIds: [user.uid],
        createdAt: serverTimestamp(),
        category: selectedCategory,
        stats: { totalGifts: 0, dailyGifts: 0 },
        lockedSeats: [],
        participantCount: 0,
        announcement: '',
        roomThemeId: 'misty',
        isPinned: false,
        participantUids: [user.uid],
        slug: user.uid,
      });

      onClose();
      setRoomName('');
      router.push(`/rooms/${user.uid}`);
    } catch (error) {
      console.error('[CreateRoom] Error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[2.5rem] p-6 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-slate-800">Create Room</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-full">
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-600 mb-2">Room Name</Text>
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Enter room name..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
              maxLength={50}
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-slate-600 mb-2">Category</Text>
            <View className="flex-row gap-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  className={`flex-1 py-3 rounded-xl items-center ${selectedCategory === cat.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-slate-50 border border-slate-200'}`}
                >
                  <Text className="text-xl mb-1">{cat.emoji}</Text>
                  <Text className={`text-[10px] font-bold uppercase ${selectedCategory === cat.id ? 'text-purple-700' : 'text-slate-500'}`}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={isCreating || !roomName.trim()}>
            <LinearGradient 
              colors={roomName.trim() ? ['#8b5cf6', '#6366f1'] : ['#cbd5e1', '#94a3b8']} 
              className="rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">
                {isCreating ? 'Creating...' : 'Create Room'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
