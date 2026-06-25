import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, LayoutChangeEvent } from 'react-native';
import { Play, Pause, SkipForward, SkipBack, Repeat, Repeat1, Disc3, X, Volume2, LayoutGrid } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MusicMiniPlayerProps {
  title: string;
  isPlaying: boolean;
  isRepeatEnabled: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleRepeat: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (vol: number) => void;
  onClose?: () => void;
  onMinimize?: () => void;
  onOpenLibrary?: () => void;
  canManage?: boolean;
}

export function MusicMiniPlayer({
  title, isPlaying, isRepeatEnabled, currentTime, duration,
  onPlayPause, onNext, onPrevious, onToggleRepeat,
  onSeek, onVolumeChange, onClose, onMinimize, onOpenLibrary, canManage
}: MusicMiniPlayerProps) {
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume] = useState(1);
  const [seekBarWidth, setSeekBarWidth] = useState(0);
  const [volumeBarWidth, setVolumeBarWidth] = useState(0);
  const seekAnim = useRef(new Animated.Value(0)).current;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekLayout = (e: LayoutChangeEvent) => {
    setSeekBarWidth(e.nativeEvent.layout.width);
  };

  const handleSeek = (locationX: number) => {
    if (!seekBarWidth || !duration || !onSeek) return;
    const ratio = Math.max(0, Math.min(1, locationX / seekBarWidth));
    onSeek(ratio * duration);
  };

  const handleVolumePress = () => {
    setShowVolume(!showVolume);
  };

  const handleVolumeSlider = (locationX: number) => {
    if (!volumeBarWidth || !onVolumeChange) return;
    const ratio = Math.max(0, Math.min(1, locationX / volumeBarWidth));
    setVolume(ratio);
    onVolumeChange(ratio);
  };

  return (
    <View className="mx-3 mb-2 rounded-2xl overflow-hidden">
      <LinearGradient colors={['rgba(37,99,235,0.4)', 'rgba(0,0,0,0.6)']} className="px-4 py-2.5">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            <Disc3 size={16} color="white" />
            <Text className="text-white text-xs font-bold flex-1" numberOfLines={1}>
              {title || 'No track playing'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={handleVolumePress} className="p-1">
              <Volume2 size={15} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            {canManage && onClose && (
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={15} color="#ef4444" />
              </TouchableOpacity>
            )}
            {onMinimize && (
              <TouchableOpacity onPress={onMinimize} className="p-1 bg-white/10 rounded-full">
                <X size={11} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-white/50 text-[9px] font-mono w-8 text-right">{formatTime(currentTime)}</Text>
          <View
            onLayout={handleSeekLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e: any) => handleSeek(e.nativeEvent.locationX)}
            onResponderMove={(e: any) => handleSeek(e.nativeEvent.locationX)}
            className="flex-1 h-3 justify-center"
          >
            <View className="h-1 bg-white/20 rounded-full overflow-hidden">
              <View className="h-full bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
            </View>
          </View>
          <Text className="text-white/50 text-[9px] font-mono w-8">{formatTime(duration)}</Text>
        </View>

        {showVolume && (
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-white/40 text-[9px]">Vol</Text>
            <View
              onLayout={(e) => setVolumeBarWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e: any) => handleVolumeSlider(e.nativeEvent.locationX)}
              onResponderMove={(e: any) => handleVolumeSlider(e.nativeEvent.locationX)}
              className="flex-1 h-4 justify-center bg-white/10 rounded-full px-1"
            >
              <View className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <View className="h-full bg-blue-400 rounded-full" style={{ width: `${volume * 100}%` }} />
              </View>
            </View>
            <Text className="text-white/40 text-[9px] w-8">{Math.round(volume * 100)}%</Text>
          </View>
        )}

        <View className="flex-row items-center justify-start gap-4 mt-[-5px] pl-4">
          {onOpenLibrary && (
            <TouchableOpacity onPress={onOpenLibrary}>
              <LayoutGrid size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onToggleRepeat}>
            {isRepeatEnabled ? (
              <Repeat1 size={18} color="#60a5fa" />
            ) : (
              <Repeat size={18} color="rgba(255,255,255,0.6)" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onPrevious}>
            <SkipBack size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onPlayPause} className="bg-white/20 rounded-full p-2">
            {isPlaying ? <Pause size={20} color="white" /> : <Play size={20} color="white" fill="white" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext}>
            <SkipForward size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}
