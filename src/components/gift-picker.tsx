import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { Gift, X, ChevronRight } from 'lucide-react-native';

interface GiftPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSend: (giftId: string) => void;
}

const GIFTS = [
  { id: 'rose', name: 'Rose', price: 10, icon: '🌹' },
  { id: 'heart', name: 'Heart', price: 50, icon: '💖' },
  { id: 'car', name: 'Car', price: 1000, icon: '🚗' },
  { id: 'rocket', name: 'Rocket', price: 5000, icon: '🚀' },
  { id: 'castle', name: 'Castle', price: 10000, icon: '🏰' },
  { id: 'diamond', name: 'Diamond', price: 500, icon: '💎' },
];

export function GiftPicker({ isVisible, onClose, onSend }: GiftPickerProps) {
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Background Overlay */}
        <TouchableOpacity 
          className="absolute inset-0 bg-black/60" 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        {/* Bottom Sheet */}
        <View className="bg-[#150029] rounded-t-3xl border-t border-purple-500/30 w-full h-[60%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-white/10">
            <View className="flex-row items-center">
              <Gift color="#fcd34d" size={24} />
              <Text className="text-white font-bold text-lg ml-2">Send Gift</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white/10 rounded-full">
              <X color="white" size={20} />
            </TouchableOpacity>
          </View>

          {/* Balance */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-black/20">
            <Text className="text-white/60">My Balance</Text>
            <View className="flex-row items-center">
              <Text className="text-yellow-400 font-bold mr-1">25,000</Text>
              <ChevronRight color="rgba(255,255,255,0.4)" size={16} />
            </View>
          </View>

          {/* Gift Grid */}
          <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {GIFTS.map((gift) => (
                <TouchableOpacity 
                  key={gift.id}
                  onPress={() => onSend(gift.id)}
                  className="w-[30%] bg-white/5 rounded-2xl items-center justify-center p-4 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-4xl mb-2">{gift.icon}</Text>
                  <Text className="text-white font-bold">{gift.price}</Text>
                  <Text className="text-white/50 text-xs">{gift.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
