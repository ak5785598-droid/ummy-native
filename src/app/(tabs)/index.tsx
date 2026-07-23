import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, FlatList, Dimensions, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Plus, Sparkles, Trophy, Heart, Users, Activity, Crown, Castle, Lock } from 'lucide-react-native';
import { useCollection, useFirebase, useUser, useDoc } from '../../firebase/provider';
import { collection, query, orderBy, limit, where, doc, getDocs } from '@/firebase/firestore-compat';
import { useRouter } from 'expo-router';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Room } from '../../lib/types';
import { useRoomContext } from '../../context/room-context';
import { ChatRoomCard } from '../../components/home/chat-room-card';
import { RankingCard } from '../../components/home/ranking-card';
import { FamilyCard } from '../../components/home/family-card';
import { CpCard } from '../../components/home/cp-card';
import { BannerCarousel } from '../../components/home/banner-carousel';
import { DailyRewardsModal } from '../../components/home/daily-rewards-modal';
import { CreateRoomSheet } from '../../components/home/create-room-sheet';
import { RoomSupportDialog } from '../../components/room/room-support-dialog';
import { GlossyCalendarIcon } from '../../components/native-svgs';
import { Image } from 'expo-image';

const CATEGORIES = ['All', 'Chat', 'Game', 'Music', 'Party'];
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [headerTab, setHeaderTab] = useState<'recommend' | 'me'>('recommend');
  const [meTab, setMeTab] = useState<'following' | 'recent'>('following');
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Password Lock Modal States
  const [lockedRoomTarget, setLockedRoomTarget] = useState<Room | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPassModal, setShowPassModal] = useState(false);
  
  const { firestore, database, isHydrated } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { activeRoom, minimizedRoom } = useRoomContext();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const [roomsWithUsersMap, setRoomsWithUsersMap] = useState<Record<string, number>>({});

  // REALTIME DATABASE PRESENCE: Track real-time online user count per room
  useEffect(() => {
    if (!isHydrated || !database) return;
    
    try {
      const { ref: dbRef, onValue } = require('firebase/database');
      const presenceRef = dbRef(database, 'roomPresence');
      
      const unsubscribe = onValue(presenceRef, (snapshot: any) => {
        const allPresence = snapshot.val() || {};
        const countsMap: Record<string, number> = {};
        const now = Date.now();
        
        Object.keys(allPresence).forEach(roomId => {
          const usersInRoom = allPresence[roomId];
          if (usersInRoom && typeof usersInRoom === 'object') {
            const onlineCount = Object.values(usersInRoom).filter((u: any) => {
              if (!u || typeof u !== 'object') return false;
              if (u.isOnline === false) return false;
              if (u.lastSeen && (now - Number(u.lastSeen) > 120000)) return false;
              return true;
            }).length;

            if (onlineCount > 0) {
              countsMap[roomId] = onlineCount;
            }
          }
        });
        
        setRoomsWithUsersMap(countsMap);
      }, (error: any) => {
        console.error('[RTDB] Error:', error?.message);
      });
      
      return () => unsubscribe();
    } catch (e) {}
  }, [isHydrated, database]);

  const configRef = firestore ? doc(firestore, 'appConfig', 'global') : null;
  const { data: config } = useDoc(configRef);

  const HELP_ROOM_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';

  // Fetch all chat rooms without restrictive orderBy constraint that drops rooms lacking participantCount
  const chatRoomsQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'chatRooms'), limit(100));
  }, [firestore, isHydrated]);

  const helpRoomRef = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return doc(firestore, 'chatRooms', HELP_ROOM_ID);
  }, [firestore, isHydrated]);

  const { data: allRoomsRaw, isLoading } = useCollection(chatRoomsQuery);
  const { data: helpRoomData } = useDoc(helpRoomRef);

  // Always merge help room into allRooms (even if not in main query)
  const allRooms = useMemo(() => {
    const rooms = allRoomsRaw || [];
    if (!helpRoomData) return rooms;
    const alreadyIn = rooms.some((r: any) => r.id === HELP_ROOM_ID);
    if (alreadyIn) return rooms;
    return [helpRoomData, ...rooms];
  }, [allRoomsRaw, helpRoomData]);

  const followedRoomsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'followedRooms'), orderBy('followedAt', 'desc'), limit(20));
  }, [firestore, user?.uid]);

  const { data: followedRooms } = useCollection(followedRoomsQuery);

  const recentVisitsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'recentVisits'), orderBy('visitedAt', 'desc'), limit(20));
  }, [firestore, user?.uid]);

  const { data: recentVisits } = useCollection(recentVisitsQuery);

  const myRoomQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'chatRooms'), where('ownerId', '==', user.uid), limit(1));
  }, [firestore, user?.uid]);

  const { data: myRooms } = useCollection(myRoomQuery);

  const hasOwnRoom = myRooms && myRooms.length > 0;
  const myRoom = myRooms?.[0];

  const myRoomParticipantsQuery = useMemo(() => {
    if (!firestore || !myRoom?.id) return null;
    return query(collection(firestore, 'chatRooms', myRoom.id, 'participants'));
  }, [firestore, myRoom?.id]);

  const { data: myRoomParticipantsData } = useCollection(myRoomParticipantsQuery);

  const myRoomParticipants = useMemo(() => {
    if (!myRoomParticipantsData) return [];
    return myRoomParticipantsData.map(p => ({ ...p, uid: p.uid || p.id }));
  }, [myRoomParticipantsData]);

  const handleOpenSupport = () => {
    if (hasOwnRoom && myRoom) {
      setShowSupportDialog(true);
    } else {
      Alert.alert(
        "No Room Found",
        "You need to create your own room first to configure support targets!",
        [
          { text: "Create Room", onPress: () => setShowCreateRoom(true) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const displayRooms = useMemo(() => {
    if (!allRooms || allRooms.length === 0) return [];

    const ORIGINAL_HELP_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';
    const activeRoomId = activeRoom?.id || minimizedRoom?.id;

    // Filter categories & decommissioned rooms
    const filtered = (allRooms as Room[]).filter(room => {
      const cat = room.category || 'Chat';
      const matchesCategory = activeCategory === 'All' || cat === activeCategory;
      const isDecommissioned = room.title?.includes('SYNCHRONIZING') || room.name?.includes('SYNCHRONIZING');
      const roomName = (room.name || room.title || '').toLowerCase().trim();

      const isOriginalHelp = room.id === ORIGINAL_HELP_ID || roomName === 'ummy help';
      const looksLikeHelp = roomName.includes('help');
      if (looksLikeHelp && !isOriginalHelp) return false;

      return matchesCategory && !isDecommissioned;
    });

    // Map each room with live online count (combining RTDB presence, Firestore participantCount, and activeRoom status)
    const mapped = filtered.map(room => {
      const rtdbCount = roomsWithUsersMap[room.id] || 0;
      const isCurrentActive = room.id === activeRoomId ? 1 : 0;
      const firestoreCount = Number(room.participantCount || 0);
      const liveOnlineCount = Math.max(rtdbCount, firestoreCount, isCurrentActive);
      return {
        ...room,
        participantCount: liveOnlineCount,
      };
    });

    // Sort: 1. Official Help room -> 2. Pinned rooms -> 3. Active rooms (highest live count first) -> 4. Most recently updated
    return mapped.sort((a, b) => {
      const aHelp = a.id === ORIGINAL_HELP_ID ? 1 : 0;
      const bHelp = b.id === ORIGINAL_HELP_ID ? 1 : 0;
      if (aHelp !== bHelp) return bHelp - aHelp;

      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aCount = a.participantCount || 0;
      const bCount = b.participantCount || 0;
      if (aCount !== bCount) return bCount - aCount;

      const aTime = a.updatedAt?.toDate?.()?.getTime?.() || 0;
      const bTime = b.updatedAt?.toDate?.()?.getTime?.() || 0;
      return bTime - aTime;
    });
  }, [allRooms, activeCategory, roomsWithUsersMap, activeRoom, minimizedRoom]);

  const followedRoomData = useMemo(() => {
    if (!followedRooms || !allRooms) return [];
    return followedRooms.map((fr: any) => {
      const room = allRooms.find((r: any) => r.id === fr.id);
      return room ? { ...room, followedAt: fr.followedAt } : null;
    }).filter(Boolean) as Room[];
  }, [followedRooms, allRooms]);

  const recentRoomData = useMemo(() => {
    if (!recentVisits || !allRooms) return [];
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    return recentVisits
      .filter((rv: any) => {
        const visitedAt = rv.visitedAt?.toDate?.()?.getTime() || 0;
        return visitedAt > oneDayAgo;
      })
      .map((rv: any) => {
        const room = allRooms.find((r: any) => r.id === rv.id);
        return room ? { ...room, visitedAt: rv.visitedAt } : null;
      })
      .filter(Boolean) as Room[];
  }, [recentVisits, allRooms]);

  const enterRoom = useCallback((room: Room) => {
    // Password Lock Gate: Check if room has password and user is not owner/moderator
    const isOwner = user?.uid && room.ownerId === user.uid;
    const isMod = user?.uid && room.moderatorIds?.includes(user.uid);

    if (room.password && !isOwner && !isMod) {
      setLockedRoomTarget(room);
      setEnteredPin('');
      setShowPassModal(true);
      return;
    }

    router.push({
      pathname: `/rooms/${room.id}` as any,
      params: {
        name: room.name || room.title || 'Room',
        coverUrl: room.coverUrl || '',
        backgroundUrl: room.backgroundUrl || '',
        roomThemeId: room.roomThemeId || '',
        hasPassword: room.password ? 'true' : 'false'
      }
    });
  }, [router, user?.uid]);

  const handleUnlockAndEnter = () => {
    if (!lockedRoomTarget) return;
    if (enteredPin.trim() === lockedRoomTarget.password) {
      const r = lockedRoomTarget;
      setShowPassModal(false);
      setLockedRoomTarget(null);
      setEnteredPin('');
      router.push({
        pathname: `/rooms/${r.id}` as any,
        params: {
          name: r.name || r.title || 'Room',
          coverUrl: r.coverUrl || '',
          backgroundUrl: r.backgroundUrl || '',
          roomThemeId: r.roomThemeId || '',
          hasPassword: 'true'
        }
      });
    } else {
      Alert.alert('Access Denied', 'Incorrect Room Password PIN. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleCreateRoom = () => {
    if (hasOwnRoom && myRooms?.[0]) {
      enterRoom(myRooms[0]);
    } else {
      setShowCreateRoom(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Background visual cover matching real Web app */}
      <View className="absolute top-0 left-0 right-0 z-0 pointer-events-none">
        <View className="h-6 bg-purple-400" />
        <LinearGradient 
          colors={['#c084fc', 'rgba(192, 132, 252, 0.4)', 'transparent']} 
          className="h-56" 
        />
      </View>

      <View className="flex-row items-center justify-between px-4 pt-2 pb-3 z-50 bg-transparent shrink-0">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => setHeaderTab('recommend')}>
            <Text className={`text-xl font-bold tracking-tight transition-all duration-200 ${headerTab === 'recommend' ? 'text-black' : 'text-gray-500'}`}>
              Recommend
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHeaderTab('me')}>
            <Text className={`text-xl font-bold tracking-tight transition-all duration-200 ${headerTab === 'me' ? 'text-black' : 'text-gray-500'}`}>
              Me
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push('/search')} className="p-1 px-1.5 bg-white/80 rounded-2xl shadow-sm border border-white/80">
            <Search size={18} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateRoom} className="p-1.5 bg-slate-800 rounded-full shadow-md active:scale-90 transition-all flex items-center">
            {hasOwnRoom ? <Castle size={16} color="white" /> : <Plus size={16} color="white" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 z-10" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {headerTab === 'recommend' ? (
          <>
            <View className="px-3 mb-0 mt-2">
              <BannerCarousel onOpenSupport={handleOpenSupport} />
            </View>

            <View className="mb-1" style={{ paddingLeft: 22, paddingRight: 6, marginTop: 4 }}>
              <View className="flex-row gap-3">
                <RankingCard onPress={() => router.push('/leaderboard?type=rich')} />
                <FamilyCard onPress={() => router.push('/families')} />
                <CpCard onPress={() => router.push('/cp-ranking')} />
              </View>
            </View>

            {/* Sticky Category Bar */}
            <View className="px-3 py-2 border-b border-slate-100 flex-row mt-[-8px]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
                <View className="flex-row gap-2">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full shadow-sm border transition-all duration-200 ${activeCategory === cat ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200/80'}`}
                    >
                      <Text className={`text-[10px] font-black uppercase tracking-wider ${activeCategory === cat ? 'text-white' : 'text-slate-500'}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="flex-row flex-wrap px-2 pt-0 pb-24 mt-[2px]">
              {isLoading ? (
                <View className="w-full py-10 items-center justify-center">
                  <Activity size={24} color="#cbd5e1" />
                  <Text className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest">Loading...</Text>
                </View>
              ) : displayRooms.length > 0 ? (
                displayRooms.map((room) => (
                  <ChatRoomCard key={room.id} room={room} onPress={() => enterRoom(room)} />
                ))
              ) : (
                <View className="w-full py-10 items-center justify-center">
                  <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">No Active Rooms</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View className="px-4 pt-4">
            <View className="flex-row items-center bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <TouchableOpacity onPress={() => router.push('/profile')} className="flex-row items-center flex-1">
                <Image cachePolicy="memory-disk" source={{ uri: userProfile?.avatarUrl || 'https://picsum.photos/200' }} 
                  className="w-16 h-16 rounded-full mr-4"
                />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-slate-800">{userProfile?.username || 'User'}</Text>
                  <Text className="text-sm text-slate-500">ID: {userProfile?.accountNumber || '000000'}</Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-amber-600 font-bold text-sm">{userProfile?.wallet?.coins?.toFixed(0) || '0'} Coins</Text>
                  </View>
                </View>
              </TouchableOpacity>
              {hasOwnRoom && myRoom ? (
                <TouchableOpacity
                  onPress={() => enterRoom(myRoom)}
                  className="shrink-0 bg-slate-900 rounded-2xl px-4 py-2 ml-2"
                >
                  <Text className="text-white text-xs font-bold uppercase tracking-widest">My Room</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowCreateRoom(true)}
                  className="shrink-0 bg-slate-900 rounded-2xl px-4 py-2 ml-2"
                >
                  <Text className="text-white text-xs font-bold uppercase tracking-widest">Create</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row items-center gap-4 mb-4">
              <TouchableOpacity onPress={() => setMeTab('following')}>
                <Text className={`text-base font-bold ${meTab === 'following' ? 'text-slate-800' : 'text-slate-400'}`}>
                  Following
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMeTab('recent')}>
                <Text className={`text-base font-bold ${meTab === 'recent' ? 'text-slate-800' : 'text-slate-400'}`}>
                  Recent
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap pb-24">
              {meTab === 'following' ? (
                followedRoomData.length > 0 ? (
                  followedRoomData.map((room) => (
                    <ChatRoomCard key={room.id} room={room} onPress={() => enterRoom(room)} />
                  ))
                ) : (
                  <View className="w-full py-10 items-center">
                    <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">No followed rooms</Text>
                  </View>
                )
              ) : (
                recentRoomData.length > 0 ? (
                  recentRoomData.map((room) => (
                    <ChatRoomCard key={room.id} room={room} onPress={() => enterRoom(room)} />
                  ))
                ) : (
                  <View className="w-full py-10 items-center">
                    <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">No recent visits</Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        onPress={() => setShowRewardsModal(true)}
        className="absolute bottom-36 right-4 z-50 active:scale-95 transition-all duration-200"
      >
        <View className="shadow-lg">
          <GlossyCalendarIcon width={58} height={58} />
        </View>
      </TouchableOpacity>

      <DailyRewardsModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />
      <CreateRoomSheet 
        visible={showCreateRoom} 
        onClose={() => setShowCreateRoom(false)} 
      />

      {/* Password Lock Verification Modal */}
      <Modal
        visible={showPassModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPassModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 }}>
            <View style={{ width: 56, h: 56, height: 56, borderRadius: 28, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Lock size={28} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
              Locked Room
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', textAlign: 'center', marginBottom: 20 }}>
              This voice room is private. Please enter the 4-digit room password PIN to enter.
            </Text>

            <TextInput
              value={enteredPin}
              onChangeText={setEnteredPin}
              placeholder="Enter Room PIN"
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={10}
              style={{
                width: '100%',
                height: 50,
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                borderRadius: 14,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: 4,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                marginBottom: 20
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setShowPassModal(false)}
                style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnlockAndEnter}
                style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Unlock & Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {hasOwnRoom && myRoom && (
        <RoomSupportDialog 
          visible={showSupportDialog} 
          onClose={() => setShowSupportDialog(false)} 
          roomStats={myRoom?.stats}
          visitorCount={myRoomParticipants.length}
          levelPoints={myRoom?.levelPoints || 0}
          roomId={myRoom.id}
          isOwner={true}
          participants={myRoomParticipants}
          partners={myRoom?.partners || []}
        />
      )}
    </SafeAreaView>
  );
}
