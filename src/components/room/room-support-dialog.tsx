import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Alert, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { X, Trophy, Users, Plus, Info, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, arrayUnion, arrayRemove } from '@/firebase/firestore-compat';
import { useFirestore } from '../../firebase/provider';
import { updateDocumentNonBlocking } from '../../lib/non-blocking-writes';

interface RoomSupportDialogProps {
  visible: boolean;
  onClose: () => void;
  roomStats?: {
    weeklyGifts?: number;
    totalGifts?: number;
    dailyGifts?: number;
  };
  visitorCount?: number;
  levelPoints?: number;
  roomId?: string;
  isOwner?: boolean;
  participants?: any[];
  partners?: any[];
}

const GOALS_REWARDS = [
  { level: 17, visitors: '≥130', roomCoins: '2600M', totalCoins: '250,960,000', hostCoins: '152,200,000', partnerCoins: '8,230,000', partners: 13 },
  { level: 16, visitors: '≥120', roomCoins: '1900M', totalCoins: '187,150,000', hostCoins: '100,750,000', partnerCoins: '7,200,000', partners: 12 },
  { level: 15, visitors: '≥110', roomCoins: '1300M', totalCoins: '131,580,000', hostCoins: '77,350,000', partnerCoins: '4,930,000', partners: 11 },
  { level: 14, visitors: '≥100', roomCoins: '800M', totalCoins: '82,250,000', hostCoins: '45,250,000', partnerCoins: '3,700,000', partners: 10 },
  { level: 13, visitors: '≥90', roomCoins: '600M', totalCoins: '61,670,000', hostCoins: '33,950,000', partnerCoins: '3,080,000', partners: 9 },
  { level: 12, visitors: '≥70', roomCoins: '400M', totalCoins: '41,160,000', hostCoins: '21,400,000', partnerCoins: '2,470,000', partners: 8 },
  { level: 11, visitors: '≥50', roomCoins: '300M', totalCoins: '19,750,000', hostCoins: '17,900,000', partnerCoins: '1,850,000', partners: 7 },
  { level: 10, visitors: '≥45', roomCoins: '200M', totalCoins: '20,530,000', hostCoins: '13,150,000', partnerCoins: '1,230,000', partners: 6 },
  { level: 9, visitors: '≥40', roomCoins: '150M', totalCoins: '15,650,000', hostCoins: '10,300,000', partnerCoins: '1,070,000', partners: 5 },
  { level: 8, visitors: '≥35', roomCoins: '100M', totalCoins: '12,500,000', hostCoins: '9,200,000', partnerCoins: '550,000', partners: 5 },
  { level: 7, visitors: '≥30', roomCoins: '75M', totalCoins: '9,543,750', hostCoins: '7,012,500', partnerCoins: '506,250', partners: 5 },
  { level: 6, visitors: '≥25', roomCoins: '50M', totalCoins: '6,750,000', hostCoins: '4,750,000', partnerCoins: '400,000', partners: 5 },
  { level: 5, visitors: '≥20', roomCoins: '22.5M', totalCoins: '3,225,000', hostCoins: '2,325,000', partnerCoins: '225,000', partners: 4 },
  { level: 4, visitors: '≥15', roomCoins: '15M', totalCoins: '2,200,000', hostCoins: '1,600,000', partnerCoins: '200,000', partners: 3 },
  { level: 3, visitors: '≥10', roomCoins: '10M', totalCoins: '1,488,350', hostCoins: '1,353,350', partnerCoins: '135,000', partners: 3 },
  { level: 2, visitors: '≥5', roomCoins: '5M', totalCoins: '600,000', hostCoins: '450,000', partnerCoins: '150,000', partners: 1 },
  { level: 1, visitors: '≥2', roomCoins: '2.5M', totalCoins: '350,000', hostCoins: '275,000', partnerCoins: '75,000', partners: 1 },
];

function getRemainingTime() {
  const now = new Date();
  const day = now.getUTCDay();
  const deadline = new Date(now);
  deadline.setUTCHours(0, 0, 0, 0);
  
  // Wednesday 00:00 UTC is the deadline (days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, etc.)
  let daysToWednesday = (3 - day + 7) % 7;
  if (daysToWednesday === 0) {
    daysToWednesday = 7;
  }
  deadline.setUTCDate(deadline.getUTCDate() + daysToWednesday);
  
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "00h : 00m : 00s";
  
  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}h : ${pad(mins)}m : ${pad(secs)}s`;
}

export function RoomSupportDialog({
  visible,
  onClose,
  roomStats,
  visitorCount = 0,
  levelPoints = 0,
  roomId,
  isOwner = false,
  participants = [],
  partners = []
}: RoomSupportDialogProps) {
  const firestore = useFirestore();
  const [timeLeft, setTimeLeft] = useState(getRemainingTime());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getRemainingTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Link with Room Trophy (Daily Gifts)
  const roomCoins = roomStats?.dailyGifts || 0;

  // Find current goal level based on dailyGifts
  const currentGoal = [...GOALS_REWARDS].reverse().find(g => {
    const targetCoins = parseFloat(g.roomCoins.replace('M', '')) * 1000000;
    return roomCoins >= targetCoins;
  }) || (roomCoins > 0 ? GOALS_REWARDS[GOALS_REWARDS.length - 1] : { level: 0 });

  const roomLevel = currentGoal.level;

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[#0a0f1d] overflow-hidden">
          
          {/* Base Background Color */}
          <View className="absolute inset-0 bg-[#0a0f1d]" />

          {/* Header Graphic Banner */}
          <View className="absolute top-0 left-0 w-full h-[250px] overflow-hidden">
            <Image 
              source={require('../../../assets/images/haza_style_room_support_lions_trophy_header_1776810688232.png')} 
              className="w-full h-full opacity-90"
              style={{ tintColor: undefined, contrast: 1.1, brightness: 0.9 } as any}
              resizeMode="cover"
            />
            {/* Top Glow & Bottom Fade */}
            <LinearGradient
              colors={['rgba(10, 15, 29, 0.2)', 'rgba(10, 15, 29, 0.5)', '#0a0f1d']}
              className="absolute inset-0"
            />
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{ elevation: 10 }}
            className="absolute top-5 left-5 z-[50] h-10 w-10 flex items-center justify-center rounded-full bg-black/40 border border-white/10 active:scale-95"
          >
            <X size={20} color="white" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 120, paddingBottom: 40 }} className="px-4">
            
            {/* Title Section */}
            <View className="items-center mb-16 mt-8">
              <View className="relative">
                <View className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full" />
                <Text className="text-2xl font-black text-white uppercase tracking-widest text-center">
                  Room Support
                </Text>
              </View>
            </View>

            {/* My Room Section */}
            <View className="mb-8">
              <View className="items-center mb-3">
                <LinearGradient
                  colors={['transparent', 'rgba(37,99,235,0.4)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  className="px-6 py-1.5 border-y border-blue-500/30"
                >
                  <Text className="text-xs font-black uppercase tracking-widest text-blue-100">My Room</Text>
                </LinearGradient>
              </View>

              <View className="bg-[#121b2d]/80 border border-blue-500/20 rounded-2xl overflow-hidden shadow-2xl">
                {/* Table Header */}
                <View className="flex-row bg-blue-900/40 border-b border-blue-800/50 py-2 px-3 justify-between">
                  <Text className="text-[10px] font-black uppercase text-blue-300/70 flex-1">Period</Text>
                  <Text className="text-[10px] font-black uppercase text-blue-300/70 w-12 text-center">Level</Text>
                  <Text className="text-[10px] font-black uppercase text-blue-300/70 w-16 text-center">Rewards</Text>
                  <Text className="text-[10px] font-black uppercase text-blue-300/70 w-16 text-center">Visitors</Text>
                  <Text className="text-[10px] font-black uppercase text-blue-300/70 w-20 text-right">Coins</Text>
                </View>

                {/* This Week Row */}
                <View className="flex-row border-b border-white/5 bg-blue-500/5 py-2.5 px-3 justify-between items-center">
                  <Text className="text-[10px] font-bold text-blue-400 flex-1">This Week</Text>
                  <Text className="text-[10px] font-bold text-white w-12 text-center">{roomLevel}</Text>
                  <Text className="text-[10px] font-bold text-yellow-400 w-16 text-center">0</Text>
                  <Text className="text-[10px] font-bold text-white w-16 text-center">{visitorCount}</Text>
                  <Text className="text-[10px] font-bold text-cyan-400 w-20 text-right">{roomCoins.toLocaleString()}</Text>
                </View>

                {/* Last Week Row */}
                <View className="flex-row py-2.5 px-3 justify-between items-center opacity-50">
                  <Text className="text-[10px] font-bold text-white/40 flex-1">Last Week</Text>
                  <Text className="text-[10px] font-bold text-white/40 w-12 text-center">0</Text>
                  <Text className="text-[10px] font-bold text-white/40 w-16 text-center">--</Text>
                  <Text className="text-[10px] font-bold text-white/40 w-16 text-center">0</Text>
                  <Text className="text-[10px] font-bold text-white/40 w-20 text-right">0</Text>
                </View>

                <View className="p-3 bg-blue-950/40 border-t border-white/5">
                  <Text className="text-[9px] text-white/40 font-bold text-center italic">
                    This week's rewards will be delivered next Wednesday (UTC+0)
                  </Text>
                </View>
              </View>
            </View>

            {/* Partners Section */}
            <View className="mb-6">
              <View className="items-center mb-3">
                <LinearGradient
                  colors={['transparent', 'rgba(6,182,212,0.4)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  className="px-6 py-1.5 border-y border-cyan-500/30"
                >
                  <Text className="text-xs font-black uppercase tracking-widest text-cyan-100">Partners</Text>
                </LinearGradient>
              </View>

              <View className="bg-[#121b2d]/80 border border-cyan-500/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <View className="absolute top-0 right-0 p-4 opacity-10">
                  <Users size={64} color="#22d3ee" />
                </View>

                <View className="items-center mb-4">
                  <View className="flex-row items-center gap-1.5 px-3 py-1 bg-black/40 rounded-full border border-white/5 mb-1.5">
                    <Clock size={12} color="#22d3ee" />
                    <Text className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Add Time:</Text>
                    <Text className="text-[11px] font-black text-cyan-400">{timeLeft}</Text>
                  </View>
                  <Text className="text-[10px] text-white/40 text-center leading-normal max-w-[85%]">
                    Partners can be added from Monday 00:00 to Tuesday 24:00 (UTC+0).
                  </Text>
                </View>

                <View className="flex-row gap-3 justify-center">
                  {[0, 1, 2].map(index => {
                    const partner = partners[index];
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (!isOwner) {
                            Alert.alert('Info', 'Only room owner can manage partners.');
                            return;
                          }
                          if (partner) {
                            Alert.alert(
                              'Remove Partner',
                              `Are you sure you want to remove ${partner.name || 'this partner'}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: () => {
                                    if (roomId && firestore) {
                                      updateDocumentNonBlocking(doc(firestore, 'chatRooms', roomId), {
                                        partners: arrayRemove(partner)
                                      });
                                    }
                                  }
                                }
                              ]
                            );
                          } else {
                            setShowPicker(true);
                          }
                        }}
                        className="flex-1 aspect-square rounded-2xl bg-white/5 border border-dashed border-white/10 items-center justify-center p-2"
                      >
                        {partner ? (
                          <View className="items-center justify-center">
                            <Image
                              source={{ uri: partner.avatarUrl || 'https://via.placeholder.com/150' }}
                              className="w-12 h-12 rounded-full border border-cyan-500/30 mb-1"
                              cachePolicy="memory-disk"
                            />
                            <Text className="text-[9px] font-bold text-white text-center w-16" numberOfLines={1}>
                              {partner.name || 'Partner'}
                            </Text>
                          </View>
                        ) : (
                          <Plus size={20} color="rgba(255,255,255,0.2)" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Goals & Rewards Section */}
            <View className="mb-6">
              <View className="items-center mb-4">
                <LinearGradient
                  colors={['transparent', 'rgba(217,119,6,0.4)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  className="px-6 py-1.5 border-y border-amber-500/30"
                >
                  <Text className="text-xs font-black uppercase tracking-widest text-amber-100">Goals & Rewards</Text>
                </LinearGradient>
              </View>

              <View className="bg-[#121b2d]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Custom Table Layout using Views */}
                <View className="bg-[#1a253a] border-b border-white/5 py-1 px-1">
                  <View className="flex-row items-center border-b border-white/5 pb-1">
                    <Text className="text-[8px] font-black text-white/40 w-[35px] text-center">Lvl</Text>
                    <Text className="text-[8px] font-black text-white/40 flex-1 text-center">Goals (Visitors / Coins)</Text>
                    <Text className="text-[8px] font-black text-white/40 flex-2 text-center">Rewards (Total / Host / Partner / PtrQty)</Text>
                  </View>
                </View>

                {GOALS_REWARDS.map((goal, idx) => (
                  <View
                    key={idx}
                    className={`flex-row items-center border-b border-white/5 py-2 px-1 ${
                      idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                    }`}
                  >
                    <Text className="text-[9px] font-black text-blue-400 w-[35px] text-center">{goal.level}</Text>
                    
                    <View className="flex-1 flex-row border-r border-white/5 justify-around">
                      <Text className="text-[8.5px] font-bold text-white/80">{goal.visitors}</Text>
                      <Text className="text-[8.5px] font-bold text-cyan-400">{goal.roomCoins}</Text>
                    </View>

                    <View className="flex-2 flex-row justify-around pl-1">
                      <Text className="text-[8px] font-bold text-white/70 w-16 text-center">{goal.totalCoins}</Text>
                      <Text className="text-[8px] font-bold text-yellow-400 w-16 text-center">{goal.hostCoins}</Text>
                      <Text className="text-[8px] font-bold text-blue-300 w-16 text-center">{goal.partnerCoins}</Text>
                      <Text className="text-[8.5px] font-black text-white/60 w-8 text-center">{goal.partners}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Note Section */}
            <View className="bg-black/20 rounded-2xl p-5 border border-white/5">
              <View className="flex-row items-center gap-2 mb-2">
                <Info size={14} color="rgba(255,255,255,0.4)" />
                <Text className="text-[10px] font-black uppercase tracking-widest text-white/60">Note</Text>
              </View>
              <View className="space-y-2">
                <Text className="text-[9.5px] text-white/40 leading-relaxed italic">
                  1. Weekly room visits and coin statistics are counted from Monday 00:00 to Sunday 23:59 (UTC+0).
                </Text>
                <Text className="text-[9.5px] text-white/40 leading-relaxed italic">
                  2. Room owners must submit the partner information before Wednesday; otherwise, the reward will be forfeited.
                </Text>
                <Text className="text-[9.5px] text-white/40 leading-relaxed italic">
                  3. The official team will send the reward to the room owner and partner on Wednesday.
                </Text>
              </View>
            </View>

          </ScrollView>
        </View>

        {/* Participant Picker Modal */}
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View className="flex-1 justify-center items-center bg-black/60 px-5">
            <View className="w-full max-w-sm bg-[#121b2d] border border-cyan-500/30 rounded-3xl p-5 shadow-2xl">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-sm font-black text-cyan-100 uppercase tracking-widest">Select Partner</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <X size={18} color="#22d3ee" />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-[300px]">
                {participants.length === 0 ? (
                  <Text className="text-xs text-white/40 text-center py-6">No active participants in the room</Text>
                ) : (
                  participants.map((item) => {
                    const isAlreadyPartner = partners.some(p => p.uid === item.uid);
                    return (
                      <TouchableOpacity
                        key={item.uid}
                        disabled={isAlreadyPartner}
                        onPress={() => {
                          if (partners.length >= 3) {
                            Alert.alert('Limit Reached', 'You can add up to 3 partners.');
                            return;
                          }
                          if (roomId && firestore) {
                            updateDocumentNonBlocking(doc(firestore, 'chatRooms', roomId), {
                              partners: arrayUnion({
                                uid: item.uid,
                                name: item.name || 'User',
                                avatarUrl: item.avatarUrl || ''
                              })
                            });
                          }
                          setShowPicker(false);
                        }}
                        className={`flex-row items-center gap-3 p-2.5 rounded-xl mb-1.5 ${
                          isAlreadyPartner ? 'opacity-40 bg-white/2' : 'bg-white/5 active:bg-cyan-500/20'
                        }`}
                      >
                        <Image
                          source={{ uri: item.avatarUrl || 'https://via.placeholder.com/150' }}
                          className="w-8 h-8 rounded-full border border-white/10"
                          cachePolicy="memory-disk"
                        />
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-white">{item.name || 'User'}</Text>
                          {isAlreadyPartner && <Text className="text-[9px] text-cyan-400 font-bold">Already Partner</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>
    );
  }
