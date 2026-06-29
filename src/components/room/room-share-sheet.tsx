import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Linking } from 'react-native';
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

  const roomUrl = `https://ummy-chat.vercel.app/rooms/${room.id}`;

  const handleCopyId = async () => {
    try {
      await Clipboard.setStringAsync(room.roomNumber || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
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
        Linking.openURL(webUrl);
      });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity 
        className="flex-1 bg-black/60 justify-center items-center px-6" 
        activeOpacity={1} 
        onPress={onClose}
      >
        {/* Centered Compact Premium Dialog */}
        <View 
          className="bg-white rounded-[2rem] w-full max-w-[320px] p-5 border border-slate-100 shadow-2xl items-center" 
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center w-full pb-3.5 border-b border-slate-100">
            <View className="flex-row items-center gap-2">
              <Share2 size={16} color="#3b82f6" />
              <Text className="text-slate-800 text-sm font-black uppercase tracking-wider">Share Room</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1.5 bg-slate-100 rounded-full">
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Room Card - Horizontal Compact */}
          <View className="flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl w-full border border-slate-100 mt-4 mb-4">
            <Image 
              cachePolicy="memory-disk" 
              source={{ uri: room.coverUrl || 'https://picsum.photos/150' }} 
              className="h-11 w-11 rounded-xl object-cover bg-slate-200" 
            />
            <View className="flex-1">
              <Text className="font-extrabold text-slate-800 text-sm" numberOfLines={1}>
                {room.title}
              </Text>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                ID: {room.roomNumber}
              </Text>
            </View>
          </View>

          {/* Highlighted ID Display */}
          <View className="items-center mb-5 bg-blue-50/40 border border-blue-100/50 px-6 py-2 rounded-xl">
            <Text className="text-2xl font-black tracking-tight text-blue-600">
              #{room.roomNumber}
            </Text>
          </View>

          {/* Action Buttons - Compact */}
          <View className="w-full gap-2">
            <TouchableOpacity
              onPress={handleShareToWhatsApp}
              className="h-11 rounded-2xl bg-[#25D366] items-center justify-center flex-row shadow-sm shadow-green-500/20 active:scale-95 transition-all"
            >
              <Text className="text-white font-extrabold text-xs uppercase tracking-wider">ðŸ“² Share to WhatsApp</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 h-11 rounded-2xl border border-slate-200 items-center justify-center active:scale-95 transition-all"
              >
                <Text className="text-slate-500 font-extrabold text-xs uppercase tracking-wider">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCopyId}
                className="flex-1 h-11 rounded-2xl bg-blue-600 items-center justify-center active:scale-95 transition-all"
              >
                {copied ? (
                  <View className="flex-row items-center gap-1.5 justify-center">
                    <Check size={12} color="white" />
                    <Text className="text-white font-extrabold text-xs uppercase tracking-wider">Copied!</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1.5 justify-center">
                    <Copy size={12} color="white" />
                    <Text className="text-white font-extrabold text-xs uppercase tracking-wider">Copy ID</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
