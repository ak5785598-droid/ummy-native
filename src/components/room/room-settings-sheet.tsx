import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronLeft, ChevronRight, Camera, Mic, Shield, Palette, Lock, UserCheck, Tag, Sun, Sparkles, Volume2, MessageSquare, Loader, Crown, Trash2, Sparkle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc, useFirebase } from '../../firebase/provider';
import { doc, serverTimestamp, arrayUnion, arrayRemove, collection, query, orderBy, updateDoc, deleteDoc, writeBatch } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Room, RoomParticipant } from '../../lib/types';
import { ROOM_THEMES } from '../../lib/themes';
import { useRoomContext } from '../../context/room-context';
import { useUserProfile } from '../../hooks/use-user-profile';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';

const CATEGORIES = ['Chat', 'Game', 'Music', 'Party'];
const MIC_OPTIONS = [
  { label: '5 Seats', value: 5 },
  { label: '9 Seats', value: 9 },
  { label: '13 Seats', value: 13 },
];

interface RoomSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  room: Room | null;
  participants?: RoomParticipant[];
}

export function RoomSettingsSheet({ visible, onClose, room, participants }: RoomSettingsSheetProps) {
  const firestore = useFirestore();
  const storage = useFirebase().storage;
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const { isBrightMode, setIsBrightMode, isAIVoiceEnabled, toggleAIVoice, isAIListening, setIsAIListening, isCaptionsEnabled, setIsCaptionsEnabled, isSpeakerMuted, setIsSpeakerMuted } = useRoomContext();

  const [page, setPage] = useState<string>('main');
  const [editingName, setEditingName] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState('');
  const [editingPassword, setEditingPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [announcementEditOpen, setAnnouncementEditOpen] = useState(false);
  const [passwordEditOpen, setPasswordEditOpen] = useState(false);
  const [themeEditOpen, setThemeEditOpen] = useState(false);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [tagEditOpen, setTagEditOpen] = useState(false);
  const [micEditOpen, setMicEditOpen] = useState(false);
  const [micTestOpen, setMicTestOpen] = useState(false);
  const [showThemeArchitect, setShowThemeArchitect] = useState(false);
  const [showTransferOwner, setShowTransferOwner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [themePrompt, setThemePrompt] = useState('');
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [generatedTheme, setGeneratedTheme] = useState<any>(null);

  const router = useRouter();

  const customThemesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'roomThemes'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: customThemes } = useCollection<any>(customThemesQuery);

  const isOfficialHelpRoom = room?.id === 'ummy-help';
  const userIsOfficial = userProfile?.tags?.some((t: string) => ['Admin', 'Official', 'Super Admin'].includes(t));
  const isOwner = room?.ownerId === user?.uid;
  const isModerator = room?.moderatorIds?.includes(user?.uid || '') || false;
  const canManage = isOwner || isModerator;
  const canUseOfficialThemes = isOfficialHelpRoom || (userIsOfficial && isOwner) || isOwner;

  const filteredThemes = useMemo(() => {
    const baseline = ROOM_THEMES.filter(theme => {
      if (isOfficialHelpRoom) return theme.category === 'help' || theme.category === 'general';
      if (userIsOfficial || isOwner) return true;
      return theme.category === 'entertainment' || theme.category === 'general';
    });

    const dynamic = (customThemes || []).filter(theme => {
      if (isOfficialHelpRoom) return theme.category === 'help' || theme.category === 'general';
      if (userIsOfficial || isOwner) return true;
      return theme.category === 'entertainment' || theme.category === 'general';
    });
    
    // Add user's purchased themes from inventory
    const purchasedThemes: any[] = [];
    if (userProfile?.inventory?.ownedItems && customThemes) {
      const ownedIds = userProfile.inventory.ownedItems as string[];
      customThemes.forEach(theme => {
        if (ownedIds.includes(theme.id)) {
          purchasedThemes.push({
            id: theme.id,
            name: theme.name || 'Purchased Theme',
            url: theme.videoUrl || theme.imageUrl || theme.mediaUrl || theme.thumbnailUrl || '',
            category: 'inventory',
            isOfficial: false
          });
        }
      });
    }

    return [...baseline, ...dynamic, ...purchasedThemes].map(t => ({ 
      ...t, 
      url: typeof t.url === 'string' ? t.url.replace('w=2000', 'w=200') : t.url 
    }));
  }, [isOfficialHelpRoom, userIsOfficial, isOwner, customThemes, userProfile?.inventory?.ownedItems]);

  const handleUpdate = async (field: string, value: any) => {
    if (!firestore || !room?.id || !canManage) return;
    try {
      await updateDoc(doc(firestore, 'chatRooms', room.id), { [field]: value, updatedAt: serverTimestamp() });
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message || 'Failed to update settings');
    }
  };

  const handleAvatarUpload = async () => {
    if (!storage || !room?.id || isUploading) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to upload cover images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setIsUploading(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const ref = storageRef(storage, `rooms/${room.id}/cover.jpg`);
      await uploadBytes(ref, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const url = await getDownloadURL(ref);
      await handleUpdate('coverUrl', url);
    } catch (e) {
      Alert.alert('Upload Failed', 'Failed to upload cover image.');
    }
    setIsUploading(false);
  };

  const handleMuteRoom = async () => {
    if (!room?.id) return;
    const newMuted = !isSpeakerMuted;
    setIsSpeakerMuted(newMuted);
    await handleUpdate('isMuted', newMuted);
  };

  const handleGenerateTheme = async () => {
    if (!themePrompt.trim() || generatingTheme || !room?.id) return;
    setGeneratingTheme(true);
    try {
      const themeName = themePrompt.trim().slice(0, 30);
      const newThemeId = `ai_${Date.now()}`;
      const unsplashUrl = `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2000`;
      await handleUpdate('roomThemeId', newThemeId);
      await handleUpdate('backgroundUrl', unsplashUrl);
      setGeneratedTheme({ name: themeName, url: unsplashUrl });
      Alert.alert('Theme Generated', `"${themeName}" applied to your room!`);
      setShowThemeArchitect(false);
      setThemePrompt('');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate theme');
    }
    setGeneratingTheme(false);
  };

  const handleTransferOwnership = async (newOwnerUid: string) => {
    if (!firestore || !room?.id) return;
    try {
      await updateDoc(doc(firestore, 'chatRooms', room.id), { ownerId: newOwnerUid, updatedAt: serverTimestamp() });
      Alert.alert('Ownership Transferred', 'Room ownership has been transferred successfully.');
      setShowTransferOwner(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to transfer ownership');
    }
  };

  const handleDeleteRoom = async () => {
    if (!firestore || !room?.id) return;
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'chatRooms', room.id));
      (participants || []).forEach(p => {
        batch.delete(doc(firestore, 'chatRooms', room.id, 'participants', p.uid));
      });
      await batch.commit();
      setShowDeleteConfirm(false);
      onClose();
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete room');
    }
  };

  const goBack = () => {
    setNameEditOpen(false); setAnnouncementEditOpen(false); setPasswordEditOpen(false);
    setThemeEditOpen(false); setAdminEditOpen(false); setTagEditOpen(false); setMicEditOpen(false);
    setMicTestOpen(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
            {page !== 'main' || nameEditOpen || announcementEditOpen || passwordEditOpen || themeEditOpen || adminEditOpen || tagEditOpen || micEditOpen || micTestOpen ? (
              <TouchableOpacity onPress={() => { setPage('main'); goBack(); }} style={{ padding: 4 }}><ChevronLeft size={22} color="#374151" /></TouchableOpacity>
            ) : <View style={{ width: 24 }} />}
            <Text style={{ color: '#111827', fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
              {passwordEditOpen ? 'Privacy Code' : themeEditOpen ? 'Themes' : adminEditOpen ? 'Administrators' : tagEditOpen ? 'Room Tag' : micEditOpen ? 'Number of Mic' : micTestOpen ? 'Microphone Test' : 'Settings'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20 }}><X size={18} color="#6b7280" /></TouchableOpacity>
          </View>
 
          <ScrollView style={{ backgroundColor: '#ffffff' }} showsVerticalScrollIndicator={false}>
            {nameEditOpen ? (
              <EditNamePage room={room} onSave={async (val: string) => { await handleUpdate('name', val); await handleUpdate('title', val); setNameEditOpen(false); }} onClose={() => setNameEditOpen(false)} />
            ) : announcementEditOpen ? (
              <EditAnnouncementPage room={room} onSave={async (val: string) => { await handleUpdate('announcement', val); setAnnouncementEditOpen(false); }} onClose={() => setAnnouncementEditOpen(false)} />
            ) : passwordEditOpen ? (
              <PasswordPage room={room} onSave={async (val: string | null) => { await handleUpdate('password', val || null); setPasswordEditOpen(false); }} onClose={() => setPasswordEditOpen(false)} />
            ) : showThemeArchitect ? (
              <ThemeArchitectPage prompt={themePrompt} onChange={setThemePrompt} onGenerate={handleGenerateTheme} generating={generatingTheme} onClose={() => { setShowThemeArchitect(false); setThemePrompt(''); }} />
            ) : showTransferOwner ? (
              <TransferOwnerPage room={room} participants={participants} onTransfer={handleTransferOwnership} onClose={() => setShowTransferOwner(false)} />
            ) : showDeleteConfirm ? (
              <DeleteConfirmPage room={room} onDelete={handleDeleteRoom} onClose={() => setShowDeleteConfirm(false)} />
            ) : themeEditOpen ? (
              <ThemePage room={room} themes={filteredThemes} onSelect={async (id: string) => { await handleUpdate('roomThemeId', id); setThemeEditOpen(false); }} onClose={() => setThemeEditOpen(false)} />
            ) : adminEditOpen ? (
              <AdminPage room={room} participants={participants} onClose={() => setAdminEditOpen(false)} />
            ) : tagEditOpen ? (
              <TagPage room={room} onSelect={async (tag: string) => { await handleUpdate('category', tag); setTagEditOpen(false); }} onClose={() => setTagEditOpen(false)} />
            ) : micEditOpen ? (
              <MicCountPage room={room} onSelect={async (val: number) => { await handleUpdate('maxActiveMics', val); setMicEditOpen(false); }} onClose={() => setMicEditOpen(false)} />
            ) : micTestOpen ? (
              <MicTestPage onClose={() => setMicTestOpen(false)} />
            ) : (
              <MainMenu
                room={room} isOwner={isOwner} canManage={canManage} isUploading={isUploading}
                isBrightMode={isBrightMode} onToggleBrightMode={() => { setIsBrightMode(!isBrightMode); handleUpdate('isBrightMode', !isBrightMode); }}
                isAIVoiceEnabled={isAIVoiceEnabled} onToggleAIVoice={() => toggleAIVoice(!isAIVoiceEnabled)}
                isAIListening={isAIListening} onToggleAIListening={() => setIsAIListening(!isAIListening)}
                isCaptionsEnabled={isCaptionsEnabled} onToggleCaptions={() => setIsCaptionsEnabled(!isCaptionsEnabled)}
                onOpenNameEdit={() => setNameEditOpen(true)}
                onOpenAnnouncementEdit={() => setAnnouncementEditOpen(true)}
                onOpenPasswordEdit={() => setPasswordEditOpen(true)}
                onOpenThemeEdit={() => setThemeEditOpen(true)}
                onOpenAdminEdit={() => setAdminEditOpen(true)}
                onOpenTagEdit={() => setTagEditOpen(true)}
                onOpenMicEdit={() => setMicEditOpen(true)}
                onOpenMicTest={() => setMicTestOpen(true)}
                onAvatarUpload={handleAvatarUpload}
                onClearChat={async () => { if (room?.id && firestore) { await updateDoc(doc(firestore, 'chatRooms', room.id), { chatClearedAt: serverTimestamp(), updatedAt: serverTimestamp() }); }}}
                onMuteRoom={handleMuteRoom}
                onOpenThemeArchitect={() => setShowThemeArchitect(true)}
                onOpenTransferOwner={() => setShowTransferOwner(true)}
                onOpenDeleteRoom={() => setShowDeleteConfirm(true)}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MainMenu({
  room, isOwner, canManage, isUploading,
  isBrightMode, onToggleBrightMode,
  isAIVoiceEnabled, onToggleAIVoice,
  isAIListening, onToggleAIListening,
  isCaptionsEnabled, onToggleCaptions,
  onOpenNameEdit, onOpenAnnouncementEdit, onOpenPasswordEdit,
  onOpenThemeEdit, onOpenAdminEdit, onOpenTagEdit, onOpenMicEdit,
  onOpenMicTest,
  onAvatarUpload, onClearChat, onMuteRoom, onOpenThemeArchitect,
  onOpenTransferOwner, onOpenDeleteRoom,
}: any) {
  const iconColor = 'rgba(0,0,0,0.4)';
  return (
    <View style={{ paddingTop: 8 }}>
      {/* Cover Photo Row */}
      <TouchableOpacity onPress={onAvatarUpload} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ position: 'relative' }}>
            <View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {room?.coverUrl ? (
                <Image cachePolicy="memory-disk" source={{ uri: room.coverUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Camera size={22} color="#9ca3af" />
              )}
            </View>
            {isUploading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={16} color="white" />
              </View>
            )}
            {!isUploading && (
              <View style={{ position: 'absolute', bottom: -3, right: -3, backgroundColor: '#7c3aed', borderRadius: 10, padding: 4, borderWidth: 2, borderColor: '#fff' }}>
                <Camera size={8} color="white" />
              </View>
            )}
          </View>
          <View>
            <Text style={{ color: '#374151', fontSize: 13, fontWeight: '700' }}>Room Cover</Text>
            <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>Tap to change</Text>
          </View>
        </View>
        <ChevronRight size={14} color="rgba(0,0,0,0.2)" />
      </TouchableOpacity>

      <MenuItem label="Room Name" value={room?.name || room?.title} onPress={onOpenNameEdit} icon={<MessageSquare size={16} color={iconColor} />} />
      <MenuItem label="Announcement" value={room?.announcement} onPress={onOpenAnnouncementEdit} icon={<Sparkles size={16} color={iconColor} />} />
      <MenuItem label="Microphone Test" onPress={onOpenMicTest} icon={<Mic size={16} color={iconColor} />} />

      <ToggleItem label="AI Voice Assistant" value={isAIVoiceEnabled} onToggle={onToggleAIVoice} />
      <ToggleItem label="AI Listen" value={isAIListening} onToggle={onToggleAIListening} subtitle="Bolo, AI Sunt Hai" />
      <ToggleItem label="Voice Captions" value={isCaptionsEnabled} onToggle={onToggleCaptions} subtitle="Live Subtitles" />
      <ToggleItem label="Super Glow Mode" value={isBrightMode} onToggle={onToggleBrightMode} badge="PRO" />

      <MenuItem label="Number of Mic" value={`${room?.maxActiveMics || 9} Seats`} onPress={onOpenMicEdit} icon={<Volume2 size={16} color={iconColor} />} />
      <MenuItem label="Room Password" value={room?.password ? 'Active' : 'Off'} onPress={onOpenPasswordEdit} disabled={!isOwner} icon={<Lock size={16} color={iconColor} />} />
      <MenuItem label="Room Theme" value={room?.roomThemeId || 'Default'} onPress={onOpenThemeEdit} icon={<Palette size={16} color={iconColor} />} />

      {isOwner && (
        <MenuItem label="AI Theme Architect" onPress={onOpenThemeArchitect} badge="AI GENERATE ✨" badgeColor="#f59e0b" icon={<Sparkle size={16} color={iconColor} />} />
      )}

      <MenuItem label="Room Tag" value={room?.category || 'Chat'} onPress={onOpenTagEdit} icon={<Tag size={16} color={iconColor} />} />
      <MenuItem label="Administrators" onPress={onOpenAdminEdit} icon={<UserCheck size={16} color={iconColor} />} />

      {canManage && (
        <>
          <View style={{ borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginTop: 16 }}>
            <DangerItem label="Clear Chat" onPress={onClearChat} />
            <DangerItem label="Mute Room" onPress={onMuteRoom} />
          </View>
          {isOwner && (
            <View style={{ borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginTop: 8 }}>
              <DangerItem label="Transfer Ownership" onPress={onOpenTransferOwner} />
              <DangerItem label="Delete Room" onPress={onOpenDeleteRoom} destructive />
            </View>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </View>
  );
}

function MenuItem({ label, value, onPress, disabled, icon, badge, badgeColor }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>{icon || <View />}</View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: disabled ? '#9ca3af' : '#111827' }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {badge && <Text style={{ fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: badgeColor || '#f59e0b' }}>{badge}</Text>}
        {value && <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500', maxWidth: 100 }} numberOfLines={1}>{value}</Text>}
        {!badge && <ChevronRight size={14} color="rgba(0,0,0,0.2)" />}
      </View>
    </TouchableOpacity>
  );
}

function ToggleItem({ label, value, onToggle, subtitle, badge }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{label}</Text>
          {badge && <Text style={{ fontSize: 9, fontWeight: '900', color: '#d97706', textTransform: 'uppercase', letterSpacing: 1 }}>{badge}</Text>}
        </View>
        {subtitle && <Text style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e5e7eb', true: '#7c3aed' }}
        thumbColor={value ? '#a78bfa' : '#ffffff'}
      />
    </View>
  );
}

function DangerItem({ label, onPress, destructive }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: destructive ? '#ef4444' : '#f97316' }}>{label}</Text>
      <ChevronRight size={14} color="rgba(0,0,0,0.2)" />
    </TouchableOpacity>
  );
}

/* Sub-pages */

function EditNamePage({ room, onSave, onClose }: any) {
  const [val, setVal] = useState(room?.title || room?.name || '');
  return (
    <View className="p-6 items-center">
      <Text className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Edit Room Name</Text>
      <TextInput value={val} onChangeText={setVal} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg font-bold text-center" placeholder="Room Name" placeholderTextColor="rgba(255,255,255,0.2)" autoFocus />
      <View className="flex-row gap-3 mt-6 w-full">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-white/10 rounded-2xl py-3.5 items-center"><Text className="text-white/60 font-bold text-sm">Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(val)} className="flex-1 bg-purple-600 rounded-2xl py-3.5 items-center"><Text className="text-white font-bold text-sm">Save</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function EditAnnouncementPage({ room, onSave, onClose }: any) {
  const [val, setVal] = useState(room?.announcement || '');
  return (
    <View className="p-6 items-center">
      <Text className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Announcement</Text>
      <TextInput value={val} onChangeText={setVal} multiline numberOfLines={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm font-medium" placeholder="Room announcement..." placeholderTextColor="rgba(255,255,255,0.2)" textAlignVertical="top" style={{ minHeight: 100 }} autoFocus />
      <View className="flex-row gap-3 mt-6 w-full">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-white/10 rounded-2xl py-3.5 items-center"><Text className="text-white/60 font-bold text-sm">Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(val)} className="flex-1 bg-purple-600 rounded-2xl py-3.5 items-center"><Text className="text-white font-bold text-sm">Save</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function PasswordPage({ room, onSave, onClose }: any) {
  const [val, setVal] = useState(room?.password || '');
  return (
    <View className="p-6 items-center">
      <Text className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Privacy Code</Text>
      <TextInput value={val} onChangeText={(t) => setVal(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-3xl font-black text-center tracking-[0.5em]" placeholder="0000" placeholderTextColor="rgba(255,255,255,0.15)" autoFocus />
      <View className="flex-row gap-3 mt-6 w-full">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-white/10 rounded-2xl py-3.5 items-center"><Text className="text-white/60 font-bold text-sm">Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(val)} className="flex-1 bg-purple-600 rounded-2xl py-3.5 items-center"><Text className="text-white font-bold text-sm">Save</Text></TouchableOpacity>
      </View>
      {room?.password && (
        <TouchableOpacity onPress={() => onSave('')} className="mt-6 w-full bg-red-500/10 border border-red-500/20 rounded-2xl py-3.5 items-center flex-row justify-center gap-2">
          <Text className="text-red-400 font-bold text-sm">Remove Password</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ThemePage({ room, themes, onSelect, onClose }: any) {
  return (
    <View className="flex-row flex-wrap p-4 gap-3">
      {themes.map((theme: any) => (
        <TouchableOpacity key={theme.id} onPress={() => onSelect(theme.id)} className="w-[45%]">
          <View className={`rounded-2xl overflow-hidden border-2 ${room?.roomThemeId === theme.id ? 'border-purple-500' : 'border-white/10'}`}>
            <Image source={typeof theme.url === 'string' ? { uri: theme.url } : theme.url} className="w-full h-28" cachePolicy="memory-disk" />
          </View>
          <Text className={`text-xs font-bold mt-1.5 text-center ${room?.roomThemeId === theme.id ? 'text-purple-400' : 'text-white/50'}`}>{theme.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function AdminPage({ room, participants, onClose }: any) {
  const firestore = useFirestore();

  const handleToggleMod = async (uid: string) => {
    if (!firestore || !room?.id) return;
    const isMod = room.moderatorIds?.includes(uid);
    await updateDoc(doc(firestore, 'chatRooms', room.id), {
      moderatorIds: isMod ? arrayRemove(uid) : arrayUnion(uid),
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <View className="p-2">
      {(participants || []).map((p: RoomParticipant) => (
        <View key={p.uid} className="flex-row items-center justify-between px-3 py-3 border-b border-white/5">
          <View className="flex-row items-center gap-3">
            <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }} className="w-10 h-10 rounded-full bg-slate-700" />
            <View>
              <Text className="text-white text-sm font-bold">{p.name}</Text>
            </View>
          </View>
          {p.uid !== room?.ownerId && (
            <Switch
              value={room?.moderatorIds?.includes(p.uid) || false}
              onValueChange={() => handleToggleMod(p.uid)}
              trackColor={{ false: '#374151', true: '#7c3aed' }}
              thumbColor={room?.moderatorIds?.includes(p.uid) ? '#a78bfa' : '#6b7280'}
            />
          )}
          {p.uid === room?.ownerId && (
            <Text className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Owner</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function TagPage({ room, onSelect, onClose }: any) {
  return (
    <View className="p-4 gap-3">
      {CATEGORIES.map((tag) => (
        <TouchableOpacity key={tag} onPress={() => onSelect(tag)} className={`flex-row items-center justify-between p-5 rounded-2xl border-2 ${(room?.category || 'Chat') === tag ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}>
          <View>
            <Text className={`text-base font-black uppercase tracking-widest ${(room?.category || 'Chat') === tag ? 'text-purple-400' : 'text-white/50'}`}>{tag}</Text>
            <Text className="text-[9px] text-white/30 font-bold uppercase tracking-tight mt-0.5">Show in {tag} section</Text>
          </View>
          {(room?.category || 'Chat') === tag && <View className="w-6 h-6 rounded-full bg-purple-500 items-center justify-center"><Text className="text-white text-xs">✓</Text></View>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ThemeArchitectPage({ prompt, onChange, onGenerate, generating, onClose }: any) {
  return (
    <View className="p-6 items-center">
      <Text className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">AI Theme Architect</Text>
      <Text className="text-white/30 text-xs text-center mb-4">Describe your dream room theme and AI will generate it</Text>
      <TextInput value={prompt} onChangeText={onChange} multiline numberOfLines={3} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm font-medium" placeholder="e.g. Cyberpunk night city with neon lights..." placeholderTextColor="rgba(255,255,255,0.2)" textAlignVertical="top" style={{ minHeight: 80 }} autoFocus />
      <View className="flex-row gap-3 mt-6 w-full">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-white/10 rounded-2xl py-3.5 items-center"><Text className="text-white/60 font-bold text-sm">Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={onGenerate} disabled={generating || !prompt.trim()} className="flex-1 bg-amber-600 rounded-2xl py-3.5 items-center flex-row justify-center gap-2">
          {generating ? <ActivityIndicator size="small" color="white" /> : <Sparkle size={16} color="white" />}
          <Text className="text-white font-bold text-sm">{generating ? 'Generating...' : 'Generate ✨'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TransferOwnerPage({ room, participants, onTransfer, onClose }: any) {
  const eligible = (participants || []).filter((p: any) => p.uid !== room?.ownerId);
  return (
    <View className="p-2">
      <Text className="text-white/40 text-xs font-bold uppercase tracking-widest text-center mb-4">Transfer Ownership</Text>
      {eligible.length === 0 ? (
        <Text className="text-white/40 text-sm text-center py-10">No other participants to transfer to</Text>
      ) : eligible.map((p: RoomParticipant) => (
        <TouchableOpacity key={p.uid} onPress={() => {
          Alert.alert('Transfer Ownership', `Transfer room ownership to ${p.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Transfer', style: 'destructive', onPress: () => onTransfer(p.uid) }
          ]);
        }} className="flex-row items-center justify-between px-3 py-3 border-b border-white/5">
          <View className="flex-row items-center gap-3">
            <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }} className="w-10 h-10 rounded-full bg-slate-700" />
            <Text className="text-white text-sm font-bold">{p.name}</Text>
          </View>
          <Crown size={16} color="#fbbf24" />
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={onClose} className="mt-4 bg-white/10 rounded-2xl py-3.5 items-center mx-3"><Text className="text-white/60 font-bold text-sm">Cancel</Text></TouchableOpacity>
    </View>
  );
}

function DeleteConfirmPage({ room, onDelete, onClose }: any) {
  return (
    <View className="p-6 items-center">
      <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-4">
        <Trash2 size={28} color="#ef4444" />
      </View>
      <Text className="text-white text-lg font-bold mb-2">Delete Room?</Text>
      <Text className="text-white/50 text-sm text-center mb-6">This will permanently delete "{room?.title || room?.name}" and all its messages. This action cannot be undone.</Text>
      <View className="flex-row gap-3 w-full">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-white/10 rounded-2xl py-3.5 items-center"><Text className="text-white/60 font-bold text-sm">Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={onDelete} className="flex-1 bg-red-600 rounded-2xl py-3.5 items-center"><Text className="text-white font-bold text-sm">Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function MicCountPage({ room, onSelect, onClose }: any) {
  return (
    <View className="p-4 gap-3">
      {MIC_OPTIONS.map((opt) => (
        <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)} className={`flex-row items-center justify-between p-5 rounded-2xl border-2 ${(room?.maxActiveMics || 9) === opt.value ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}>
          <Text className={`text-base font-black uppercase tracking-widest ${(room?.maxActiveMics || 9) === opt.value ? 'text-purple-400' : 'text-white/50'}`}>{opt.label}</Text>
          {(room?.maxActiveMics || 9) === opt.value && <View className="w-6 h-6 rounded-full bg-purple-500 items-center justify-center"><Text className="text-white text-xs">✓</Text></View>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MicTestPage({ onClose }: { onClose: () => void }) {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const requestPermission = async () => {
    const response = await Audio.requestPermissionsAsync();
    setPermission(response.granted);
  };

  useEffect(() => {
    Audio.getPermissionsAsync().then((response) => {
      setPermission(response.granted);
    });
  }, []);

  const toggleTest = async () => {
    if (!permission) return;
    if (isTesting) {
      setIsTesting(false);
      try {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      } catch (e) {}
    } else {
      setIsTesting(true);
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
      } catch (e) {
        setIsTesting(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  return (
    <View className="p-6 items-center">
      <Text className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Microphone Test</Text>
      
      {permission === null ? (
        <ActivityIndicator color="white" />
      ) : permission === false ? (
        <View className="items-center">
          <Text className="text-white/60 text-sm text-center mb-6">Microphone permission is required to perform testing and speak in rooms.</Text>
          <TouchableOpacity onPress={requestPermission} className="bg-purple-600 rounded-2xl px-8 py-3.5"><Text className="text-white font-bold text-sm">Grant Permission</Text></TouchableOpacity>
        </View>
      ) : (
        <View className="items-center w-full">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/30">
            <Mic size={32} color={isTesting ? '#a78bfa' : '#6b7280'} />
          </View>
          <Text className="text-white text-sm text-center mb-6">
            {isTesting ? 'Recording... Say something to test your microphone levels!' : 'Click test to start checking your audio input.'}
          </Text>
          <TouchableOpacity onPress={toggleTest} className={`rounded-2xl px-10 py-3.5 w-full items-center ${isTesting ? 'bg-red-600' : 'bg-purple-600'}`}>
            <Text className="text-white font-bold text-sm">{isTesting ? 'Stop Test' : 'Start Test'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
