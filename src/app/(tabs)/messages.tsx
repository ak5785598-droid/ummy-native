import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, RefreshControl, Keyboard, Platform, LayoutAnimation, UIManager, Alert, BackHandler, Dimensions, Vibration, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Shield, Heart, ChevronRight, Send, X, Image as ImageIcon, MoreHorizontal, Loader, Check, CheckCheck, Gift, Mic, Smile, Plus, Play, Pause, ChevronDown, Download, Settings, Share2, Copy } from 'lucide-react-native';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '../../firebase/provider';
import { collection, query, where, orderBy, limit, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot, getDoc, increment, writeBatch } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { useUserProfile } from '../../hooks/use-user-profile';
import { PrivateChat, PrivateMessage, Proposal, CpPair } from '../../lib/types';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '../../lib/non-blocking-writes';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { FullProfileDialog } from '../../components/profile/FullProfileDialog';
import { toCDN } from '@/lib/cdn';
import { GoldenCoin } from '../../components/GoldenCoin';
import { getCpLevelFromValue } from '../../lib/level-utils';
import { getLevelFromSpent } from '../../hooks/use-user-level';
import { calculateLevelUpRewards } from '../../lib/level-rewards';

const LEVEL_THRESHOLDS = [0, 10000, 50000, 200000, 1000000, 5000000, 20000000, 100000000, 500000000, 2000000000];

function getFamilyLevel(totalWealth: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalWealth >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export default function MessagesScreen() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<any>();

  useEffect(() => {
    if (params?.recipientUid && params?.chatId) {
      setActiveChatId(params.chatId);
      setSelectedRecipient({
        uid: params.recipientUid,
        username: params.recipientName || 'User',
        avatarUrl: params.recipientAvatar || ''
      });
    }
  }, [params?.recipientUid, params?.chatId]);

  const [showOfficial, setShowOfficial] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChatForOptions, setSelectedChatForOptions] = useState<PrivateChat | null>(null);
  const [profileDialogUid, setProfileDialogUid] = useState<string | null>(null);
  const { profile: dialogProfile } = useUserProfile(profileDialogUid || undefined);
  const [dialogFollowData, setDialogFollowData] = useState<any>(null);
  const [dialogProcessingFollow, setDialogProcessingFollow] = useState(false);

  useEffect(() => {
    if (!profileDialogUid || !user?.uid || !firestore) { setDialogFollowData(null); return; }
    setDialogFollowData(null);
    const followId = `${user.uid}_${profileDialogUid}`;
    const followRef = doc(firestore, 'followers', followId);
    const unsub = onSnapshot(followRef, (snap: any) => {
      const exists = snap && (typeof snap.exists === 'function' ? snap.exists() : snap.exists);
      setDialogFollowData(exists ? { id: snap.id, ...snap.data() } : null);
    }, () => setDialogFollowData(null));
    return () => unsub();
  }, [profileDialogUid, user?.uid, firestore]);

  // Observer to check Admin-dispatched logo from Firebase
  const configRef = useMemo(() => firestore ? doc(firestore, 'appConfig', 'global') : null, [firestore]);
  const { data: config } = useDoc(configRef);
  const brandLogoUrl = config?.customLogoUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Ummy";

  // Dynamic hiding of bottom tab bar on expo-router — only hide when inside a chat
  useEffect(() => {
    try {
      navigation.setOptions({
        tabBarStyle: activeChatId 
          ? { display: 'none' } 
          : { backgroundColor: '#1a0b2e', borderTopWidth: 0, minHeight: 72, paddingBottom: 22, paddingTop: 4 }
      });
    } catch (e) {}
  }, [navigation, activeChatId]);

  // Handle hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (activeChatId) {
        setActiveChatId(null);
        setSelectedRecipient(null);
        return true;
      }
      if (showOfficial) {
        setShowOfficial(false);
        return true;
      }
      if (showSystem) {
        setShowSystem(false);
        return true;
      }
      if (showRequests) {
        setShowRequests(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeChatId, showOfficial, showSystem, showRequests]);

  const chatsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'privateChats'), where('participantIds', 'array-contains', user.uid));
  }, [firestore, user?.uid]);

  const { data: chats, isLoading } = useCollection<PrivateChat>(chatsQuery);

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc'));
  }, [firestore, user?.uid]);

  const { data: notifications } = useCollection(notificationsQuery);

  const proposalsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'proposals'), where('toUid', '==', user.uid), where('status', '==', 'pending'));
  }, [firestore, user?.uid]);

  const { data: proposals } = useCollection<Proposal>(proposalsQuery);

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(user?.uid || '') || false;
      const bPinned = b.pinnedBy?.includes(user?.uid || '') || false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?.seconds * 1000 || 0;
      const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });
  }, [chats, user?.uid]);

  const teamMsgs = notifications?.filter((n: any) => n.type === 'system') || [];
  const systemMsgs = notifications?.filter((n: any) => n.type === 'direct_system') || [];
  const unreadTeamCount = teamMsgs.filter((n: any) => n.isRead === false).length;
  const unreadSystemCount = systemMsgs.filter((n: any) => n.isRead === false).length;

  const openChat = (chat: PrivateChat) => {
    const otherUid = (chat.participantIds || []).find(id => id !== user?.uid);
    setActiveChatId(chat.id);
    setSelectedRecipient({ uid: otherUid });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  if (activeChatId) {
    return (
      <ChatRoomScreen 
        chatId={activeChatId} 
        recipientUid={selectedRecipient?.uid}
        onBack={() => { setActiveChatId(null); setSelectedRecipient(null); }}
        onAvatarPress={(uid) => setProfileDialogUid(uid)}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="absolute top-0 left-0 right-0 h-32">
        <LinearGradient colors={['#FF91B5', 'rgba(255,145,181,0.3)', 'transparent']} className="flex-1" />
      </View>

      <View className="flex-row items-center justify-between px-4 pt-4 pb-2 z-50">
        <Text className="text-2xl font-bold text-slate-800">Messages</Text>
        <TouchableOpacity className="p-2 bg-white/80 rounded-full">
          <Search size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <TouchableOpacity 
          onPress={() => setShowOfficial(true)}
          className="flex-row items-center bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3"
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', marginRight: 12 }}>
            <Image cachePolicy="memory-disk" source={{ uri: toCDN(brandLogoUrl) }} 
              style={{ width: '100%', height: '100%' }}
              contentFit="contain" 
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800">Ummy Team</Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {teamMsgs[0]?.content || 'Official announcements'}
            </Text>
          </View>
          {unreadTeamCount > 0 && (
            <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center mr-2">
              <Text className="text-white text-[10px] font-bold">{unreadTeamCount > 99 ? '99+' : unreadTeamCount}</Text>
            </View>
          )}
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setShowSystem(true)}
          className="flex-row items-center bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3"
        >
          <LinearGradient
            colors={['#4F92FE', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800">System</Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {systemMsgs[0]?.content || 'System notices'}
            </Text>
          </View>
          {unreadSystemCount > 0 && (
            <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center mr-2">
              <Text className="text-white text-[10px] font-bold">{unreadSystemCount > 99 ? '99+' : unreadSystemCount}</Text>
            </View>
          )}
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setShowRequests(true)}
          className="flex-row items-center bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4"
        >
          <LinearGradient
            colors={['#FB7185', '#F43F5E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: '#F43F5E', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={22} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800">Requests</Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {proposals?.length ? `${proposals.length} pending` : 'No pending requests'}
            </Text>
          </View>
          {proposals && proposals.length > 0 && (
            <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center mr-2">
              <Text className="text-white text-[10px] font-bold">{proposals.length}</Text>
            </View>
          )}
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Conversations</Text>

        {isLoading ? (
          <View className="py-10 items-center">
            <Loader size={24} color="#94a3b8" />
          </View>
        ) : sortedChats.length > 0 ? (
          sortedChats.map((chat) => (
            <ChatListItem 
              key={chat.id} 
              chat={chat} 
              currentUid={user?.uid || ''} 
              onPress={() => openChat(chat)} 
              onLongPress={() => setSelectedChatForOptions(chat)}
              onAvatarPress={(uid) => setProfileDialogUid(uid)}
            />
          ))
        ) : (
          <View className="py-10 items-center">
            <Text className="text-slate-400 text-sm">No conversations yet</Text>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      <OfficialPage visible={showOfficial} onClose={() => setShowOfficial(false)} messages={teamMsgs} />
      <SystemPage visible={showSystem} onClose={() => setShowSystem(false)} messages={systemMsgs} />
      <RequestsPage visible={showRequests} onClose={() => setShowRequests(false)} proposals={proposals || []} />

      {/* Chat Options Modal */}
      <Modal visible={!!selectedChatForOptions} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-center items-center px-4" 
          activeOpacity={1} 
          onPress={() => setSelectedChatForOptions(null)}
        >
          <View className="w-full bg-white rounded-3xl overflow-hidden p-2" onStartShouldSetResponder={() => true}>
            <TouchableOpacity 
              className="p-4 border-b border-slate-100 flex-row items-center"
              onPress={async () => {
                if (selectedChatForOptions && firestore && user?.uid) {
                  const isPinned = selectedChatForOptions.pinnedBy?.includes(user.uid);
                  await updateDocumentNonBlocking(doc(firestore, 'privateChats', selectedChatForOptions.id), {
                    pinnedBy: isPinned ? arrayRemove(user.uid) : arrayUnion(user.uid)
                  });
                }
                setSelectedChatForOptions(null);
              }}
            >
              <Text className="text-base font-bold text-slate-800 ml-2">
                {selectedChatForOptions?.pinnedBy?.includes(user?.uid || '') ? 'Unpin from Top' : 'Pin to Top'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-4 flex-row items-center"
              onPress={async () => {
                if (selectedChatForOptions && firestore && user?.uid) {
                  await updateDocumentNonBlocking(doc(firestore, 'privateChats', selectedChatForOptions.id), {
                    participantIds: arrayRemove(user.uid)
                  });
                }
                setSelectedChatForOptions(null);
              }}
            >
              <Text className="text-base font-bold text-red-500 ml-2">Delete from List</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <FullProfileDialog
        open={!!profileDialogUid}
        onOpenChange={(open: boolean) => { if (!open) setProfileDialogUid(null); }}
        profile={dialogProfile}
        isOwnProfile={profileDialogUid === user?.uid}
        displayId={dialogProfile?.accountNumber || profileDialogUid?.slice(0, 6) || '000000'}
        followData={dialogFollowData}
        isProcessingFollow={dialogProcessingFollow}
        onViewProfile={(uid: string) => { setProfileDialogUid(null); router.push(`/profile/${uid}`); }}
        onFollow={async () => {
          if (!profileDialogUid || !firestore || !user?.uid) return;
          setDialogProcessingFollow(true);
          const followId = `${user.uid}_${profileDialogUid}`;
          const followRef = doc(firestore, 'followers', followId);
          const targetUserRef = doc(firestore, 'users', profileDialogUid);
          const targetProfileRef = doc(firestore, 'users', profileDialogUid, 'profile', profileDialogUid);
          try {
            if (dialogFollowData) {
              await deleteDoc(followRef);
              try {
                await updateDoc(targetUserRef, { 'stats.fans': increment(-1) }).catch(() => {});
                await updateDoc(targetProfileRef, { 'stats.fans': increment(-1) }).catch(() => {});
              } catch {}
              setDialogFollowData(null);
            } else {
              await setDoc(followRef, { followerId: user.uid, followingId: profileDialogUid, timestamp: new Date() }, { merge: true });
              try {
                await updateDoc(targetUserRef, { 'stats.fans': increment(1) }).catch(() => {});
                await updateDoc(targetProfileRef, { 'stats.fans': increment(1) }).catch(() => {});
              } catch {}
              setDialogFollowData({ id: followId, followerId: user.uid, followingId: profileDialogUid });
            }
          } catch (e: any) {}
          setDialogProcessingFollow(false);
        }}
        onChat={(p: any) => {
          setProfileDialogUid(null);
          const chatPartId = [user?.uid, profileDialogUid].sort().join('_');
          setActiveChatId(chatPartId);
          setSelectedRecipient({ uid: profileDialogUid, username: p.username || p.name, avatarUrl: p.avatarUrl });
        }}
        onChangeFrame={async (frameId: string, frameUrl: string | null) => {
          if (!firestore || !profileDialogUid) return;
          try {
            await updateDoc(doc(firestore, 'users', profileDialogUid, 'profile', profileDialogUid), { 'inventory.activeFrame': frameId, 'inventory.activeFrameMediaUrl': frameUrl || null });
          } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
          setProfileDialogUid(null);
        }}
        onRemoveFrame={async () => {
          if (!firestore || !profileDialogUid) return;
          try {
            await updateDoc(doc(firestore, 'users', profileDialogUid, 'profile', profileDialogUid), { 'inventory.activeFrame': 'None', 'inventory.activeFrameMediaUrl': null });
          } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
          setProfileDialogUid(null);
        }}
      />
    </SafeAreaView>
  );
}

function ChatListItem({ chat, currentUid, onPress, onLongPress, onAvatarPress }: { chat: PrivateChat; currentUid: string; onPress: () => void; onLongPress?: () => void; onAvatarPress?: (uid: string) => void }) {
  const router = useRouter();
  const otherUid = (chat.participantIds || []).find(id => id !== currentUid) || '';
  const { profile: otherUser } = useUserProfile(otherUid);
  
  const isUnread = chat.lastSenderId !== currentUid && !(chat.lastMessageReadBy || []).includes(currentUid);
  
  const isOnline = useMemo(() => {
    if (!otherUser) return false;
    const isActuallyOnline = otherUser.isOnline === true && otherUser.lastSeen && 
                             (Date.now() - (otherUser.lastSeen?.toMillis?.() || otherUser.lastSeen?.seconds * 1000 || 0) < 120000);
    return !!isActuallyOnline;
  }, [otherUser]);

  const inRoomId = otherUser?.isOnline ? otherUser.currentRoomId : null;
  const isPinned = chat.pinnedBy?.includes(currentUid) || false;

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 86400000 && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 172800000) {
      return 'Yesterday';
    } else if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      onLongPress={onLongPress}
      className={`flex-row items-center py-4 px-3 rounded-2xl border-b border-slate-100/60 mb-2 ${
        isUnread ? 'bg-pink-50/40' : 'bg-white'
      } ${isPinned ? 'border-l-4 border-l-pink-500' : ''}`}
    >
      <View className="relative mr-3">
        <TouchableOpacity onPress={() => { if (onAvatarPress && otherUid) onAvatarPress(otherUid); }} activeOpacity={0.7}>
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(otherUser?.avatarUrl) || 'https://picsum.photos/100' }} 
            className="w-12 h-12 rounded-full border border-slate-100"
          />
        </TouchableOpacity>
        {isOnline && !inRoomId && (
          <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm" />
        )}
        {isUnread && (
          <View className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-pink-500 border-2 border-white shadow-sm" />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className={`text-base font-bold ${isUnread ? 'text-pink-600' : 'text-slate-800'}`} numberOfLines={1}>
            {otherUser?.username || 'User'}
          </Text>
          <Text className="text-[10px] font-semibold text-slate-400">{formatTime(chat.updatedAt)}</Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className={`text-xs flex-1 ${isUnread ? 'text-slate-900 font-bold' : 'text-slate-500'}`} numberOfLines={1}>
            {chat.lastMessage || 'Sent a vibe'}
          </Text>
          <View className="flex-row items-center gap-1.5 ml-2">
            {isPinned && <Text style={{ fontSize: 10 }}>📌</Text>}
          </View>
        </View>
        {isOnline && inRoomId && (
          <View className="flex-row items-center mt-1.5">
            <TouchableOpacity 
              onPress={() => router.push(`/rooms/${inRoomId}`)}
              className="flex-row items-center bg-indigo-500 rounded-full px-2.5 py-1 border border-white/20 shadow-sm"
            >
              <Text className="text-[8px] font-black uppercase text-white tracking-wider">In Room • Go Live ➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Global tracker — only one audio plays at a time across all AudioPlayer instances
let currentGlobalSound: any = null;


function AudioPlayer({ audioUrl, isMe }: { audioUrl: string; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<any>(null);
  const isMounted = useRef(true);
  const intervalRef = useRef<any>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startPolling = (sound: any) => {
    stopPolling();
    intervalRef.current = setInterval(async () => {
      if (!isMounted.current || !sound) { stopPolling(); return; }
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;
        if (isMounted.current) {
          setPosition(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? 0);
        }
        if (status.didJustFinish) {
          if (isMounted.current) { setIsPlaying(false); setPosition(0); }
          currentGlobalSound = null;
          stopPolling();
          sound.setPositionAsync(0).catch(() => {});
        }
      } catch { stopPolling(); }
    }, 250);
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopPolling();
      if (soundRef.current) {
        if (currentGlobalSound === soundRef.current) currentGlobalSound = null;
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = async () => {
    const { Audio } = require('expo-av');
    try {
      if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          stopPolling();
          if (isMounted.current) setIsPlaying(false);
        } else {
          // Stop any other globally playing sound
          if (currentGlobalSound && currentGlobalSound !== soundRef.current) {
            await currentGlobalSound.stopAsync().catch(() => {});
          }
          const status: any = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.positionMillis >= (status.durationMillis || 1) - 150) {
            await soundRef.current.replayAsync();
          } else {
            await soundRef.current.playAsync();
          }
          currentGlobalSound = soundRef.current;
          startPolling(soundRef.current);
          if (isMounted.current) setIsPlaying(true);
        }
      } else {
        // Stop any globally playing sound first
        if (currentGlobalSound) {
          await currentGlobalSound.stopAsync().catch(() => {});
          currentGlobalSound = null;
        }
        // No native status callback — avoids java.lang.reflect.InvocationTargetException
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        soundRef.current = newSound;
        currentGlobalSound = newSound;
        startPolling(newSound);
        if (isMounted.current) setIsPlaying(true);
      }
    } catch (err) {
      console.warn('[AudioPlayer]', err);
    }
  };

  const getFormatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View className="flex-row items-center py-2 gap-3 min-w-[200px]">
      <TouchableOpacity
        onPress={handlePlayPause}
        className={`w-9 h-9 rounded-full items-center justify-center ${
          isMe ? 'bg-white/20' : 'bg-cyan-500/10'
        }`}
      >
        {isPlaying ? (
          <Pause size={16} color={isMe ? 'white' : '#0891b2'} fill={isMe ? 'white' : '#0891b2'} />
        ) : (
          <Play size={16} color={isMe ? 'white' : '#0891b2'} fill={isMe ? 'white' : '#0891b2'} className="ml-0.5" />
        )}
      </TouchableOpacity>
      <View className="flex-1 justify-center">
        <View className={`h-1.5 rounded-full w-full ${isMe ? 'bg-white/30' : 'bg-slate-200'}`}>
          <View
            style={{ width: `${progress * 100}%` }}
            className={`h-full rounded-full ${isMe ? 'bg-white' : 'bg-cyan-500'}`}
          />
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className={`text-[10px] ${isMe ? 'text-white/80' : 'text-slate-500'}`}>
            {getFormatTime(position)}
          </Text>
          <Text className={`text-[10px] ${isMe ? 'text-white/80' : 'text-slate-500'}`}>
            {getFormatTime(duration || 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ChatRoomScreen({ chatId, recipientUid, onBack, onAvatarPress }: { chatId: string; recipientUid: string; onBack: () => void; onAvatarPress?: (uid: string) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const navigation = useNavigation();
  const { profile: otherUser } = useUserProfile(recipientUid);
  const { profile: myProfile } = useUserProfile(user?.uid);
  
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(collection(firestore, 'gifts'), (snap: any) => {
      setGifts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [firestore]);
  
  const [text, setText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<PrivateMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<PrivateMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [gifts, setGifts] = useState<any[]>([]);
  const [activeGiftCategory, setActiveGiftCategory] = useState('Hot');
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [selectedGiftQty, setSelectedGiftQty] = useState('1');
  const [showQtyPopup, setShowQtyPopup] = useState(false);

  const GIFT_CATEGORIES = ['Hot', 'Lucky', 'Luxury', 'Event', 'Customized'];
  const QUANTITIES = ['1', '10', '99', '520', '1314'];

  const groupedGifts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    GIFT_CATEGORIES.forEach(c => { groups[c] = []; });
    gifts.forEach((g: any) => {
      const cat = g.category || 'Hot';
      if (groups[cat]) groups[cat].push(g);
      else groups['Event'].push(g);
    });
    return groups;
  }, [gifts]);

  const currentGifts = groupedGifts[activeGiftCategory] || [];
  
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingInstanceRef = useRef<any>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKbHeight(e.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKbHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const chatRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'privateChats', chatId);
  }, [firestore, chatId]);

  const messagesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'privateChats', chatId, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, chatId]);

  const { data: messages, error: messagesError } = useCollection<PrivateMessage>(messagesQuery);

  useEffect(() => {
    if (messagesError) {
      console.warn('[DM Chat Error] Firestore query failed:', messagesError);
      Alert.alert('Chat Sync Failed', 'Please verify privacy settings or internet connection.');
    }
  }, [messagesError]);

  // Load block status and last seen preference
  useEffect(() => {
    if (!firestore || !user?.uid || !recipientUid) return;
    const myProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    const unsub = onSnapshot(myProfileRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        const blocked: string[] = data?.blockedUsers || [];
        setIsBlocked(blocked.includes(recipientUid));
        setShowLastSeen(data?.showLastSeen !== false);
      }
    }, (error: any) => {});
    return () => unsub();
  }, [firestore, user?.uid, recipientUid]);

  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp ? new Date(a.timestamp).getTime() : Date.now()));
      const bTime = b.timestamp?.toMillis?.() || (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp ? new Date(b.timestamp).getTime() : Date.now()));
      return aTime - bTime;
    });
  }, [messages]);

  useEffect(() => {
    if (sortedMessages && sortedMessages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [sortedMessages?.length]);

  useEffect(() => {
    if (firestore && user?.uid && chatRef) {
      updateDocumentNonBlocking(chatRef, {
        lastMessageReadBy: arrayUnion(user.uid),
      });
    }
  }, [messages?.length, firestore, user?.uid]);

  const handleSend = async (msgText?: string, imageUrl?: string, audioUrl?: string) => {
    if (!firestore || !user?.uid || (!msgText?.trim() && !imageUrl && !audioUrl)) return;

    const messagesRef = collection(firestore, 'privateChats', chatId, 'messages');
    const chatDocRef = doc(firestore, 'privateChats', chatId);

    await addDocumentNonBlocking(messagesRef, {
      text: msgText?.trim() || '',
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    });

    await setDocumentNonBlocking(chatDocRef, {
      participantIds: [user.uid, recipientUid].sort(),
      lastMessage: msgText?.trim() || (imageUrl ? '📷 Photo' : (audioUrl ? '🎤 Voice message' : '')),
      lastSenderId: user.uid,
      lastMessageReadBy: [user.uid],
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setText('');
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.3,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      try {
        const uri = result.assets[0].uri;
        const filename = `${Date.now()}_${uri.split('/').pop()}`;
        const storagePath = `chats/${chatId}/${filename}`;

        // Strip file:// prefix so Android native FS can resolve the path
        const nativePath = uri.replace(/^file:\/\//, '');

        // Upload via React Native Firebase Storage (native wrapper with auto-auth and appcheck)
        const rnfbStorage = require('@react-native-firebase/storage').default;
        const fileRef = rnfbStorage().ref(storagePath);
        await fileRef.putFile(nativePath);
        const downloadUrl = await fileRef.getDownloadURL();
        await handleSend(undefined, downloadUrl);
      } catch (error: any) {
        console.error('[Image Upload Error]', error);
        Alert.alert('Upload Failed', error.message || 'Could not send image.');
      }
      setIsUploading(false);
    }
  };

  const QUICK_EMOJIS = ['😊','😂','❤️','🔥','👍','😍','😭','🥳','😎','🙏','💪','🎉','🥰','😘','💯','✨'];

  const handleSendEmoji = async (emoji: string) => {
    await handleSend(emoji);
    setShowEmojiPicker(false);
  };

  const handleMicPress = async () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        if (recordingInstanceRef.current) {
          const rec = recordingInstanceRef.current;
          recordingInstanceRef.current = null;
          await rec.stopAndUnloadAsync();
          const { Audio: AvAudio } = require('expo-av');
          AvAudio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, playThroughEarpieceAndroid: false }).catch(() => {});
          const uri = rec.getURI();
          if (uri && storage) {
            setIsUploading(true);
            try {
              const filename = `voice_${Date.now()}.m4a`;
              const storagePath = `privateChats/${chatId}/voice/${filename}`;

              // Step 1: Copy to clean cache path (ensures file fully flushed)
              const cleanPath = `${FileSystem.cacheDirectory}${filename}`;
              await FileSystem.copyAsync({ from: uri, to: cleanPath });

              // Step 2: Strip file:// prefix so Android native FS can resolve the path
              const nativePath = cleanPath.replace(/^file:\/\//, '');

              // Step 3: Upload via RNFB (uses native auth + App Check automatically)
              const rnfbStorage = require('@react-native-firebase/storage').default;
              const fileRef = rnfbStorage().ref(storagePath);
              await fileRef.putFile(nativePath);
              const downloadUrl = await fileRef.getDownloadURL();
              await handleSend(undefined, undefined, downloadUrl);

              FileSystem.deleteAsync(cleanPath, { idempotent: true }).catch(() => {});
            } catch (error: any) {
              console.error('[Voice Upload]', error);
              Alert.alert('Upload Failed', error.message || 'Could not upload voice message.');
            }
            setIsUploading(false);
          }
        }
      } catch (err) {
        console.warn('[Audio] Failed to stop recording:', err);
      }
      return;
    }
    
    const { Audio } = require('expo-av');
    try {
      const response = await Audio.requestPermissionsAsync();
      if (!response.granted) {
        Alert.alert('Permission Denied', 'Microphone access is required to record voice messages.');
        return;
      }

      if (recordingInstanceRef.current) {
        try {
          await recordingInstanceRef.current.stopAndUnloadAsync();
        } catch {}
        recordingInstanceRef.current = null;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
      await new Promise(r => setTimeout(r, 300));

      let rec;
      try {
        const VOICE_RECORDING_OPTIONS = {
          android: {
            extension: '.m4a',
            outputFormat: 2,
            audioEncoder: 3,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            audioSource: 7,
          },
          ios: {
            extension: '.m4a',
            outputFormat: 'aac ',
            audioQuality: 96,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {}
        };
        const { recording } = await Audio.Recording.createAsync(VOICE_RECORDING_OPTIONS);
        rec = recording;
      } catch (innerErr) {
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        rec = recording;
      }

      recordingInstanceRef.current = rec;
      setIsRecording(true);
    } catch (err: any) {
      console.error('[Audio] start recording error:', err);
      Alert.alert('Recording Error', err?.message || 'Could not start voice recording.');
      setIsRecording(false);
    }
  };

  const handleGiftPress = () => {
    setShowGiftPicker(true);
  };

  const handleSendGift = async () => {
    if (!firestore || !user?.uid || !selectedGift || !myProfile) return;
    const qty = parseInt(selectedGiftQty) || 1;
    const totalCost = selectedGift.price * qty;
    const userCoins = myProfile.wallet?.coins || 0;
    if (userCoins < totalCost) {
      Alert.alert('Insufficient Coins', `You need ${totalCost.toLocaleString()} coins but have ${userCoins.toLocaleString()}.`);
      return;
    }
    try {
      const batch = writeBatch(firestore);
      const senderProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const senderUserRef = doc(firestore, 'users', user.uid);
      const currentLevel = getLevelFromSpent(myProfile?.wallet?.totalSpent || 0);
      const newTotalSpent = (myProfile.wallet?.totalSpent || 0) + totalCost;
      const newLevel = getLevelFromSpent(newTotalSpent);

      let levelUpCoins = 0;
      let levelUpFrames: any[] = [];

      // Level-up rewards using new system
      if (newLevel > currentLevel) {
        const rewards = calculateLevelUpRewards(currentLevel, newLevel);
        levelUpCoins = rewards.totalCoins;
        levelUpFrames = rewards.frames;

        // Log Level Up coins reward transaction
        if (levelUpCoins > 0) {
          const levelUpTxRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
          batch.set(levelUpTxRef, {
            amount: levelUpCoins,
            currency: 'coins',
            type: 'level_up_reward',
            description: `Level Up! Reached Level ${newLevel}. Earned ${levelUpCoins.toLocaleString()} coins.`,
            timestamp: serverTimestamp()
          });
        }

        // Add frames to inventory
        if (levelUpFrames.length > 0) {
          const frameIds = levelUpFrames.map(f => f.frameId).filter(Boolean);
          batch.update(senderUserRef, { 'inventory.ownedItems': arrayUnion(...frameIds) });
          batch.update(senderProfileRef, { 'inventory.ownedItems': arrayUnion(...frameIds) });

          // Log frame rewards
          for (const frame of levelUpFrames) {
            const frameTxRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(frameTxRef, {
              amount: 0,
              currency: 'coins',
              type: 'level_up_frame',
              description: `Level Up Reward: ${frame.frameName} at Level ${frame.level}`,
              timestamp: serverTimestamp()
            });
          }
        }
      }

      batch.update(senderProfileRef, {
        'wallet.coins': increment(-totalCost + levelUpCoins),
        'wallet.totalSpent': increment(totalCost),
        'wallet.dailySpent': increment(totalCost),
        'wallet.weeklySpent': increment(totalCost),
        'wallet.monthlySpent': increment(totalCost),
      });
      batch.update(senderUserRef, {
        'wallet.coins': increment(-totalCost + levelUpCoins),
        'wallet.totalSpent': increment(totalCost),
        'wallet.dailySpent': increment(totalCost),
        'wallet.weeklySpent': increment(totalCost),
        'wallet.monthlySpent': increment(totalCost),
      });

      const recipientProfileRef = doc(firestore, 'users', recipientUid, 'profile', recipientUid);
      const recipientUserRef = doc(firestore, 'users', recipientUid);
      const diamondReward = Math.floor(totalCost * 0.4);
      batch.update(recipientProfileRef, {
        'wallet.diamonds': increment(diamondReward),
        'wallet.totalReceived': increment(totalCost),
        'wallet.dailyReceived': increment(totalCost),
        'wallet.weeklyReceived': increment(totalCost),
        'wallet.monthlyReceived': increment(totalCost),
        'activityPoints': increment(totalCost),
        'dailyActivityPoints': increment(totalCost),
        [`stats.receivedGifts.${selectedGift.id || selectedGift.name}`]: increment(qty),
        [`stats.giftDetails.${selectedGift.id || selectedGift.name}_name`]: selectedGift.name || 'Gift',
        [`stats.giftDetails.${selectedGift.id || selectedGift.name}_imageUrl`]: selectedGift.imageUrl || null,
        'stats.dailyGiftsReceived': increment(diamondReward),
        'stats.weeklyGiftsReceived': increment(diamondReward),
        'stats.monthlyGiftsReceived': increment(diamondReward),
      });
      batch.update(recipientUserRef, {
        'wallet.totalReceived': increment(totalCost),
        'wallet.dailyReceived': increment(totalCost),
        'wallet.weeklyReceived': increment(totalCost),
        'wallet.monthlyReceived': increment(totalCost),
        'stats.dailyGiftsReceived': increment(diamondReward),
        'stats.weeklyGiftsReceived': increment(diamondReward),
        'stats.monthlyGiftsReceived': increment(diamondReward),
      });

      const senderPartnerUid = myProfile?.relationship?.partnerUid;
      const senderCpType = myProfile?.relationship?.type;
      if (senderPartnerUid && senderCpType && senderCpType !== 'None' && recipientUid === senderPartnerUid) {
        const sortedIds = [user.uid, senderPartnerUid].sort();
        const pairId = sortedIds.join('_');
        const cpRef = doc(firestore, 'cpPairs', pairId);
        const cpSnap = await getDoc(cpRef);
        const oldCpValue = cpSnap.exists() ? (cpSnap.data()?.cpValue || 0) : 0;
        const newCpLevel = getCpLevelFromValue(oldCpValue + totalCost);
        const isUser1 = sortedIds[0] === user.uid;
        batch.set(cpRef, {
          cpValue: increment(totalCost),
          [isUser1 ? 'user1Sent' : 'user2Sent']: increment(totalCost),
          level: newCpLevel,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      const messagesRef = collection(firestore, 'privateChats', chatId, 'messages');
      const msgRef = doc(messagesRef);
      batch.set(msgRef, {
        text: '',
        senderId: user.uid,
        timestamp: serverTimestamp(),
        type: 'gift',
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        giftValue: totalCost,
        quantity: qty,
        animationUrl: selectedGift.animationUrl || selectedGift.imageUrl || null,
        imageUrl: selectedGift.imageUrl || null,
      });

      const chatDocRef = doc(firestore, 'privateChats', chatId);
      batch.update(chatDocRef, {
        participantIds: [user.uid, recipientUid].sort(),
        lastMessage: `🎁 ${selectedGift.name} x${qty}`,
        lastSenderId: user.uid,
        lastMessageReadBy: [user.uid],
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      Vibration.vibrate(100);
      setSelectedGift(null);
      setSelectedGiftQty('1');
      setShowGiftPicker(false);
      setShowQtyPopup(false);

      if (myProfile?.familyId) {
        const familyRef = doc(firestore, 'families', myProfile.familyId);
        try {
          const familySnap = await getDoc(familyRef);
          if (familySnap.exists()) {
            const currentWealth = familySnap.data()?.totalWealth || 0;
            const newWealth = currentWealth + totalCost;
            const newFamilyLevel = getFamilyLevel(newWealth);
            updateDocumentNonBlocking(familyRef, {
              totalWealth: increment(totalCost),
              [`contributions.${user.uid}`]: increment(totalCost),
              level: newFamilyLevel,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {}
      }
    } catch (e) {}
  };

  const handleDeleteMsg = async (msg: PrivateMessage) => {
    if (!firestore || !user?.uid) return;
    const hasSeen = otherUser?.lastSeen && msg.timestamp && 
      (otherUser.lastSeen?.toMillis?.() || 0) > (msg.timestamp?.toMillis?.() || 0);
    
    if (hasSeen) {
      // Recipient saw it → only delete from sender side (mark as deleted)
      const msgRef = doc(firestore, 'privateChats', chatId, 'messages', msg.id);
      await updateDocumentNonBlocking(msgRef, { deletedBySender: true, text: '', imageUrl: null });
    } else {
      // Recipient hasn't seen → delete entirely
      const msgRef = doc(firestore, 'privateChats', chatId, 'messages', msg.id);
      await deleteDoc(msgRef);
    }
    setSelectedMsg(null);
  };

  const handleEditMsg = async () => {
    if (!firestore || !editingMsg || !editText.trim()) return;
    const msgRef = doc(firestore, 'privateChats', chatId, 'messages', editingMsg.id);
    await updateDocumentNonBlocking(msgRef, { text: editText.trim(), edited: true });
    setEditingMsg(null);
    setEditText('');
  };

  const handleStartEdit = (msg: PrivateMessage) => {
    setEditingMsg(msg);
    setEditText(msg.text || '');
    setSelectedMsg(null);
  };

  const isOnline = useMemo(() => {
    if (!otherUser) return false;
    return otherUser.isOnline === true && otherUser.lastSeen && 
      (Date.now() - (otherUser.lastSeen?.toMillis?.() || otherUser.lastSeen?.seconds * 1000 || 0)) < 120000;
  }, [otherUser]);

  const getLastSeenText = (timestamp: any) => {
    if (!timestamp) return 'offline';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isSameDay = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

      const formatTimeOnly = (d: Date) => {
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        return `${hours}:${minutes} ${ampm}`;
      };

      if (isSameDay(date, today)) {
        return `last seen today at ${formatTimeOnly(date)}`;
      }
      if (isSameDay(date, yesterday)) {
        return `last seen yesterday at ${formatTimeOnly(date)}`;
      }
      return `last seen on ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return 'offline';
    }
  };

  const handleReportUser = async () => {
    if (!firestore || !user?.uid || !recipientUid) return;
    setShowActions(false);
    try {
      await addDocumentNonBlocking(collection(firestore, 'reports'), {
        reporterId: user.uid,
        reportedUserId: recipientUid,
        reportedUsername: otherUser?.username || 'Unknown',
        type: 'dm_chat',
        chatId,
        reason: 'Inappropriate behavior',
        timestamp: serverTimestamp(),
      });
      Alert.alert('Reported', `${otherUser?.username || 'User'} has been reported. Our team will review this.`);
    } catch (e) {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    }
  };

  const handleBlockUser = async () => {
    if (!firestore || !user?.uid || !recipientUid) return;
    setShowActions(false);
    const myUserRef = doc(firestore, 'users', user.uid);
    const myProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    try {
      if (isBlocked) {
        await updateDoc(myUserRef, { blockedUsers: arrayRemove(recipientUid) });
        await updateDoc(myProfileRef, { blockedUsers: arrayRemove(recipientUid) });
        setIsBlocked(false);
        Alert.alert('Unblocked', `${otherUser?.username || 'User'} has been unblocked.`);
      } else {
        Alert.alert(
          'Block User',
          `Block ${otherUser?.username || 'User'}? They won't be able to message you.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                await updateDoc(myUserRef, { blockedUsers: arrayUnion(recipientUid) });
                await updateDoc(myProfileRef, { blockedUsers: arrayUnion(recipientUid) });
                setIsBlocked(true);
                Alert.alert('Blocked', `${otherUser?.username || 'User'} has been blocked.`);
              },
            },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update block status.');
    }
  };

  const handleToggleLastSeen = async () => {
    if (!firestore || !user?.uid) return;
    const newVal = !showLastSeen;
    const myUserRef = doc(firestore, 'users', user.uid);
    const myProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    try {
      await updateDoc(myUserRef, { showLastSeen: newVal });
      await updateDoc(myProfileRef, { showLastSeen: newVal });
      setShowLastSeen(newVal);
    } catch (e) {
      Alert.alert('Error', 'Could not update setting.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingBottom: kbHeight + 16 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={onBack} className="mr-1 p-2 active:opacity-60" style={{ transform: [{ rotate: '180deg' }] }}>
          <ChevronRight size={24} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { if (onAvatarPress && recipientUid) onAvatarPress(recipientUid); }} activeOpacity={0.7}>
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(otherUser?.avatarUrl) || 'https://picsum.photos/100' }} 
            className="w-10 h-10 rounded-full mr-3 border border-slate-100"
          />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">{otherUser?.username || 'User'}</Text>
          <Text className={`text-xs ${isOnline ? 'text-green-500 font-bold' : 'text-slate-400'}`}>
            {isOnline ? 'online' : (otherUser?.showLastSeen === false ? '' : getLastSeenText(otherUser?.lastSeen))}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowActions(true)} className="p-2">
          <MoreHorizontal size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 py-2"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 70 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {(() => {
          let lastDateStr = '';
          return sortedMessages?.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            if (isMe && (msg as any).deletedBySender) return null;

            const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : (msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : (msg.timestamp ? new Date(msg.timestamp) : null));
            const msgDateStr = msgDate ? msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const showDateSeparator = msgDateStr && msgDateStr !== lastDateStr;
            if (showDateSeparator) {
              lastDateStr = msgDateStr;
            }
            const timeStr = msgDate ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <View style={{ alignItems: 'center', marginVertical: 12 }}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{msgDateStr}</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onLongPress={() => isMe && setSelectedMsg(msg)}
                  className={`flex-row mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: toCDN(otherUser?.avatarUrl) || 'https://picsum.photos/100' }}
                      style={{ width: 28, height: 28, borderRadius: 14, marginRight: 6, marginTop: 2 }}
                    />
                  )}
                  {(msg as any).type === 'room_invite' ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        const targetRoomId = (msg as any).roomId || (msg as any).roomNumber;
                        if (targetRoomId) {
                          router.push(`/rooms/${targetRoomId}`);
                        }
                      }}
                      style={{ width: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: isMe ? '#7c3aed' : '#ffffff', marginBottom: 4, borderWidth: 1, borderColor: isMe ? '#6d28d9' : '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
                    >
                      {(msg as any).roomCoverUrl ? (
                        <Image cachePolicy="memory-disk" source={{ uri: toCDN((msg as any).roomCoverUrl) }} style={{ width: '100%', height: 95 }} contentFit="cover" />
                      ) : (
                        <View style={{ width: '100%', height: 75, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
                          <Mic size={28} color="white" />
                        </View>
                      )}
                      <View style={{ padding: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: isMe ? '#fff' : '#0f172a' }} numberOfLines={1}>{(msg as any).roomName || 'Voice Room'}</Text>
                        <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: 2 }}>Invites you to join their room</Text>
                        {(msg as any).roomNumber && (
                          <Text style={{ fontSize: 9, fontWeight: '700', color: isMe ? 'rgba(255,255,255,0.5)' : '#94a3b8', marginTop: 1 }}>ID: #{(msg as any).roomNumber}</Text>
                        )}
                        
                        {/* Join Room Action Button */}
                        <View style={{ marginTop: 10, backgroundColor: isMe ? '#ffffff' : '#6366f1', borderRadius: 10, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                          <Mic size={12} color={isMe ? '#7c3aed' : '#ffffff'} />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: isMe ? '#7c3aed' : '#ffffff' }}>Join Room</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 10, paddingBottom: 6 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: isMe ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>{timeStr}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                  <View className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    (msg as any).type === 'gift' ? 'bg-gradient-to-br from-pink-500 to-purple-600' : isMe ? 'bg-cyan-500 rounded-br-none' : 'bg-slate-100 rounded-bl-none'
                  }`}>
                    {(msg as any).type === 'gift' ? (
                      <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                        {(msg as any).imageUrl ? (
                          <Image cachePolicy="memory-disk" source={{ uri: toCDN((msg as any).imageUrl) }} style={{ width: 80, height: 80 }} contentFit="contain" />
                        ) : (
                          <Text style={{ fontSize: 40 }}>{String.fromCodePoint(0x1F381)}</Text>
                        )}
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '800', marginTop: 4 }}>{(msg as any).giftName || 'Gift'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 }}>Tap to view</Text>
                        <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', marginTop: 4 }}>
                          {timeStr}
                        </Text>
                      </View>
                    ) : (
                      <View>
                        {msg.imageUrl && (
                          <TouchableOpacity onPress={() => setPreviewImage(msg.imageUrl || null)}>
                            <Image cachePolicy="memory-disk" source={{ uri: toCDN(msg.imageUrl) }} className="w-48 h-48 rounded-lg mb-1" contentFit="cover" />
                          </TouchableOpacity>
                        )}
                        {(msg as any).audioUrl && (
                          <AudioPlayer audioUrl={(msg as any).audioUrl} isMe={isMe} />
                        )}
                        {msg.text && (
                          <Text style={{ fontSize: 14, color: isMe ? '#ffffff' : '#1e293b' }}>{msg.text}</Text>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          {(msg as any).edited && (
                            <Text style={{ fontSize: 8, color: isMe ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>edited</Text>
                          )}
                          <Text style={{ fontSize: 8, fontWeight: '700', color: isMe ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
                            {timeStr}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
                  {isMe && (
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: toCDN(myProfile?.avatarUrl) || 'https://picsum.photos/100' }}
                      style={{ width: 28, height: 28, borderRadius: 14, marginLeft: 6, marginTop: 2 }}
                    />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          });
        })()}
      </ScrollView>

      {/* Edit Message Bar */}
      {editingMsg && (
        <View className="flex-row items-center px-3 py-2 bg-blue-50 border-t border-blue-200 gap-2">
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-blue-600 mb-0.5">Editing message</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="Edit message..."
              placeholderTextColor="#93c5fd"
              className="text-sm text-slate-800 bg-white rounded-lg px-3 py-1.5 border border-blue-200"
            />
          </View>
          <TouchableOpacity onPress={handleEditMsg} className="p-2 bg-blue-500 rounded-full">
            <Send size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditingMsg(null); setEditText(''); }} className="p-2">
            <X size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Normal Input Bar (hidden when editing) */}
      {isBlocked ? (
        <View className="flex-row items-center justify-center px-4 py-4 border-t border-slate-100 bg-slate-50">
          <Text className="text-sm text-slate-400 font-medium">You blocked this user</Text>
        </View>
      ) : !editingMsg && (
      <View className="flex-row items-center px-3 py-2 border-t border-slate-100 bg-white gap-2">
        <TouchableOpacity onPress={handleGiftPress} className="p-1.5">
          <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center">
            <Gift size={18} color="#f59e0b" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMicPress} className="p-1.5">
          <View className={`w-9 h-9 rounded-full items-center justify-center ${isRecording ? 'bg-red-100' : 'bg-slate-100'}`}>
            <Mic size={18} color={isRecording ? '#ef4444' : '#64748b'} />
          </View>
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type something..."
          placeholderTextColor="#94a3b8"
          multiline
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm max-h-24"
          style={{ color: '#1e293b', backgroundColor: '#f1f5f9' }}
        />
        <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5">
          <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
            <Smile size={18} color={showEmojiPicker ? '#8b5cf6' : '#64748b'} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            if (text.trim()) {
              handleSend(text);
            } else {
              handlePickImage();
            }
          }}
          disabled={isUploading}
          className="p-1.5"
        >
          <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
            {isUploading ? (
              <Loader size={18} color="#06b6d4" />
            ) : text.trim() ? (
              <Send size={18} color="#06b6d4" />
            ) : (
              <Plus size={18} color="#64748b" />
            )}
          </View>
        </TouchableOpacity>
      </View>
      )}

      {showEmojiPicker && (
        <View className="flex-row flex-wrap px-3 py-2 bg-slate-50 border-t border-slate-100 gap-1">
          {QUICK_EMOJIS.map((emoji) => (
            <TouchableOpacity key={emoji} onPress={() => handleSendEmoji(emoji)} className="p-1.5">
              <Text className="text-2xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Delete / Edit Message Popup */}
      <Modal visible={!!selectedMsg} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-center items-center" 
          activeOpacity={1}
          onPress={() => setSelectedMsg(null)}
        >
          <View className="bg-white rounded-2xl overflow-hidden shadow-lg" style={{ width: 200 }}>
            {selectedMsg?.text && (
              <TouchableOpacity 
                onPress={() => handleStartEdit(selectedMsg)}
                className="flex-row items-center px-5 py-3.5 border-b border-slate-100 active:bg-slate-50"
              >
                <Text className="text-sm font-semibold text-slate-700">Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => handleDeleteMsg(selectedMsg!)}
              className="flex-row items-center px-5 py-3.5 active:bg-slate-50"
            >
              <Text className="text-sm font-semibold text-red-500">Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {previewImage && (
        <Modal visible transparent>
          <View className="flex-1 bg-black items-center justify-center">
            <TouchableOpacity onPress={() => setPreviewImage(null)} className="absolute top-12 right-4 z-50 p-2 bg-black/50 rounded-full">
              <X size={24} color="white" />
            </TouchableOpacity>
            <Image cachePolicy="memory-disk" source={{ uri: toCDN(previewImage) }} className="w-full h-full" contentFit="contain" />
          </View>
        </Modal>
      )}

      {/* Three-dot menu */}
      <Modal visible={showActions} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/40" 
          activeOpacity={1}
          onPress={() => setShowActions(false)}
          style={{ justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 16 }}
        >
          <View className="bg-white rounded-2xl overflow-hidden shadow-lg" style={{ width: 220 }}>
            <TouchableOpacity 
              onPress={handleReportUser}
              className="flex-row items-center px-5 py-3.5 border-b border-slate-100 active:bg-slate-50"
            >
              <Shield size={16} color="#ef4444" />
              <Text className="text-sm font-semibold text-slate-700 ml-3">Report User</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleBlockUser}
              className="flex-row items-center px-5 py-3.5 border-b border-slate-100 active:bg-slate-50"
            >
              <Shield size={16} color={isBlocked ? '#22c55e' : '#ef4444'} />
              <Text className={`text-sm font-semibold ml-3 ${isBlocked ? 'text-green-500' : 'text-red-500'}`}>
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleToggleLastSeen}
              className="flex-row items-center px-5 py-3.5 active:bg-slate-50"
            >
              <Text className="text-sm font-semibold text-slate-700 ml-3 flex-1">Last Seen</Text>
              <View style={{
                width: 44, height: 24, borderRadius: 12,
                backgroundColor: showLastSeen ? '#0d9488' : '#cbd5e1',
                justifyContent: 'center', alignItems: 'center', padding: 2,
              }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: 'white',
                  transform: [{ translateX: showLastSeen ? 10 : -2 }],
                }} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gift Picker Modal */}
      <Modal visible={showGiftPicker} transparent animationType="slide" onRequestClose={() => { setShowGiftPicker(false); setSelectedGift(null); setShowQtyPopup(false); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1a0b2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 34 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '800' }}>Send Gift</Text>
              <TouchableOpacity onPress={() => { setShowGiftPicker(false); setSelectedGift(null); setShowQtyPopup(false); }}>
                <X size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
              {GIFT_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} onPress={() => { setActiveGiftCategory(cat); setSelectedGift(null); }}
                  style={{ paddingHorizontal: 22, paddingVertical: 11, borderRadius: 24, backgroundColor: activeGiftCategory === cat ? '#ec4899' : 'rgba(255,255,255,0.12)', minWidth: 90, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '800', textAlign: 'center' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FlatList
              data={currentGifts}
              keyExtractor={(item: any) => item.id}
              numColumns={4}
              style={{ maxHeight: 280 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
              columnWrapperStyle={{ justifyContent: 'flex-start', gap: 8 }}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={3}
              removeClippedSubviews
              renderItem={({ item }: any) => (
                <TouchableOpacity onPress={() => setSelectedGift(item)}
                  style={{ width: (Dimensions.get('window').width - 64) / 4, alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: selectedGift?.id === item.id ? '#22d3ee' : 'rgba(255,255,255,0.08)', backgroundColor: selectedGift?.id === item.id ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)' }}>
                  {item.imageUrl ? (
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(item.imageUrl) }} style={{ width: 52, height: 52 }} contentFit="contain" />
                  ) : (
                    <Text style={{ fontSize: 32 }}>🎁</Text>
                  )}
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                    <GoldenCoin size={12} />
                    <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '800' }}>{(item.price || 0).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <GoldenCoin size={26} />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' }}>{(myProfile?.wallet?.coins || 0).toLocaleString()}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowQtyPopup(!showQtyPopup)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>x{selectedGiftQty}</Text>
                <ChevronDown size={14} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendGift}
                disabled={!selectedGift || ((myProfile?.wallet?.coins || 0) < (selectedGift?.price || 0) * (parseInt(selectedGiftQty) || 1))}
                style={{ opacity: (!selectedGift || ((myProfile?.wallet?.coins || 0) < (selectedGift?.price || 0) * (parseInt(selectedGiftQty) || 1))) ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={selectedGift && ((myProfile?.wallet?.coins || 0) >= (selectedGift?.price || 0) * (parseInt(selectedGiftQty) || 1)) ? ['#ec4899', '#db2777'] : ['#374151', '#4b5563']}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Send size={14} color="white" />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                    {((selectedGift?.price || 0) * (parseInt(selectedGiftQty) || 1)).toLocaleString()}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {showQtyPopup && (
              <>
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onPress={() => setShowQtyPopup(false)} activeOpacity={1} />
                <View style={{ position: 'absolute', bottom: 64, right: 16, zIndex: 100, backgroundColor: '#1e293b', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  {QUANTITIES.map((q) => (
                    <TouchableOpacity key={q} onPress={() => { setSelectedGiftQty(q); setShowQtyPopup(false); }}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: selectedGiftQty === q ? '#ec4899' : 'transparent' }}>
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: selectedGiftQty === q ? '800' : '600', textAlign: 'center' }}>x{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
}

function OfficialPage({ visible, onClose, messages }: { visible: boolean; onClose: () => void; messages: any[] }) {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!visible || !firestore || !user?.uid || messages.length === 0) return;
    const unread = messages.filter((m: any) => m.isRead === false);
    if (unread.length === 0) return;
    const batch = writeBatch(firestore);
    unread.forEach((m: any) => {
      const ref = doc(firestore, 'users', user.uid, 'notifications', m.id);
      batch.update(ref, { isRead: true });
    });
    batch.commit().catch(() => {});
  }, [visible]);

  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
      <>
        {parts.map((part, i) => {
          if (part.match(urlRegex)) {
            return (
              <TouchableOpacity
                key={i}
                onPress={() => Linking.openURL(part)}
                style={{
                  backgroundColor: '#FF6C22',
                  borderRadius: 20,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  marginTop: 12,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#FF6C22',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Download size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Download Now</Text>
              </TouchableOpacity>
            );
          }
          return <Text key={i} style={{ color: '#1e293b', fontSize: 14, lineHeight: 20 }}>{part}</Text>;
        })}
      </>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Text style={{ color: '#1e293b' }} className="text-lg font-bold">Ummy Team</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-4 py-2">
          {messages.length > 0 ? messages.map((msg: any, i: number) => {
            const text = msg.content || msg.text || '';
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const hasUrl = urlRegex.test(text);
            const textWithoutUrl = text.replace(urlRegex, '').trim();
            return (
              <View key={i} className="bg-blue-50 rounded-2xl p-4 mb-3">
                {textWithoutUrl ? <Text style={{ color: '#1e293b', fontSize: 14, lineHeight: 20 }}>{textWithoutUrl}</Text> : null}
                {hasUrl ? (() => {
                  const urlMatch = text.match(urlRegex);
                  const url = urlMatch ? urlMatch[0] : '';
                  return (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(url)}
                      style={{
                        backgroundColor: '#FF6C22',
                        borderRadius: 20,
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        marginTop: textWithoutUrl ? 12 : 0,
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: '#FF6C22',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Download size={16} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Download Now</Text>
                    </TouchableOpacity>
                  );
                })() : null}
                <Text className="text-[10px] text-slate-400 mt-2">
                  {msg.timestamp?.toDate?.()?.toLocaleString() || ''}
                </Text>
              </View>
            );
          }) : (
            <View className="py-10 items-center">
              <Text className="text-slate-400 text-sm">No messages</Text>
            </View>
          )}
        </ScrollView>
        <View className="px-4 py-3 border-t border-slate-100">
          <Text className="text-xs text-slate-400 text-center">You can't message here</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SystemPage({ visible, onClose, messages }: { visible: boolean; onClose: () => void; messages: any[] }) {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!visible || !firestore || !user?.uid || messages.length === 0) return;
    const unread = messages.filter((m: any) => m.isRead === false);
    if (unread.length === 0) return;
    const batch = writeBatch(firestore);
    unread.forEach((m: any) => {
      const ref = doc(firestore, 'users', user.uid, 'notifications', m.id);
      batch.update(ref, { isRead: true });
    });
    batch.commit().catch(() => {});
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Text className="text-lg font-bold text-slate-800">System Notices</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-4 py-2">
          {messages.length > 0 ? messages.map((msg: any, i: number) => (
            <View key={i} className="bg-slate-50 rounded-2xl p-4 mb-3">
              <Text className="text-sm text-slate-800">{msg.content || msg.text}</Text>
              <Text className="text-[10px] text-slate-400 mt-2">
                {msg.timestamp?.toDate?.()?.toLocaleString() || ''}
              </Text>
            </View>
          )) : (
            <View className="py-10 items-center">
              <Text className="text-slate-400 text-sm">No notices</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function RequestsPage({ visible, onClose, proposals }: { visible: boolean; onClose: () => void; proposals: Proposal[] }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const handleAccept = async (proposal: Proposal) => {
    if (!firestore || !user?.uid) return;
    
    const sortedIds = [user.uid, proposal.fromUid].sort();
    const pairId = sortedIds.join('_');
    
    // Fetch both users' profiles from profile subcollection (where avatarUrl lives)
    let senderName = 'User';
    let senderAvatar = '';
    let receiverName = 'User';
    let receiverAvatar = '';
    
    try {
      const receiverProfileDoc = await getDoc(doc(firestore, 'users', user.uid, 'profile', user.uid));
      if (receiverProfileDoc.exists()) {
        const rd = receiverProfileDoc.data();
        if (rd?.relationship && rd.relationship.type && rd.relationship.type !== 'None') {
          Alert.alert('Error 💔', 'You already have an active relationship. You cannot accept another proposal.');
          return;
        }
        receiverName = rd?.username || rd?.displayName || 'User';
        receiverAvatar = rd?.avatarUrl || '';
      } else {
        const receiverDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (receiverDoc.exists()) {
          const rd = receiverDoc.data();
          if (rd?.relationship && rd.relationship.type && rd.relationship.type !== 'None') {
            Alert.alert('Error 💔', 'You already have an active relationship. You cannot accept another proposal.');
            return;
          }
          receiverName = rd?.username || rd?.displayName || 'User';
          receiverAvatar = rd?.avatarUrl || '';
        }
      }
    } catch {}

    try {
      const senderProfileDoc = await getDoc(doc(firestore, 'users', proposal.fromUid, 'profile', proposal.fromUid));
      if (senderProfileDoc.exists()) {
        const sd = senderProfileDoc.data();
        if (sd?.relationship && sd.relationship.type && sd.relationship.type !== 'None') {
          Alert.alert('Error 💔', 'The sender already has an active relationship.');
          return;
        }
        senderName = sd?.username || sd?.displayName || 'User';
        senderAvatar = sd?.avatarUrl || '';
      } else {
        const senderDoc = await getDoc(doc(firestore, 'users', proposal.fromUid));
        if (senderDoc.exists()) {
          const sd = senderDoc.data();
          if (sd?.relationship && sd.relationship.type && sd.relationship.type !== 'None') {
            Alert.alert('Error 💔', 'The sender already has an active relationship.');
            return;
          }
          senderName = sd?.username || sd?.displayName || 'User';
          senderAvatar = sd?.avatarUrl || '';
        }
      }
    } catch {}

    const cpType = proposal.type || 'cp';
    
    // Write cpPairs with denormalized user data (for home CP card)
    const cpRef = doc(firestore, 'cpPairs', pairId);
    const isSenderUser1 = sortedIds[0] === proposal.fromUid;
    await setDocumentNonBlocking(cpRef, {
      id: pairId,
      participantIds: sortedIds,
      type: cpType,
      cpValue: 0,
      user1Sent: 0,
      user2Sent: 0,
      level: 1,
      user1Name: isSenderUser1 ? senderName : receiverName,
      user1Avatar: isSenderUser1 ? senderAvatar : receiverAvatar,
      user2Name: isSenderUser1 ? receiverName : senderName,
      user2Avatar: isSenderUser1 ? receiverAvatar : senderAvatar,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Write relationship to BOTH users' profiles
    const partnerData = {
      uid: proposal.fromUid,
      name: senderName,
      avatarUrl: senderAvatar,
      startDate: new Date().toISOString(),
    };

    const myPartnerData = {
      uid: user.uid,
      name: receiverName,
      avatarUrl: receiverAvatar,
      startDate: new Date().toISOString(),
    };

    // Write to receiver (current user) profile
    try {
      const receiverProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      if (cpType === 'CP') {
        await setDocumentNonBlocking(receiverProfileRef, { relationship: { type: 'CP', ...partnerData } }, { merge: true });
      } else if (cpType === 'Best Friend') {
        await setDocumentNonBlocking(receiverProfileRef, { bestFriend: partnerData }, { merge: true });
      } else if (cpType === 'Besties') {
        await setDocumentNonBlocking(receiverProfileRef, { besties: partnerData }, { merge: true });
      }
    } catch {}

    // Write to sender (proposer) profile
    try {
      const senderProfileRef = doc(firestore, 'users', proposal.fromUid, 'profile', proposal.fromUid);
      if (cpType === 'CP') {
        await setDocumentNonBlocking(senderProfileRef, { relationship: { type: 'CP', ...myPartnerData } }, { merge: true });
      } else if (cpType === 'Best Friend') {
        await setDocumentNonBlocking(senderProfileRef, { bestFriend: myPartnerData }, { merge: true });
      } else if (cpType === 'Besties') {
        await setDocumentNonBlocking(senderProfileRef, { besties: myPartnerData }, { merge: true });
      }
    } catch {}

    const proposalRef = doc(firestore, 'proposals', proposal.id);
    await updateDocumentNonBlocking(proposalRef, { status: 'accepted' });
  };

  const handleDecline = async (proposal: Proposal) => {
    if (!firestore) return;
    const proposalRef = doc(firestore, 'proposals', proposal.id);
    await updateDocumentNonBlocking(proposalRef, { status: 'declined' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Text className="text-lg font-bold text-slate-800">Relationship Requests</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-4 py-2">
          {proposals.length > 0 ? proposals.map((proposal) => (
            <ProposalCard 
              key={proposal.id} 
              proposal={proposal} 
              onAccept={() => handleAccept(proposal)}
              onDecline={() => handleDecline(proposal)}
            />
          )) : (
            <View className="py-10 items-center">
              <Heart size={32} color="#e2e8f0" />
              <Text className="text-slate-400 text-sm mt-2">No pending requests</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ProposalCard({ proposal, onAccept, onDecline }: { proposal: Proposal; onAccept: () => void; onDecline: () => void }) {
  const { profile: fromUser } = useUserProfile(proposal.fromUid);

  return (
    <View className="flex-row items-center bg-pink-50 rounded-2xl p-4 mb-3 border border-pink-100">
      <Image cachePolicy="memory-disk" source={{ uri: toCDN(fromUser?.avatarUrl) || 'https://picsum.photos/100' }} 
        className="w-12 h-12 rounded-full mr-3"
      />
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-800">{fromUser?.username || 'User'}</Text>
        <Text className="text-xs text-pink-600">wants to be your {proposal.type || 'CP'}</Text>
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={onDecline} className="px-3 py-1.5 rounded-full bg-slate-200">
          <Text className="text-slate-600 text-xs font-bold">Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAccept} className="px-3 py-1.5 rounded-full bg-pink-500">
          <Text className="text-white text-xs font-bold">Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
