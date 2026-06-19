import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Mic } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RoomMicInviteProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  inviterName?: string;
  seatIndex?: number;
}

export function RoomMicInvite({
  visible, onClose, onAccept, onDecline, inviterName, seatIndex
}: RoomMicInviteProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 justify-center items-center px-8">
        <View className="bg-slate-900 rounded-[2rem] w-full p-6">
          <TouchableOpacity onPress={onClose} className="absolute top-4 right-4 p-1 z-10">
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-purple-500/20 items-center justify-center mb-3">
              <Mic size={32} color="#a78bfa" />
            </View>
            <Text className="text-white text-lg font-bold text-center">Mic Invite</Text>
            <Text className="text-white/60 text-sm text-center mt-1">
              {inviterName || 'Someone'} invited you to speak
            </Text>
            {seatIndex && (
              <Text className="text-white/40 text-xs mt-1">Seat #{seatIndex}</Text>
            )}
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onDecline} className="flex-1">
              <View className="bg-white/10 rounded-2xl py-3 items-center">
                <Text className="text-white font-bold">Decline</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} className="flex-1">
              <LinearGradient colors={['#8b5cf6', '#6366f1']} className="rounded-2xl py-3 items-center">
                <Text className="text-white font-bold">Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
