import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Clock,
  Headphones,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '../../firebase/provider';
import { collection, query, where, getDocs } from '@/firebase/firestore-compat';
import { LinearGradient } from 'expo-linear-gradient';
import { toCDN } from '../../lib/cdn';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const SUPER_ADMIN_UID = '901piBzTQ0VzCtAvlyyobwvAaTs1';

const FAQS = [
  {
    question: 'How do I create an account?',
    answer: 'You can create an account using your phone number or Google account directly from the login screen.',
  },
  {
    question: 'How do I buy coins?',
    answer: "You can buy coins by navigating to Boutique > Gold Coins. There you'll find various coin packages available for purchase.",
  },
  {
    question: 'What are coins used for?',
    answer: 'Coins are used to send virtual gifts to other users in chat rooms and to equip premium assets in the Boutique.',
  },
  {
    question: 'How can I edit my profile?',
    answer: 'You can edit your profile information, including your name, bio, and avatar, by going to Me > Modify Persona.',
  },
  {
    question: 'How do I launch a frequency?',
    answer: 'On the main Home screen, select "Create Room" to define your frequency and gather your tribe.',
  },
];

interface AdminUser {
  uid: string;
  username: string;
  avatarUrl: string;
  tags?: string[];
  isOnline?: boolean;
  lastSeen?: any;
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    if (!firestore) return;
    try {
      const adminMap = new Map<string, AdminUser>();

      // 1. Always include super admin
      const superAdminDoc = await import('@/firebase/firestore-compat').then(m => m.default ? m.default : null);
      try {
        const { getDoc, doc: firestoreDoc } = await import('@/firebase/firestore-compat');
        const saSnap = await getDoc(firestoreDoc(firestore, 'users', SUPER_ADMIN_UID));
        if (saSnap.exists()) {
          const data = saSnap.data();
          adminMap.set(SUPER_ADMIN_UID, {
            uid: SUPER_ADMIN_UID,
            username: data.username || data.displayName || 'History',
            avatarUrl: data.avatarUrl || '',
            tags: data.tags || [],
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          });
        }
      } catch {}

      // 2. Fetch users with isAdmin: true
      const q1 = query(collection(firestore, 'users'), where('isAdmin', '==', true));
      const snap1 = await getDocs(q1);
      snap1.forEach((d) => {
        if (d.id === SUPER_ADMIN_UID) return;
        const data = d.data();
        adminMap.set(d.id, {
          uid: d.id,
          username: data.username || data.displayName || 'Official',
          avatarUrl: data.avatarUrl || '',
          tags: data.tags || [],
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        });
      });

      // 3. Fetch users with 'Official' tag
      const q2 = query(collection(firestore, 'users'), where('tags', 'array-contains', 'Official'));
      const snap2 = await getDocs(q2);
      snap2.forEach((d) => {
        if (adminMap.has(d.id)) return;
        const data = d.data();
        adminMap.set(d.id, {
          uid: d.id,
          username: data.username || data.displayName || 'Official',
          avatarUrl: data.avatarUrl || '',
          tags: data.tags || [],
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        });
      });

      // 4. Fetch users with 'Official center' tag
      const q3 = query(collection(firestore, 'users'), where('tags', 'array-contains', 'Official center'));
      const snap3 = await getDocs(q3);
      snap3.forEach((d) => {
        if (adminMap.has(d.id)) return;
        const data = d.data();
        adminMap.set(d.id, {
          uid: d.id,
          username: data.username || data.displayName || 'Official',
          avatarUrl: data.avatarUrl || '',
          tags: data.tags || [],
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        });
      });

      const list = Array.from(adminMap.values()).filter(a => a.uid !== 'XcEUwkKp1KSZ66Qns6tIgpmzOQA3');

      const order = [
        SUPER_ADMIN_UID,
        'MFgvjdzyAqW9RulxKYy6UE2SHz12',
        '3jl4mF9y86h4yNIhF2rKdzjJ3TV2',
        'L01wyEZKBPXZq25fFt14FH7ZGbq1',
      ];
      list.sort((a, b) => {
        const aIdx = order.indexOf(a.uid);
        const bIdx = order.indexOf(b.uid);
        const aOrder = aIdx >= 0 ? aIdx : order.length;
        const bOrder = bIdx >= 0 ? bIdx : order.length;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.username.localeCompare(b.username);
      });

      setAdmins(list);
    } catch (e) {
      console.log('Failed to fetch admins:', e);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const toggleAccordion = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@ummylive.com').catch(() => {
      alert('Could not launch mail client. Please contact support@ummylive.com manually.');
    });
  };

  const handleMessageAdmin = (adminUid: string) => {
    if (!user?.uid) return;
    const chatId = [user.uid, adminUid].sort().join('_');
    router.push({
      pathname: '/(tabs)/messages',
      params: { chatId, recipientUid: adminUid },
    });
  };

  return (
    <View className="flex-1 bg-[#f1f8e9]">
      <View className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#e8f5e9] to-transparent opacity-80" />

      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 bg-white/60 rounded-full border border-white/80">
            <ArrowLeft size={22} color="#1b4332" />
          </TouchableOpacity>
          <Text className="text-lg font-black tracking-tight text-[#1b4332] uppercase">Support</Text>
        </View>

        <ScrollView className="flex-1 px-4 pb-12" showsVerticalScrollIndicator={false}>
          {/* Support Protocol Badge */}
          <View className="flex-row mt-4 mb-2">
            <View className="flex-row items-center gap-1.5 bg-white/60 px-3 py-1 rounded-full border border-white/80 shadow-sm">
              <Zap size={11} color="#eab308" fill="#eab308" />
              <Text className="text-[9px] font-black uppercase tracking-widest text-[#1b4332]">Support Protocol</Text>
            </View>
          </View>

          <View className="mb-6 space-y-1.5">
            <Text className="text-3xl font-black text-[#1b4332] uppercase leading-none">Official Help Center</Text>
            <Text className="text-slate-600 text-sm font-medium">Find answers to your questions and get the support you need.</Text>
          </View>

          {/* 24/7 Availability Banner */}
          <LinearGradient colors={['#16a34a', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="rounded-2xl p-4 mb-5 flex-row items-center gap-3">
            <View className="h-10 w-10 bg-white/20 rounded-full items-center justify-center">
              <Headphones size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-black uppercase">24/7 Available</Text>
              <Text className="text-white/70 text-[10px] font-medium">Our official team is always ready to help you</Text>
            </View>
            <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <View className="h-1.5 w-1.5 bg-green-300 rounded-full" />
              <Text className="text-white text-[9px] font-bold uppercase">Active</Text>
            </View>
          </LinearGradient>

          {/* Official Team Section */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3 ml-1">
              <View className="p-1.5 bg-green-100 rounded-lg">
                <ShieldCheck size={16} color="#16a34a" />
              </View>
              <Text className="text-xs font-black uppercase tracking-wider text-[#1b4332]">Official Team</Text>
              <View className="bg-green-100 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-bold text-green-700">Direct Message</Text>
              </View>
            </View>

            {loadingAdmins ? (
              <View className="bg-white rounded-2xl p-6 items-center border border-green-50">
                <ActivityIndicator size="small" color="#16a34a" />
                <Text className="text-slate-400 text-xs mt-2">Loading team...</Text>
              </View>
            ) : admins.length > 0 ? (
              <View className="bg-white rounded-2xl border border-green-50 overflow-hidden">
                {admins.map((admin, idx) => (
                  <View key={admin.uid} className={`flex-row items-center px-4 py-3.5 ${idx < admins.length - 1 ? 'border-b border-green-50/60' : ''}`}>
                      {/* Avatar */}
                      <View className="relative">
                        {admin.avatarUrl ? (
                          <Image source={{ uri: toCDN(admin.avatarUrl) }} className="h-12 w-12 rounded-full" />
                        ) : (
                          <View className="h-12 w-12 bg-green-100 rounded-full items-center justify-center">
                            <Text className="text-green-700 font-black text-lg">{admin.username.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {/* Online dot - only if actually online */}
                        {admin.isOnline && admin.lastSeen && (Date.now() - (admin.lastSeen?.toMillis?.() || admin.lastSeen?.seconds * 1000 || 0) < 120000) && (
                          <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </View>

                    {/* Info */}
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-[#1b4332]" numberOfLines={1}>{admin.username}</Text>
                        <View className="bg-green-600 px-1.5 py-0.5 rounded">
                          <Text className="text-[7px] font-black text-white uppercase">Official</Text>
                        </View>
                      </View>
                      <Text className="text-[10px] text-slate-400 font-medium mt-0.5">Available 24/7 for support</Text>
                    </View>

                    {/* Message Button */}
                    <TouchableOpacity
                      onPress={() => handleMessageAdmin(admin.uid)}
                      className="bg-green-600 flex-row items-center gap-1.5 px-3.5 py-2 rounded-full shadow-sm shadow-green-900/10"
                    >
                      <MessageCircle size={13} color="#fff" />
                      <Text className="text-white text-[10px] font-black uppercase">Message</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-5 items-center border border-green-50">
                <Text className="text-slate-400 text-xs">No officials available right now.</Text>
              </View>
            )}
          </View>

          {/* Email Support Card */}
          <View className="bg-white rounded-3xl border border-green-100 p-5 shadow-sm mb-6">
            <Text className="text-base font-black text-[#1b4332] uppercase tracking-wide mb-3">Need More Help?</Text>
            <Text className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
              You can also reach us via email. Our team typically responds within 24 hours.
            </Text>
            <View className="flex-row items-center justify-between bg-green-50/40 border border-green-100/60 rounded-2xl p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 bg-green-600 rounded-xl items-center justify-center shadow-lg shadow-green-900/10">
                  <Mail size={22} color="#fff" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#1b4332]">Ummy Support</Text>
                  <Text className="text-[8px] text-green-700 font-bold uppercase tracking-wider mt-0.5">Response in 24 hrs</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleEmailSupport}
                className="bg-green-600 px-4 py-2.5 rounded-full shadow-md"
              >
                <Text className="text-white text-xs font-black uppercase tracking-wider">Email Us</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQs */}
          <View className="space-y-4 mb-20">
            <View className="flex-row items-center gap-2 mb-2 ml-1">
              <View className="p-1.5 bg-green-100 rounded-lg">
                <ShieldCheck size={16} color="#16a34a" />
              </View>
              <Text className="text-xs font-black uppercase tracking-wider text-[#1b4332]">FAQ Dimension</Text>
            </View>

            <View className="bg-white rounded-3xl border border-green-50 overflow-hidden shadow-inner">
              {FAQS.map((faq, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <View key={index} className="border-b border-green-50/40 last:border-b-0">
                    <TouchableOpacity
                      onPress={() => toggleAccordion(index)}
                      className="flex-row items-center justify-between py-4.5 px-5"
                    >
                      <Text className="flex-1 text-[#1b4332] text-xs font-bold uppercase tracking-wide pr-4">{faq.question}</Text>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#8b9e8d" />
                      ) : (
                        <ChevronDown size={16} color="#8b9e8d" />
                      )}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View className="px-5 pb-5 pt-1">
                        <Text className="text-slate-500 text-[11px] font-medium leading-relaxed">{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
