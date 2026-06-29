import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Settings, Share2, Heart, Users, Power } from 'lucide-react-native';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

interface RoomHeaderProps {
  roomTitle: string;
  roomId: string;
  roomNumber?: string;
  onlineCount: number;
  coverUrl?: string;
  isOwner: boolean;
  isFollowing?: boolean;
  onOpenInfo: () => void;
  onFollow?: () => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  onExit: () => void;
  onOpenUserList?: () => void;
}

export function RoomHeader({
  roomTitle, roomId, roomNumber, onlineCount, coverUrl,
  isOwner, isFollowing, onOpenInfo, onFollow, onOpenSettings, onOpenShare, onExit,
  onOpenUserList,
}: RoomHeaderProps) {
  return (
    <View className="flex-row items-center justify-between w-full pl-2 pr-4 z-50" style={{ height: 44 }}>
      <View className="flex-row items-center gap-3 flex-1 min-w-0">
        <TouchableOpacity onPress={onOpenInfo} activeOpacity={0.7} className="-ml-1">
          {coverUrl ? (
            <Image cachePolicy="memory-disk" key={coverUrl} source={{ uri: toCDN(coverUrl) }} className="w-12 h-12 rounded-xl border border-white/10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 } as any} />
          ) : (
            <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center border border-white/10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 }}>
              <Text className="text-white text-base font-black">R</Text>
            </View>
          )}
        </TouchableOpacity>
        <View className="flex-col min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5 overflow-hidden">
            <Text className="text-white font-bold" style={{ fontSize: 14, letterSpacing: -0.3, lineHeight: 16 }} numberOfLines={1}>{roomTitle}</Text>
            {!isOwner && onFollow && (
              <TouchableOpacity onPress={onFollow} className="h-5 px-1.5 rounded-full flex-row items-center gap-1 border shrink-0" style={{ backgroundColor: isFollowing ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.05)', borderColor: isFollowing ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)' }}>
                <Heart size={10} color={isFollowing ? '#ec4899' : 'rgba(255,255,255,0.4)'} fill={isFollowing ? '#ec4899' : 'transparent'} />
                <Text style={{ fontSize: 7.5, fontWeight: '900', letterSpacing: -0.3 }} className={isFollowing ? 'text-pink-500' : 'text-white/40'}>{isFollowing ? 'Sub' : 'Follow'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-white/40 font-medium" style={{ fontSize: 9, lineHeight: 12 }}>ID:{roomNumber || roomId.slice(0, 6)}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 shrink-0">
        <TouchableOpacity onPress={onOpenUserList} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
          <Users size={16} color="white" />
          <Text className="text-white font-bold absolute" style={{ fontSize: 9, bottom: 2 }}>{onlineCount}</Text>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity onPress={onOpenSettings} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
            <Settings size={20} color="white" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onOpenShare} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
          <Share2 size={16} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onExit} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
          <Power size={16} color="#fca5a5" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
