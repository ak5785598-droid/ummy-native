import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Plus } from 'lucide-react-native';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '../../firebase/provider';
import { collection, query, orderBy, where, limit } from '@/firebase/firestore-compat';
import { Moment } from '../../lib/types';
import { MomentCard } from '../../components/discover/moment-card';
import { FullscreenMomentOverlay } from '../../components/discover/fullscreen-moment-overlay';
import { MomentCommentsSheet } from '../../components/discover/moment-comments-sheet';
import { PublishMoment } from '../../components/discover/publish-moment';

export default function DiscoverScreen() {
  const { firestore, isHydrated } = useFirebase();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<'recommend' | 'following'>('recommend');
  const [activeSection, setActiveSection] = useState<'photos' | 'reels'>('photos');
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [commentsMomentId, setCommentsMomentId] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Social Graph: Get users that current user follows
  const followingListQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'followers'), where('followerId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: followingData } = useCollection<any>(followingListQuery);
  const followingIds = useMemo(() => followingData?.map(f => f.followingId) || [], [followingData]);

  const twentyFourHoursAgo = useMemo(() => {
    return new Date(Date.now() - 86400000);
  }, []);

  const recommendQuery = useMemoFirebase(() => {
    if (!firestore || !isHydrated) return null;
    return query(
      collection(firestore, 'moments'),
      where('createdAt', '>=', twentyFourHoursAgo),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [firestore, isHydrated, twentyFourHoursAgo]);

  const followingMomentsQuery = useMemo(() => {
    if (!firestore || followingIds.length === 0) return null;
    return query(
      collection(firestore, 'moments'),
      where('userId', 'in', followingIds.slice(0, 30)),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [firestore, followingIds]);

  const { data: recommendMoments, isLoading: isLoadingRecommend } = useCollection<Moment>(recommendQuery);
  const { data: followingMoments, isLoading: isLoadingFollowing } = useCollection<Moment>(followingMomentsQuery);

  const rawMoments = activeTab === 'recommend' ? recommendMoments : followingMoments;
  const isLoading = activeTab === 'recommend' ? isLoadingRecommend : isLoadingFollowing;

  const filteredMoments = useMemo(() => {
    if (!rawMoments) return [];
    return rawMoments.filter(m => {
      if (activeSection === 'photos') return m.type !== 'video' && !m.videoUrl;
      return m.type === 'video' || m.videoUrl;
    });
  }, [rawMoments, activeSection]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  };

  const openFullscreen = (index: number) => setFullscreenIndex(index);
  const closeFullscreen = () => setFullscreenIndex(null);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="absolute top-0 left-0 right-0 h-32">
        <LinearGradient colors={['#8b5cf6', 'rgba(139,92,246,0.3)', 'transparent']} className="flex-1" />
      </View>

      <View className="flex-row items-center justify-between px-4 pt-4 pb-2 z-50">
        <Text className="text-2xl font-bold text-slate-800">Discover</Text>
        <TouchableOpacity onPress={() => setShowPublish(true)} className="bg-purple-600 rounded-full p-2 shadow-md">
          <Plus size={18} color="white" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center gap-4 px-4 mb-2">
        <TouchableOpacity onPress={() => setActiveTab('recommend')}>
          <Text className={`text-base font-bold ${activeTab === 'recommend' ? 'text-slate-800' : 'text-slate-400'}`}>
            Recommend
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('following')}>
          <Text className={`text-base font-bold ${activeTab === 'following' ? 'text-slate-800' : 'text-slate-400'}`}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row mx-4 bg-slate-100 rounded-full p-0.5 mb-3">
        <TouchableOpacity
          onPress={() => setActiveSection('photos')}
          className={`flex-1 py-2 rounded-full items-center ${activeSection === 'photos' ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`text-xs font-bold ${activeSection === 'photos' ? 'text-slate-800' : 'text-slate-400'}`}>
            Photos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSection('reels')}
          className={`flex-1 py-2 rounded-full items-center ${activeSection === 'reels' ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`text-xs font-bold ${activeSection === 'reels' ? 'text-slate-800' : 'text-slate-400'}`}>
            Reels
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-2"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="small" color="#8b5cf6" />
          </View>
        ) : filteredMoments.length > 0 ? (
          <View className="flex-row flex-wrap justify-between px-1">
            {filteredMoments.map((moment, index) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                onPress={() => openFullscreen(index)}
                onCommentPress={() => setCommentsMomentId(moment.id)}
              />
            ))}
          </View>
        ) : (
          <View className="py-20 items-center">
            <Sparkles size={36} color="#cbd5e1" />
            <Text className="text-slate-400 text-sm mt-2 font-medium">No moments yet</Text>
            <Text className="text-slate-300 text-xs mt-1">Be the first to share!</Text>
          </View>
        )}
        <View className="h-24" />
      </ScrollView>

      {fullscreenIndex !== null && filteredMoments.length > 0 && (
        <FullscreenMomentOverlay
          moments={filteredMoments}
          initialIndex={fullscreenIndex}
          visible
          onClose={closeFullscreen}
          onOpenComments={(id) => {
            setCommentsMomentId(id);
            closeFullscreen();
          }}
        />
      )}

      <MomentCommentsSheet
        momentId={commentsMomentId}
        visible={!!commentsMomentId}
        onClose={() => setCommentsMomentId(null)}
      />

      <PublishMoment
        visible={showPublish}
        onClose={() => setShowPublish(false)}
      />
    </SafeAreaView>
  );
}
