import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Send, MessageCircle } from 'lucide-react-native';
import { useFirestore, useUser } from '../../firebase/provider';
import { collection, query, orderBy, limit, doc, addDoc, serverTimestamp, onSnapshot, where, setDoc, getDocs, getDoc } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Image } from 'expo-image';

interface RoomMessagesDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  initialRecipient?: { uid: string; name: string; avatarUrl: string } | null;
}

interface ChatPreview {
  id: string;
  participantIds: string[];
  otherUser: { uid: string; name: string; avatarUrl: string };
  lastMessage: string;
  lastSenderId: string;
  updatedAt: any;
  unread: number;
}

export function RoomMessagesDialog({ visible, onClose, roomId, initialRecipient }: RoomMessagesDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const userCacheRef = useRef<Record<string, { name: string; avatar: string }>>({});

  useEffect(() => {
    if (!firestore || !user?.uid || !visible) return;
    const chatsRef = collection(firestore, 'privateChats');
    const q = query(chatsRef, where('participantIds', 'array-contains', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const sortedDocs = [...snap.docs].sort((a, b) => {
        const ad = a.data();
        const bd = b.data();
        return (bd.updatedAt?.toMillis?.() || 0) - (ad.updatedAt?.toMillis?.() || 0);
      });
      const otherUids = new Set<string>();
      sortedDocs.forEach((docSnap) => {
        const data = docSnap.data();
        const otherUid = data.participantIds?.find((id: string) => id !== user.uid);
        if (otherUid) otherUids.add(otherUid);
      });
      const userCache = userCacheRef.current;
      const uncachedUids = [...otherUids].filter(uid => !userCache[uid]);
      if (uncachedUids.length > 0) {
        await Promise.all(uncachedUids.map(async (uid) => {
          try {
            const otherDoc = await getDoc(doc(firestore, 'users', uid));
            if (otherDoc.exists) {
              const od = otherDoc.data();
              userCache[uid] = { name: od.username || od.name || 'User', avatar: od.avatarUrl || 'https://picsum.photos/100' };
            } else {
              userCache[uid] = { name: 'User', avatar: 'https://picsum.photos/100' };
            }
          } catch {
            userCache[uid] = { name: 'User', avatar: 'https://picsum.photos/100' };
          }
        }));
      }
      const list: ChatPreview[] = [];
      for (const docSnap of sortedDocs) {
        const data = docSnap.data();
        const otherUid = data.participantIds?.find((id: string) => id !== user.uid);
        if (!otherUid) continue;
        const cached = userCache[otherUid] || { name: 'User', avatar: 'https://picsum.photos/100' };
        list.push({
          id: docSnap.id,
          participantIds: data.participantIds || [],
          otherUser: { uid: otherUid, name: cached.name, avatarUrl: cached.avatar },
          lastMessage: data.lastMessage || '',
          lastSenderId: data.lastSenderId || '',
          updatedAt: data.updatedAt,
          unread: data.unread?.[user.uid] || 0,
        });
      }
      setChats(list);
    });
    return () => unsub();
  }, [firestore, user?.uid, visible]);

  useEffect(() => {
    if (!selectedChat || !firestore || !user?.uid) return;
    const msgRef = collection(firestore, 'privateChats', selectedChat.id, 'messages');
    const q = query(msgRef, orderBy('timestamp', 'asc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedChat, firestore, user?.uid]);

  useEffect(() => {
    if (!initialRecipient || !firestore || !user?.uid) return;
    const participantIds = [user.uid, initialRecipient.uid].sort();
    const chatId = participantIds.join('_');
    const existing = chats.find(c => c.id === chatId);
    if (existing) setSelectedChat(existing);
    else {
      setSelectedChat({
        id: chatId,
        participantIds,
        otherUser: initialRecipient,
        lastMessage: '',
        lastSenderId: '',
        updatedAt: null,
        unread: 0,
      });
    }
  }, [initialRecipient, chats]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages]);

  const handleSend = async () => {
    if (!firestore || !user?.uid || !userProfile || !inputText.trim() || !selectedChat) return;
    try {
      const chatId = selectedChat.id;
      const otherUid = selectedChat.otherUser.uid;
      const participantIds = [user.uid, otherUid].sort();
      const msgRef = collection(firestore, 'privateChats', chatId, 'messages');
      
      const messageData = {
        text: inputText.trim(),
        senderId: user.uid,
        senderBubble: userProfile?.inventory?.activeBubble || null,
        timestamp: serverTimestamp()
      };
      
      await addDoc(msgRef, messageData);
      
      const chatUpdateData = {
        id: chatId,
        participantIds,
        lastMessage: inputText.trim(),
        lastSenderId: user.uid,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(firestore, 'privateChats', chatId), chatUpdateData, { merge: true });
      setInputText('');
    } catch (e) { console.error('[Messages] Send error:', e); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] h-[85%]">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2"><MessageCircle size={16} color="rgba(255,255,255,0.6)" /><Text className="text-white text-base font-bold">{selectedChat ? selectedChat.otherUser.name : 'Messages'}</Text></View>
            {selectedChat ? <TouchableOpacity onPress={() => setSelectedChat(null)}><Text className="text-cyan-400 text-xs font-bold">Back</Text></TouchableOpacity> : <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>}
          </View>
          {!selectedChat ? (
            <ScrollView className="px-4 pt-2" showsVerticalScrollIndicator={false}>
              {chats.length === 0 ? <Text className="text-white/40 text-sm text-center py-20">No messages yet</Text> : chats.map(chat => (
                <TouchableOpacity key={chat.id} onPress={() => setSelectedChat(chat)} className="flex-row items-center py-3 border-b border-white/5">
                  <Image cachePolicy="memory-disk" source={{ uri: chat.otherUser.avatarUrl }} className="w-11 h-11 rounded-full bg-slate-700" />
                  <View className="ml-3 flex-1"><Text className="text-white text-sm font-bold">{chat.otherUser.name}</Text><Text className="text-white/40 text-[11px]" numberOfLines={1}>{chat.lastSenderId === user?.uid ? 'You: ' : ''}{chat.lastMessage}</Text></View>
                  {chat.unread > 0 && <View className="bg-red-500 rounded-full px-1.5 py-0.5"><Text className="text-white text-[9px] font-bold">{chat.unread}</Text></View>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
              <ScrollView ref={scrollRef} className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
                {messages.map(msg => (
                  <View key={msg.id} className={`mb-2 ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                    <View className={`rounded-2xl px-3 py-2 max-w-[80%] ${msg.senderId === user?.uid ? 'bg-purple-600' : 'bg-white/10'}`}>
                      <Text className="text-white text-sm">{msg.text}</Text>
                    </View>
                    <Text className="text-white/20 text-[8px] mt-0.5">{msg.timestamp?.toDate?.()?.toLocaleTimeString?.() || ''}</Text>
                  </View>
                ))}
              </ScrollView>
              <View className="flex-row items-center gap-2 px-4 py-3 border-t border-white/10">
                <TextInput value={inputText} onChangeText={setInputText} placeholder="Type a message..." placeholderTextColor="rgba(255,255,255,0.3)" className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-white text-sm" />
                <TouchableOpacity onPress={handleSend} disabled={!inputText.trim()} className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center"><Send size={16} color="white" /></TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  );
}
