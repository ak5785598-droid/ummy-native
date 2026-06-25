import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Minimize2, Power } from 'lucide-react-native';

interface ExitRoomSheetProps {
  visible: boolean;
  onClose: () => void;
  onExit: () => void;
  onMinimize?: () => void;
}

export function ExitRoomSheet({ visible, onClose, onExit, onMinimize }: ExitRoomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 items-center justify-center relative">
        {/* Lighter tap-to-close background area */}
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />

        <View className="items-center gap-10 z-10">
          {/* KEEP / MINIMIZE BUTTON */}
          {onMinimize && (
            <View className="items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  onMinimize();
                  onClose();
                }}
                className="h-20 w-20 rounded-full bg-[#00E5FF] items-center justify-center shadow-lg shadow-cyan-500/40 active:scale-90 transition-all"
              >
                <Minimize2 size={28} color="white" />
              </TouchableOpacity>
              <Text className="text-white font-black text-base tracking-wider drop-shadow-md">Keep</Text>
            </View>
          )}

          {/* EXIT BUTTON */}
          <View className="items-center gap-2">
            <TouchableOpacity
              onPress={() => {
                onExit();
                onClose();
              }}
              className="h-20 w-20 rounded-full bg-[#00E5FF] items-center justify-center shadow-lg shadow-cyan-500/40 active:scale-90 transition-all"
            >
              <Power size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-black text-base tracking-wider drop-shadow-md">Exit</Text>
          </View>
        </View>

        {/* Bottom Close Button */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute bottom-12 p-3 bg-white/10 rounded-full active:scale-90 transition-all"
        >
          <X size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
