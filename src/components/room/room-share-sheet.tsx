import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { X, Copy, Share2, Check, Search, Send } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useUser, useFirestore } from '../../firebase/provider';
import { collection, doc, setDoc, addDoc, getDocs, onSnapshot, query, where, serverTimestamp, getDoc } from '@/firebase/firestore-compat';
import { toCDN } from '../../lib/cdn';

interface RoomShareSheetProps {
  visible: boolean;
  onClose: () => void;
  room: {
    id: string;
    name?: string;
    title?: string;
    roomNumber: string;
    coverUrl?: string;
  } | null;
  onShare?: () => void;
}

interface Contact {
  id: string;
  username: string;
  avatarUrl?: string;
}

export function RoomShareSheet({ visible, onClose, room, onShare }: RoomShareSheetProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});

  const roomUrl = room ? `https://ummy-chat.vercel.app/rooms/${room.id}` : '';

  // Load followers & following as contacts from root 'followers' collection
  useEffect(() => {
    if (!visible || !user?.uid || !firestore) return;

    let cancelled = false;
    setLoadingContacts(true);

    (async () => {
      try {
        // Root followers collection: { followerId, followingId, timestamp }
        const followersQuery = query(collection(firestore, 'followers'), where('followingId', '==', user.uid));
        const followingQuery = query(collection(firestore, 'followers'), where('followerId', '==', user.uid));

        const [followersSnap, followingSnap] = await Promise.all([
          getDocs(followersQuery),
          getDocs(followingQuery),
        ]);

        // Extract unique UIDs (followers = people who follow me, following = people I follow)
        const uidSet = new Set<string>();
        followersSnap.docs.forEach((d) => {
          const fid = d.data().followerId;
          if (fid && fid !== user.uid) uidSet.add(fid);
        });
        followingSnap.docs.forEach((d) => {
          const fid = d.data().followingId;
          if (fid && fid !== user.uid) uidSet.add(fid);
        });

        // Fetch each user's profile in parallel (batch of 10)
        const uids = Array.from(uidSet);
        const contactList: Contact[] = [];

        for (let i = 0; i < uids.length; i += 10) {
          const batch = uids.slice(i, i + 10);
          const profiles = await Promise.all(
            batch.map(async (uid) => {
              try {
                const userDoc = await getDoc(doc(firestore, 'users', uid));
                const userData = userDoc.exists() ? userDoc.data() : {};
                const username = userData.username || 'User';
                const avatarUrl = userData.avatarUrl || null;
                return { id: uid, username, avatarUrl } as Contact;
              } catch {
                return { id: uid, username: 'User', avatarUrl: null } as Contact;
              }
            })
          );
          contactList.push(...profiles);
        }

        if (!cancelled) {
          setContacts(contactList);
          setLoadingContacts(false);
        }
      } catch (err) {
        console.log('[ShareSheet Load Error]', err);
        if (!cancelled) setLoadingContacts(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, user?.uid, firestore]);

  const handleCopyId = async () => {
    if (!room) return;
    try {
      await Clipboard.setStringAsync(room.roomNumber || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(roomUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {}
  };

  const handleSendToUser = async (contact: Contact) => {
    if (!user?.uid || !firestore || !room) return;

    setSendingStatus((prev) => ({ ...prev, [contact.id]: 'sending' }));

    try {
      const chatId = [user.uid, contact.id].sort().join('_');
      const messagesRef = collection(firestore, 'privateChats', chatId, 'messages');
      const chatDocRef = doc(firestore, 'privateChats', chatId);

      const inviteText = `Hey, join my room! 🎙️\nRoom ID: #${room.roomNumber}\nLink: ${roomUrl}`;

      // 1. Send the invite message with room metadata
      await addDoc(messagesRef, {
        text: inviteText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        type: 'room_invite',
        roomId: room.id,
        roomName: room.name || room.title || 'Room',
        roomNumber: room.roomNumber,
        roomCoverUrl: room.coverUrl || null,
      });

      // 2. Update the parent chat room preview
      await setDoc(
        chatDocRef,
        {
          participantIds: [user.uid, contact.id].sort(),
          lastMessage: `🎙️ Room Invite #${room.roomNumber}`,
          lastSenderId: user.uid,
          lastMessageReadBy: [user.uid],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSendingStatus((prev) => ({ ...prev, [contact.id]: 'sent' }));
      onShare?.();
    } catch (e: any) {
      console.error('[Send Invite Error]', e);
      Alert.alert('Error', 'Failed to send room invite.');
      setSendingStatus((prev) => ({ ...prev, [contact.id]: 'idle' }));
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    return contacts.filter((c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  if (!room) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View 
          style={{ 
            backgroundColor: '#0f172a', // Slate-900 
            borderTopLeftRadius: 32, 
            borderTopRightRadius: 32, 
            height: '75%', 
            paddingBottom: 24 
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Share2 size={18} color="#60a5fa" />
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Share Room</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
              <X size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', margin: 16, borderRadius: 14, paddingHorizontal: 12, height: 44 }}>
            <Search size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search Friends / Followers..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' }}
            />
          </View>

          {/* Contacts List */}
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            {loadingContacts ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#60a5fa" />
              </View>
            ) : filteredContacts.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>No friends or followers found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const status = sendingStatus[item.id] || 'idle';
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 12, overflow: 'hidden' }}>
                        {item.avatarUrl ? (
                          <Image cachePolicy="memory-disk" source={{ uri: toCDN(item.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#38bdf8' }}>
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{item.username?.[0]?.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' }}>{item.username}</Text>
                      
                      <TouchableOpacity
                        onPress={() => handleSendToUser(item)}
                        disabled={status !== 'idle'}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                          borderRadius: 12,
                          backgroundColor: status === 'sent' ? 'rgba(255,255,255,0.05)' : status === 'sending' ? 'rgba(96,165,250,0.2)' : '#60a5fa',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {status === 'sending' ? (
                          <ActivityIndicator size="small" color="#60a5fa" />
                        ) : status === 'sent' ? (
                          <>
                            <Check size={12} color="rgba(255,255,255,0.4)" />
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800' }}>SENT</Text>
                          </>
                        ) : (
                          <>
                            <Send size={11} color="#0f172a" />
                            <Text style={{ color: '#0f172a', fontSize: 11, fontWeight: '800' }}>SEND</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>

          {/* Fallback Copy Options */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
            <TouchableOpacity
              onPress={handleCopyId}
              style={{
                flex: 1,
                height: 44,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6
              }}
            >
              {copied ? <Check size={14} color="#60a5fa" /> : <Copy size={14} color="rgba(255,255,255,0.6)" />}
              <Text style={{ color: copied ? '#60a5fa' : '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                {copied ? 'Copied ID' : 'Copy ID'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCopyLink}
              style={{
                flex: 1,
                height: 44,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6
              }}
            >
              {copiedLink ? <Check size={14} color="#60a5fa" /> : <Copy size={14} color="rgba(255,255,255,0.6)" />}
              <Text style={{ color: copiedLink ? '#60a5fa' : '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                {copiedLink ? 'Copied Link' : 'Copy Link'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
