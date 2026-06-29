import React from 'react';
import { View, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

interface ImagePreviewDialogProps {
  visible: boolean;
  onClose: () => void;
  imageUrl?: string | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImagePreviewDialog({ visible, onClose, imageUrl }: ImagePreviewDialogProps) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/90 justify-center items-center">
        <TouchableOpacity onPress={onClose} className="absolute top-12 right-6 z-10 p-2 bg-black/50 rounded-full">
          <X size={24} color="white" />
        </TouchableOpacity>
        <Image cachePolicy="memory-disk" source={{ uri: toCDN(imageUrl) }}
          style={{ width: SCREEN_WIDTH - 32, height: SCREEN_HEIGHT * 0.6 }}
          contentFit="contain"
        />
      </View>
    </Modal>
  );
}
