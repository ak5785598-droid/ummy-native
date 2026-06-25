import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Smile } from 'lucide-react-native';

interface RoomEmojiPickerDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export function RoomEmojiPickerDialog({ isVisible, onClose, onSelectEmoji }: RoomEmojiPickerDialogProps) {
  // Common room emojis
  const emojis = ['😀','😂','😍','😘','😎','😭','😡','👍','👎','👏','🔥','❤️','🎉','💯','✨','👑'];

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-slate-900 rounded-t-3xl h-[40%] w-full absolute bottom-0 shadow-2xl border-t border-white/10">
        
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-white/10">
          <View className="flex-row items-center gap-2">
            <Smile color="white" size={20} />
            <Text className="font-bold text-lg text-white">Send Emoji</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2 bg-white/5 rounded-full">
            <X color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Emojis Grid */}
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap gap-4 justify-center">
            {emojis.map((emoji, idx) => (
              <TouchableOpacity 
                key={idx} 
                onPress={() => {
                  onSelectEmoji(emoji);
                  onClose();
                }}
                className="w-14 h-14 bg-white/5 rounded-full items-center justify-center active:scale-90 border border-white/5"
              >
                <Text className="text-3xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
