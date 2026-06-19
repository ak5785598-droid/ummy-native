import React from 'react';
import { View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface RoomFooterProps {
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  isInSeat: boolean;
  hasBluetooth?: boolean;
  hasWired?: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onOpenChatInput: () => void;
  onOpenEmoji: () => void;
  onOpenMessages: () => void;
  onOpenGift: () => void;
  onOpenPlay: () => void;
  onOpenSoundboard?: () => void;
  onOpenGames?: () => void;
  onOpenYouTube?: () => void;
  onOpenEntertainment?: () => void;
  onOpenScreenMirror?: () => void;
  onOpenSports?: () => void;
  onOpenCaptions?: () => void;
  onOpenLanguagePicker?: () => void;
  onOpenEcho?: () => void;
  onOpenThemeArchitect?: () => void;
  onOpenSupport?: () => void;
}

export function RoomFooter({
  isMicMuted, isSpeakerMuted, isInSeat,
  onToggleMic, onToggleSpeaker, onOpenChatInput, onOpenEmoji,
  onOpenMessages, onOpenGift, onOpenPlay, onOpenGames
}: RoomFooterProps) {
  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center justify-between gap-2">
        {/* Item 1: Say Hi */}
        <TouchableOpacity 
          onPress={onOpenChatInput} 
          className="flex-1 h-[38px] rounded-full bg-black/40 border border-white/10 items-center justify-center max-w-[100px]"
        >
          <Text className="text-white font-bold text-[13px]">Say hi...</Text>
        </TouchableOpacity>

        {/* Item 2: Emoji Selector */}
        <ActionBtn onPress={onOpenEmoji}>
          <FontAwesome5 name="smile" size={20} color="white" />
        </ActionBtn>

        {/* Item 3: Microphone */}
        <TouchableOpacity
          onPress={onToggleMic}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: !isMicMuted ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.4)',
            borderWidth: 1,
            borderColor: !isMicMuted ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.1)',
            alignItems: 'center', justifyContent: 'center',
            opacity: isInSeat ? 1 : 0.4,
          }}
        >
          {!isMicMuted
            ? <FontAwesome5 name="microphone" size={18} color="white" />
            : <FontAwesome5 name="microphone-slash" size={18} color="rgba(255,255,255,0.6)" />
          }
        </TouchableOpacity>

        {/* Item 4: Speaker */}
        <ActionBtn onPress={onToggleSpeaker}>
          {isSpeakerMuted ? <Ionicons name="volume-mute" size={20} color="white" /> : <Ionicons name="volume-high" size={20} color="white" />}
        </ActionBtn>

        {/* Item 5: Mail/Messages */}
        <ActionBtn onPress={onOpenMessages}>
          <Ionicons name="chatbubble-ellipses" size={20} color="white" />
        </ActionBtn>

        {/* Item 6: Gift Button (Gradient colorful container with gift box) */}
        <TouchableOpacity onPress={onOpenGift} className="relative">
          <LinearGradient colors={['#A020F0', '#FF69B4']} className="w-[38px] h-[38px] rounded-full items-center justify-center border border-white/20 shadow-lg">
            <FontAwesome5 name="gift" size={18} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Item 7: Play / Grid Panel */}
        <ActionBtn onPress={onOpenPlay}>
          <Ionicons name="grid" size={20} color="white" />
        </ActionBtn>
      </View>
    </View>
  );
}

function ActionBtn({ onPress, children, disabled, style }: { onPress?: () => void; children: React.ReactNode; disabled?: boolean; style?: any }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || !onPress} className="w-[38px] h-[38px] rounded-full bg-black/40 border border-white/10 items-center justify-center shadow-lg" style={style}>
      {children}
    </TouchableOpacity>
  );
}
