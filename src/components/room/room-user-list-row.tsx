import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Crown, Shield, Mic, MicOff } from 'lucide-react-native';
import { Image } from 'expo-image';
interface UserRowProps {
  p: any;
  isOwner: boolean;
  isModerator: boolean;
  onPress?: (uid: string) => void;
}

export function UserRow({ p, isOwner, isModerator, onPress }: UserRowProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress?.(p.uid)}
      className="flex-row items-center py-3 border-b border-white/5"
    >
      <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }}
        className="w-10 h-10 rounded-full mr-3"
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-sm font-bold">{p.name}</Text>
          {isOwner && <Crown size={14} color="#fbbf24" />}
          {isModerator && <Shield size={14} color="#60a5fa" />}
        </View>
        <Text className="text-white/50 text-[10px]">
          Seat {p.seatIndex || 'Audience'}
        </Text>
      </View>
      {p.seatIndex > 0 && (
        p.isMuted ? (
          <MicOff size={16} color="#ef4444" />
        ) : (
          <Mic size={16} color="#22c55e" />
        )
      )}
    </TouchableOpacity>
  );
}
