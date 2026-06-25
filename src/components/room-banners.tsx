import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Star, Gift, Sparkles } from 'lucide-react-native';
import { Image } from 'expo-image';

interface RoomBannersProps {
  onOpenSpin: () => void;
  onOpenChest: () => void;
}

export function RoomBanners({ onOpenSpin, onOpenChest }: RoomBannersProps) {
  return (
    <View className="absolute right-3 bottom-[270px] z-40 flex-col gap-3 items-end">
      
      {/* Event Button */}
      <TouchableOpacity className="w-12 h-14 bg-pink-500 rounded-lg items-center justify-center border border-pink-300 shadow-lg relative overflow-hidden">
        <Image cachePolicy="memory-disk" source={{ uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/diamond-4996203-4160494.png' }} 
          className="w-8 h-8"
          contentFit="contain"
        />
        <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5">
          <Text className="text-[8px] text-white font-bold text-center">Event</Text>
        </View>
      </TouchableOpacity>

      {/* Merge Aristocracy Banner */}
      <TouchableOpacity className="bg-[#150029]/80 rounded-full flex-row items-center p-1 border border-purple-500/50 shadow-lg">
        <Image cachePolicy="memory-disk" source={{ uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/crown-4996215-4160506.png' }} 
          className="w-8 h-8"
        />
        <Text className="text-white font-bold text-[10px] mx-2">Merge Aristocra...</Text>
      </TouchableOpacity>

      {/* Bus Progress Bar */}
      <TouchableOpacity className="bg-black/60 rounded-full flex-row items-center p-1 border border-white/20 shadow-lg w-32 relative">
        <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center z-10">
          <Text className="text-[10px] text-white font-bold">BUS</Text>
        </View>
        <View className="flex-1 px-2">
          <Text className="text-white/50 text-[8px] font-bold">0%</Text>
          {/* Progress track */}
          <View className="w-full h-1 bg-gray-600 rounded-full mt-0.5">
            <View className="w-0 h-1 bg-blue-400 rounded-full" />
          </View>
        </View>
        <View className="absolute -top-2 -right-2 bg-yellow-500 rounded-full px-1.5 border border-white">
          <Text className="text-[8px] font-bold text-black">Lv.1</Text>
        </View>
      </TouchableOpacity>
      
    </View>
  );
}
