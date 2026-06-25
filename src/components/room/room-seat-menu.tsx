import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Mic, MicOff, Lock, Unlock, UserPlus, LogOut } from 'lucide-react-native';

interface RoomSeatMenuProps {
  visible: boolean;
  onClose: () => void;
  seatIndex: number;
  isLocked: boolean;
  isSeatMuted: boolean;
  isOwner: boolean;
  isModerator: boolean;
  onTakeSeat: () => void;
  onLockSeat: () => void;
  onMuteSeat: () => void;
  onInvite?: () => void;
}

export function RoomSeatMenu({
  visible, onClose, seatIndex, isLocked, isSeatMuted,
  isOwner, isModerator,
  onTakeSeat, onLockSeat, onMuteSeat, onInvite
}: RoomSeatMenuProps) {
  const canManage = isOwner || isModerator;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity className="flex-1 bg-black/60 justify-center items-center px-8" activeOpacity={1} onPress={onClose}>
        <View className="bg-white rounded-[2rem] w-full overflow-hidden border border-slate-100 shadow-2xl p-6" onStartShouldSetResponder={() => true}>
          {/* Menu Items Container - Web Style 4 Column Layout */}
          <View className="flex-row justify-between items-center">
            {/* 1. Take mic / Take seat — only on unlocked seats */}
            {!isLocked ? (
              <MenuItem 
                label="Take mic" 
                icon={Mic} 
                onPress={() => { onTakeSeat(); onClose(); }} 
              />
            ) : (
              <View className="w-14" />
            )}

            {/* 2. Invite */}
            {onInvite ? (
              <MenuItem 
                label="Invite" 
                icon={UserPlus} 
                onPress={() => { onInvite(); onClose(); }} 
              />
            ) : (
              <View className="w-14" />
            )}

            {/* 3. Lock/Unlock (Admin Only) */}
            {canManage ? (
              <MenuItem 
                label={isLocked ? "Unlock" : "Lock"} 
                icon={isLocked ? Unlock : Lock} 
                onPress={() => { onLockSeat(); onClose(); }} 
                iconColor={isLocked ? "#8B5CF6" : "#64748b"}
              />
            ) : (
              <View className="w-14" />
            )}

            {/* 4. Mute/Unmute Seat (Admin Only) */}
            {canManage ? (
              <MenuItem 
                label={isSeatMuted ? "Unmute" : "Mute"} 
                icon={isSeatMuted ? Mic : MicOff} 
                onPress={() => { onMuteSeat(); onClose(); }} 
                iconColor={isSeatMuted ? "#10B981" : "#EF4444"}
              />
            ) : (
              <View className="w-14" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function MenuItem({ label, icon: Icon, onPress, iconColor }: { label: string; icon: any; onPress: () => void; iconColor?: string }) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      className="items-center justify-center w-[22%] active:scale-95 transition-all"
    >
      <View className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50 shadow-sm mb-1.5">
        <Icon size={16} color={iconColor || '#475569'} />
      </View>
      <Text className="text-[10px] font-semibold text-slate-500 text-center" numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}
