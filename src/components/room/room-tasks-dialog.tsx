import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, UserPlus, Gift, Users, Share2, Mic, Trophy, CheckCircle2, Circle } from 'lucide-react-native';
import { Image } from 'expo-image';

const ROOM_TASKS = [
  { id: 'mic_10', title: 'On mic for 10 Minutes', target: 10, reward: 2500, category: 'mic', unit: 'min' },
  { id: 'mic_30', title: 'On mic for 30 Minutes', target: 30, reward: 10000, category: 'mic', unit: 'min' },
  { id: 'mic_60', title: 'On mic for 60 Minute', target: 60, reward: 25000, category: 'mic', unit: 'min' },
  { id: 'invite_1', title: 'Successfully invited 1 user on mic', target: 1, reward: 2500, category: 'invite' },
  { id: 'invite_10', title: 'Successfully Invited 10 user on mic', target: 10, reward: 25000, category: 'invite' },
  { id: 'invite_new_3', title: 'Successfully invited 3 New user on mic', target: 3, reward: 2000, category: 'invite' },
  { id: 'gift_once', title: 'Send gift once', target: 1, reward: 500, category: 'gift' },
  { id: 'traffic_consecutive', title: 'more then 5 user enter Your room for 2 Consecutive days', target: 2, reward: 20000, category: 'traffic', unit: 'days' },
  { id: 'sim_mic_1', title: '3 User on mic at the same time for 1 minutes', target: 1, reward: 5000, category: 'mic', unit: 'min' },
  { id: 'sim_mic_10', title: '3 user on mic at the same time for 10 minutes', target: 10, reward: 10000, category: 'mic', unit: 'min' },
  { id: 'sim_mic_new_5', title: '3 New user on mice at the same time for 5 minutes', target: 5, reward: 10000, category: 'mic', unit: 'min' },
  { id: 'new_user_gift_3', title: '3 New user send gifts in the room', target: 3, reward: 5000, category: 'gift' },
  { id: 'follow_1', title: '1 New follower', target: 1, reward: 1000, category: 'follow' },
  { id: 'follow_10', title: '10 New follower', target: 10, reward: 5000, category: 'follow' },
  { id: 'follow_new_3', title: '3 New follower From new user', target: 3, reward: 2500, category: 'follow' },
  { id: 'share_whatsapp', title: 'Successfully Shared room link to whatsApp', target: 1, reward: 5000, category: 'share' },
  { id: 'entry_10', title: '10 User enter the room', target: 10, reward: 10000, category: 'traffic' },
  { id: 'entry_3', title: '3 User enter the room', target: 3, reward: 2500, category: 'traffic' }
];

const CATEGORY_ICONS: Record<string, any> = { mic: Mic, invite: UserPlus, gift: Gift, traffic: Users, follow: Users, share: Share2 };

interface RoomTasksDialogProps {
  visible: boolean;
  onClose: () => void;
  taskProgress: Record<string, number>;
  achievedTasks: string[];
  claimedTasks: string[];
  onClaim: (taskId: string) => void;
  totalRoomGifts?: number;
}

export function RoomTasksDialog({ visible, onClose, taskProgress, achievedTasks, claimedTasks, onClaim, totalRoomGifts = 0 }: RoomTasksDialogProps) {
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  useEffect(() => {
    if (!visible) return;
    const calc = () => {
      const now = new Date();
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      if (diff <= 0) return '00:00:00';
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const bonus = Math.floor(totalRoomGifts * 0.05);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/80">
        <View className="flex-1 bg-[#0d011c]">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
            {/* GRAND MAJESTIC HERO SECTION */}
            <View className="relative w-full aspect-[3/4] items-center justify-center overflow-hidden bg-[#1c011e]">
              <Image 
                source={require('../../../assets/images/pink_violet_golden_task_jar_1776801042241.jpg')} 
                style={{ position: 'absolute', width: '100%', height: '100%', transform: [{ scale: 1.05 }] }} 
                contentFit="cover" 
              />
              
              {/* Overlays */}
              <LinearGradient colors={['rgba(255,215,0,0.15)', 'transparent']} className="absolute inset-0 z-10" />
              <LinearGradient colors={['rgba(28,1,30,0.8)', 'transparent', '#0d011c']} className="absolute inset-0 z-20" />
              
              {/* Back Button */}
              <TouchableOpacity onPress={onClose} className="absolute top-12 left-4 z-30 p-3 bg-black/40 rounded-full border border-white/20">
                <ChevronLeft size={22} color="white" />
              </TouchableOpacity>

              {/* Title */}
              <View className="absolute top-28 left-0 right-0 z-30 items-center">
                <Text className="text-5xl font-black italic uppercase text-white text-center tracking-tighter" style={{ textShadowColor: 'rgba(179,141,79,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 }}>
                  Room{'\n'}Missions
                </Text>
                <View className="h-1 w-20 bg-gradient-to-r from-transparent via-[#F9E58A] to-transparent mx-auto mt-2 opacity-80" />
              </View>

              {/* Description Box */}
              <View className="absolute bottom-6 left-0 right-0 z-30 items-center px-10">
                <View className="bg-black/40 py-3 px-5 rounded-3xl border border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <Text className="text-[12px] font-bold text-pink-100 text-center leading-5 shadow-sm">
                    The Task Jar allows the room host to get a <Text className="text-[#F9E58A] font-black">5% bonus</Text> of the total Gold Coins consumed in the room.
                  </Text>
                </View>
              </View>
            </View>

            {/* ACCUMULATED BONUS PANEL */}
            <View className="px-6 mb-4 mt-2">
              <View className="bg-gradient-to-br from-[#805e26] via-[#B38D4F] to-[#5e4113] p-[1.5px] rounded-2xl shadow-lg">
                <View className="bg-[#4d0246] rounded-2xl p-4 items-center">
                  <Text className="text-3xl font-black text-[#F9E58A]">{bonus.toLocaleString()}</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-[#E8C27E]/60 mt-1">Accumulated Bonus Gold Coins</Text>
                </View>
              </View>
            </View>

            {/* DAILY MISSIONS LIST */}
            <View className="px-6 pb-20 mt-4">
              <View className="flex-row items-center justify-between px-2 mb-4">
                <Text className="text-sm font-black uppercase tracking-widest text-[#F9E58A]">Daily Missions</Text>
                <View className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                  <Text className="text-[10px] font-black text-pink-200">End in {timeLeft}</Text>
                </View>
              </View>

              {ROOM_TASKS.map((task) => {
                const progress = taskProgress[task.id] || 0;
                const isClaimed = claimedTasks.includes(task.id);
                const isAchieved = achievedTasks.includes(task.id);
                const Icon = CATEGORY_ICONS[task.category] || Trophy;

                return (
                  <View key={task.id} className="bg-white/5 rounded-2xl p-4 mb-3 border border-white/5">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 pr-4">
                        <View className="w-10 h-10 rounded-full bg-black/30 items-center justify-center mr-3 border border-white/5">
                          <Icon size={18} color="#F9E58A" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-[13px] font-bold" numberOfLines={2}>{task.title}</Text>
                          <Text className="text-yellow-500 text-xs font-bold mt-0.5">+{task.reward} Coins</Text>
                        </View>
                      </View>
                      {isClaimed ? (
                        <View className="items-center justify-center w-20">
                          <CheckCircle2 size={24} color="#22c55e" />
                          <Text className="text-[10px] font-bold text-green-500 mt-1 uppercase">Claimed</Text>
                        </View>
                      ) : isAchieved ? (
                        <TouchableOpacity onPress={() => onClaim(task.id)} className="bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 rounded-xl shadow-lg w-20 items-center">
                          <Text className="text-black text-xs font-black uppercase">Claim</Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="items-center justify-center w-20">
                          <Circle size={24} color="rgba(255,255,255,0.2)" />
                          <Text className="text-[10px] font-bold text-white/30 mt-1 uppercase">Pending</Text>
                        </View>
                      )}
                    </View>
                    <View className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <View 
                        className={`h-full rounded-full ${isAchieved ? 'bg-green-500' : 'bg-gradient-to-r from-yellow-500 to-amber-500'}`} 
                        style={{ width: `${Math.min(100, (progress / task.target) * 100)}%` }} 
                      />
                    </View>
                    <Text className="text-[10px] font-bold text-white/40 mt-2 text-right">
                      {Math.min(progress, task.target)} / {task.target} {task.unit || ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
