import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, RefreshControl, Keyboard, Platform, LayoutAnimation, UIManager, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Shield, Heart, ChevronRight, Send, X, Image as ImageIcon, MoreHorizontal, Loader, Check, CheckCheck, Gift, Mic, Smile, Plus } from 'lucide-react-native';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '../../firebase/provider';
import { collection, query, where, orderBy, limit, doc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot, getDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter, useNavigation } from 'expo-router';
import { useUserProfile } from '../../hooks/use-user-profile';
import { PrivateChat, PrivateMessage, Proposal, CpPair } from '../../lib/types';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '../../lib/non-blocking-writes';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { FullProfileDialog } from '../../components/profile/FullProfileDialog';
import { toCDN } from '@/lib/cdn';

export default function MessagesScreen() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const navigation = useNavigation();

  const [showOfficial, setShowOfficial] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChatForOptions, setSelectedChatForOptions] = useState<PrivateChat | null>(null);
  const [profileDialogUid, setProfileDialogUid] = useState<string | null>(null);
  const { profile: dialogProfile } = useUserProfile(profileDialogUid || undefined);

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
      <FullProfileDialog open={!!profileDialogUid} onOpenChange={(open: boolean) => { if (!open) setProfileDialogUid(null); }} profile={dialogProfile} isOwnProfile={profileDialogUid === user?.uid} />
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

function ChatRoomScreen({ chatId, recipientUid, onBack, onAvatarPress }: { chatId: string; recipientUid: string; onBack: () => void; onAvatarPress?: (uid: string) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const navigation = useNavigation();
  const { profile: otherUser } = useUserProfile(recipientUid);
  const { profile: myProfile } = useUserProfile(user?.uid);
  
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
  
  const scrollViewRef = useRef<ScrollView>(null);
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
    return query(collection(firestore, 'privateChats', chatId, 'messages'), orderBy('timestamp', 'asc'), limit(100));
  }, [firestore, chatId]);

  const { data: messages } = useCollection<PrivateMessage>(messagesQuery);

  // Load block status and last seen preference
  useEffect(() => {
    if (!firestore || !user?.uid || !recipientUid) return;
    const myProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    const unsub = onSnapshot(myProfileRef, (snap: any) => {
      if (snap.exists) {
        const data = snap.data();
        const blocked: string[] = data?.blockedUsers || [];
        setIsBlocked(blocked.includes(recipientUid));
        setShowLastSeen(data?.showLastSeen !== false);
      }
    });
    return () => unsub();
  }, [firestore, user?.uid, recipientUid]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  useEffect(() => {
    if (firestore && user?.uid && chatRef) {
      updateDocumentNonBlocking(chatRef, {
        lastMessageReadBy: arrayUnion(user.uid),
      });
    }
  }, [messages?.length, firestore, user?.uid]);

  const handleSend = async (msgText?: string, imageUrl?: string) => {
    if (!firestore || !user?.uid || (!msgText?.trim() && !imageUrl)) return;

    const messagesRef = collection(firestore, 'privateChats', chatId, 'messages');
    const chatDocRef = doc(firestore, 'privateChats', chatId);

    await addDocumentNonBlocking(messagesRef, {
      text: msgText?.trim() || '',
      imageUrl: imageUrl || null,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    });

    await setDocumentNonBlocking(chatDocRef, {
      lastMessage: msgText?.trim() || (imageUrl ? '📷 Photo' : ''),
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

    if (!result.canceled && result.assets[0] && storage) {
      setIsUploading(true);
      try {
        const filename = `${Date.now()}_${result.assets[0].uri.split('/').pop()}`;
        const fileRef = storageRef(storage, `chats/${chatId}/${filename}`);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
        const downloadUrl = await getDownloadURL(fileRef);
        await handleSend(undefined, downloadUrl);
      } catch (error) {
        console.error('[Chat] Image upload error:', error);
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
        const Voice = require('@react-native-voice/voice').default;
        Voice.stop?.();
      } catch {}
      return;
    }
    try {
      const Voice = require('@react-native-voice/voice').default;
      Voice.onSpeechResults = (e: any) => {
        const transcript = e.value?.[0];
        if (transcript) handleSend(transcript);
        setIsRecording(false);
      };
      Voice.onSpeechError = () => setIsRecording(false);
      Voice.onSpeechEnd = () => setIsRecording(false);
      setIsRecording(true);
      await Voice.start('hi-IN');
    } catch {
      Alert.alert('Voice', 'Mic permission required');
      setIsRecording(false);
    }
  };

  const handleGiftPress = () => {
    Alert.alert(
      'Send Gift',
      'Choose a gift to send',
      [
        { text: '🌹 Flower', onPress: () => handleSend('🌹') },
        { text: '💎 Diamond', onPress: () => handleSend('💎') },
        { text: '🎂 Cake', onPress: () => handleSend('🎂') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
        {messages?.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          if (isMe && (msg as any).deletedBySender) return null;
          return (
            <TouchableOpacity 
              key={msg.id} 
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
              <View className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMe ? 'bg-cyan-500 rounded-br-none' : 'bg-slate-100 rounded-bl-none'
              }`}>
                {msg.imageUrl && (
                  <TouchableOpacity onPress={() => setPreviewImage(msg.imageUrl || null)}>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(msg.imageUrl) }} className="w-48 h-48 rounded-lg mb-1" contentFit="cover" />
                  </TouchableOpacity>
                )}
                {msg.text && (
                  <Text className={`text-sm ${isMe ? 'text-white' : 'text-slate-800'}`}>{msg.text}</Text>
                )}
                {(msg as any).edited && (
                  <Text className={`text-[9px] mt-0.5 ${isMe ? 'text-white/60' : 'text-slate-400'}`}>edited</Text>
                )}
              </View>
              {isMe && (
                <Image
                  cachePolicy="memory-disk"
                  source={{ uri: toCDN(myProfile?.avatarUrl) || 'https://picsum.photos/100' }}
                  style={{ width: 28, height: 28, borderRadius: 14, marginLeft: 6, marginTop: 2 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
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
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-800 max-h-24"
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
    </SafeAreaView>
    </View>
  );
}

function OfficialPage({ visible, onClose, messages }: { visible: boolean; onClose: () => void; messages: any[] }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Text className="text-lg font-bold text-slate-800">Ummy Team</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-4 py-2">
          {messages.length > 0 ? messages.map((msg: any, i: number) => (
            <View key={i} className="bg-blue-50 rounded-2xl p-4 mb-3">
              <Text className="text-sm text-slate-800">{msg.content || msg.text}</Text>
              <Text className="text-[10px] text-slate-400 mt-2">
                {msg.timestamp?.toDate?.()?.toLocaleString() || ''}
              </Text>
            </View>
          )) : (
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
      const senderProfileDoc = await getDoc(doc(firestore, 'users', proposal.fromUid, 'profile', proposal.fromUid));
      if (senderProfileDoc.exists()) {
        const sd = senderProfileDoc.data();
        senderName = sd?.username || sd?.displayName || 'User';
        senderAvatar = sd?.avatarUrl || '';
      } else {
        const senderDoc = await getDoc(doc(firestore, 'users', proposal.fromUid));
        if (senderDoc.exists()) {
          const sd = senderDoc.data();
          senderName = sd?.username || sd?.displayName || 'User';
          senderAvatar = sd?.avatarUrl || '';
        }
      }
    } catch {}
    
    try {
      const receiverProfileDoc = await getDoc(doc(firestore, 'users', user.uid, 'profile', user.uid));
      if (receiverProfileDoc.exists()) {
        const rd = receiverProfileDoc.data();
        receiverName = rd?.username || rd?.displayName || 'User';
        receiverAvatar = rd?.avatarUrl || '';
      } else {
        const receiverDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (receiverDoc.exists()) {
          const rd = receiverDoc.data();
          receiverName = rd?.username || rd?.displayName || 'User';
          receiverAvatar = rd?.avatarUrl || '';
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
