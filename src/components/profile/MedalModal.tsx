import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X, Award, Gift, Activity } from 'lucide-react-native';

const MOCK_MEDALS = [
  { id: '1', name: 'Top Spender', category: 'Achievement', tier: 'legendary' },
  { id: '2', name: 'Social Butterfly', category: 'Activity', tier: 'epic' },
  { id: '3', name: 'Gift King', category: 'Gift', tier: 'rare' },
];

export const MedalModal = ({ open, onClose, profile }: any) => {
  const [activeTab, setActiveTab] = useState('Achievement');

  const tabs = ['Achievement', 'Gift', 'Activity'];
  const filteredMedals = MOCK_MEDALS.filter(m => m.category === activeTab);

  return (
    <Modal visible={open} transparent animationType="slide">
      <View className="flex-1 bg-black/80 justify-center items-center px-4">
        <View className="w-full bg-[#1a1025] rounded-3xl overflow-hidden border border-purple-500/30">
          
          <View className="p-4 flex-row justify-between items-center bg-[#231535] border-b border-purple-900/50">
            <Text className="text-white font-bold text-xl ml-2">Medal Wall</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white/10 rounded-full">
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row justify-around p-2 bg-[#1f132e]">
            {tabs.map(tab => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full ${activeTab === tab ? 'bg-purple-600' : 'bg-transparent'}`}
              >
                <Text className={`font-bold ${activeTab === tab ? 'text-white' : 'text-purple-300'}`}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Medals Grid */}
          <ScrollView className="p-4 h-[300px]" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap justify-between">
              {filteredMedals.length > 0 ? filteredMedals.map(medal => (
                <View key={medal.id} className="w-[48%] bg-[#2a1b3d] rounded-2xl p-4 items-center mb-4 border border-purple-800/50">
                  <View className="w-16 h-16 rounded-full bg-purple-900/50 border-2 border-yellow-500/50 items-center justify-center mb-3">
                    {activeTab === 'Achievement' ? <Award size={32} color="#facc15" /> :
                     activeTab === 'Gift' ? <Gift size={32} color="#f472b6" /> :
                     <Activity size={32} color="#4ade80" />}
                  </View>
                  <Text className="text-yellow-400 text-[10px] mb-1 tracking-widest">
                    {medal.tier === 'legendary' ? '★★★★★' : medal.tier === 'epic' ? '★★★★' : '★★★'}
                  </Text>
                  <Text className="text-white font-bold text-xs text-center">{medal.name}</Text>
                </View>
              )) : (
                <View className="w-full py-10 items-center">
                  <Text className="text-purple-400/50 font-bold tracking-widest text-xs uppercase">No Medals Unlocked</Text>
                </View>
              )}
            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};
