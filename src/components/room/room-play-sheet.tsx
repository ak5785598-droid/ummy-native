import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Switch, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Music, Play, Upload, Search, Trash2, Power } from 'lucide-react-native';


const GAME_CONTROLLER = require('../../../assets/images/play-icons/game_controller.jpg');
const ICON_GAMES = require('../../../assets/images/play-icons/icon_games.jpg');
const ICON_MUSIC = require('../../../assets/images/play-icons/music_notes.jpg');
const ICON_CLEAN = require('../../../assets/images/play-icons/icon_clean.png');
const ICON_PUBLIC_MSG = require('../../../assets/images/play-icons/icon_public_msg.png');
const ICON_GIFT_EFFECTS = require('../../../assets/images/play-icons/icon_gift_effects.png');
const ICON_YOUTUBE = require('../../../assets/images/play-icons/icon_youtube.png');
const ICON_NETMIRROR = require('../../../assets/images/play-icons/icon_netmirror.jpg');
const ICON_MOVIE = require('../../../assets/images/play-icons/icon_movie.png');
const ICON_SCREEN = require('../../../assets/images/play-icons/icon_screen.png');

import { useFirestore, useUser, useCollection, useMemoFirebase } from '../../firebase/provider';
import { doc, serverTimestamp, collection, query, orderBy, addDoc, deleteDoc, updateDoc, writeBatch, getDocs } from '@/firebase/firestore-compat';
import rnfbStorage from '@react-native-firebase/storage';
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
  onOpenNetMirror?: () => void;
  onOpenEntertainment?: () => void;
  onOpenScreenMirror?: () => void;
}

export function RoomPlaySheet({ visible, onClose, roomId, room, participants, onOpenGames, onOpenYouTube, onOpenNetMirror, onOpenEntertainment, onOpenScreenMirror }: RoomPlaySheetProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const { isMusicEnabled, setIsMusicEnabled, isGiftEffects, setIsGiftEffects } = useRoomContext();

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
    if (!firestore || !roomId || !user) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      setIsUploading(true);
      const asset = result.assets[0];
      const timestamp = Date.now();
      const filename = asset.name || `${timestamp}.mp3`;
      const path = `rooms/${roomId}/music/${timestamp}_${filename}`;
      const reference = rnfbStorage().ref(path);
      await reference.putFile(asset.uri, { contentType: asset.mimeType || 'audio/mpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const url = await reference.getDownloadURL();
      await addDoc(collection(firestore, 'chatRooms', roomId, 'music'), {
        name: filename,
        url,
        storagePath: path,
        type: 'upload',
        size: asset.size || 0,
        uploadedBy: user.uid,
        uploaderName: userProfile?.username || user.displayName || 'User',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', `${filename} added to room library.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Upload failed');
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
    if (!canManage || !firestore || !roomId) return;
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
                await rnfbStorage().ref(track.storagePath).delete().catch(() => {});
              }
              await deleteDoc(doc(firestore, 'chatRooms', roomId, 'music', track.id));
              Alert.alert('Deleted', 'Track removed from library.');
            } catch (e: any) {
              Alert.alert('Delete Failed', e?.message || 'Delete failed');
            }
          }
        }
      ]
    );
  };

  const toggleOptions = canManage ? [
    {
      id: 'clean',
      label: 'Clean',
      onPress: handleClearChat,
      icon: ICON_CLEAN,
      activeColor: '#06b6d4',
      bgColor: '#e0f7fa',
      showDot: false,
    },
    {
      id: 'public-msg',
      label: 'Public Msg',
      onPress: handleToggleChatMute,
      icon: ICON_PUBLIC_MSG,
      activeColor: isChatMuted ? '#475569' : '#3b82f6',
      bgColor: '#eff6ff',
      showDot: !isChatMuted,
      dotColor: '#22c55e',
    },
    {
      id: 'gift-effects',
      label: 'Gift Effects',
      onPress: () => setIsGiftEffects(!isGiftEffects),
      icon: ICON_GIFT_EFFECTS,
      activeColor: isGiftEffects ? '#eab308' : '#475569',
      bgColor: '#fefce8',
      showDot: isGiftEffects,
      dotColor: '#eab308',
    },
  ] : [];

  const featureItems = (canManage ? [
    {
      id: 'games',
      label: 'GAMES',
      icon: ICON_GAMES,
      gradient: ['#22c55e', '#047857'],
      onPress: () => { onOpenGames?.(); onClose(); },
    },
    {
      id: 'music',
      label: 'MUSIC',
      icon: ICON_MUSIC,
      gradient: ['#00ACC1', '#006064'],
      onPress: () => setView('music'),
    },
    {
      id: 'youtube',
      label: 'YOUTUBE',
      icon: ICON_YOUTUBE,
      gradient: ['#ef4444', '#b91c1c'],
      onPress: () => { onOpenYouTube?.(); onClose(); },
    },
    {
      id: 'netmirror',
      label: 'MOVIE HUB 1',
      icon: ICON_NETMIRROR,
      gradient: ['#22c55e', '#047857'],
      onPress: () => { onOpenNetMirror?.(); onClose(); },
    },
    {
      id: 'movies',
      label: 'MOVIE HUB 2',
      icon: ICON_MOVIE,
      gradient: ['#a855f7', '#6d28d9'],
      onPress: () => { onOpenEntertainment?.(); onClose(); },
    },
    {
      id: 'screenmirror',
      label: 'SCREEN',
      icon: ICON_SCREEN,
      gradient: ['#3b82f6', '#1d4ed8'],
      onPress: () => { onOpenScreenMirror?.(); onClose(); },
    },
  ] : [
    {
      id: 'games',
      label: 'GAMES',
      icon: ICON_GAMES,
      gradient: ['#22c55e', '#047857'],
      onPress: () => { onOpenGames?.(); onClose(); },
    },
    {
      id: 'youtube',
      label: 'YOUTUBE',
      icon: ICON_YOUTUBE,
      gradient: ['#ef4444', '#b91c1c'],
      onPress: () => { onOpenYouTube?.(); onClose(); },
    },
    {
      id: 'netmirror',
      label: 'MOVIE HUB 1',
      icon: ICON_NETMIRROR,
      gradient: ['#22c55e', '#047857'],
      onPress: () => { onOpenNetMirror?.(); onClose(); },
    },
    {
      id: 'movies',
      label: 'MOVIE HUB 2',
      icon: ICON_MOVIE,
      gradient: ['#a855f7', '#6d28d9'],
      onPress: () => { onOpenEntertainment?.(); onClose(); },
    },
    {
      id: 'screenmirror',
      label: 'SCREEN',
      icon: ICON_SCREEN,
      gradient: ['#3b82f6', '#1d4ed8'],
      onPress: () => { onOpenScreenMirror?.(); onClose(); },
    },
  ]);

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
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            width: '100%',
            height: view === 'grid' ? 280 : 600,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <View style={{ width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 8 }} />

          {view === 'grid' && (
            <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {/* Top Row: Quick Toggles (Glossy Circles) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 6, marginBottom: 4 }}>
                {toggleOptions.map(opt => (
                  <View key={opt.id} style={{ alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      onPress={opt.onPress}
                      activeOpacity={0.8}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        overflow: 'hidden',
                        borderWidth: 1.5,
                        borderColor: 'rgba(0,0,0,0.06)',
                        shadowColor: opt.activeColor,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.22,
                        shadowRadius: 6,
                        elevation: 4,
                        backgroundColor: opt.bgColor || '#f0f0f0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={opt.icon}
                        style={{ width: 46, height: 46 }}
                        contentFit="contain"
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
                          borderColor: '#ffffff',
                        }} />
                      )}
                    </TouchableOpacity>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{opt.label}</Text>
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
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.08)',
                      shadowColor: f.gradient[0],
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      elevation: 6,
                    }}>
                      <Image
                        source={f.icon}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {view === 'music' && (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' }}>
                <TouchableOpacity onPress={() => setView('grid')} style={{ padding: 4 }}>
                  <ChevronLeft size={22} color="rgba(0,0,0,0.5)" />
                </TouchableOpacity>
                <Text style={{ color: '#111827', fontSize: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Music Sync</Text>
                <TouchableOpacity onPress={handleFileUpload} disabled={isUploading} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
                  <Upload size={12} color="black" />
                  <Text style={{ color: 'black', fontWeight: '700', fontSize: 10, textTransform: 'uppercase' }}>{isUploading ? '...' : 'Add +'}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 24, paddingVertical: 16, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.04)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ padding: 8, borderRadius: 12, backgroundColor: isMusicEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)' }}>
                      <Power size={18} color={isMusicEnabled ? '#4ade80' : 'rgba(255,255,255,0.4)'} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>Music Power</Text>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{isMusicEnabled ? 'Active' : 'Offline'}</Text>
                    </View>
                  </View>
                  <Switch
                    value={isMusicEnabled}
                    onValueChange={setIsMusicEnabled}
                    trackColor={{ false: '#374151', true: '#7c3aed' }}
                    thumbColor={isMusicEnabled ? '#a78bfa' : '#6b7280'}
                  />
                </View>

                <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
                  <TouchableOpacity onPress={() => setMusicTab('online')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: musicTab === 'online' ? 'white' : 'transparent' }}>
                    <Text style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: 10, color: musicTab === 'online' ? '#111827' : 'rgba(0,0,0,0.4)' }}>Online Sync</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMusicTab('device')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: musicTab === 'device' ? 'white' : 'transparent' }}>
                    <Text style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: 10, color: musicTab === 'device' ? '#111827' : 'rgba(0,0,0,0.4)' }}>Room Library ({(roomMusicLibrary as any[])?.length || 0})</Text>
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
                        placeholderTextColor="rgba(0,0,0,0.3)"
                        style={{ flex: 1, height: 48, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', borderRadius: 16, paddingHorizontal: 16, color: '#111827', fontSize: 14 }}
                      />
                      <TouchableOpacity style={{ height: 48, width: 48, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={18} color="white" />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: 'rgba(0,0,0,0.4)', textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>Search YouTube tracks</Text>
                  </View>
                ) : (
                  <View>
                    {(roomMusicLibrary as any[])?.length === 0 ? (
                      <Text style={{ color: 'rgba(0,0,0,0.4)', textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>No tracks in library</Text>
                    ) : (
                      (roomMusicLibrary as any[])?.map((track: any) => (
                        <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }} numberOfLines={1}>{track.name}</Text>
                            <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{track.uploaderName}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => handleSyncMusic(track)} style={{ height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.07)' }}>
                              <Play size={18} color="#111827" fill="#111827" />
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
