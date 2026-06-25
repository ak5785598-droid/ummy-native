import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Users, Settings, Share2, Power, Heart } from 'lucide-react-native';
import { Image } from 'expo-image';

interface RoomHeaderProps {
  roomTitle: string;
  roomId: string;
  roomCoverUrl?: string;
  onlineCount: number;
  isOwner: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onOpenSettings?: () => void;
  onOpenShare?: () => void;
  onExit?: () => void;
}

export function RoomHeader({
  roomTitle,
  roomId,
  roomCoverUrl,
  onlineCount,
  isOwner,
  isFollowing,
  onFollow,
  onOpenSettings,
  onOpenShare,
  onExit
}: RoomHeaderProps) {
  return (
    <View className="relative z-[100] flex-col w-full px-4 pt-10 pb-1">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between w-full h-12">
        {/* Left Side: Avatar, Title, Follow */}
        <View className="flex-row items-center flex-1 mr-2 bg-black/30 rounded-full p-1 border border-white/10 shadow-lg">
          <Image cachePolicy="memory-disk" source={{ uri: roomCoverUrl || 'https://via.placeholder.com/150' }} 
            className="w-10 h-10 rounded-full border border-white/20"
          />
          <View className="flex-col flex-1 px-2 justify-center">
            <View className="flex-row items-center">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {roomTitle}
              </Text>
            </View>
            <Text className="text-white/50 text-[10px]">
              ID:{roomId}
            </Text>
          </View>

          {/* Follow Button */}
          {!isOwner && (
            <TouchableOpacity 
              onPress={onFollow}
              className={`mr-1 h-7 px-3 rounded-full flex-row items-center justify-center border ${isFollowing ? 'bg-black/20 border-white/20' : 'bg-pink-500 border-pink-400'}`}
            >
              <Heart color="white" size={12} fill={isFollowing ? 'transparent' : 'white'} />
              <Text className="text-white font-bold text-[10px] ml-1">{isFollowing ? 'Subscribed' : 'Sub'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right Side: Action Icons */}
        <View className="flex-row items-center gap-2">
          {/* Online Count */}
          <TouchableOpacity className="h-10 px-3 rounded-full bg-black/40 border border-white/10 flex-row items-center justify-center shadow-lg">
            <Users color="white" size={14} />
            <Text className="text-white font-bold text-[11px] ml-1">{onlineCount}</Text>
          </TouchableOpacity>

          {/* Settings */}
          {isOwner && (
            <TouchableOpacity onPress={onOpenSettings} className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center shadow-lg">
              <Settings color="white" size={16} />
            </TouchableOpacity>
          )}

          {/* Share */}
          <TouchableOpacity onPress={onOpenShare} className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center shadow-lg">
            <Share2 color="white" size={16} />
          </TouchableOpacity>

          {/* Exit */}
          <TouchableOpacity onPress={onExit} className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center shadow-lg">
            <Power color="white" size={16} />
          </TouchableOpacity>

          {/* Golden Task Jar */}
          <TouchableOpacity className="relative ml-2">
            <Image cachePolicy="memory-disk" source={{ uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/pot-of-gold-4996201-4160492.png' }} 
              className="w-12 h-12 drop-shadow-2xl"
              contentFit="contain"
            />
            <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border border-white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Room Trophy Badge Placeholder */}
      <View className="mt-2 ml-1 bg-yellow-500/20 self-start px-3 py-1 rounded-full border border-yellow-500/30">
        <Text className="text-yellow-400 font-bold text-xs">🏆 Daily: 25.0K / 2.5M</Text>
      </View>
    </View>
  );
}
