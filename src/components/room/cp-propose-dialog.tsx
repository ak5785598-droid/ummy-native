import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Vibration } from 'react-native';
import { X, Heart, Sparkles, Star, Zap, CheckCircle } from 'lucide-react-native';
import { useFirestore, useUser } from '../../firebase/provider';
import { doc, setDoc, serverTimestamp } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

interface CPProposeDialogProps {
  visible: boolean;
  onClose: () => void;
  targetUser: { uid: string; name: string; avatarUrl: string } | null;
}

const TYPES = [
  { id: 'CP', label: 'Couple Partner', icon: '💑', color: '#ec4899' },
  { id: 'BFF', label: 'Best Friend', icon: '🤝', color: '#8b5cf6' },
  { id: 'Love', label: 'Love', icon: '💕', color: '#ef4444' },
];

const MESSAGES: Record<string, string[]> = {
  CP: ['Will you be my CP? 💖', 'Let\'s be partners! 💑', 'Forever together? 💕'],
  BFF: ['Best friends forever? 🤝', 'Let\'s be BFFs! 🌟', 'Friends forever! 🎉'],
  Love: ['I love you! 💕', 'Will you be mine? 💖', 'You mean everything to me! 💗'],
};

export function CPProposeDialog({ visible, onClose, targetUser }: CPProposeDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const [selectedType, setSelectedType] = useState<'CP' | 'BFF' | 'Love'>('Love');
  const [isSent, setIsSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!firestore || !user?.uid || !targetUser || !userProfile || sending) return;
    setSending(true);
    try {
      const proposeRef = doc(firestore, 'proposals', `${user.uid}_${targetUser.uid}`);
      await setDoc(proposeRef, {
        fromUid: user.uid, fromName: userProfile.username, fromAvatar: userProfile.avatarUrl,
        toUid: targetUser.uid, toName: targetUser.name, toAvatar: targetUser.avatarUrl,
        type: selectedType, status: 'pending', message: MESSAGES[selectedType][Math.floor(Math.random() * MESSAGES[selectedType].length)],
        timestamp: serverTimestamp(),
      });
      setIsSent(true);
      Vibration.vibrate(100);
    } catch {}
    setSending(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/70 justify-center items-center">
        <View className="bg-slate-900 rounded-2xl w-[85%] p-6 border border-pink-500/20">
          <TouchableOpacity onPress={onClose} className="absolute top-3 right-3 p-1"><X size={18} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          <View className="items-center mb-4">
            <Heart size={32} color="#ec4899" fill="#ec4899" />
            <Text className="text-white text-lg font-black mt-2">Send a Proposal</Text>
          </View>
          {targetUser && (
            <View className="flex-row items-center gap-3 bg-white/5 rounded-xl p-3 mb-4 border border-white/10">
              <Image cachePolicy="memory-disk" source={{ uri: toCDN(targetUser.avatarUrl) }} className="w-12 h-12 rounded-full bg-slate-700" />
              <View>
                <Text className="text-white text-sm font-bold">{targetUser.name}</Text>
                <Text className="text-pink-400 text-[10px] font-bold">Target</Text>
              </View>
            </View>
          )}
          <Text className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Choose Type</Text>
          <View className="flex-row gap-2 mb-4">
            {TYPES.map(t => (
              <TouchableOpacity key={t.id} onPress={() => setSelectedType(t.id as any)} className={`flex-1 items-center py-3 rounded-xl border ${selectedType === t.id ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5'}`}>
                <Text className="text-2xl mb-1">{t.icon}</Text>
                <Text className={`text-[9px] font-bold text-center ${selectedType === t.id ? 'text-white' : 'text-white/50'}`}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isSent ? (
            <View className="items-center py-4">
              <CheckCircle size={40} color="#22c55e" />
              <Text className="text-emerald-400 text-sm font-bold mt-2">Proposal Sent! 💕</Text>
              <Text className="text-white/40 text-[10px] mt-1">Waiting for response...</Text>
              <TouchableOpacity onPress={onClose} className="mt-4 bg-white/10 px-6 py-2 rounded-full"><Text className="text-white text-xs font-bold">Close</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleSend} disabled={sending} className="bg-gradient-to-r from-pink-500 to-rose-500 py-3 rounded-full items-center flex-row justify-center gap-2">
              <Sparkles size={16} color="white" />
              <Text className="text-white font-bold text-sm">{sending ? 'Sending...' : `Send ${selectedType} Proposal`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
