import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Film } from 'lucide-react-native';
import { Image } from 'expo-image';

interface MovieSyncBannerProps {
  visible: boolean;
  movieTitle?: string;
  posterPath?: string;
  startedBy?: string;
  onJoin: () => void;
  onDismiss: () => void;
}

export function MovieSyncBanner({ visible, movieTitle, posterPath, startedBy, onJoin, onDismiss }: MovieSyncBannerProps) {
  if (!visible) return null;
  return (
    <TouchableOpacity onPress={onJoin} className="mx-4 mb-2 bg-purple-900/60 rounded-xl p-3 flex-row items-center border border-purple-500/30 active:opacity-80">
      <View className="w-10 h-14 rounded-lg bg-purple-800 overflow-hidden mr-3">
        {posterPath ? <Image cachePolicy="memory-disk" source={{ uri: `https://image.tmdb.org/t/p/w92${posterPath}` }} className="w-full h-full" /> : <Film size={16} color="rgba(255,255,255,0.3)" />}
      </View>
      <View className="flex-1"><Text className="text-white text-xs font-bold">{movieTitle || 'Movie'}</Text><Text className="text-white/50 text-[9px]">Started by {startedBy || 'someone'}</Text></View>
      <Text className="text-purple-300 text-[10px] font-bold mr-2">Join</Text>
    </TouchableOpacity>
  );
}
