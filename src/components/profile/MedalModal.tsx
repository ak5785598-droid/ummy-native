import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { X, ArrowLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';
import { SafeAreaView } from 'react-native-safe-area-context';

export const MedalModal = ({ open, onClose, profile }: any) => {
  const [allMedals, setAllMedals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('medalsList').onSnapshot((snap: any) => {
        if (snap) {
          setAllMedals(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, () => setLoading(false));
      return () => unsub();
    } catch (e) {
      setLoading(false);
    }
  }, [open]);

  const earnedMedalIds = profile?.medals || [];

  return (
    <Modal visible={open} transparent animationType="slide">
      <StatusBar barStyle="light-content" backgroundColor="#1a1025" />
      <View className="flex-1 bg-[#1a1025]">
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-purple-900/50">
            <TouchableOpacity onPress={onClose} className="flex-row items-center gap-2">
              <ArrowLeft size={22} color="#a78bfa" />
              <Text className="text-purple-400 font-bold text-base">Back</Text>
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Medal Wall</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Medals */}
          <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
            {loading ? (
              <View className="py-20 items-center">
                <Text className="text-purple-400/50 font-bold tracking-widest text-xs uppercase">Loading...</Text>
              </View>
            ) : allMedals.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                {allMedals.map(medal => {
                  const isEarned = earnedMedalIds.includes(medal.id);
                  return (
                    <View key={medal.id} className={`w-[31%] items-center mb-5 ${isEarned ? '' : 'opacity-35'}`}>
                      <View className={`w-20 h-20 rounded-2xl items-center justify-center mb-2 overflow-hidden ${isEarned ? 'border-2 border-yellow-500/70' : 'bg-purple-900/30 border border-purple-700/30'}`}>
                        {medal.imageUrl ? (
                          <Image cachePolicy="memory-disk" source={{ uri: toCDN(medal.imageUrl) }} style={{ width: 80, height: 80 }} contentFit="cover" />
                        ) : (
                          <Text className="text-3xl">🏅</Text>
                        )}
                      </View>
                      <Text className={`text-[9px] font-bold text-center ${isEarned ? 'text-yellow-400' : 'text-purple-400/50'}`}>{medal.name}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="py-20 items-center">
                <Text className="text-purple-400/50 font-bold tracking-widest text-xs uppercase">No Medals Available</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
