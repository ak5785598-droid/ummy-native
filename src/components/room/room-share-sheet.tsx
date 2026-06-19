import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, Linking } from 'react-native';
import { X, Copy, Share2, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';

interface RoomShareSheetProps {
  visible: boolean;
  onClose: () => void;
  room: {
    id: string;
    title: string;
    roomNumber: string;
    coverUrl?: string;
  } | null;
}

export function RoomShareSheet({ visible, onClose, room }: RoomShareSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const roomUrl = `https://ummy.app/rooms/${room.id}`;

  const handleCopyId = async () => {
    try {
      await Clipboard.setStringAsync(room.roomNumber || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('[Share] Copy error:', e);
    }
  };

  const handleShareToWhatsApp = () => {
    const shareText = `Tribe Member, join my frequency!\nRoom ID: #${room.roomNumber}\n\nLink: ${roomUrl}`;
    const url = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    const webUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        console.error('[Share] WhatsApp open error:', err);
        Linking.openURL(webUrl);
      });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        {/* Click outside to close */}
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />

        <View className="bg-white rounded-t-[2.5rem] pb-10 pt-6 px-6 relative w-full">
          {/* Header */}
          <View className="flex-row items-center gap-4 pb-4 border-b border-slate-100">
            <View className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
              <Share2 size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black uppercase text-slate-800 tracking-tight">Broadcast Frequency</Text>
              <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                Invite Tribe Members via Tribal ID
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 bg-slate-100 rounded-full">
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Room Card */}
          <View className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200/60 flex-col items-center mt-6 mb-6">
            <View className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden border border-slate-200">
              <Image cachePolicy="memory-disk" source={{ uri: room.coverUrl || 'https://picsum.photos/150' }} 
                className="h-14 w-14 rounded-full object-cover" 
              />
            </View>
            <Text className="font-black uppercase text-base text-slate-800 mt-3">{room.title}</Text>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Tribal ID: {room.roomNumber}
            </Text>
          </View>

          {/* Large Highlighted ID Display */}
          <View className="items-center mb-8">
            <View className="bg-slate-100 px-8 py-3 rounded-2xl border-2 border-slate-200/50 shadow-inner">
              <Text className="text-3xl font-black tracking-tight text-slate-800">
                #{room.roomNumber}
              </Text>
            </View>
            <Text className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-2">
              Tap Invite to Copy This ID
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleShareToWhatsApp}
              className="h-14 rounded-2xl bg-[#25D366] items-center justify-center flex-row shadow-md shadow-green-500/25 active:scale-95 transition-all"
            >
              <Text className="text-white font-black text-sm uppercase tracking-wide">📲 Share to WhatsApp</Text>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 h-14 rounded-2xl border-2 border-slate-200 items-center justify-center active:scale-95 transition-all"
              >
                <Text className="text-slate-500 font-black text-sm uppercase tracking-wide">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCopyId}
                className="flex-1 h-14 rounded-2xl bg-blue-600 items-center justify-center active:scale-95 transition-all"
              >
                {copied ? (
                  <View className="flex-row items-center gap-2 justify-center">
                    <Check size={16} color="white" />
                    <Text className="text-white font-black text-sm uppercase tracking-wide">Copied!</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2 justify-center">
                    <Copy size={16} color="white" />
                    <Text className="text-white font-black text-sm uppercase tracking-wide">Copy ID</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
