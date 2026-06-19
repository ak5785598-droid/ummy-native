import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Switch, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Music, Play, Upload, Search, Trash2, Power, Film, Cast } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const GAME_CONTROLLER = require('../../../assets/images/play-icons/game_controller.jpg');
const MUSIC_NOTES = require('../../../assets/images/play-icons/music_notes.jpg');

import { useFirestore, useUser, useStorage, useCollection, useMemoFirebase } from '../../firebase/provider';
import { doc, serverTimestamp, collection, query, orderBy, addDoc, deleteDoc, updateDoc, writeBatch, getDocs } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useRoomContext } from '../../context/room-context';
import { Room, RoomParticipant } from '../../lib/types';
import { useUserProfile } from '../../hooks/use-user-profile';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';

interface RoomPlaySheetProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  room?: Room | null;
  participants?: RoomParticipant[];
  onOpenGames?: () => void;
  onOpenYouTube?: () => void;
  onOpenEntertainment?: () => void;
  onOpenScreenMirror?: () => void;
}

export function RoomPlaySheet({ visible, onClose, roomId, room, participants, onOpenGames, onOpenYouTube, onOpenEntertainment, onOpenScreenMirror }: RoomPlaySheetProps) {
  const firestore = useFirestore();
  const firebaseStorage = useStorage();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const { isMusicEnabled, setIsMusicEnabled } = useRoomContext();

  const [view, setView] = useState<'grid' | 'music'>('grid');
  const [musicTab, setMusicTab] = useState<'online' | 'device'>('online');
  const [musicSearch, setMusicSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const isOwner = room?.ownerId === user?.uid;
  const isMod = room?.moderatorIds?.includes(user?.uid || '');
  const canManage = isOwner || isMod;
  const isChatMuted = room?.isChatMuted || false;

  const musicQuery = useMemoFirebase(() => {
    if (!firestore || !roomId) return null;
    return query(collection(firestore, 'chatRooms', roomId, 'music'), orderBy('createdAt', 'desc'));
  }, [firestore, roomId]);
  const { data: roomMusicLibrary } = useCollection(musicQuery);

  useEffect(() => {
    if (visible) setView('grid');
  }, [visible]);

  const handleClearChat = async () => {
    if (!firestore || !roomId || !user || !canManage) return;
    Alert.alert(
      'Clean Chat',
      'Are you sure you want to clear all messages in this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearingChat(true);
            try {
              const msgsRef = collection(firestore, 'chatRooms', roomId, 'messages');
              const snap = await getDocs(msgsRef);
              const batch = writeBatch(firestore);
              snap.docs.forEach((d: any) => batch.delete(d.ref));
              const sysRef = doc(msgsRef);
              const currentName = userProfile?.username || user.displayName || 'Admin';
              batch.set(sysRef, { content: `${currentName} cleared the chat`, type: 'system', timestamp: serverTimestamp() });
              batch.update(doc(firestore, 'chatRooms', roomId), { chatClearedAt: serverTimestamp(), updatedAt: serverTimestamp() });
              await batch.commit();
              Alert.alert('Success', 'Chat history cleared.');
              onClose();
            } catch (e: any) {
              Alert.alert('Error', 'Failed to clear chat.');
            } finally {
              setIsClearingChat(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleChatMute = async () => {
    if (!firestore || !roomId || !canManage) return;
    try {
      await updateDoc(doc(firestore, 'chatRooms', roomId), { isChatMuted: !isChatMuted, updatedAt: serverTimestamp() });
      Alert.alert(
        isChatMuted ? 'Messaging Restored' : 'Messaging Restricted',
        isChatMuted ? 'Tribe members can now send messages.' : 'Only authorities can broadcast.'
      );
      onClose();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update chat status.');
    }
  };

  const handleFileUpload = async () => {
    if (!firebaseStorage || !firestore || !roomId || !user) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      setIsUploading(true);
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const timestamp = Date.now();
      const filename = asset.name || `${timestamp}.mp3`;
      const path = `rooms/${roomId}/music/${timestamp}_${filename}`;
      const sRef = storageRef(firebaseStorage, path);
      await uploadBytes(sRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const url = await getDownloadURL(sRef);
      await addDoc(collection(firestore, 'chatRooms', roomId, 'music'), {
        name: filename,
        url,
        storagePath: path,
        type: 'upload',
        size: asset.size || blob.size,
        uploadedBy: user.uid,
        uploaderName: userProfile?.username || user.displayName || 'User',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', `${filename} added to room library.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSyncMusic = async (track: any) => {
    if (!firestore || !roomId || !user) return;
    try {
      await updateDoc(doc(firestore, 'chatRooms', roomId), {
        currentMusicUrl: track.url,
        currentMusicTitle: track.name || 'Unknown Song',
        currentMusicType: track.type || 'upload',
        currentMusicId: track.id,
        isMusicPlaying: true,
        musicStartedAt: serverTimestamp(),
        musicStartOffset: 0,
        musicUpdatedAt: serverTimestamp(),
        musicUpdatedBy: user?.uid,
        updatedAt: serverTimestamp(),
      });
      setIsMusicEnabled(true);
      Alert.alert('Broadcasting Track', `${track.name || 'Song'} is now playing for everyone.`);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTrack = async (track: any) => {
    if (!canManage || !firestore || !firebaseStorage || !roomId) return;
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (track.storagePath) {
                await deleteObject(storageRef(firebaseStorage, track.storagePath)).catch(() => {});
              }
              await deleteDoc(doc(firestore, 'chatRooms', roomId, 'music', track.id));
              Alert.alert('Deleted', 'Track removed from library.');
            } catch (e: any) {
              Alert.alert('Delete Failed', e.message);
            }
          }
        }
      ]
    );
  };

  const toggleOptions = [
    {
      id: 'clean',
      label: 'Clean',
      onPress: handleClearChat,
      iconUrl: 'https://img.icons8.com/clouds/100/trash.png',
      activeColor: '#06b6d4',
      showDot: false,
    },
    {
      id: 'public-msg',
      label: 'Public Msg',
      onPress: handleToggleChatMute,
      iconUrl: 'https://img.icons8.com/clouds/100/comments.png',
      activeColor: isChatMuted ? '#475569' : '#3b82f6',
      showDot: !isChatMuted,
      dotColor: '#22c55e',
    },
    {
      id: 'gift-effects',
      label: 'Gift Effects',
      onPress: () => Alert.alert('Premium Feature', 'Gift effects are always active for Sovereign members!'),
      iconUrl: 'https://img.icons8.com/clouds/100/lightning-bolt.png',
      activeColor: '#eab308',
      showDot: true,
      dotColor: '#eab308',
    },
  ];

  const featureItems = [
    {
      id: 'games',
      label: 'GAMES',
      icon: GAME_CONTROLLER,
      gradient: ['#22c55e', '#047857'],
      onPress: () => { onOpenGames?.(); onClose(); },
    },
    {
      id: 'music',
      label: 'MUSIC',
      icon: MUSIC_NOTES,
      gradient: ['#3b82f6', '#0891b2'],
      onPress: () => setView('music'),
    },
    {
      id: 'youtube',
      label: 'YOUTUBE',
      iconType: 'fontawesome',
      faName: 'youtube',
      gradient: ['#ef4444', '#b91c1c'],
      onPress: () => { onOpenYouTube?.(); onClose(); },
    },
    {
      id: 'movies',
      label: 'MOVIE',
      iconType: 'lucide',
      lucideIcon: Film,
      gradient: ['#a855f7', '#6d28d9'],
      onPress: () => { onOpenEntertainment?.(); onClose(); },
    },
    {
      id: 'screenmirror',
      label: 'SCREEN',
      iconType: 'lucide',
      lucideIcon: Cast,
      gradient: ['#3b82f6', '#1d4ed8'],
      onPress: () => { onOpenScreenMirror?.(); onClose(); },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: '#121212',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            width: '100%',
            height: view === 'grid' ? 280 : 600,
            maxHeight: '80%',
          }}
        >
          <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 8 }} />

          {view === 'grid' && (
            <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {/* Top Row: Quick Toggles (Glossy Circles) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 6, marginBottom: 4 }}>
                {toggleOptions.map(opt => (
                  <View key={opt.id} style={{ alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      onPress={opt.onPress}
                      activeOpacity={0.85}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        shadowColor: opt.activeColor,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <Image cachePolicy="memory-disk" source={{ uri: opt.iconUrl }}
                        style={{ width: 48, height: 48 }}
                        contentFit="cover"
                      />
                      {opt.showDot && (
                        <View style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: opt.dotColor || '#22c55e',
                          borderWidth: 1.5,
                          borderColor: '#121212',
                        }} />
                      )}
                    </TouchableOpacity>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{opt.label}</Text>
                  </View>
                ))}
              </View>

              {/* Feature Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, paddingHorizontal: 8, paddingBottom: 8 }}>
                {featureItems.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={f.onPress}
                    activeOpacity={0.85}
                    style={{ alignItems: 'center', gap: 6, width: '18%' }}
                  >
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.05)',
                      shadowColor: f.gradient[0],
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.6,
                      shadowRadius: 6,
                      elevation: 6,
                    }}>
                      <LinearGradient colors={f.gradient as [string, string]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.25)', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
                        {'iconType' in f && f.iconType === 'fontawesome' && 'faName' in f ? (
                          <FontAwesome5 name={f.faName} size={20} color="white" />
                        ) : 'iconType' in f && f.iconType === 'lucide' && f.lucideIcon ? (
                          <f.lucideIcon size={20} color="white" />
                        ) : (
                          <Image source={f.icon} style={{ width: 56, height: 56, marginTop: -6 }} contentFit="contain" />
                        )}
                      </LinearGradient>
                    </View>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {view === 'music' && (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <TouchableOpacity onPress={() => setView('grid')} style={{ padding: 4 }}>
                  <ChevronLeft size={22} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Music Sync</Text>
                <TouchableOpacity onPress={handleFileUpload} disabled={isUploading} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
                  <Upload size={12} color="black" />
                  <Text style={{ color: 'black', fontWeight: '700', fontSize: 10, textTransform: 'uppercase' }}>{isUploading ? '...' : 'Add +'}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 24, paddingVertical: 16, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ padding: 8, borderRadius: 12, backgroundColor: isMusicEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)' }}>
                      <Power size={18} color={isMusicEnabled ? '#4ade80' : 'rgba(255,255,255,0.4)'} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>Music Power</Text>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{isMusicEnabled ? 'Active' : 'Offline'}</Text>
                    </View>
                  </View>
                  <Switch
                    value={isMusicEnabled}
                    onValueChange={setIsMusicEnabled}
                    trackColor={{ false: '#374151', true: '#7c3aed' }}
                    thumbColor={isMusicEnabled ? '#a78bfa' : '#6b7280'}
                  />
                </View>

                <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                  <TouchableOpacity onPress={() => setMusicTab('online')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: musicTab === 'online' ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                    <Text style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: 10, color: musicTab === 'online' ? 'white' : 'rgba(255,255,255,0.4)' }}>Online Sync</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMusicTab('device')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: musicTab === 'device' ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                    <Text style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: 10, color: musicTab === 'device' ? 'white' : 'rgba(255,255,255,0.4)' }}>Room Library ({(roomMusicLibrary as any[])?.length || 0})</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {musicTab === 'online' ? (
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={musicSearch}
                        onChangeText={setMusicSearch}
                        placeholder="Search tribe vibes..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ flex: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingHorizontal: 16, color: 'white', fontSize: 14 }}
                      />
                      <TouchableOpacity style={{ height: 48, width: 48, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={18} color="white" />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>Search YouTube tracks</Text>
                  </View>
                ) : (
                  <View>
                    {(roomMusicLibrary as any[])?.length === 0 ? (
                      <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>No tracks in library</Text>
                    ) : (
                      (roomMusicLibrary as any[])?.map((track: any) => (
                        <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }} numberOfLines={1}>{track.name}</Text>
                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{track.uploaderName}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => handleSyncMusic(track)} style={{ height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                              <Play size={18} color="white" fill="white" />
                            </TouchableOpacity>
                            {canManage && (
                              <TouchableOpacity onPress={() => handleDeleteTrack(track)} style={{ height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
