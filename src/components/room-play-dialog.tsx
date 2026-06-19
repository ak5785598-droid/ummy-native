import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Gamepad2, Headphones } from 'lucide-react-native';
import { Image } from 'expo-image';

interface RoomPlayDialogProps {
  isVisible: boolean;
  onClose: () => void;
  defaultView?: 'grid' | 'music';
}

export function RoomPlayDialog({ isVisible, onClose, defaultView = 'grid' }: RoomPlayDialogProps) {
  const [activeTab, setActiveTab] = React.useState<'games' | 'music'>(defaultView === 'music' ? 'music' : 'games');

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-slate-900 rounded-t-3xl h-[60%] w-full absolute bottom-0 shadow-2xl border-t border-white/10">
        
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-white/10">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={() => setActiveTab('games')}>
              <Text className={`font-bold text-lg ${activeTab === 'games' ? 'text-white' : 'text-white/40'}`}>Games</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('music')}>
              <Text className={`font-bold text-lg ${activeTab === 'music' ? 'text-white' : 'text-white/40'}`}>Music</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2 bg-white/5 rounded-full">
            <X color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {activeTab === 'games' ? (
            <View className="flex-row flex-wrap justify-between">
              {/* Game Items (Dummy for now, can map real games later) */}
              {[1, 2, 3, 4].map(game => (
                <TouchableOpacity key={game} className="w-[48%] bg-white/5 rounded-2xl p-4 items-center justify-center mb-4 border border-white/5">
                  <LinearGradient colors={['#06b6d4', '#3b82f6']} className="w-16 h-16 rounded-full items-center justify-center mb-3">
                    <Gamepad2 color="white" size={32} />
                  </LinearGradient>
                  <Text className="text-white font-bold text-center">Game {game}</Text>
                  <Text className="text-white/50 text-[10px] text-center mt-1">Play with room</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-10">
              <View className="w-20 h-20 bg-purple-500/20 rounded-full items-center justify-center mb-4">
                <Headphones color="#a855f7" size={40} />
              </View>
              <Text className="text-white font-bold text-lg">Room Music</Text>
              <Text className="text-white/50 text-center mt-2 px-8">Only the host can control the room's music playlist right now.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
