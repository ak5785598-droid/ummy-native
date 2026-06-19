import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { X, ExternalLink } from 'lucide-react-native';

const SPORTS_LINKS: Record<string, { name: string; url: string; emoji: string }[]> = {
  'Cricket': [
    { name: 'Cricbuzz Live', url: 'https://www.cricbuzz.com/live-cricket-scores', emoji: '🏏' },
    { name: 'ESPNcricinfo', url: 'https://www.espncricinfo.com/live-cricket-score', emoji: '🏏' },
  ],
  'Football': [
    { name: 'SofaScore', url: 'https://www.sofascore.com/football', emoji: '⚽' },
    { name: 'ESPN Football', url: 'https://www.espn.com/soccer/scores', emoji: '⚽' },
  ],
  'Kabaddi': [
    { name: 'Pro Kabaddi', url: 'https://www.prokabaddi.com/schedule', emoji: '🤼' },
  ],
  'Basketball': [
    { name: 'NBA Scores', url: 'https://www.nba.com/games', emoji: '🏀' },
  ],
  'Tennis': [
    { name: 'ATP Tour', url: 'https://www.atptour.com/en/scores', emoji: '🎾' },
  ],
};

const CATEGORIES = Object.keys(SPORTS_LINKS);

interface SportsHubDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function SportsHubDialog({ visible, onClose }: SportsHubDialogProps) {
  const [activeCategory, setActiveCategory] = useState('Cricket');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] h-[70%] pb-6">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <Text className="text-white text-base font-bold">Live Sports</Text>
            <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <View className="flex-row px-4 py-2 gap-2 border-b border-white/5">
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-full ${activeCategory === cat ? 'bg-cyan-600' : 'bg-white/10'}`}>
                <Text className={`text-xs font-bold ${activeCategory === cat ? 'text-white' : 'text-white/50'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView className="px-4 pt-4" showsVerticalScrollIndicator={false}>
            {SPORTS_LINKS[activeCategory].map((link, i) => (
              <TouchableOpacity key={i} onPress={() => Linking.openURL(link.url)} className="flex-row items-center bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                <Text className="text-3xl mr-3">{link.emoji}</Text>
                <View className="flex-1"><Text className="text-white text-sm font-bold">{link.name}</Text><Text className="text-white/30 text-[10px]" numberOfLines={1}>{link.url}</Text></View>
                <ExternalLink size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
