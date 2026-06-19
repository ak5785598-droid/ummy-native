import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { Image } from 'expo-image';

export interface AvatarProps extends ViewProps {
  src?: string | null;
  fallback?: string;
  size?: number;
}

export function Avatar({ src, fallback, size = 60, className, ...props }: AvatarProps) {
  return (
    <View
      className={`rounded-full items-center justify-center bg-slate-200 overflow-hidden ${className || ''}`}
      style={{ width: size, height: size }}
      {...props}
    >
      {src ? (
        <Image cachePolicy="memory-disk" source={{ uri: src }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Text className="text-slate-500 font-bold" style={{ fontSize: size * 0.4 }}>
          {fallback || 'U'}
        </Text>
      )}
    </View>
  );
}
