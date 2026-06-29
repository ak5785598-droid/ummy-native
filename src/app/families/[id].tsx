import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users, Trophy, Flame, ShieldCheck, Crown, Share2, Trash2, UserPlus, UserMinus } from 'lucide-react-native';
import { useFirebase, useUser, useDoc, useCollection } from '../../firebase/provider';
import { doc, collection, query, where, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, serverTimestamp } from '../../firebase/firestore-compat';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { toCDN } from '@/lib/cdn';

const LEVEL_THRESHOLDS = [0, 10000, 50000, 200000, 1000000, 5000000, 20000000, 100000000, 500000000, 2000000000];

function getFamilyLevel(totalWealth: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalWealth >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

function getExpProgress(totalWealth: number, level: number) {
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 5;
  if (next <= current) return 100;
  return Math.min(100, Math.round(((totalWealth - current) / (next - current)) * 100));
}

export default function FamilyDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firestore, isHydrated } = useFirebase();
  const { user } = useUser();

  const familyRef = useMemo(() => {
    if (!firestore || !isHydrated || !id) return null;
    return doc(firestore, 'families', id);
  }, [firestore, isHydrated, id]);

  const { data: family, isLoading: isFamilyLoading } = useDoc(familyRef);

  const membersQuery = useMemo(() => {
    if (!firestore || !family?.members?.length) return null;
    return query(collection(firestore, 'users'), where('uid', 'in', family.members.slice(0, 10)));
  }, [firestore, family?.members]);

  const { data: memberProfiles } = useCollection(membersQuery);

  const isMember = user && family?.members?.includes(user.uid);
  const isOwner = user && family?.ownerId === user.uid;

  const familyLevel = getFamilyLevel(family?.totalWealth || 0);
  const expPercent = getExpProgress(family?.totalWealth || 0, familyLevel);

  const handleJoin = async () => {
    if (!user || !firestore || !family || !id) return;
    try {
      await updateDoc(doc(firestore, 'users', user.uid), { familyId: id, updatedAt: serverTimestamp() });
      await updateDoc(familyRef!, {
        members: arrayUnion(user.uid),
        memberCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (e) {}
  };

  const handleLeave = async () => {
    if (!user || !firestore || !family || isOwner) return;
    Alert.alert('Leave Family', `Are you sure you want to leave "${family.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await updateDoc(doc(firestore, 'users', user.uid), { familyId: null, updatedAt: serverTimestamp() });
            await updateDoc(familyRef!, {
              members: arrayRemove(user.uid),
              memberCount: increment(-1),
              updatedAt: serverTimestamp()
            });
          } catch (e) {}
        }
      }
    ]);
  };

  const handleDelete = () => {
    if (!isOwner || !firestore || !id) return;
    Alert.alert('Delete Family', `Delete "${family.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(familyRef!);
            router.back();
          } catch (e) {}
        }
      }
    ]);
  };

  const handleShare = () => {
    Share.share({ message: `Join my family "${family.name}" on Ummy! Family ID: ${id}` });
  };

  if (isFamilyLoading || !family) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1a0533' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' }}>
            {isFamilyLoading ? 'Loading...' : 'Family not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f0f8' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Banner */}
        <View style={{ height: 240, width: '100%', position: 'relative' }}>
          <Image
            cachePolicy="memory-disk"
            source={{ uri: toCDN(family.bannerUrl) || `https://picsum.photos/seed/${family.id}/800` }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'transparent' }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(245,240,248,0.95)' }} />
          </View>
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Family info over banner */}
          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ width: 80, height: 80, borderRadius: 22, borderWidth: 4, borderColor: 'white', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
              <Image cachePolicy="memory-disk" source={{ uri: toCDN(family.bannerUrl) || `https://picsum.photos/seed/${family.id}/200` }} style={{ width: '100%', height: '100%' }} />
            </View>
            <View style={{ flex: 1, marginLeft: 14, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#1a1a2e', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>{family.name}</Text>
                {family.isVerified && <ShieldCheck size={18} color="#4ADE80" />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Crown size={12} color="#D97706" />
                <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Founder: {family.ownerName || 'Unknown'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <TouchableOpacity onPress={handleShare} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                <Share2 size={18} color="#6B7280" />
              </TouchableOpacity>
              {isOwner ? (
                <TouchableOpacity onPress={handleDelete} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              ) : !isMember ? (
                <TouchableOpacity onPress={handleJoin} style={{ backgroundColor: '#7C3AED', borderRadius: 21, paddingHorizontal: 20, height: 42, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>Join</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 16 }}>
          <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <Flame size={24} color="#F97316" />
            <Text style={{ color: '#1a1a2e', fontSize: 22, fontWeight: '900', marginTop: 6 }}>{(family.totalWealth || 0).toLocaleString()}</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Total Power</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <Users size={24} color="#10B981" />
            <Text style={{ color: '#1a1a2e', fontSize: 22, fontWeight: '900', marginTop: 6 }}>{family.memberCount || 0}</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Active Members</Text>
          </View>
        </View>

        {/* Leave button (for members who are not owner) */}
        {isMember && !isOwner && (
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <TouchableOpacity onPress={handleLeave} style={{ backgroundColor: 'white', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FCA5A5' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UserMinus size={16} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' }}>Leave Family</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Family Reputation */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trophy size={24} color="#F59E0B" />
              <View>
                <Text style={{ color: '#1a1a2e', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' }}>Family Reputation</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Level {familyLevel} Elite Clan</Text>
              </View>
            </View>
            {isOwner && (
              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: '#D97706', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>Management</Text>
              </View>
            )}
          </View>

          {/* EXP Progress */}
          <View style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>EXP Progress</Text>
              <Text style={{ color: '#1a1a2e', fontSize: 14, fontWeight: '900' }}>
                {expPercent}% <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700' }}>to Lv.{familyLevel + 1}</Text>
              </Text>
            </View>
            <View style={{ height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${expPercent}%`, backgroundColor: '#7C3AED', borderRadius: 5 }} />
            </View>
          </View>
        </View>

        {/* Elite Roster */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Users size={16} color="#7C3AED" />
            <Text style={{ color: '#1a1a2e', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Elite Roster</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', marginLeft: 'auto' }}>Showing Top 10</Text>
          </View>

          {memberProfiles?.map((member: any) => (
            <TouchableOpacity
              key={member.uid}
              onPress={() => router.push(`/profile/${member.uid}`)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8,
                backgroundColor: 'white', borderRadius: 16,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
              }}
            >
              <Image
                cachePolicy="memory-disk"
                source={{ uri: toCDN(member.avatarUrl) || 'https://picsum.photos/200' }}
                style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#E5E7EB' }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#1a1a2e', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }} numberOfLines={1}>{member.username}</Text>
                  {member.uid === family.ownerId && <Crown size={12} color="#F59E0B" />}
                </View>
                <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', marginTop: 2 }}>Lv.{member.level?.rich || 1} Warrior</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Flame size={12} color="#F97316" />
                <Text style={{ color: '#1a1a2e', fontSize: 13, fontWeight: '900' }}>{(member.wealthValue || 0).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {!memberProfiles?.length && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700' }}>No members yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
