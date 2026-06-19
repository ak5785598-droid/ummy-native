import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Room } from '../../lib/types';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Image } from 'expo-image';

interface ChatRoomCardProps {
  room: Room;
  onPress: () => void;
}

export function ChatRoomCard({ room, onPress }: ChatRoomCardProps) {
  const { profile: owner } = useUserProfile(room.ownerId);
  const liveCount = Math.max(0, Number(room.participantCount || 0));
  const roomTitle = room.name || room.title || 'Frequency';
  const ownerName = owner?.username || room.hostName || 'Tribe Member';
  const ownerAvatar = owner?.avatarUrl || room.hostAvatar || null;

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: '48%', height: 150, borderRadius: 18, marginHorizontal: '1%', marginBottom: 12, overflow: 'hidden', backgroundColor: '#F8F9FE' }}
    >
      {room.coverUrl ? (
        <Image cachePolicy="memory-disk" source={{ uri: room.coverUrl }} 
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          contentFit="cover"
        />
      ) : (
        <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']} className="w-full h-full absolute items-center justify-center">
          <Text className="text-3xl text-purple-600/30">🏠</Text>
        </LinearGradient>
      )}
      
      {/* Cinematic Gradients for Text Legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.1)', 'transparent']}
        className="absolute top-0 left-0 right-0 h-10 z-10"
      />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
        className="absolute bottom-0 left-0 right-0 h-20 z-10"
      />

      {/* Top Left: ID Tag */}
      <View className="absolute top-2 left-2 z-20 bg-black/40 rounded-full px-1.5 py-0.5 border border-white/10">
        <Text className="text-[7px] font-black text-white uppercase tracking-tighter">ID:{room.roomNumber || '0000'}</Text>
      </View>

      {/* Top Right: Live Viewers */}
      <View className="absolute top-2 right-2 z-20 bg-black/40 px-1.5 py-0.5 rounded-full border border-white/10 flex-row items-center gap-1">
        <View className={`h-1 w-1 rounded-full ${liveCount > 0 ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]' : 'bg-slate-400'}`} />
        <Text className="text-[7px] font-black text-white tracking-tighter">{liveCount}</Text>
      </View>

      {/* Bottom Content: Title & Host */}
      <View className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-0.5">
        <Text className="font-black text-[11px] text-white truncate leading-none mb-1" numberOfLines={1}>
          {roomTitle}
        </Text>
        
        <View className="flex-row items-center gap-1.5">
          {ownerAvatar ? (
            <Image cachePolicy="memory-disk" source={{ uri: ownerAvatar }}
              className="w-3.5 h-3.5 rounded-full border border-white/30"
            />
          ) : (
            <View className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-white/30 items-center justify-center">
              <Text className="text-[5px] text-white font-bold">U</Text>
            </View>
          )}
          <Text className="text-[7px] font-bold text-white/80 truncate uppercase tracking-widest leading-none flex-1" numberOfLines={1}>
            {ownerName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
