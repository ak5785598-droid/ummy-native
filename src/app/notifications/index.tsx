import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Heart, Gift, UserPlus, Shield, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '../../firebase/provider';
import { collection, query, orderBy, limit } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

const ICON_MAP: Record<string, any> = { heart: Heart, gift: Gift, user_plus: UserPlus, shield: Shield, message: MessageCircle };

export default function NotificationsScreen() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const notifQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore, user?.uid]);

  const { data: notifications } = useCollection(notifQuery);

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate?.() || new Date(ts.seconds * 1000);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Notifications</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {notifications && notifications.length > 0 ? (
          notifications.map((n: any, i: number) => {
            const IconComp = ICON_MAP[n.type] || Bell;
            return (
              <TouchableOpacity key={n.id || i} className="flex-row items-center py-4 border-b border-slate-50">
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <IconComp size={18} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-slate-800">{n.title || n.content || 'Notification'}</Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">{formatTime(n.timestamp)}</Text>
                </View>
                {!n.isRead && <View className="w-2 h-2 rounded-full bg-purple-600" />}
              </TouchableOpacity>
            );
          })
        ) : (
          <View className="py-20 items-center">
            <Bell size={40} color="#e2e8f0" />
            <Text className="text-slate-400 text-sm mt-3">No notifications</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
