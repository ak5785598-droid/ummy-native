import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Mail, MessageSquare } from 'lucide-react-native';
import { Image } from 'expo-image';

interface RoomMessagesDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

export function RoomMessagesDialog({ isVisible, onClose }: RoomMessagesDialogProps) {
  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-slate-900 rounded-t-3xl h-[70%] w-full absolute bottom-0 shadow-2xl border-t border-white/10">
        
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-white/10">
          <View className="flex-row items-center gap-2">
            <Mail color="white" size={20} />
            <Text className="font-bold text-lg text-white">Messages</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2 bg-white/5 rounded-full">
            <X color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Messages List (Empty State for now) */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="items-center justify-center py-20 px-6">
            <View className="w-24 h-24 bg-white/5 rounded-full items-center justify-center mb-6">
              <MessageSquare color="rgba(255,255,255,0.2)" size={48} />
            </View>
            <Text className="text-white font-bold text-xl mb-2">No Messages Yet</Text>
            <Text className="text-white/50 text-center text-sm leading-relaxed">
              When people send you direct messages or system notifications arrive, they will appear here.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
