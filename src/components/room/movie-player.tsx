import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Film } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

interface MoviePlayerProps {
  visible: boolean;
  onClose: () => void;
  tmdbId?: string;
  title?: string;
  posterPath?: string;
}

export function MoviePlayer({ visible, onClose, tmdbId, title }: MoviePlayerProps) {
  const videoUrl = tmdbId ? `https://vidsrc.to/embed/movie/${tmdbId}` : null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 pt-12 pb-3 bg-black/80 z-10">
          <Text className="text-white text-sm font-bold flex-1 mr-2" numberOfLines={1}>{title || 'Movie'}</Text>
          <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
        </View>
        <View className="flex-1">
          {videoUrl ? (
            <WebView source={{ uri: videoUrl }} className="flex-1" allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} startInLoadingState renderLoading={() => <View className="flex-1 items-center justify-center bg-black"><ActivityIndicator color="white" /></View>} />
          ) : (
            <View className="flex-1 items-center justify-center"><Film size={48} color="rgba(255,255,255,0.15)" /><Text className="text-white/20 text-sm mt-3">No movie selected</Text></View>
          )}
        </View>
      </View>
    </Modal>
  );
}
