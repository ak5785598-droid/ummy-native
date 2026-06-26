import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronLeft, ChevronRight, Camera, Mic, Shield, Palette, Lock, UserCheck, Tag, Sun, Sparkles, Volume2, MessageSquare, Loader, Crown, Trash2, Sparkle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '../../firebase/provider';
import { doc, serverTimestamp, arrayUnion, arrayRemove, collection, query, orderBy, updateDoc, deleteDoc, writeBatch } from '@/firebase/firestore-compat';
import rnfbStorage from '@react-native-firebase/storage';
import { Room, RoomParticipant } from '../../lib/types';
import { ROOM_THEMES } from '../../lib/themes';
import { useRoomContext } from '../../context/room-context';
import { useUserProfile } from '../../hooks/use-user-profile';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function PopupDialog({ visible, onClose, children }: { visible: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <TouchableOpacity 
        style={StyleSheet.absoluteFillObject} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        width: '90%',
        maxWidth: 360,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
      }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

export function RoomSettingsSheet({ visible, onClose, room, participants }: RoomSettingsSheetProps) {
  const firestore = useFirestore();
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
    if (!room?.id || isUploading) return;
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
      const reference = rnfbStorage().ref(`rooms/${room.id}/cover.jpg`);
      await reference.putFile(uri, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const url = await reference.getDownloadURL();
      await handleUpdate('coverUrl', url);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Failed to upload cover image.');
    }
    setIsUploading(false);
  };

  const handleGenerateTheme = async () => {
    if (!themePrompt.trim() || generatingTheme || !room?.id) return;
    setGeneratingTheme(true);
    try {
      const themeName = themePrompt.trim().slice(0, 30);
      
      const res = await fetch('https://api.ummylive.com/ai/theme-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: themePrompt.trim(), roomId: room.id }),
      });

      if (!res.ok) {
        Alert.alert('Error', 'Failed to generate theme from AI');
        setGeneratingTheme(false);
        return;
      }

      const data = await res.json();

      if (data.url && firestore) {
        await updateDoc(doc(firestore, 'chatRooms', room.id), {
          backgroundUrl: data.url,
          roomThemeId: data.themeId || `ai_${Date.now()}`,
          accentColor: data.accentColor || null,
          updatedAt: serverTimestamp(),
        });

        Alert.alert('Theme Generated', `"${themeName}" applied to your room!`);
        setShowThemeArchitect(false);
        setThemePrompt('');
      } else {
        Alert.alert('Error', 'API returned invalid data');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Failed to generate theme.');
    }
    setGeneratingTheme(false);
  };

  const goBack = () => {
    setNameEditOpen(false); setAnnouncementEditOpen(false); setPasswordEditOpen(false);
    setThemeEditOpen(false); setAdminEditOpen(false); setTagEditOpen(false); setMicEditOpen(false);
    setMicTestOpen(false);
  };

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#f8f9ff' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: (insets.top || 0) + 12,
          paddingBottom: 14,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
        }}>
          {themeEditOpen ? (
            <TouchableOpacity onPress={() => setThemeEditOpen(false)} style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' }}>
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose} style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' }}>
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          )}
          <Text style={{ color: '#111827', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
            {themeEditOpen ? 'Themes' : 'Settings'}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 20 }}>
            <X size={18} color="#7c3aed" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {themeEditOpen ? (
              <ThemePage room={room} themes={filteredThemes} onSelect={async (id: string) => { await handleUpdate('roomThemeId', id); setThemeEditOpen(false); }} onClose={() => setThemeEditOpen(false)} />
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
                onOpenThemeArchitect={() => setShowThemeArchitect(true)}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating overlays for sub-actions */}
        <PopupDialog visible={nameEditOpen} onClose={() => setNameEditOpen(false)}>
          <EditNamePage room={room} onSave={async (val: string) => { await handleUpdate('name', val); await handleUpdate('title', val); setNameEditOpen(false); }} onClose={() => setNameEditOpen(false)} />
        </PopupDialog>

        <PopupDialog visible={announcementEditOpen} onClose={() => setAnnouncementEditOpen(false)}>
          <EditAnnouncementPage room={room} onSave={async (val: string) => { await handleUpdate('announcement', val); setAnnouncementEditOpen(false); }} onClose={() => setAnnouncementEditOpen(false)} />
        </PopupDialog>

        <PopupDialog visible={passwordEditOpen} onClose={() => setPasswordEditOpen(false)}>
          <PasswordPage room={room} onSave={async (val: string | null) => { await handleUpdate('password', val || null); setPasswordEditOpen(false); }} onClose={() => setPasswordEditOpen(false)} />
        </PopupDialog>

        <PopupDialog visible={showThemeArchitect} onClose={() => setShowThemeArchitect(false)}>
          <ThemeArchitectPage prompt={themePrompt} onChange={setThemePrompt} onGenerate={handleGenerateTheme} generating={generatingTheme} onClose={() => { setShowThemeArchitect(false); setThemePrompt(''); }} />
        </PopupDialog>

        <PopupDialog visible={micEditOpen} onClose={() => setMicEditOpen(false)}>
          <MicCountPage room={room} onSelect={async (val: number) => { await handleUpdate('maxActiveMics', val); setMicEditOpen(false); }} onClose={() => setMicEditOpen(false)} />
        </PopupDialog>

        <PopupDialog visible={tagEditOpen} onClose={() => setTagEditOpen(false)}>
          <TagPage room={room} onSelect={async (tag: string) => { await handleUpdate('category', tag); setTagEditOpen(false); }} onClose={() => setTagEditOpen(false)} />
        </PopupDialog>

        <PopupDialog visible={micTestOpen} onClose={() => setMicTestOpen(false)}>
          <MicTestPage onClose={() => setMicTestOpen(false)} />
        </PopupDialog>

        <PopupDialog visible={adminEditOpen} onClose={() => setAdminEditOpen(false)}>
          <AdminPage room={room} participants={participants} onClose={() => setAdminEditOpen(false)} />
        </PopupDialog>


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
  onAvatarUpload, onOpenThemeArchitect,
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
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Edit Room Name</Text>
      <TextInput value={val} onChangeText={setVal} style={{ width: '100%', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, color: '#111827', fontSize: 17, fontWeight: 'bold', textAlign: 'center' }} placeholder="Room Name" placeholderTextColor="#94a3b8" autoFocus />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#6b7280', fontWeight: 'bold', fontSize: 14 }}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(val)} style={{ flex: 1, backgroundColor: '#9333ea', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Save</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function EditAnnouncementPage({ room, onSave, onClose }: any) {
  const [val, setVal] = useState(room?.announcement || '');
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Announcement</Text>
      <TextInput value={val} onChangeText={setVal} multiline numberOfLines={4} style={{ width: '100%', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, color: '#111827', fontSize: 14, fontWeight: '500', textAlignVertical: 'top', minHeight: 100 }} placeholder="Room announcement..." placeholderTextColor="#94a3b8" autoFocus />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#6b7280', fontWeight: 'bold', fontSize: 14 }}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(val)} style={{ flex: 1, backgroundColor: '#9333ea', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Save</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function PasswordPage({ room, onSave, onClose }: any) {
  const [val, setVal] = useState(room?.password || '');
  return (
    <View className="p-6 items-center">
      <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Privacy Code</Text>
      <TextInput value={val} onChangeText={(t) => setVal(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} secureTextEntry style={{ width: '100%', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, color: '#111827', fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: 8 }} placeholder="0000" placeholderTextColor="#94a3b8" autoFocus />
      <View className="flex-row gap-3 mt-6 w-full">
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#6b7280', fontWeight: 'bold', fontSize: 14 }}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(val)} style={{ flex: 1, backgroundColor: '#9333ea', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Save</Text></TouchableOpacity>
      </View>
      {room?.password && (
        <TouchableOpacity onPress={() => onSave('')} style={{ marginTop: 24, width: '100%', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14 }}>Remove Password</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ThemePage({ room, themes, onSelect, onClose }: any) {
  return (
    <View className="flex-row flex-wrap p-2 gap-3 justify-center">
      {themes.map((theme: any) => (
        <TouchableOpacity key={theme.id} onPress={() => onSelect(theme.id)} className="w-[45%]">
          <View className={`rounded-2xl overflow-hidden border-2 ${room?.roomThemeId === theme.id ? 'border-purple-500' : 'border-slate-200'}`}>
            <Image source={typeof theme.url === 'string' ? { uri: theme.url } : theme.url} className="w-full h-24" cachePolicy="memory-disk" />
          </View>
          <Text className={`text-xs font-bold mt-1.5 text-center ${room?.roomThemeId === theme.id ? 'text-purple-600' : 'text-slate-600'}`}>{theme.name}</Text>
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
    <View style={{ padding: 8 }}>
      {(participants || []).map((p: RoomParticipant) => (
        <View key={p.uid} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0' }} />
            <View>
              <Text style={{ color: '#111827', fontSize: 14, fontWeight: 'bold' }}>{p.name}</Text>
            </View>
          </View>
          {p.uid !== room?.ownerId && (
            <Switch
              value={room?.moderatorIds?.includes(p.uid) || false}
              onValueChange={() => handleToggleMod(p.uid)}
              trackColor={{ false: '#e2e8f0', true: '#9333ea' }}
              thumbColor={room?.moderatorIds?.includes(p.uid) ? '#c084fc' : '#9ca3af'}
            />
          )}
          {p.uid === room?.ownerId && (
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#d97706', textTransform: 'uppercase', letterSpacing: 1 }}>Owner</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function TagPage({ room, onSelect, onClose }: any) {
  return (
    <View style={{ padding: 8, gap: 12 }}>
      {CATEGORIES.map((tag) => (
        <TouchableOpacity key={tag} onPress={() => onSelect(tag)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: (room?.category || 'Chat') === tag ? '#9333ea' : '#e2e8f0', backgroundColor: (room?.category || 'Chat') === tag ? '#faf5ff' : '#f8fafc' }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: (room?.category || 'Chat') === tag ? '#9333ea' : '#6b7280' }}>{tag}</Text>
            <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Show in {tag} section</Text>
          </View>
          {(room?.category || 'Chat') === tag && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#9333ea', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'white', fontSize: 10 }}>✓</Text></View>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ThemeArchitectPage({ prompt, onChange, onGenerate, generating, onClose }: any) {
  return (
    <View style={{ padding: 12, alignItems: 'center' }}>
      <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>AI Theme Architect</Text>
      <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', marginBottom: 16 }}>Describe your dream room theme and AI will generate it</Text>
      <TextInput value={prompt} onChangeText={onChange} multiline numberOfLines={3} style={{ width: '100%', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, color: '#111827', fontSize: 14, fontWeight: '500', textAlignVertical: 'top', minHeight: 80 }} placeholder="e.g. Cyberpunk night city with neon lights..." placeholderTextColor="#94a3b8" autoFocus />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#6b7280', fontWeight: 'bold', fontSize: 14 }}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={onGenerate} disabled={generating || !prompt.trim()} style={{ flex: 1, backgroundColor: '#d97706', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: generating || !prompt.trim() ? 0.5 : 1 }}>
          {generating ? <ActivityIndicator size="small" color="white" /> : <Sparkle size={16} color="white" />}
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{generating ? 'Generating...' : 'Generate ✨'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MicCountPage({ room, onSelect, onClose }: any) {
  return (
    <View style={{ padding: 8, gap: 12 }}>
      {MIC_OPTIONS.map((opt) => (
        <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: (room?.maxActiveMics || 9) === opt.value ? '#9333ea' : '#e2e8f0', backgroundColor: (room?.maxActiveMics || 9) === opt.value ? '#faf5ff' : '#f8fafc' }}>
          <Text style={{ fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: (room?.maxActiveMics || 9) === opt.value ? '#9333ea' : '#6b7280' }}>{opt.label}</Text>
          {(room?.maxActiveMics || 9) === opt.value && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#9333ea', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'white', fontSize: 10 }}>✓</Text></View>}
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
    <View className="p-4 items-center">
      <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Microphone Test</Text>
      
      {permission === null ? (
        <ActivityIndicator color="#7c3aed" />
      ) : permission === false ? (
        <View className="items-center">
          <Text className="text-slate-600 text-sm text-center mb-6">Microphone permission is required to perform testing and speak in rooms.</Text>
          <TouchableOpacity onPress={requestPermission} className="bg-purple-600 rounded-2xl px-8 py-3.5"><Text className="text-white font-bold text-sm">Grant Permission</Text></TouchableOpacity>
        </View>
      ) : (
        <View className="items-center w-full">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-6 bg-purple-500/5 border border-purple-500/10">
            <Mic size={28} color={isTesting ? '#a78bfa' : '#6b7280'} />
          </View>
          <Text className="text-slate-600 text-xs text-center mb-6">
            {isTesting ? 'Recording... Say something to test your microphone levels!' : 'Click test to start checking your audio input Check.'}
          </Text>
          <TouchableOpacity onPress={toggleTest} className={`rounded-2xl px-10 py-3.5 w-full items-center ${isTesting ? 'bg-red-600' : 'bg-purple-600'}`}>
            <Text className="text-white font-bold text-sm">{isTesting ? 'Stop Test' : 'Start Test'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
