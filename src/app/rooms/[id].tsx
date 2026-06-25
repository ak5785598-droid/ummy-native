import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Modal, Alert, BackHandler, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, collection, query, orderBy, limit, where, Timestamp, serverTimestamp, arrayUnion, arrayRemove, increment, deleteDoc, getDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useStorage, useDatabase } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useRoomPresence } from '../../hooks/use-room-presence';
import { useMusicSync, destroyMusicSound } from '../../hooks/use-music-sync';
import { useRoomContext } from '../../context/room-context';
import { useAgoraNative, destroyAgoraEngine } from '../../hooks/use-agora-native';
import { useVoiceEngine } from '../../hooks/use-voice-engine';
import { useRoomTasks } from '../../hooks/use-room-tasks';
import { Room, Message, RoomParticipant, MusicTrack, TopSupporter } from '../../lib/types';
import { ROOM_THEMES } from '../../lib/themes';
import { setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '../../lib/non-blocking-writes';
import { Seat } from '../../components/room/seat';
import { RoomHeader } from '../../components/room/room-header';
import { RoomFooter } from '../../components/room/room-footer';
import { RoomChatArea } from '../../components/room/room-chat-area';
import { RoomLanguagePicker } from '../../components/room/room-language-picker';
import { ChatInputBar } from '../../components/room/chat-input-bar';
import { ExitRoomSheet } from '../../components/room/exit-room-sheet';
import { MusicMiniPlayer } from '../../components/room/music-mini-player';
import { RoomSettingsSheet } from '../../components/room/room-settings-sheet';
import { RoomShareSheet } from '../../components/room/room-share-sheet';
import { RoomUserList } from '../../components/room/room-user-list';
import { RoomSeatMenu } from '../../components/room/room-seat-menu';
import { RoomProfileCard } from '../../components/room/room-profile-card';
import { RoomPlaySheet } from '../../components/room/room-play-sheet';
import { RoomInfoSheet } from '../../components/room/room-info-sheet';
import { RoomMicInvite } from '../../components/room/room-mic-invite';
import { RoomTrophyBadge } from '../../components/room/room-trophy-badge';
import { RoomBanners } from '../../components/room/room-banners';
import { LootBoxDisplay } from '../../components/room/loot-box-display';
import { RoomTasksDialog } from '../../components/room/room-tasks-dialog';
import { UserPlus, X, Disc3, Lock } from 'lucide-react-native';
import { GiftPicker } from '../../components/gift/gift-picker';
import { GiftAnimationOverlay } from '../../components/gift/gift-animation-overlay';
import { RoomEmojiPickerDialog } from '../../components/room/room-emoji-picker-dialog';
import { LiveBackground } from '../../components/room/live-background';
import { EntryEffectPlayer } from '../../components/room/entry-effect-player';
import { RoomTopSupportersDialog } from '../../components/room/room-top-supporters-dialog';
import { RoomLuckySpinDialog } from '../../components/room/room-lucky-spin-dialog';
import { RoomGoldenChestDialog } from '../../components/room/room-golden-chest-dialog';
import { ImagePreviewDialog } from '../../components/room/image-preview-dialog';
import { FullProfileDialog } from '../../components/profile/FullProfileDialog';
import { RoomSoundboard } from '../../components/room/room-soundboard';
import { GiftBattleCanvas } from '../../components/room/gift-battle-canvas';
import { RoomMessagesDialog } from '../../components/room/room-messages-dialog';
import { RoomFollowersDialog } from '../../components/room/room-followers-dialog';
import { RoomGamesDialog } from '../../components/room/room-games-dialog';
import { RoomGameOverlay } from '../../components/room/room-game-overlay';
import { YouTubeDialog } from '../../components/room/youtube-dialog';
import { NetMirrorDialog } from '../../components/room/net-mirror-dialog';
import { EntertainmentHubDialog } from '../../components/room/entertainment-hub-dialog';
import { ScreenMirrorDialog } from '../../components/room/screen-mirror-dialog';
import { SportsHubDialog } from '../../components/room/sports-hub-dialog';
import { MoviePlayer } from '../../components/room/movie-player';
import { MovieSyncBanner } from '../../components/room/movie-sync-banner';
import { LootGate } from '../../components/room/loot-gate';
import { LootLevelAnimation } from '../../components/room/loot-level-animation';
import { LootingRoom } from '../../components/room/looting-room';
import { MountOverlay } from '../../components/room/mount-overlay';
import { RoomAISystems } from '../../components/room/room-ai-systems';
import { CaptionsOverlay } from '../../components/room/captions-overlay';
import { RoomEchoDialog } from '../../components/room/room-echo-dialog';
import { RoomThemeArchitectDialog } from '../../components/room/room-theme-architect-dialog';
import { RoomSupportDialog } from '../../components/room/room-support-dialog';
import { MovieAdProtection } from '../../components/room/movie-ad-protection';
import { LuckyRainOverlay } from '../../components/room/lucky-rain-overlay';
import { CPProposeDialog } from '../../components/room/cp-propose-dialog';
import { AiVoiceAnnouncer } from '../../components/room/ai-voice-announcer';
import { EmojiReactionOverlay } from '../../components/room/emoji-reaction-overlay';
import { useVoiceCaptions } from '../../hooks/use-voice-captions';
import { useTranslation } from '../../hooks/use-translation';
import { useActivityTracker } from '../../hooks/use-activity-tracker';
import { useMediaPreloader } from '../../hooks/use-media-preloader';
import { useScreenWakeLock } from '../../hooks/use-screen-wake-lock';
import { Image } from 'expo-image';

export default function RoomScreen() {
  const { id, name, coverUrl, backgroundUrl, roomThemeId, hasPassword } = useLocalSearchParams<{
    id: string;
    name?: string;
    coverUrl?: string;
    backgroundUrl?: string;
    roomThemeId?: string;
    hasPassword?: string;
  }>();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const database = useDatabase();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const { setActiveRoom, setIsMinimized, setMinimizedRoom, minimizedRoom, isSpeakerMuted, setIsSpeakerMuted, isAIVoiceEnabled, isAIListening, setIsAIListening, isGiftEffects } = useRoomContext();
  const [sessionJoinTime] = useState(new Date());
  const isMinimizingRef = useRef(false);

  const [isGiftPickerOpen, setIsGiftPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatInputOpen, setIsChatInputOpen] = useState(false);
  const [isPlayOpen, setIsPlayOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showTopSupporters, setShowTopSupporters] = useState(false);
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [showGoldenChest, setShowGoldenChest] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [showGiftBattle, setShowGiftBattle] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showNetMirror, setShowNetMirror] = useState(false);
  const [showEntertainmentHub, setShowEntertainmentHub] = useState(false);
  const [showScreenMirror, setShowScreenMirror] = useState(false);
  const [showSports, setShowSports] = useState(false);
  const [showMoviePlayer, setShowMoviePlayer] = useState(false);
  const [moviePlayerData, setMoviePlayerData] = useState<{ tmdbId: string; title: string; posterPath: string; mediaType?: 'movie' | 'tv'; season?: number; episode?: number } | null>(null);
  const [showLootGate, setShowLootGate] = useState(false);
  const [showLevelAnimation, setShowLevelAnimation] = useState(false);
  const [levelAnimationUrl, setLevelAnimationUrl] = useState<string | undefined>(undefined);
  const [showLootingRoom, setShowLootingRoom] = useState(false);
  const [currentGateIndex, setCurrentGateIndex] = useState(0);
  const [currentGateLevelName, setCurrentGateLevelName] = useState('Home');
  const [showMountOverlay, setShowMountOverlay] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ uid: string; name: string; avatarUrl: string } | null>(null);
  const [entryEffect, setEntryEffect] = useState<{ username: string; avatarUrl?: string; mediaUrl?: string; videoUrl?: string; effect?: 'slide' | 'fade' | 'bounce' | 'lion' | 'line' | 'dragon' } | null>(null);
  const [selectedSeatIdx, setSelectedSeatIdx] = useState<number | null>(null);
  const [showSeatMenu, setShowSeatMenu] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [fullProfileUid, setFullProfileUid] = useState<string | null>(null);
  const [fullProfileData, setFullProfileData] = useState<any>(null);

  useEffect(() => {
    console.log('[FullProfile] useEffect fired, fullProfileUid:', fullProfileUid, 'currentUser.uid:', user?.uid);
    if (!fullProfileUid) { setFullProfileData(null); return; }
    const db = require('@react-native-firebase/firestore').default;
    
    let baseData: any = {};
    let subData: any = {};
    
    const updateMergedData = () => {
      setFullProfileData({
        ...baseData,
        ...subData,
        id: fullProfileUid
      });
    };

    const unsubBase = db().collection('users').doc(fullProfileUid)
      .onSnapshot((snap: any) => {
        console.log('[FullProfile] base user snap.exists:', typeof snap?.exists === 'function' ? snap.exists() : snap?.exists);
        baseData = snap && (typeof snap.exists === 'function' ? snap.exists() : snap.exists) ? snap.data() : {};
        updateMergedData();
      }, (e: any) => console.log('[FullProfile] base snapshot error:', e?.message));

    const unsubSub = db().collection('users').doc(fullProfileUid).collection('profile').doc(fullProfileUid)
      .onSnapshot((snap: any) => {
        console.log('[FullProfile] profile sub doc snap.exists:', typeof snap?.exists === 'function' ? snap.exists() : snap?.exists);
        subData = snap && (typeof snap.exists === 'function' ? snap.exists() : snap.exists) ? snap.data() : {};
        updateMergedData();
      }, (e: any) => console.log('[FullProfile] sub snapshot error:', e?.message));

    return () => {
      if (typeof unsubBase === 'function') unsubBase();
      if (typeof unsubSub === 'function') unsubSub();
    };
  }, [fullProfileUid]);

  const [fullProfileFollowData, setFullProfileFollowData] = useState<any>(null);
  const [isFullProfileProcessingFollow, setIsFullProfileProcessingFollow] = useState(false);

  useEffect(() => {
    if (!fullProfileUid || !user?.uid || !firestore) { setFullProfileFollowData(null); return; }
    const db = require('@react-native-firebase/firestore').default;
    const followId = `${user.uid}_${fullProfileUid}`;
    const unsub = db().collection('followers').doc(followId)
      .onSnapshot((snap: any) => {
        setFullProfileFollowData(snap && (typeof snap.exists === 'function' ? snap.exists() : snap.exists) ? { id: snap.id, ...snap.data() } : null);
      }, () => setFullProfileFollowData(null));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [fullProfileUid, user?.uid]);
  // Real-time stats for the clicked user profile
  const [fullProfileStats, setFullProfileStats] = useState({ fans: 0, following: 0, friends: 0, visitors: 0 });

  useEffect(() => {
    if (!fullProfileUid) {
      setFullProfileStats({ fans: 0, following: 0, friends: 0, visitors: 0 });
      return;
    }
    const db = require('@react-native-firebase/firestore').default;
    let fansList: any[] = [];
    let followingList: any[] = [];
    let visitorsList: any[] = [];
    
    const computeStats = () => {
      const fans = fansList.length;
      const following = followingList.length;
      const visitors = visitorsList.length;
      const fanIds = new Set(fansList.map(f => f.followerId));
      const followingIds = followingList.map(f => f.followingId);
      const friends = followingIds.filter(id => fanIds.has(id)).length;
      console.log('[Room-FullProfile] fansList:', fansList, 'followingList:', followingList, 'computedStats:', { fans, following, friends, visitors });
      setFullProfileStats({ fans, following, friends, visitors });
    };

    const unsubFans = db().collection('followers').where('followingId', '==', fullProfileUid)
      .onSnapshot((snap: any) => {
        fansList = snap ? snap.docs.map((d: any) => d.data()) : [];
        computeStats();
      }, (e: any) => console.log('[FullProfile] fans fetch error:', e?.message));

    const unsubFollowing = db().collection('followers').where('followerId', '==', fullProfileUid)
      .onSnapshot((snap: any) => {
        followingList = snap ? snap.docs.map((d: any) => d.data()) : [];
        computeStats();
      }, (e: any) => console.log('[FullProfile] following fetch error:', e?.message));

    const unsubVisitors = db().collection('users').doc(fullProfileUid).collection('profileVisitors')
      .onSnapshot((snap: any) => {
        visitorsList = snap ? snap.docs.map((d: any) => d.data()) : [];
        computeStats();
      }, (e: any) => console.log('[FullProfile] visitors fetch error:', e?.message));

    return () => {
      if (typeof unsubFans === 'function') unsubFans();
      if (typeof unsubFollowing === 'function') unsubFollowing();
      if (typeof unsubVisitors === 'function') unsubVisitors();
    };
  }, [fullProfileUid]);

  const [showMicInvite, setShowMicInvite] = useState(false);
  const [inviteData, setInviteData] = useState<{ inviterName?: string; seatIndex?: number }>({});
  const [showAudienceInvite, setShowAudienceInvite] = useState(false);
  const [profileCardUser, setProfileCardUser] = useState<any>(null);
  const [giftRecipient, setGiftRecipient] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const followRef = useMemo(() => {
    if (!firestore || !user?.uid || !id) return null;
    return doc(firestore, 'users', user.uid, 'followedRooms', id);
  }, [firestore, user?.uid, id]);
  const { data: followData } = useDoc<any>(followRef);

  useEffect(() => {
    setIsFollowing(!!followData);
  }, [followData]);

  const handleFollow = async () => {
    if (!firestore || !user?.uid || !id || !room) return;
    try {
      const userFollowRef = doc(firestore, 'users', user.uid, 'followedRooms', id);
      const roomFollowRef = doc(firestore, 'chatRooms', id, 'followers', user.uid);

      if (isFollowing) {
        await deleteDoc(userFollowRef);
        await deleteDoc(roomFollowRef);
        Alert.alert('Unfollowed', 'You have unfollowed this room.');
      } else {
        const followObj = {
          id: id,
          title: room.name || room.title || 'Room',
          coverUrl: room.coverUrl || '',
          roomNumber: room.roomNumber || '0000',
          ownerId: room.ownerId || '',
          followedAt: serverTimestamp()
        };
        await setDoc(userFollowRef, followObj, { merge: true });
        await setDoc(roomFollowRef, {
          uid: user.uid,
          followedAt: serverTimestamp()
        }, { merge: true });
        Alert.alert('Followed', 'You are now following this room.');
      }
    } catch (e: any) {
      console.error('[Room] Follow/Unfollow failed:', e?.message);
      Alert.alert('Error', 'Failed to follow/unfollow. Please try again.');
    }
  };
  const [giftAnimEvents, setGiftAnimEvents] = useState<any[]>([]);
  const [showLuckyRain, setShowLuckyRain] = useState(false);
  const [luckyRainAmount, setLuckyRainAmount] = useState(0);
  const [showEcho, setShowEcho] = useState(false);
  const [echoTarget, setEchoTarget] = useState<{ uid: string; name: string; avatarUrl: string } | null>(null);
  const [showThemeArchitect, setShowThemeArchitect] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [showAiVoiceAnnouncer, setShowAiVoiceAnnouncer] = useState(false);
  const [showCPPropose, setShowCPPropose] = useState(false);
  const [cpProposeTarget, setCpProposeTarget] = useState<{ uid: string; name: string; avatarUrl: string } | null>(null);
  const [emojiEffects, setEmojiEffects] = useState<Record<number, { emoji: string; key: number }>>({});
  const [aiVoiceAnnouncements, setAiVoiceAnnouncements] = useState<any[]>([]);

  const roomDocRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'chatRooms', id);
  }, [firestore, id]);
  const { data: room } = useDoc<Room>(roomDocRef);

  const displayRoom = useMemo(() => {
    return {
      id,
      name: name || 'Ummy Room',
      coverUrl: coverUrl || '',
      backgroundUrl: backgroundUrl || '',
      roomThemeId: roomThemeId || '',
      ownerId: room?.ownerId || '',
      moderatorIds: room?.moderatorIds || [],
      maxActiveMics: room?.maxActiveMics || 9,
      roomNumber: room?.roomNumber || '0000',
      announcement: room?.announcement || '',
      stats: room?.stats || { dailyGifts: 0 },
      ...room
    } as any;
  }, [room, id, name, coverUrl, backgroundUrl, roomThemeId]);

  const [secondaryQueriesReady, setSecondaryQueriesReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSecondaryQueriesReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const requiresPassword = (room ? room.password : (hasPassword === 'true')) && 
    user?.uid !== (room ? room.ownerId : '') && 
    !room?.moderatorIds?.includes(user?.uid || '') && 
    !isUnlocked;

  const handleVerifyPassword = () => {
    if (passwordInput === room?.password) {
      setIsUnlocked(true);
      setPasswordError('');
    } else {
      setPasswordError('Wrong password. Try again.');
      setPasswordInput('');
    }
  };

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'chatRooms', id, 'participants'));
  }, [firestore]);
  const { data: participantsData } = useCollection<RoomParticipant>(participantsQuery);
  
  const participants = useMemo(() => {
    if (!participantsData) return [];
    return participantsData.map(p => ({ ...p, uid: p.uid || p.id || '' }));
  }, [participantsData]);

  const onlineParticipants = useMemo(() => participants, [participants]);
  const seatedParticipants = useMemo(() => participants.filter(p => p.seatIndex > 0).sort((a, b) => a.seatIndex - b.seatIndex), [participants]);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    // Use 3 seconds before join time so entrance message is never missed
    const queryFrom = new Date(sessionJoinTime.getTime() - 3000);
    return query(
      collection(firestore, 'chatRooms', id, 'messages'),
      where('timestamp', '>', Timestamp.fromDate(queryFrom)),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
  }, [firestore, id]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  // Filter messages by chatClearedAt (web logic)
  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    const clearedAt = room?.chatClearedAt?.toDate?.() || null;
    if (!clearedAt) return messages;
    return messages.filter((m: any) => {
      if (m.type === 'system') return true;
      const msgTime = m.timestamp?.toDate?.() || new Date();
      return msgTime > clearedAt;
    });
  }, [messages, room?.chatClearedAt]);

  const musicQuery = useMemoFirebase(() => {
    if (!firestore || !id || !secondaryQueriesReady) return null;
    return query(collection(firestore, 'chatRooms', id, 'music'), orderBy('createdAt', 'desc'));
  }, [firestore, id, secondaryQueriesReady]);
  const { data: roomMusicLibrary } = useCollection<MusicTrack>(musicQuery);

  const topSupportersQuery = useMemoFirebase(() => {
    if (!firestore || !id || !secondaryQueriesReady) return null;
    return query(collection(firestore, 'chatRooms', id, 'topSupporters'), orderBy('dailyAmount', 'desc'), limit(50));
  }, [firestore, id, secondaryQueriesReady]);
  const { data: topSupporters } = useCollection<TopSupporter>(topSupportersQuery);

  const customEmojisQuery = useMemoFirebase(() => {
    if (!firestore || !secondaryQueriesReady) return null;
    return query(collection(firestore, 'customEmojis'), limit(100));
  }, [firestore, secondaryQueriesReady]);
  const { data: customEmojis } = useCollection<any>(customEmojisQuery);
  const customEmojiMap = useMemo(() => {
    if (!customEmojis) return {};
    const map: Record<string, any> = {};
    customEmojis.forEach((e: any) => { 
      const id = e.id || e.name?.toLowerCase().replace(/\s+/g, '-');
      if (id) {
        map[id] = { imageUrl: e.imageUrl, animationUrl: e.animationUrl, isCustom: true, zoom: e.zoom || 1.2, offsetX: e.offsetX || 0 };
      }
    });
    return map;
  }, [customEmojis]);

  const globalConfigDocRef = useMemo(() => {
    if (!firestore || !secondaryQueriesReady) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore, secondaryQueriesReady]);
  const { data: globalConfig } = useDoc<any>(globalConfigDocRef);

  const lootConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'lootSettings');
  }, [firestore]);
  const { data: lootConfig } = useDoc<any>(lootConfigDocRef);

  useEffect(() => {
    setIsMinimized(false);
    if (room) setActiveRoom(room);
    return () => {
      if (!isMinimizingRef.current) {
        setActiveRoom(null);
      }
      isMinimizingRef.current = false;
    };
  }, [room, setActiveRoom, setIsMinimized]);

  useEffect(() => {
    const onBackPress = () => {
      if (showExitDialog) { setShowExitDialog(false); return true; }
      if (showProfileCard) { setShowProfileCard(false); return true; }
      if (showFullProfile) { setShowFullProfile(false); setFullProfileUid(null); return true; }
      if (isGiftPickerOpen) { setIsGiftPickerOpen(false); return true; }
      if (showGames) { setShowGames(false); return true; }
      if (showYouTube) { setShowYouTube(false); return true; }
      if (showNetMirror) { setShowNetMirror(false); return true; }
      if (showEntertainmentHub) { setShowEntertainmentHub(false); return true; }
      if (showScreenMirror) { setShowScreenMirror(false); return true; }
      if (showSports) { setShowSports(false); return true; }
      if (showMoviePlayer) { setShowMoviePlayer(false); return true; }
      if (showSeatMenu) { setShowSeatMenu(false); return true; }
      if (isEmojiPickerOpen) { setIsEmojiPickerOpen(false); return true; }
      if (isInfoOpen) { setIsInfoOpen(false); return true; }
      if (showLootGate) { setShowLootGate(false); return true; }
      if (showLevelAnimation) { setShowLevelAnimation(false); setLevelAnimationUrl(undefined); return true; }
      if (showLootingRoom) { setShowLootingRoom(false); return true; }
      if (showLuckySpin) { setShowLuckySpin(false); return true; }
      if (showGoldenChest) { setShowGoldenChest(false); return true; }
      if (showSoundboard) { setShowSoundboard(false); return true; }
      if (showFollowers) { setShowFollowers(false); return true; }
      if (showTopSupporters) { setShowTopSupporters(false); return true; }
      if (isPlayOpen) { setIsPlayOpen(false); return true; }
      if (isMessagesOpen) { setIsMessagesOpen(false); return true; }
      if (showLanguagePicker) { setShowLanguagePicker(false); return true; }
      setShowExitDialog(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [showExitDialog, showProfileCard, showFullProfile, isGiftPickerOpen, showGames, showYouTube, showNetMirror, showEntertainmentHub, showScreenMirror, showSports, showMoviePlayer, showSeatMenu, isEmojiPickerOpen, isInfoOpen, showLootGate, showLevelAnimation, showLootingRoom, showLuckySpin, showGoldenChest, showSoundboard, showFollowers, showTopSupporters, isPlayOpen, isMessagesOpen, showLanguagePicker]);

  const processedMsgIds = useMemo(() => new Set<string>(), []);
  const shownEntranceEffects = useRef<Set<string>>(new Set());
  const lastAnnouncedMsgId = useRef<string | null>(null);
  const lastProcessedMsgCount = useRef(0);

  useEffect(() => {
    if (!messages?.length) return;
    const newMessages = messages.slice(lastProcessedMsgCount.current);
    lastProcessedMsgCount.current = messages.length;
    newMessages.forEach(msg => {
      if (processedMsgIds.has(msg.id)) return;
      processedMsgIds.add(msg.id);

      if (msg.type === 'entrance' && msg.senderName && msg.senderId !== 'SYSTEM_BOT') {
        if (!shownEntranceEffects.current.has(msg.senderId)) {
          shownEntranceEffects.current.add(msg.senderId);
          const effectType = (msg.entryEffectType as any) || null;
          if (effectType) {
            setEntryEffect({ username: msg.senderName, avatarUrl: msg.senderAvatar || undefined, mediaUrl: msg.mediaUrl || undefined, videoUrl: (msg as any).entryVideoUrl || undefined, effect: effectType });
          }
        }
      }
      if (msg.type === 'gift') {
        setGiftAnimEvents(prev => [...prev.slice(-5), { ...msg, id: msg.id || `${Date.now()}` }]);
      }
      if (msg.type === 'lucky-rain') {
        setLuckyRainAmount((msg as any).amount || 0);
        setShowLuckyRain(true);
      }
      if (msg.type === 'gift' && (msg as any).winnerUid && (msg as any).isBattle) {
        setShowGiftBattle(true);
      }
      if (msg.type === 'emoji' && !(msg as any).isSfx && msg.senderId) {
        const p = seatedParticipants.find(pp => pp.uid === msg.senderId);
        if (p && p.seatIndex) {
          const key = Date.now();
          setEmojiEffects(prev => ({ ...prev, [p.seatIndex!]: { emoji: (msg as any).text || '😊', key } }));
          setTimeout(() => setEmojiEffects(prev => { const n = { ...prev }; delete n[p.seatIndex!]; return n; }), 2500);
        }
      }

      // AI VOICE: Jab SYSTEM_BOT (Ummy AI) ka koi bhi message aaye — bol do
      if (msg.senderId === 'SYSTEM_BOT' && (msg.content || msg.text)) {
        const text = (msg.content || msg.text || '') as string;
        const hasHindi = /[\u0900-\u097F]/.test(text);
        setAiVoiceAnnouncements(prev => [
          ...prev,
          { id: msg.id || `bot-${Date.now()}`, text, lang: hasHindi ? 'hi-IN' : 'en-IN', type: 'system' }
        ]);
      }
    });
  }, [messages]);

  useRoomPresence({ activeRoom: room, minimizedRoom: minimizedRoom, userProfile: userProfile || null });

  const currentUserParticipant = useMemo(() => participants?.find(p => p.uid === user?.uid) || null, [participants, user?.uid]);
  // isInSeat derived directly — no useState delay
  const isInSeat = (currentUserParticipant?.seatIndex ?? 0) > 0;

  // isMuted: Firestore is source of truth, but local override ref blocks rollback for 3s after toggle
  const muteOverrideRef = useRef<boolean | null>(null);
  const muteOverrideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceUpdate] = useState(0); // just to trigger re-render

  const isMuted = muteOverrideRef.current !== null
    ? muteOverrideRef.current
    : (currentUserParticipant?.isMuted ?? false);

  // PERSISTENT EMOJI AUTO-CLEAR (3-SECOND RULE)
  useEffect(() => {
    if (!firestore || !id || !user?.uid || !currentUserParticipant?.activeEmoji) return;
    
    const timer = setTimeout(() => {
      const pRef = doc(firestore, 'chatRooms', id, 'participants', user.uid);
      updateDocumentNonBlocking(pRef, { activeEmoji: null });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [currentUserParticipant?.activeEmoji, firestore, id, user?.uid]);


  // AI Voice Announcer Listener
  useEffect(() => {
    if (!messages || !Array.isArray(messages) || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastAnnouncedMsgId.current === lastMsg.id) return;
    
    const announceableTypes = ['system', 'gift', 'entrance', 'loot'];
    if (announceableTypes.includes(lastMsg.type || '')) {
      let textToSpeak = lastMsg.content || lastMsg.text || '';
      if (lastMsg.type === 'entrance' && lastMsg.senderName) {
        textToSpeak = `${lastMsg.senderName} entered the room`;
      }
      if (textToSpeak) {
        lastAnnouncedMsgId.current = lastMsg.id;
        setAiVoiceAnnouncements(prev => {
          if (prev.some(a => a.id === lastMsg.id)) return prev;
          return [...prev, {
            id: lastMsg.id,
            text: textToSpeak,
            lang: 'hi',
            type: lastMsg.type,
            timestamp: Date.now()
          }];
        });
      }
    }
  }, [messages]);

  const isOwner = room?.ownerId === user?.uid;
  const isModerator = room?.moderatorIds?.includes(user?.uid || '') || false;
  const canManageRoom = isOwner || isModerator || user?.uid === '901piBzTQ0VzCtAvlyyobwvAaTs1';

  const agoraHook = useVoiceEngine({ roomId: id, isInSeat, isMuted, uid: user?.uid, isSpeakerMuted, keepAlive: isMinimizingRef.current });

  const { isMusicPlaying, musicState, isRepeatEnabled, setIsRepeatEnabled, handleToggleMusic, handleStopMusic, handleSeekMusic, handleNextMusic, handlePreviousMusic, setLocalVolume, songIntensity } = useMusicSync({ room: room || null, canManageRoom, userId: user?.uid, isSpeakerMuted, keepAlive: isMinimizingRef.current });

  const { taskProgress, achievedTasks, claimedTasks, claimTask, totalTasks, completedTasks } = useRoomTasks(id, onlineParticipants, room?.ownerId || '', isModerator);
  const { captions, isCaptionsEnabled, setIsCaptionsEnabled, sttEngine } = useVoiceCaptions(id, isInSeat, isMuted);
  const { targetLanguage, setTargetLanguage, sourceLanguage, setSourceLanguage, translateMessage, translating } = useTranslation();
  useActivityTracker(id, isInSeat);
  useMediaPreloader([], []);
  useScreenWakeLock(true);

  // AI Listen — Continuous STT to chat message
  const aiListenRecognitionRef = useRef<any>(null);
  useEffect(() => {
    if (!isAIListening) {
      // User ne manually off kiya — sab rokdo
      if (aiListenRecognitionRef.current) {
        try { aiListenRecognitionRef.current.stop?.(); } catch {}
        aiListenRecognitionRef.current = null;
      }
      try {
        const VoiceModule = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
        VoiceModule?.destroy?.().catch(() => {});
      } catch {}
      return;
    }

    let active = true; // Track if still enabled

    const startSTT = async () => {
      if (!active || !isAIListening) return;
      try {
        const VoiceModule = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
        if (VoiceModule) {
          VoiceModule.onSpeechResults = (e: any) => {
            const transcript = e.value?.[0];
            if (transcript) {
              handleSendMessage(transcript);
            }
            // Restart for next command (continuous mode)
            setTimeout(() => { if (active) startSTT(); }, 800);
          };
          VoiceModule.onSpeechError = () => {
            setTimeout(() => { if (active) startSTT(); }, 1000);
          };
          VoiceModule.onSpeechEnd = () => {
            // Don't setIsAIListening(false) — restart instead
            setTimeout(() => { if (active) startSTT(); }, 500);
          };
          await VoiceModule.start('hi-IN');
          aiListenRecognitionRef.current = VoiceModule;
          return;
        }
      } catch {}

      // Fallback: Web SpeechRecognition (continuous mode — Expo Go)
      try {
        if (typeof window === 'undefined') return; // Native build mein window nahi hoga
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return; // STT unavailable — toggle ON rakhna, silently do nothing
        const recognition = new SR();
        recognition.lang = 'hi-IN';
        recognition.interimResults = false;
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript;
              if (transcript) handleSendMessage(transcript);
            }
          }
        };
        recognition.onerror = () => {
          setTimeout(() => { if (active) startSTT(); }, 1000);
        };
        recognition.onend = () => {
          setTimeout(() => { if (active) startSTT(); }, 300);
        };
        recognition.start();
        aiListenRecognitionRef.current = recognition;
      } catch { /* Silent fail — don't turn off toggle */ }
    };

    startSTT();

    return () => {
      active = false;
      try { aiListenRecognitionRef.current?.stop?.(); } catch {}
    };
  }, [isAIListening]);

  const [showMiniPlayer, setShowMiniPlayer] = useState(true);
  useEffect(() => {
    if (displayRoom && displayRoom.currentMusicUrl) {
      setShowMiniPlayer(true);
    }
  }, [displayRoom?.currentMusicUrl]);

  function hashUidToNumber(uid: string | undefined): number {
    if (!uid) return 0;
    let hash = 5381;
    for (let i = 0; i < uid.length; i++) {
      hash = (hash * 33) ^ uid.charCodeAt(i);
    }
    return (hash >>> 0);
  }

  const maxSeats = displayRoom?.maxActiveMics || 9;
  const seatIndices = Array.from({ length: maxSeats }, (_, i) => i + 1);
  const getOccupant = (idx: number) => seatedParticipants.find(p => p.seatIndex === idx) || null;
  const isSeatLocked = (idx: number) => displayRoom?.lockedSeats?.includes(idx) || false;

  const getSeatSpeaking = useCallback((occupant: RoomParticipant | null) => {
    if (!occupant) return { isSpeaking: false, intensity: 0 };
    const isMe = occupant.uid === user?.uid;
    const agoraUid = hashUidToNumber(occupant.uid);
    let agoraIntensity = agoraHook?.getSpeakingIntensity(agoraUid);
    if (isMe && (!agoraIntensity || agoraIntensity === 0)) {
      agoraIntensity = agoraHook?.getSpeakingIntensity(0);
    }
    if (agoraIntensity > 15) return { isSpeaking: true, intensity: agoraIntensity };
    if (isMusicPlaying && songIntensity > 30) return { isSpeaking: true, intensity: songIntensity };
    return { isSpeaking: false, intensity: 0 };
  }, [agoraHook, isMusicPlaying, songIntensity]);

  const handleSeatClick = (seatIdx: number) => {
    setSelectedSeatIdx(seatIdx);
    const occupant = getOccupant(seatIdx);
    if (occupant) { 
      setProfileCardUser(occupant); 
      setShowProfileCard(true); 
    } else { 
      setShowSeatMenu(true); 
    }
  };

  const handleMuteSeat = async () => {
    if (!firestore || !id || selectedSeatIdx === null || !canManageRoom) return;
    const currentMuted = room?.mutedSeats || [];
    const isMuted = currentMuted.includes(selectedSeatIdx);
    await updateDocumentNonBlocking(doc(firestore, 'chatRooms', id), {
      mutedSeats: isMuted ? arrayRemove(selectedSeatIdx) : arrayUnion(selectedSeatIdx)
    });
  };

  const handleTakeSeat = async (seatIdx: number) => {
    if (!firestore || !id || !user?.uid || !userProfile) return;
    if (isSeatLocked(seatIdx)) return;
    const isSeatMuted = room?.mutedSeats?.includes(seatIdx) || false;
    muteOverrideRef.current = isSeatMuted;
    forceUpdate(n => n + 1);
    await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', user.uid), { seatIndex: seatIdx, isMuted: isSeatMuted, name: userProfile.username, avatarUrl: userProfile.avatarUrl, activeFrameMediaUrl: userProfile.inventory?.activeFrameMediaUrl || null, lastSeen: serverTimestamp() }, { merge: true });
    setTimeout(() => { muteOverrideRef.current = null; forceUpdate(n => n + 1); }, 2000);
  };

  const handleLeaveSeat = async (targetUid?: string) => {
    if (!firestore || !id || !user?.uid) return;
    const uidToLeave = targetUid || user.uid;
    const isSelf = uidToLeave === user.uid;
    if (isSelf) {
      muteOverrideRef.current = true;
      forceUpdate(n => n + 1);
    }
    await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', uidToLeave), { seatIndex: 0, isMuted: true, lastSeen: serverTimestamp() }, { merge: true });
    if (isSelf) {
      setTimeout(() => { muteOverrideRef.current = null; forceUpdate(n => n + 1); }, 2000);
    }
  };

  const handleMicToggle = async () => {
    if (!firestore || !id || !user?.uid) return;
    const newMuted = !isMuted;
    // Set local override for 3s to prevent Firestore listener rollback
    muteOverrideRef.current = newMuted;
    if (muteOverrideTimer.current) clearTimeout(muteOverrideTimer.current);
    muteOverrideTimer.current = setTimeout(() => {
      muteOverrideRef.current = null;
      forceUpdate(n => n + 1);
    }, 3000);
    forceUpdate(n => n + 1);
    await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', user.uid), { isMuted: newMuted, lastSeen: serverTimestamp() }, { merge: true });
  };

  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!firestore || !id || !user?.uid || !userProfile || (!text && !imageUrl)) return;
    await addDocumentNonBlocking(collection(firestore, 'chatRooms', id, 'messages'), { content: text, imageUrl: imageUrl || null, senderId: user.uid, senderName: userProfile.username, senderAvatar: userProfile.avatarUrl || null, senderBubble: userProfile.inventory?.activeBubble || null, chatRoomId: id, timestamp: serverTimestamp(), type: 'text' });
  };

  const handleImageUpload = async (uri: string): Promise<string | null> => {
    if (!storage || !id) return null;
    try {
      const filename = `${Date.now()}_${uri.split('/').pop()}`;
      const fileRef = storageRef(storage, `rooms/${id}/chat/${filename}`);
      const response = await fetch(uri); const blob = await response.blob();
      await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' }); return await getDownloadURL(fileRef);
    } catch (e) { console.error('[Room] Upload error:', e); return null; }
  };

  const handleExit = async () => {
    destroyAgoraEngine();
    destroyMusicSound();
    setActiveRoom(null);
    setMinimizedRoom(null);
    try { router.back(); } catch { router.replace('/'); }
    if (firestore && id && user?.uid) {
      try {
        const participantRef = doc(firestore, 'chatRooms', id, 'participants', user.uid);
        const roomRef = doc(firestore, 'chatRooms', id);
        const userRef = doc(firestore, 'users', user.uid);
        const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
        await Promise.all([
          deleteDoc(participantRef),
          updateDocumentNonBlocking(roomRef, { participantCount: increment(-1), updatedAt: serverTimestamp() }),
          updateDocumentNonBlocking(userRef, { currentRoomId: null, isOnline: false, updatedAt: serverTimestamp() }),
          updateDocumentNonBlocking(profileRef, { currentRoomId: null, isOnline: false, updatedAt: serverTimestamp() }),
        ]);
      } catch (e) { console.error('[Room] Exit cleanup error:', e); }
    }
  };
  const handleMinimize = () => {
    isMinimizingRef.current = true;
    if (room) setMinimizedRoom(room);
    setIsMinimized(true);
    try { router.back(); } catch { router.replace('/'); }
  };

  const handleLockSeat = async () => {
    if (!firestore || !id || selectedSeatIdx === null || !canManageRoom) return;
    const currentLocked = room?.lockedSeats || [];
    const isLocking = !currentLocked.includes(selectedSeatIdx);
    const newLocked = isLocking ? [...currentLocked, selectedSeatIdx] : currentLocked.filter(s => s !== selectedSeatIdx);
    
    await updateDocumentNonBlocking(doc(firestore, 'chatRooms', id), { lockedSeats: newLocked });

    if (isLocking) {
      const occupant = getOccupant(selectedSeatIdx);
      if (occupant) {
        await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', occupant.uid), { seatIndex: 0, isMuted: true }, { merge: true });
      }
    }
  };

  const handleMuteUser = async () => {
    if (!firestore || !id || selectedSeatIdx === null || !canManageRoom) return;
    const occupant = getOccupant(selectedSeatIdx);
    if (occupant) await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', occupant.uid), { isMuted: true, lastSeen: serverTimestamp() }, { merge: true });
  };

  const handleKickUser = async () => {
    if (!firestore || !id || selectedSeatIdx === null || !canManageRoom) return;
    const occupant = getOccupant(selectedSeatIdx);
    if (occupant) await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', occupant.uid), { seatIndex: 0, isMuted: true }, { merge: true });
  };

  const handleSendInvite = async (targetUid: string, targetName: string, targetAvatar: string | null, seatIdx: number) => {
    if (!firestore || !id || !user?.uid || !userProfile) return;
    await addDocumentNonBlocking(collection(firestore, 'chatRooms', id, 'messages'), {
      type: 'mic_invite', targetUid, targetSeatIndex: seatIdx, inviterId: user.uid, inviterName: userProfile.username, inviterAvatar: userProfile.avatarUrl || null,
      content: `${userProfile.username} invited you to join mic on seat #${seatIdx}`, senderId: 'SYSTEM_BOT', senderName: 'Ummy Chat', timestamp: serverTimestamp(), processed: false,
    });
    setShowAudienceInvite(false);
  };

  const handlePlayMovie = (tmdbId: string, title: string, posterPath: string) => {
    setMoviePlayerData({ tmdbId, title, posterPath });
    setShowMoviePlayer(true);
    if (firestore && id) {
      updateDocumentNonBlocking(doc(firestore, 'chatRooms', id), { currentMovie: { tmdbId, title, posterPath, startedBy: user?.uid } });
    }
  };

  useEffect(() => {
    if (!messages || !user?.uid) return;
    const inviteMsg = messages.find(m => m.type === 'mic_invite' && (m as any).targetUid === user.uid && !(m as any).processed);
    if (inviteMsg) {
      setInviteData({ inviterName: (inviteMsg as any).inviterName, seatIndex: (inviteMsg as any).targetSeatIndex });
      setShowMicInvite(true);
    }
  }, [messages, user?.uid]);

  const renderSeat = useCallback((idx: number) => {
    const occupant = getOccupant(idx);
    const isMe = occupant?.uid === user?.uid;
    // If user just left seat (seatIndex: 0 written but not yet propagated), treat as empty
    if (isMe && !isInSeat && occupant) {
      return (
        <Seat
          key={idx}
          index={idx}
          occupant={null}
          isMuted={false}
          isSeatMuted={false}
          isLocked={isSeatLocked(idx)}
          onClick={() => handleSeatClick(idx)}
          isSpeaking={false}
          speakingIntensity={0}
          activeEmoji={null}
          customEmojiMap={customEmojiMap}
          avatarFrameUrl={null}
        />
      );
    }
    const seatMuted = isMe ? isMuted : (occupant?.isMuted ?? false);
    const speakingInfo = getSeatSpeaking(occupant);
    return (
      <Seat
        key={idx}
        index={idx}
        occupant={occupant}
        isMuted={seatMuted}
        isSeatMuted={displayRoom?.mutedSeats?.includes(idx) && occupant?.uid !== displayRoom?.ownerId && occupant?.uid !== user?.uid}
        isLocked={isSeatLocked(idx)}
        onClick={() => handleSeatClick(idx)}
        isSpeaking={speakingInfo.isSpeaking}
        speakingIntensity={speakingInfo.intensity}
        activeEmoji={occupant?.activeEmoji}
        customEmojiMap={customEmojiMap}
        avatarFrameUrl={occupant?.activeFrameMediaUrl}
      />
    );
  }, [getOccupant, user?.uid, isMuted, isInSeat, displayRoom?.mutedSeats, displayRoom?.ownerId, isSeatLocked, handleSeatClick, getSeatSpeaking, customEmojiMap]);

  if (requiresPassword) {
    return (
      <View className="flex-1">
        <Image source={{ uri: displayRoom?.coverUrl || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2000' }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" cachePolicy="memory-disk" transition={300} />
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <SafeAreaView className="flex-1">
            <View className="flex-1 items-center justify-center px-8">
              <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 32, width: '100%', alignItems: 'center' }}>
                <Lock size={48} color="#ff6b9d" />
                <Text className="text-white text-xl font-bold mt-4">{displayRoom.name || displayRoom.title || 'Room'}</Text>
                <Text className="text-white/60 text-sm mt-2">This room is password protected</Text>
                <TextInput
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  placeholder="Enter 4-digit password"
                  placeholderTextColor="#ffffff50"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, fontSize: 20, color: 'white', width: '100%', textAlign: 'center', letterSpacing: 12, marginTop: 20, borderWidth: 1, borderColor: passwordError ? '#ff4444' : 'rgba(255,255,255,0.2)' }}
                />
                {passwordError ? <Text className="text-red-400 text-xs mt-2">{passwordError}</Text> : null}
                <TouchableOpacity onPress={handleVerifyPassword} style={{ backgroundColor: '#ff6b9d', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: 16, width: '100%', alignItems: 'center' }}>
                  <Text className="text-white font-bold text-base">Enter Room</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12, padding: 8 }}>
                  <Text className="text-white/50 text-sm">Go Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const themeConfigBg = ROOM_THEMES.find(t => t.id === displayRoom?.roomThemeId);
  const backgroundSource = themeConfigBg 
    ? (typeof themeConfigBg.url === 'string' ? { uri: themeConfigBg.url } : themeConfigBg.url) 
    : { uri: displayRoom?.backgroundUrl || displayRoom?.coverUrl || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2000' };

  return (
    <View className="flex-1">
      <Image key={displayRoom?.backgroundUrl || displayRoom?.coverUrl || 'default'} source={backgroundSource} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" cachePolicy="memory-disk" transition={300} />
      <RoomAISystems 
        roomId={id} 
        messages={filteredMessages || []} 
        participants={onlineParticipants} 
        isOwner={isOwner} 
        isModerator={isModerator} 
        canManageRoom={canManageRoom} 
        ownerId={displayRoom?.ownerId}
        moderatorIds={displayRoom?.moderatorIds || []}
      />
      <SafeAreaView className="flex-1">
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} className="absolute top-0 left-0 right-0 h-40 z-0" pointerEvents="none" />

        <RoomHeader roomTitle={displayRoom.name || displayRoom.title || 'Room'} roomId={displayRoom.id} roomNumber={displayRoom.roomNumber} onlineCount={participants.length} coverUrl={displayRoom.coverUrl} isOwner={isOwner} isFollowing={isFollowing} onOpenInfo={() => setIsInfoOpen(true)} onFollow={handleFollow} onOpenSettings={() => setIsSettingsOpen(true)} onOpenShare={() => setIsShareOpen(true)} onExit={() => setShowExitDialog(true)} onOpenUserList={() => setIsUserListOpen(true)} />

        <RoomTrophyBadge dailyGifts={displayRoom?.stats?.dailyGifts || 0} supporters={topSupporters || []} onPress={() => setShowTopSupporters(true)} />

        <View className="flex-1 z-10">
          {/* Seats — fixed, never scroll */}
          <View className="px-2">
            <MovieSyncBanner visible={!!displayRoom?.currentMovie} movieTitle={displayRoom?.currentMovie?.title} posterPath={displayRoom?.currentMovie?.posterPath} startedBy={displayRoom?.currentMovie?.startedBy} onJoin={() => { if (displayRoom?.currentMovie) { setMoviePlayerData({ tmdbId: displayRoom.currentMovie.tmdbId, title: displayRoom.currentMovie.title, posterPath: displayRoom.currentMovie.posterPath, mediaType: displayRoom.currentMovie.mediaType, season: displayRoom.currentMovie.season, episode: displayRoom.currentMovie.episode }); setShowMoviePlayer(true); }}} onDismiss={() => {}} />
            <View className="items-center w-full mb-1">
              {renderSeat(1)}
            </View>
            <View className="flex-row flex-wrap justify-between px-2">
              {seatIndices.slice(1).map(idx => renderSeat(idx))}
            </View>
          </View>

          {/* Chat + Announcement — only this scrolls */}
          <ScrollView 
            className="flex-1 px-2" 
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, flexGrow: 1 }} 
            showsVerticalScrollIndicator={false}
          >
            {((globalConfig?.globalAnnouncement || displayRoom?.announcement) && (!displayRoom?.chatClearedAt || (displayRoom?.chatClearedAt?.toDate?.() || 0) < (sessionJoinTime || new Date()))) && (
              <View className="ml-2 bg-black/40 rounded-xl px-3 py-1 border border-white/10" style={{ marginRight: maxSeats >= 13 ? 96 : 64 }}>
                {globalConfig?.globalAnnouncement && (
                  <Text className="text-white text-[11px] font-bold mb-1">{globalConfig.globalAnnouncement}</Text>
                )}
                {displayRoom?.announcement && (
                  <Text className="text-white/90 text-[11px] font-medium">{displayRoom.announcement}</Text>
                )}
              </View>
            )}
            <View className="mt-2" style={{ flex: 1 }}>
              <RoomChatArea messages={filteredMessages || []} chatClearedAt={displayRoom.chatClearedAt} onAvatarPress={(uid) => { setFullProfileUid(uid); setShowFullProfile(true); }} onImagePress={(url) => { setPreviewImageUrl(url); setShowImagePreview(true); }} targetLanguage={targetLanguage} sourceLanguage={sourceLanguage} />
            </View>
          </ScrollView>
        </View>

        {/* Floating Banners (Mid-Bottom Right) */}
        <View className="absolute right-2 z-50 items-end gap-2" pointerEvents="box-none" style={{ bottom: maxSeats >= 13 ? 224 : 256 }}>
          <RoomBanners onOpenSupport={() => setShowSupportDialog(true)} onOpenSpin={() => setShowLuckySpin(true)} onOpenChest={() => setShowGoldenChest(true)} />
        </View>

        {/* Floating Loot Box (Bottom Right, just above footer actions) */}
        <View className="absolute bottom-20 right-2 z-50" pointerEvents="box-none">
          <LootBoxDisplay
            roomId={id}
            topSupporters={topSupporters || []}
            isOwner={isOwner}
            onOpenGate={(idx) => { setCurrentGateIndex(idx); setShowLootGate(true); }}
            onGateReady={(idx, name) => { setCurrentGateIndex(idx); setCurrentGateLevelName(name); setShowLootGate(true); }}
          />
        </View>

        {isGiftEffects && <GiftAnimationOverlay events={giftAnimEvents} />}

        {(() => {
          const themeConfig = ROOM_THEMES.find(t => t.id === room?.roomThemeId);
          const animId = themeConfig?.animationId || 'none';
          return <LiveBackground themeId={animId} />;
        })()}

         <EntryEffectPlayer visible={!!entryEffect} username={entryEffect?.username} avatarUrl={entryEffect?.avatarUrl} mediaUrl={entryEffect?.mediaUrl} videoUrl={entryEffect?.videoUrl} effect={entryEffect?.effect || 'lion'} onComplete={() => setEntryEffect(null)} />
        <CaptionsOverlay captions={captions} visible={isCaptionsEnabled} />
        <LuckyRainOverlay visible={showLuckyRain} roomId={id} coinAmount={luckyRainAmount} onComplete={() => setShowLuckyRain(false)} />
        <AiVoiceAnnouncer enabled={isAIVoiceEnabled} language="hi" announcements={aiVoiceAnnouncements} />

        {isOwner && (
          <View className="absolute right-2 top-24 z-20 items-center">
            <TouchableOpacity onPress={() => setIsTasksOpen(true)} activeOpacity={0.8} className="relative group">
              <Image source={require('../../../assets/images/golden_task_jar.png')} className="w-16 h-16 bg-transparent" contentFit="contain" />
              {achievedTasks.some(taskId => !claimedTasks.includes(taskId)) && (
                <View className="absolute top-0 right-1 h-4 w-4 bg-red-500 rounded-full border border-black shadow-lg items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 5 }} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {displayRoom?.currentMusicUrl && showMiniPlayer && (
          <View className="absolute bottom-32 left-4 right-16 z-50" pointerEvents="box-none">
            <MusicMiniPlayer title={displayRoom.currentMusicTitle || 'Playing...'} isPlaying={isMusicPlaying} isRepeatEnabled={isRepeatEnabled} currentTime={musicState.currentTime} duration={musicState.duration} onPlayPause={handleToggleMusic} onNext={() => handleNextMusic(roomMusicLibrary || [])} onPrevious={() => handlePreviousMusic(roomMusicLibrary || [])} onToggleRepeat={() => setIsRepeatEnabled(!isRepeatEnabled)} onSeek={(t) => handleSeekMusic(t)} onVolumeChange={(v) => setLocalVolume(v)} onClose={() => handleStopMusic()} onMinimize={() => setShowMiniPlayer(false)} onOpenLibrary={() => setIsPlayOpen(true)} canManage={canManageRoom} />
          </View>
        )}

        {displayRoom?.currentMusicUrl && !showMiniPlayer && (
          <TouchableOpacity
            onPress={() => setShowMiniPlayer(true)}
            activeOpacity={0.8}
            className="absolute right-4 bottom-40 z-50 p-1.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg border border-blue-400/50"
          >
            <View className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 overflow-hidden">
              <Disc3 size={24} color="white" />
            </View>
          </TouchableOpacity>
        )}

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} className="absolute bottom-0 left-0 right-0 h-40 z-0" pointerEvents="none" />

        <View className="z-10">
          <RoomFooter isMicMuted={isMuted} isSpeakerMuted={isSpeakerMuted} isInSeat={isInSeat} onToggleMic={handleMicToggle} onToggleSpeaker={() => setIsSpeakerMuted(!isSpeakerMuted)} onOpenChatInput={() => setIsChatInputOpen(true)} onOpenEmoji={() => setIsEmojiPickerOpen(true)} onOpenMessages={() => setIsMessagesOpen(true)} onOpenGift={() => { setGiftRecipient(null); setIsGiftPickerOpen(true); }} onOpenPlay={() => setIsPlayOpen(true)} onOpenSoundboard={() => setShowSoundboard(true)} onOpenGames={() => setShowGames(true)} onOpenYouTube={() => setShowYouTube(true)} onOpenEntertainment={() => setShowEntertainmentHub(true)} onOpenScreenMirror={() => setShowScreenMirror(true)} onOpenSports={() => setShowSports(true)} onOpenCaptions={() => setIsCaptionsEnabled(!isCaptionsEnabled)} onOpenLanguagePicker={() => setShowLanguagePicker(true)} onOpenEcho={() => setShowEcho(true)} onOpenThemeArchitect={() => setShowThemeArchitect(true)} onOpenSupport={() => setShowSupportDialog(true)} />
        </View>

        <ChatInputBar visible={isChatInputOpen} onClose={() => setIsChatInputOpen(false)} onSend={handleSendMessage} onImageUpload={handleImageUpload} targetLanguage={targetLanguage} sourceLanguage={sourceLanguage} onSelectLanguage={setTargetLanguage} onSelectSourceLanguage={setSourceLanguage} />
      </SafeAreaView>

      <ExitRoomSheet visible={showExitDialog} onClose={() => setShowExitDialog(false)} onExit={handleExit} onMinimize={handleMinimize} />
      <RoomSettingsSheet visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} room={displayRoom} participants={onlineParticipants} />
      <RoomShareSheet visible={isShareOpen} onClose={() => setIsShareOpen(false)} room={displayRoom} />
      <RoomUserList 
        visible={isUserListOpen} 
        onClose={() => setIsUserListOpen(false)} 
        participants={onlineParticipants} 
        ownerId={displayRoom.ownerId} 
        moderatorIds={displayRoom.moderatorIds} 
        onUserPress={(uid) => { 
          setIsUserListOpen(false); 
          const p = participants?.find(pp => pp.uid === uid);
          if (p) {
            setProfileCardUser(p);
            setShowProfileCard(true);
          }
        }} 
      />
      <RoomInfoSheet 
        visible={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        room={displayRoom} 
        isOwner={isOwner} 
        onUserPress={(uid) => { setIsInfoOpen(false); setFullProfileUid(uid); setShowFullProfile(true); }} 
      />
      <RoomPlaySheet
        visible={isPlayOpen}
        onClose={() => setIsPlayOpen(false)}
        roomId={id}
        room={displayRoom}
        participants={onlineParticipants}
        onOpenGames={() => { setIsPlayOpen(false); setTimeout(() => setShowGames(true), 350); }}
        onOpenYouTube={() => { setIsPlayOpen(false); setTimeout(() => setShowYouTube(true), 350); }}
        onOpenNetMirror={() => { setIsPlayOpen(false); setTimeout(() => setShowNetMirror(true), 350); }}
        onOpenEntertainment={() => { setIsPlayOpen(false); setTimeout(() => setShowEntertainmentHub(true), 350); }}
        onOpenScreenMirror={() => { setIsPlayOpen(false); setTimeout(() => setShowScreenMirror(true), 350); }}
      />
      <RoomMicInvite visible={showMicInvite} onClose={() => setShowMicInvite(false)} onAccept={() => { if (inviteData.seatIndex) handleTakeSeat(inviteData.seatIndex); setShowMicInvite(false); }} onDecline={() => setShowMicInvite(false)} inviterName={inviteData.inviterName} seatIndex={inviteData.seatIndex} />
      <GiftPicker visible={isGiftPickerOpen} onClose={() => setIsGiftPickerOpen(false)} roomId={id} participants={onlineParticipants} initialRecipient={giftRecipient} onLocalGiftEvent={(evt) => setGiftAnimEvents(prev => [...prev.slice(-5), evt])} />
      <RoomLanguagePicker visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)} sourceLanguage={sourceLanguage} targetLanguage={targetLanguage} onSelectSourceLanguage={setSourceLanguage} onSelectLanguage={setTargetLanguage} />
      <RoomEmojiPickerDialog visible={isEmojiPickerOpen} onClose={() => setIsEmojiPickerOpen(false)} roomId={id} />
      <RoomTasksDialog visible={isTasksOpen} onClose={() => setIsTasksOpen(false)} taskProgress={taskProgress} achievedTasks={achievedTasks} claimedTasks={claimedTasks} onClaim={claimTask} totalRoomGifts={displayRoom.stats?.totalGifts || 0} />

      <RoomTopSupportersDialog visible={showTopSupporters} onClose={() => setShowTopSupporters(false)} supporters={topSupporters || []} />
      <RoomLuckySpinDialog visible={showLuckySpin} onClose={() => setShowLuckySpin(false)} roomId={id} />
      <RoomGoldenChestDialog visible={showGoldenChest} onClose={() => setShowGoldenChest(false)} roomId={id} />
      <ImagePreviewDialog visible={showImagePreview} onClose={() => setShowImagePreview(false)} imageUrl={previewImageUrl} />
      <RoomSoundboard visible={showSoundboard} onClose={() => setShowSoundboard(false)} roomId={id} />
      <RoomMessagesDialog visible={isMessagesOpen} onClose={() => { setIsMessagesOpen(false); setMessageRecipient(null); }} roomId={id} initialRecipient={messageRecipient} />
      <RoomFollowersDialog visible={showFollowers} onClose={() => setShowFollowers(false)} roomId={id} />
      <RoomGamesDialog visible={showGames} onClose={() => setShowGames(false)} onSelectGame={(g, title, coverUrl) => { setActiveGame(g); }} roomId={id} canManage={canManageRoom} />
      <GiftBattleCanvas visible={showGiftBattle} roomId={id} />
      <RoomGameOverlay visible={!!activeGame} gameId={activeGame} onClose={() => setActiveGame(null)} roomId={id} isAdmin={canManageRoom} />
      <YouTubeDialog visible={showYouTube} onClose={() => setShowYouTube(false)} roomId={id} isHost={isOwner || isModerator} canClose={canManageRoom} />
      <NetMirrorDialog visible={showNetMirror} onClose={() => setShowNetMirror(false)} />
      <EntertainmentHubDialog visible={showEntertainmentHub} onClose={() => setShowEntertainmentHub(false)} roomId={id} isHost={isOwner || isModerator} canManage={canManageRoom} />
      <ScreenMirrorDialog visible={showScreenMirror} onClose={() => setShowScreenMirror(false)} roomId={id} userId={user?.uid || ''} isHost={isOwner || isModerator} agoraHook={agoraHook} />
      <SportsHubDialog visible={showSports} onClose={() => setShowSports(false)} />
      <MoviePlayer visible={showMoviePlayer} onClose={() => setShowMoviePlayer(false)} tmdbId={moviePlayerData?.tmdbId} title={moviePlayerData?.title} posterPath={moviePlayerData?.posterPath} mediaType={moviePlayerData?.mediaType} season={moviePlayerData?.season} episode={moviePlayerData?.episode} />
      <MovieAdProtection isOpen={showMoviePlayer} videoUrl={moviePlayerData?.tmdbId ? (moviePlayerData.mediaType === 'tv' ? `https://vidlink.pro/tv/${moviePlayerData.tmdbId}/${moviePlayerData.season}/${moviePlayerData.episode}` : `https://vidlink.pro/movie/${moviePlayerData.tmdbId}`) : null} />
      <LootGate 
        visible={showLootGate} 
        onClose={() => setShowLootGate(false)} 
        roomId={id}
        levelName={currentGateLevelName}
        levelIndex={currentGateIndex}
        topSupporters={topSupporters || []}
        isOwner={isOwner}
        currentUserId={user?.uid}
        onCrack={(idx) => {
          setShowLootGate(false);
          const levels = lootConfig?.levels || [];
          const animUrl = levels[idx]?.animation;
          if (animUrl) {
            setLevelAnimationUrl(animUrl);
            setShowLevelAnimation(true);
          } else {
            setTimeout(() => setShowLootingRoom(true), 300);
          }
        }}
        lootConfig={lootConfig}
      />
      <LootLevelAnimation
        visible={showLevelAnimation}
        videoUrl={levelAnimationUrl}
        levelName={currentGateLevelName}
        onComplete={() => { setShowLevelAnimation(false); setLevelAnimationUrl(undefined); setTimeout(() => setShowLootingRoom(true), 300); }}
      />
      <LootingRoom visible={showLootingRoom} onClose={() => setShowLootingRoom(false)} roomId={id} />
      <MountOverlay visible={showMountOverlay} type="car" username={user?.displayName || 'Someone'} onComplete={() => setShowMountOverlay(false)} />
      <RoomEchoDialog visible={showEcho} onClose={() => { setShowEcho(false); setEchoTarget(null); }} targetUser={echoTarget} />
      <RoomThemeArchitectDialog visible={showThemeArchitect} onClose={() => setShowThemeArchitect(false)} roomId={id} isOwner={isOwner} />
      <RoomSupportDialog 
        visible={showSupportDialog} 
        onClose={() => setShowSupportDialog(false)} 
        roomStats={room?.stats}
        visitorCount={participants?.length || 0}
        levelPoints={room?.levelPoints || 0}
        roomId={id}
        isOwner={isOwner}
        participants={participants}
        partners={(room?.partners || []) as any}
      />
      <CPProposeDialog visible={showCPPropose} onClose={() => { setShowCPPropose(false); setCpProposeTarget(null); }} targetUser={cpProposeTarget} />
      <RoomSeatMenu
        visible={showSeatMenu}
        onClose={() => setShowSeatMenu(false)}
        seatIndex={selectedSeatIdx || 1}
        isLocked={selectedSeatIdx !== null && isSeatLocked(selectedSeatIdx)}
        isSeatMuted={selectedSeatIdx !== null && (room?.mutedSeats || []).includes(selectedSeatIdx)}
        isOwner={isOwner}
        isModerator={isModerator}
        onTakeSeat={() => selectedSeatIdx !== null && handleTakeSeat(selectedSeatIdx)}
        onLockSeat={handleLockSeat}
        onMuteSeat={handleMuteSeat}
        onInvite={() => setShowAudienceInvite(true)}
      />
      <RoomProfileCard
        visible={showProfileCard}
        onClose={() => setShowProfileCard(false)}
        user={profileCardUser ? { ...profileCardUser, isInSeat: seatedParticipants.some(p => p.uid === profileCardUser?.uid) } : null}
        isOwner={profileCardUser?.uid === room?.ownerId}
        isModerator={room?.moderatorIds?.includes(profileCardUser?.uid)}
        isMe={profileCardUser?.uid === user?.uid}
        canManage={canManageRoom}
        onSendMessage={(uid) => {
          const p = participants?.find(pp => pp.uid === uid);
          if (p) {
            setMessageRecipient({ uid: p.uid, name: p.name, avatarUrl: p.avatarUrl });
            setIsMessagesOpen(true);
            setShowProfileCard(false);
          }
        }}
        onFollow={async (uid: string) => {
          if (!uid || !firestore || !user?.uid) return;
          const followId = `${user.uid}_${uid}`;
          const followRef = doc(firestore, 'followers', followId);
          try {
            const snap = await getDoc(followRef);
            const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
            if (exists) {
              await deleteDoc(followRef);
              Alert.alert('Unfollowed', 'You have unfollowed this user.');
            } else {
              setDocumentNonBlocking(followRef, { followerId: user.uid, followingId: uid, timestamp: new Date() }, { merge: true });
              Alert.alert('Followed', 'You are now following this user.');
            }
          } catch (e: any) {
            console.error('[Room] User follow failed:', e?.message);
          }
        }}
        onReport={(uid) => { Alert.alert('Report', `User ${uid} reported`); }}
        onMute={(uid, current) => { if (!firestore || !id) return; setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', uid), { isMuted: !current }, { merge: true }); }}
        onKick={(uid) => { if (!firestore || !id) return; setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', uid), { seatIndex: 0, isMuted: true }, { merge: true }); }}
        onLeaveSeat={(uid) => {
          if (!firestore || !id) return;
          setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', uid), { seatIndex: 0, isMuted: true }, { merge: true });
        }}
        onToggleMod={(uid) => { if (!firestore || !id) return; const isMod = room?.moderatorIds?.includes(uid); updateDocumentNonBlocking(doc(firestore, 'chatRooms', id), { moderatorIds: isMod ? arrayRemove(uid) : arrayUnion(uid) }); }}
        onSendGift={(uid) => {
          const target = participants?.find(pp => pp.uid === uid);
          setGiftRecipient(target || null);
          setIsGiftPickerOpen(true);
        }}
        onMention={(username) => {}}
        onPropose={(target) => { setCpProposeTarget(target); setShowCPPropose(true); }}
        onEcho={(target) => {
          setEchoTarget(target);
          setShowEcho(true);
        }}
        onViewProfile={(uid) => { setShowProfileCard(false); setFullProfileUid(uid); setShowFullProfile(true); }}
        isLocked={profileCardUser?.seatIndex !== undefined && (room?.lockedSeats || []).includes(profileCardUser.seatIndex)}
        onLockSeat={async (seatIdx) => {
          if (!firestore || !id) return;
          const currentLocked = room?.lockedSeats || [];
          const isLocking = !currentLocked.includes(seatIdx);
          const newLocked = isLocking
            ? [...currentLocked, seatIdx]
            : currentLocked.filter(s => s !== seatIdx);
          
          await updateDocumentNonBlocking(doc(firestore, 'chatRooms', id), { lockedSeats: newLocked });

          if (isLocking) {
            const occupant = participants?.find(p => p.seatIndex === seatIdx);
            if (occupant) {
              await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', occupant.uid), { seatIndex: 0, isMuted: true }, { merge: true });
            }
          }
        }}
      />
      <FullProfileDialog
        open={showFullProfile}
        onOpenChange={(v: boolean) => { setShowFullProfile(v); if (!v) setFullProfileUid(null); }}
        profile={fullProfileData}
        stats={fullProfileStats}
        isOwnProfile={fullProfileUid === user?.uid}
        displayId={fullProfileData?.accountNumber || fullProfileUid?.slice(0, 6)}
        followData={fullProfileFollowData}
        isProcessingFollow={isFullProfileProcessingFollow}
        onFollow={async () => {
          if (!fullProfileUid || !firestore || !user?.uid) return;
          setIsFullProfileProcessingFollow(true);
          const followId = `${user.uid}_${fullProfileUid}`;
          const followRef = doc(firestore, 'followers', followId);
          try {
            if (fullProfileFollowData) {
              await deleteDoc(followRef);
            } else {
              setDocumentNonBlocking(followRef, { followerId: user.uid, followingId: fullProfileUid, timestamp: new Date() }, { merge: true });
            }
          } catch {}
          setIsFullProfileProcessingFollow(false);
        }}
        onChat={(p: any) => {
          setMessageRecipient({ uid: p.id || p.uid, name: p.username || p.name, avatarUrl: p.avatarUrl });
          setIsMessagesOpen(true);
        }}
        onMention={(username: string) => {
          setIsChatInputOpen(true);
        }}
        onGift={(recipient: any) => {
          setGiftRecipient(recipient);
          setIsGiftPickerOpen(true);
        }}
        onChangeFrame={() => {
          setShowFullProfile(false);
        }}
        onRemoveFrame={async () => {
          if (!firestore || !fullProfileUid) return;
          try { await setDocumentNonBlocking(doc(firestore, 'users', fullProfileUid, 'profile', fullProfileUid), { 'inventory.activeFrame': 'None' }, { merge: true }); } catch {}
        }}
      />
      <Modal visible={showAudienceInvite} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 max-h-[70%] pb-6" style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
            <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
              <Text className="text-white text-base font-bold">Invite to Seat #{selectedSeatIdx}</Text>
              <TouchableOpacity onPress={() => setShowAudienceInvite(false)} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
            </View>
            <ScrollView className="px-4 pt-2" showsVerticalScrollIndicator={false}>
              {((participants || []).filter(p => !p.seatIndex || p.seatIndex === 0)).length === 0 ? (
                <Text className="text-white/40 text-sm text-center py-10">No audience members to invite</Text>
              ) : (
                ((participants || []).filter(p => !p.seatIndex || p.seatIndex === 0)).map((p) => (
                  <TouchableOpacity key={p.uid} onPress={() => handleSendInvite(p.uid, p.name, p.avatarUrl || null, selectedSeatIdx!)} className="flex-row items-center py-3 border-b border-white/5">
                    <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }} className="w-10 h-10 rounded-full bg-slate-700" />
                    <Text className="text-white text-sm font-bold ml-3 flex-1">{p.name}</Text>
                    <UserPlus size={16} color="rgba(167,139,250,0.7)" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
