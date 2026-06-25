import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Heart, MessageCircle, Eye, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moment } from '../../lib/types';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 28) / 2;

interface MomentCardProps {
  moment: Moment;
  onPress: () => void;
  onCommentPress: () => void;
}

export function MomentCard({ moment, onPress, onCommentPress }: MomentCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: CARD_SIZE, height: CARD_SIZE * 1.3 }}
      className="rounded-xl overflow-hidden mb-2"
    >
      {moment.imageUrl && !imageError ? (
        <Image cachePolicy="memory-disk" source={{ uri: moment.imageUrl }}
          className="w-full h-full absolute"
          contentFit="cover"
          onError={() => setImageError(true)}
        />
      ) : moment.videoUrl ? (
        <View className="w-full h-full absolute bg-slate-800 items-center justify-center">
          <Image cachePolicy="memory-disk" source={{ uri: moment.imageUrl || 'https://picsum.photos/400' }}
            className="w-full h-full absolute"
            contentFit="cover"
          />
          <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center">
            <Play size={20} color="white" fill="white" />
          </View>
        </View>
      ) : (
        <View className="w-full h-full absolute bg-purple-200 items-center justify-center p-2">
          <Text className="text-purple-600 text-xs text-center" numberOfLines={3}>
            {moment.content}
          </Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        className="absolute bottom-0 left-0 right-0 h-24"
      />

      {moment.commentsCount > 0 && (
        <View className="absolute top-2 left-2 bg-black/50 rounded-full px-2 py-0.5">
          <View className="flex-row items-center gap-1">
            <MessageCircle size={10} color="white" />
            <Text className="text-[9px] font-bold text-white">{moment.commentsCount}</Text>
          </View>
        </View>
      )}

      <View className="absolute bottom-2 left-2 right-2">
        <View className="flex-row items-center gap-1.5 mb-1">
          <Image cachePolicy="memory-disk" source={{ uri: moment.avatarUrl || 'https://picsum.photos/100' }}
            className="w-5 h-5 rounded-full border border-white/30"
          />
          <Text className="text-white text-[9px] font-bold flex-1" numberOfLines={1}>
            {moment.username}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Eye size={10} color="rgba(255,255,255,0.6)" />
            <Text className="text-[8px] text-white/60">{moment.views || 0}</Text>
          </View>
          <TouchableOpacity onPress={onCommentPress} className="flex-row items-center gap-1">
            <Heart size={10} color="rgba(255,255,255,0.6)" />
            <Text className="text-[8px] text-white/60">{moment.likes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
