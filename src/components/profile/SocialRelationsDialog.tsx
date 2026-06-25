import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator,  } from 'react-native';
import { ChevronLeft, Star, Sparkles, Eye } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useUserLevel } from '../../hooks/use-user-level';
import { Image } from 'expo-image';

// ─── UserListItem ────────────────────────────────────────────────────────────
// Mirrors web app's UserListItem: Avatar · Username · Flag · Gender · Level badges
const UserListItem = ({ userId, onPress }: { userId: string; onPress: () => void }) => {
  const { profile, isLoading } = useUserProfile(userId);

  if (isLoading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9' }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 14, width: '40%', backgroundColor: '#f1f5f9', borderRadius: 7 }} />
          <View style={{ height: 11, width: '55%', backgroundColor: '#f8fafc', borderRadius: 6 }} />
        </View>
      </View>
    );
  }

  if (!profile) return null;

  const isFemale = profile.gender === 'Female';
  const { level: richLevel } = useUserLevel(profile);
  const charmLevel = profile?.level?.charm || 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f8fafc',
      }}
    >
      {/* Avatar */}
      <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', elevation: 2 }}>
        <Image cachePolicy="memory-disk" source={{ uri: profile.avatarUrl || `https://i.pravatar.cc/150?u=${userId}` }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 4 }} numberOfLines={1}>
          {profile.username || 'Unknown'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Flag */}
          <Text style={{ fontSize: 14 }}>🇮🇳</Text>

          {/* Gender badge */}
          <View style={{
            width: 16, height: 16, borderRadius: 8,
            backgroundColor: isFemale ? '#ec4899' : '#3b82f6',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>{isFemale ? '♀' : '♂'}</Text>
          </View>

          {/* Rich level badge (cyan) */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 2,
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
            backgroundColor: '#06b6d4',
          }}>
            <Star size={8} color="#fff" fill="#fff" />
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{richLevel}</Text>
          </View>

          {/* Charm level badge (pink-purple) */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 2,
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
            backgroundColor: '#a855f7',
          }}>
            <Sparkles size={8} color="#fff" fill="#fff" />
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{charmLevel}</Text>
          </View>
        </View>
      </View>

      {/* Follow chip */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#f3e8ff', borderRadius: 99 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#7c3aed' }}>Follow</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Tab Button ──────────────────────────────────────────────────────────────
const TabBtn = ({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flex: 1, alignItems: 'center', paddingVertical: 12,
      borderBottomWidth: 3,
      borderBottomColor: active ? '#7c3aed' : 'transparent',
    }}
  >
    <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 0.5, color: active ? '#7c3aed' : '#94a3b8', textTransform: 'uppercase' }}>
      {label} ({count})
    </Text>
  </TouchableOpacity>
);

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ label }: { label: string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
    <Eye size={40} color="#e2e8f0" />
    <Text style={{ marginTop: 12, fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1 }}>
      No {label} yet
    </Text>
  </View>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export const SocialRelationsDialog = ({
  open, onOpenChange, userId, initialTab = 'followers', username,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null | undefined;
  initialTab?: 'followers' | 'following' | 'friends' | 'visitors';
  username?: string;
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'friends' | 'visitors'>(initialTab);

  // Sync tab when dialog opens with a different initialTab
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  // ── Real-time listeners ─────────────────────────────────────────────────
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !open) return;
    setLoading(true);

    (async () => {
      try {
        const [followersSnap, followingSnap, visitorsSnap] = await Promise.all([
          firestore().collection('followers').where('followingId', '==', userId).get(),
          firestore().collection('followers').where('followerId', '==', userId).get(),
          firestore().collection('users').doc(userId).collection('profileVisitors').orderBy('timestamp', 'desc').limit(50).get(),
        ]);
        setFollowers(followersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setFollowing(followingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVisitors(visitorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('[SocialDialog] load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, open]);

  // ── Computed friends (mutual follow) ───────────────────────────────────
  const followerIds = new Set(followers.map((f: any) => f.followerId));
  const friends = following.filter((f: any) => followerIds.has(f.followingId));

  // ── Tab data ────────────────────────────────────────────────────────────
  const tabData = {
    followers: { data: followers, idKey: 'followerId', label: 'fans' },
    following: { data: following, idKey: 'followingId', label: 'following' },
    friends:   { data: friends,   idKey: 'followingId', label: 'friends' },
    visitors:  { data: visitors,  idKey: 'visitorId',   label: 'visitors' },
  };
  const current = tabData[activeTab];

  return (
    <Modal visible={open} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
          borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
        }}>
          <TouchableOpacity onPress={() => onOpenChange(false)} style={{ padding: 6, borderRadius: 99, backgroundColor: '#f8fafc' }}>
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: -0.5 }}>
              {username || 'Social'}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Tribal Frequencies
            </Text>
          </View>
        </View>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <TabBtn label="Fans"      count={followers.length} active={activeTab === 'followers'} onPress={() => setActiveTab('followers')} />
          <TabBtn label="Following" count={following.length} active={activeTab === 'following'} onPress={() => setActiveTab('following')} />
          <TabBtn label="Friends"   count={friends.length}   active={activeTab === 'friends'}   onPress={() => setActiveTab('friends')} />
          <TabBtn label="Visitors"  count={visitors.length}  active={activeTab === 'visitors'}  onPress={() => setActiveTab('visitors')} />
        </View>

        {/* ── List ───────────────────────────────────────────────────────── */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1 }}>
              Syncing...
            </Text>
          </View>
        ) : current.data.length === 0 ? (
          <EmptyState label={current.label} />
        ) : (
          <FlatList
            data={current.data}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const uid = item[current.idKey] || item.id;
              return (
                <UserListItem
                  userId={uid}
                  onPress={() => {
                    onOpenChange(false);
                    router.push(`/profile/${uid}`);
                  }}
                />
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}

      </View>
    </Modal>
  );
};
