import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { X, Star, Users, MessageSquare, Gamepad2, Music, PartyPopper, MoreVertical, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useUserLevel } from '../../hooks/use-user-level';
import { UserLevelBadge } from '@/components/user-level-badge';
import { useFirestore } from '../../firebase/provider';
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, getDocs } from '@/firebase/firestore-compat';
import { Room } from '../../lib/types';
import { Alert } from 'react-native';
import { Image } from 'expo-image';

interface RoomInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  room: Room | null;
  isOwner?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUserPress?: (uid: string) => void;
}

const CATEGORY_TAGS: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  Chat: { icon: MessageSquare, color: '#3b82f6', bg: '#eff6ff', label: 'Chat' },
  Game: { icon: Gamepad2, color: '#a855f7', bg: '#faf5ff', label: 'Game' },
  Music: { icon: Music, color: '#ec4899', bg: '#fdf2f8', label: 'Music' },
  Party: { icon: PartyPopper, color: '#f97316', bg: '#fff7ed', label: 'Party' },
};

export function RoomInfoSheet({ visible, onClose, room: propRoom, isOwner = false, isFollowing = false, onFollow, onUserPress }: RoomInfoSheetProps) {
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState<'profile' | 'member'>('profile');
  const [liveRoom, setLiveRoom] = useState<Room | null>(null);

  // Subscribe to real-time room updates from Firestore
  useEffect(() => {
    if (!firestore || !propRoom?.id || !visible) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('chatRooms').doc(propRoom.id).onSnapshot((snap: any) => {
        if (snap && snap.exists()) {
          setLiveRoom({ id: snap.id, ...snap.data() });
        }
      });
      return () => unsub();
    } catch (e) {
    }
  }, [firestore, propRoom?.id, visible]);

  if (!propRoom) return null;

  // Use live room if available, fallback to propRoom
  const room = liveRoom || propRoom;

  // Level Calculation Logic
  const currentExp = room.levelPoints || 0;
  const currentLevel = Math.floor(Math.sqrt(currentExp / 100)) + 1;
  const nextLevelExp = Math.pow(currentLevel, 2) * 100;
  const prevLevelExp = Math.pow(currentLevel - 1, 2) * 100;
  const progress = Math.min(100, Math.max(0, ((currentExp - prevLevelExp) / (nextLevelExp - prevLevelExp)) * 100));

  const currentTag = room.category || 'Chat';
  const tagInfo = CATEGORY_TAGS[currentTag] || CATEGORY_TAGS.Chat;
  const TagIcon = tagInfo.icon;

  // Fetch followers (all joined members) from subcollection - real-time snapshot
  const [followers, setFollowers] = useState<any[]>([]);
  const [isFollowersLoading, setIsFollowersLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !room.id || !visible) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('chatRooms').doc(room.id).collection('followers')
        .orderBy('followedAt', 'desc')
        .onSnapshot((snap: any) => {
          if (snap) {
            setFollowers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
          }
          setIsFollowersLoading(false);
        }, (error: any) => {
          setIsFollowersLoading(false);
        });
      return () => unsub();
    } catch (e) {
      setIsFollowersLoading(false);
    }
  }, [firestore, room.id, visible]);

  const handleToggleAdmin = async (uid: string, isCurrentlyAdmin: boolean) => {
    if (!firestore || !room.id) return;
    const roomRef = doc(firestore, 'chatRooms', room.id);
    try {
      await updateDoc(roomRef, {
        moderatorIds: isCurrentlyAdmin ? arrayRemove(uid) : arrayUnion(uid),
      });
    } catch (e) {
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        {/* Click outside to close */}
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />

        <View className="bg-white rounded-t-[2.5rem] pb-8 pt-5 w-full max-h-[80vh] relative shadow-2xl">
          {/* Tabs Navigation Header */}
          <View className="flex-row items-center justify-center border-b border-slate-100 pb-3 relative">
            {!isOwner && onFollow && (
              <TouchableOpacity 
                onPress={onFollow} 
                className="absolute left-4 flex-row items-center gap-1 px-2 py-0.5 border"
                style={{
                  top: 8,
                  borderRadius: 4,
                  backgroundColor: isFollowing ? 'rgba(236,72,153,0.06)' : 'rgba(59,130,246,0.06)',
                  borderColor: isFollowing ? '#f472b6' : '#60a5fa',
                }}
              >
                <Heart size={8} color={isFollowing ? '#ec4899' : '#3b82f6'} fill={isFollowing ? '#ec4899' : 'transparent'} />
                <Text style={{ fontSize: 9.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.3, color: isFollowing ? '#ec4899' : '#3b82f6' }}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-row gap-8 justify-center ml-5">
              <TouchableOpacity onPress={() => setActiveTab('profile')} className="pb-1 relative">
                <Text className={`text-base font-black uppercase tracking-wider ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-300'}`}>
                  Profile
                </Text>
                {activeTab === 'profile' && (
                  <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('member')} className="pb-1 relative">
                <Text className={`text-base font-black uppercase tracking-wider ${activeTab === 'member' ? 'text-blue-600' : 'text-slate-300'}`}>
                  Member ({followers.length + 1})
                </Text>
                {activeTab === 'member' && (
                  <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} className="absolute right-4 top-[-6] p-1.5 bg-slate-100 rounded-full">
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Tab Contents */}
          <ScrollView className="px-6 pt-5" showsVerticalScrollIndicator={false} scrollEnabled={true}>
            {activeTab === 'profile' ? (
              <View className="space-y-5">
                {/* Hero profile card details */}
                <View className="flex-row items-center gap-4">
                  <Image 
                    cachePolicy="memory-disk" 
                    source={{ uri: room.coverUrl || 'https://picsum.photos/150' }}
                    className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50"
                  />
                  <View className="flex-1 justify-center">
                    <Text className="text-lg font-black text-slate-800 leading-tight mb-1.5">{room.title}</Text>
                    <View className="space-y-1">
                      <View className="flex-row justify-between items-end">
                        <Text className="text-cyan-600 font-extrabold text-[11px] leading-none">Lv.{currentLevel}</Text>
                        <Text className="text-[10px] font-bold text-slate-300 leading-none">Lv.{currentLevel + 1}</Text>
                      </View>
                      <View className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <View className="h-full bg-cyan-400 rounded-full" style={{ width: `${progress}%` }} />
                      </View>
                      <Text className="text-[9px] font-extrabold text-slate-400 text-right uppercase tracking-wider mt-0.5">
                        {currentExp} / {nextLevelExp} EXP
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Info Fields */}
                <View className="space-y-4 pt-1.5">
                  {/* Combined Stats Row */}
                  <View className="flex-row justify-between items-center py-3 border-b border-slate-100">
                    <View>
                      <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Members</Text>
                      <Text className="text-sm font-black text-slate-800">{followers?.length || 0}</Text>
                    </View>
                    <View>
                      <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Language</Text>
                      <Text className="text-sm font-black text-slate-800">{room.language || 'Hindi'}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[9px] font-black text-slate-400 tracking-widest mb-1">TAG</Text>
                      <View style={{ backgroundColor: tagInfo.bg }} className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-lg border border-slate-100/50">
                        <TagIcon size={10} color={tagInfo.color} />
                        <Text style={{ color: tagInfo.color }} className="text-[10px] font-black uppercase tracking-tight">{tagInfo.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Announcement Row */}
                  <View className="pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Announcement</Text>
                    <Text className="text-xs font-semibold text-slate-600 leading-relaxed">
                      {room.announcement || 'No announcement set.'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="space-y-4">
                {/* Stats Header */}
                <View className="flex-row justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Admins: <Text className="text-slate-800 font-extrabold">{(room.moderatorIds?.length || 0)}/10</Text>
                  </Text>
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Members: <Text className="text-slate-800 font-extrabold">{followers?.length || 0}</Text>
                  </Text>
                </View>

                {/* Users List */}
                <View className="space-y-1 pb-10">
                  {/* Owner Row */}
                  <UserRow uid={room.ownerId} role="owner" isOwnerUser={isOwner} onPress={onUserPress} />

                  {/* Moderator Rows */}
                  {room.moderatorIds?.filter((mid: string) => mid !== room.ownerId).map((mid: string) => (
                    <UserRow key={mid} uid={mid} role="admin" isOwnerUser={isOwner} onToggleAdmin={handleToggleAdmin} onPress={onUserPress} />
                  ))}

                  {/* Normal Participants */}
                  {isFollowersLoading ? (
                    <ActivityIndicator size="small" color="#3b82f6" className="py-6" />
                  ) : (
                    followers?.filter(f => f.uid !== room.ownerId && !room.moderatorIds?.includes(f.uid)).map(f => (
                      <UserRow key={f.uid} uid={f.uid} role="follower" isOwnerUser={isOwner} onToggleAdmin={handleToggleAdmin} onPress={onUserPress} />
                    ))
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function UserRow({ uid, role, isOwnerUser, onToggleAdmin, onPress }: { uid: string; role?: 'owner' | 'admin' | 'follower'; isOwnerUser: boolean; onToggleAdmin?: (uid: string, isCurrentlyAdmin: boolean) => void; onPress?: (uid: string) => void }) {
  const { profile, isLoading } = useUserProfile(uid);
  const { level: userLevel } = useUserLevel(profile);

  if (isLoading) {
    return <View className="h-14 w-full bg-slate-50 rounded-2xl mb-1.5 animate-pulse" />;
  }

  if (!profile) return null;

  const isModerator = role === 'admin';

  const handleOptionsPress = () => {
    Alert.alert(
      'Admin Management',
      isModerator ? 'Remove this user from admins?' : 'Make this user an admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isModerator ? 'Remove Admin' : 'Make Admin', 
          onPress: () => onToggleAdmin?.(uid, isModerator),
          style: isModerator ? 'destructive' : 'default'
        }
      ]
    );
  };

  return (
    <TouchableOpacity onPress={() => onPress?.(uid)} activeOpacity={0.7}>
      <View className="flex-row items-center justify-between p-3 rounded-2xl border border-slate-100 mb-1.5 bg-slate-50/40">
        <View className="flex-row items-center gap-3">
          <Image 
            cachePolicy="memory-disk" 
            source={{ uri: profile.avatarUrl || 'https://picsum.photos/100' }}
            className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100"
          />
          <View className="flex-col">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-extrabold text-sm text-slate-800 truncate max-w-[120px]">{profile.username}</Text>
              {role === 'owner' && (
                <View className="bg-yellow-400 px-1.5 py-0.5 rounded-md">
                  <Text className="text-white text-[7px] font-black uppercase">Owner</Text>
                </View>
              )}
              {role === 'admin' && (
                <View className="bg-purple-500 px-1.5 py-0.5 rounded-md">
                  <Text className="text-white text-[7px] font-black uppercase">Admin</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-1 mt-1">
              {profile.gender && (
                <View className={`h-3.5 w-3.5 rounded-full items-center justify-center ${profile.gender === 'Female' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                  <Text className="text-white text-[9px] font-bold leading-none">{profile.gender === 'Female' ? String.fromCodePoint(0x2640) : String.fromCodePoint(0x2642)}</Text>
                </View>
              )}
              <UserLevelBadge level={userLevel} scale={0.9} />
            </View>
          </View>
        </View>

        {/* 3-Dots Options Menu */}
        {isOwnerUser && role !== 'owner' && onToggleAdmin && (
          <TouchableOpacity
            onPress={handleOptionsPress}
            className="p-2 bg-slate-100 rounded-full active:scale-90"
          >
            <MoreVertical size={16} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
