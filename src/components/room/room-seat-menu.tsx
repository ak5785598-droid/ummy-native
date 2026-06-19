import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Mic, MicOff, Lock, Unlock, UserPlus } from 'lucide-react-native';

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
        <View className="bg-slate-900 rounded-[2rem] w-full overflow-hidden border border-white/10 shadow-2xl">
          <View className="flex-row justify-between items-center px-6 pt-5 pb-3 border-b border-white/10">
            <Text className="text-white text-base font-bold">Seat #{seatIndex} Options</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View className="p-6 flex-row flex-wrap justify-around gap-4">
            {/* 1. Take mic / Take seat */}
            <MenuItem 
              label="Take mic" 
              icon={Mic} 
              onPress={() => { onTakeSeat(); onClose(); }} 
            />

            {/* 2. Invite */}
            {onInvite && (
              <MenuItem 
                label="Invite" 
                icon={UserPlus} 
                onPress={() => { onInvite(); onClose(); }} 
              />
            )}

            {/* 3. Lock/Unlock (Admin Only) */}
            {canManage && (
              <MenuItem 
                label={isLocked ? "Unlock" : "Lock"} 
                icon={isLocked ? Unlock : Lock} 
                onPress={() => { onLockSeat(); onClose(); }} 
              />
            )}

            {/* 4. Mute/Unmute Seat (Admin Only) */}
            {canManage && (
              <MenuItem 
                label={isSeatMuted ? "Unmute" : "Mute"} 
                icon={isSeatMuted ? Mic : MicOff} 
                onPress={() => { onMuteSeat(); onClose(); }} 
                color={isSeatMuted ? "#4ade80" : "#f87171"}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function MenuItem({ label, icon: Icon, onPress, color }: { label: string; icon: any; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      className="items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 w-20 h-20 active:scale-95 transition-all"
    >
      <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mb-1">
        <Icon size={18} color={color || 'white'} />
      </View>
      <Text className="text-[10px] font-bold text-white/80 text-center">{label}</Text>
    </TouchableOpacity>
  );
}
