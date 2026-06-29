import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, FlatList, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Plus, Sparkles, Trophy, Heart, Users, Activity, Crown, Castle } from 'lucide-react-native';
import { useCollection, useFirebase, useUser, useDoc } from '../../firebase/provider';
import { collection, query, orderBy, limit, where, doc, getDocs } from '@/firebase/firestore-compat';
import { useRouter } from 'expo-router';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Room } from '../../lib/types';
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
  
  const { firestore, database, isHydrated } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const [roomsWithUsers, setRoomsWithUsers] = useState<Set<string>>(new Set());

  // REALTIME DATABASE PRESENCE: Track which rooms have online users (only when tab focused)
  useEffect(() => {
    if (!isHydrated || !database) return;
    
    try {
      const { ref: dbRef, onValue } = require('firebase/database');
      const presenceRef = dbRef(database, 'roomPresence');
      
      const unsubscribe = onValue(presenceRef, (snapshot: any) => {
        const allPresence = snapshot.val() || {};
        const roomIds = new Set<string>();
        
        Object.keys(allPresence).forEach(roomId => {
          const usersInRoom = allPresence[roomId];
          if (usersInRoom && Object.keys(usersInRoom).length > 0) {
            roomIds.add(roomId);
          }
        });
        
        setRoomsWithUsers(roomIds);
      });
      
      return () => unsubscribe();
    } catch (e) {
      console.warn('[Home] Realtime DB presence listener failed:', e);
    }
  }, [isHydrated, database]);

  const configRef = firestore ? doc(firestore, 'appConfig', 'global') : null;
  const { data: config } = useDoc(configRef);

  const HELP_ROOM_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';

  const chatRoomsQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'chatRooms'), orderBy('participantCount', 'desc'), limit(50));
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
    if (!allRooms) return [];

    const ORIGINAL_HELP_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';
    let rooms = [...allRooms] as Room[];

    rooms.sort((a, b) => {
      const aName = (a.name || a.title || '').toLowerCase().trim();
      const bName = (b.name || b.title || '').toLowerCase().trim();
      const aIsHelp = a.id === ORIGINAL_HELP_ID || aName === 'ummy help';
      const bIsHelp = b.id === ORIGINAL_HELP_ID || bName === 'ummy help';
      if (aIsHelp && !bIsHelp) return -1;
      if (!aIsHelp && bIsHelp) return 1;
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.participantCount || 0) - (a.participantCount || 0);
    });

    return rooms.filter(room => {
      const cat = room.category || 'Chat';
      const matchesCategory = activeCategory === 'All' || cat === activeCategory;
      const isDecommissioned = room.title?.includes('SYNCHRONIZING') || room.name?.includes('SYNCHRONIZING');

      const roomName = (room.name || room.title || '').toLowerCase().trim();

      // Original help room — match by ID OR exact name
      const isOriginalHelp = room.id === ORIGINAL_HELP_ID || roomName === 'ummy help';

      // Any room with 'help' in name that is NOT the original → HIDE (duplicate)
      const looksLikeHelp = roomName.includes('help');
      if (looksLikeHelp && !isOriginalHelp) return false;
      if (isOriginalHelp) return !isDecommissioned; // always show, no category filter

      const hasOnlineUsers = roomsWithUsers.has(room.id);
      const isPinned = room.isPinned === true;

      return matchesCategory && (hasOnlineUsers || isPinned) && !isDecommissioned;
    });
  }, [allRooms, activeCategory, roomsWithUsers]);

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
  }, [router]);

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
      <CreateRoomSheet visible={showCreateRoom} onClose={() => setShowCreateRoom(false)} />
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
