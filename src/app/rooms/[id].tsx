import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ImageBackground, TouchableOpacity, Animated, Modal, Alert, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, collection, query, orderBy, limit, where, Timestamp, serverTimestamp, arrayUnion, arrayRemove, increment, deleteDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useStorage, useDatabase } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useRoomPresence } from '../../hooks/use-room-presence';
import { useMusicSync, destroyMusicSound } from '../../hooks/use-music-sync';
import { useRoomContext } from '../../context/room-context';
import { useAgoraNative, destroyAgoraEngine } from '../../hooks/use-agora-native';
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
import { UserPlus, X, Disc3 } from 'lucide-react-native';
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
import { EntertainmentHubDialog } from '../../components/room/entertainment-hub-dialog';
import { ScreenMirrorDialog } from '../../components/room/screen-mirror-dialog';
import { SportsHubDialog } from '../../components/room/sports-hub-dialog';
import { MoviePlayer } from '../../components/room/movie-player';
import { MovieSyncBanner } from '../../components/room/movie-sync-banner';
import { LootGate } from '../../components/room/loot-gate';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const database = useDatabase();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const { setActiveRoom, setIsMinimized, setMinimizedRoom, minimizedRoom, isSpeakerMuted, setIsSpeakerMuted, isAIVoiceEnabled, isAIListening, setIsAIListening } = useRoomContext();
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
  const [showEntertainmentHub, setShowEntertainmentHub] = useState(false);
  const [showScreenMirror, setShowScreenMirror] = useState(false);
  const [showSports, setShowSports] = useState(false);
  const [showMoviePlayer, setShowMoviePlayer] = useState(false);
  const [moviePlayerData, setMoviePlayerData] = useState<{ tmdbId: string; title: string; posterPath: string } | null>(null);
  const [showLootGate, setShowLootGate] = useState(false);
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
  const [fullProfileUser, setFullProfileUser] = useState<any>(null);
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

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'chatRooms', id, 'participants'));
  }, [firestore]);
  const { data: participantsData } = useCollection<RoomParticipant>(participantsQuery);
  
  const participants = useMemo(() => {
    if (!participantsData) return [];
    return participantsData.map(p => ({ ...p, uid: p.uid || p.id }));
  }, [participantsData]);

  const onlineParticipants = useMemo(() => participants, [participants]);
  const seatedParticipants = useMemo(() => participants.filter(p => p.seatIndex > 0).sort((a, b) => a.seatIndex - b.seatIndex), [participants]);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(
      collection(firestore, 'chatRooms', id, 'messages'),
      where('timestamp', '>', Timestamp.fromDate(sessionJoinTime)),
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
    if (!firestore || !id) return null;
    return query(collection(firestore, 'chatRooms', id, 'music'), orderBy('createdAt', 'desc'));
  }, [firestore, id]);
  const { data: roomMusicLibrary } = useCollection<MusicTrack>(musicQuery);

  const topSupportersQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'chatRooms', id, 'topSupporters'), orderBy('dailyAmount', 'desc'), limit(50));
  }, [firestore, id]);
  const { data: topSupporters } = useCollection<TopSupporter>(topSupportersQuery);

  const customEmojisQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customEmojis'), limit(100));
  }, [firestore]);
  const { data: customEmojis } = useCollection<any>(customEmojisQuery);
  const customEmojiMap = useMemo(() => {
    if (!customEmojis) return {};
    const map: Record<string, any> = {};
    customEmojis.forEach((e: any) => { 
      const id = e.id || e.name?.toLowerCase().replace(/\s+/g, '-');
      if (id) {
        map[id] = { imageUrl: e.imageUrl, animationUrl: e.animationUrl, isCustom: true };
      }
    });
    return map;
  }, [customEmojis]);

  const globalConfigDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);
  const { data: globalConfig } = useDoc<any>(globalConfigDocRef);

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
      setShowExitDialog(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

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
          const effectType = (msg.entryEffectType as any) || 'line';
          setEntryEffect({ username: msg.senderName, avatarUrl: msg.senderAvatar || undefined, mediaUrl: msg.mediaUrl || undefined, videoUrl: (msg as any).entryVideoUrl || undefined, effect: effectType });
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
    : (currentUserParticipant?.isMuted ?? true);

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

  const agoraHook = useAgoraNative(id, isInSeat, isMuted, user?.uid, isSpeakerMuted, isMinimizingRef.current);

  const { isMusicPlaying, musicState, isRepeatEnabled, setIsRepeatEnabled, handleToggleMusic, handleStopMusic, handleSeekMusic, handleNextMusic, handlePreviousMusic, setLocalVolume, songIntensity } = useMusicSync({ room: room || null, canManageRoom, userId: user?.uid, isSpeakerMuted, keepAlive: isMinimizingRef.current });

  const { taskProgress, achievedTasks, claimedTasks, claimTask, totalTasks, completedTasks } = useRoomTasks(id, onlineParticipants, room?.ownerId || '', isModerator);
  const { captions, isCaptionsEnabled, setIsCaptionsEnabled, sttEngine } = useVoiceCaptions(id, isInSeat, isMuted);
  const { targetLanguage, setTargetLanguage, sourceLanguage, setSourceLanguage, translateMessage, translating } = useTranslation();
  useActivityTracker(id, isInSeat);
  useMediaPreloader([], []);
  useScreenWakeLock(true);

  // AI Listen — STT to chat message (web app logic ported to native)
  const aiListenRecognitionRef = useRef<any>(null);
  useEffect(() => {
    if (!isAIListening) {
      if (aiListenRecognitionRef.current) {
        try { aiListenRecognitionRef.current.stop?.(); } catch {}
        aiListenRecognitionRef.current = null;
      }
      return;
    }
    const startSTT = async () => {
      try {
        const VoiceModule = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
        if (VoiceModule) {
          VoiceModule.onSpeechResults = (e: any) => {
            const transcript = e.value?.[0];
            if (transcript) {
              handleSendMessage(transcript);
              setIsAIListening(false);
            }
          };
          VoiceModule.onSpeechError = () => { setIsAIListening(false); };
          VoiceModule.onSpeechEnd = () => { setIsAIListening(false); };
          await VoiceModule.start('hi-IN');
          aiListenRecognitionRef.current = VoiceModule;
          return;
        }
      } catch {}
      // Fallback: try web SpeechRecognition
      try {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          const recognition = new SR();
          recognition.lang = 'hi-IN';
          recognition.interimResults = false;
          recognition.continuous = false;
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) handleSendMessage(transcript);
            setIsAIListening(false);
          };
          recognition.onerror = () => { setIsAIListening(false); };
          recognition.onend = () => { setIsAIListening(false); };
          recognition.start();
          aiListenRecognitionRef.current = recognition;
        } else {
          setIsAIListening(false);
        }
      } catch { setIsAIListening(false); }
    };
    startSTT();
    return () => {
      try { aiListenRecognitionRef.current?.stop?.(); } catch {}
    };
  }, [isAIListening]);

  const [showMiniPlayer, setShowMiniPlayer] = useState(true);
  useEffect(() => {
    if (room?.currentMusicUrl) {
      setShowMiniPlayer(true);
    }
  }, [room?.currentMusicUrl]);

  function hashUidToNumber(uid: string | undefined): number {
    if (!uid) return 0;
    let hash = 5381;
    for (let i = 0; i < uid.length; i++) {
      hash = (hash * 33) ^ uid.charCodeAt(i);
    }
    return (hash >>> 0);
  }

  const maxSeats = room?.maxActiveMics || 9;
  const seatIndices = Array.from({ length: maxSeats }, (_, i) => i + 1);
  const getOccupant = (idx: number) => seatedParticipants.find(p => p.seatIndex === idx) || null;
  const isSeatLocked = (idx: number) => room?.lockedSeats?.includes(idx) || false;

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
    const isSeatMuted = room?.mutedSeats?.includes(seatIdx) || false;
    muteOverrideRef.current = isSeatMuted;
    forceUpdate(n => n + 1);
    await setDocumentNonBlocking(doc(firestore, 'chatRooms', id, 'participants', user.uid), { seatIndex: seatIdx, isMuted: isSeatMuted, name: userProfile.username, avatarUrl: userProfile.avatarUrl, lastSeen: serverTimestamp() }, { merge: true });
    // Clear override after 2s — Firestore will have synced by then
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
    if (firestore && id && user?.uid) {
      try {
        const participantRef = doc(firestore, 'chatRooms', id, 'participants', user.uid);
        const roomRef = doc(firestore, 'chatRooms', id);
        await deleteDoc(participantRef);
        await updateDocumentNonBlocking(roomRef, { participantCount: increment(-1), updatedAt: serverTimestamp() });
        await updateDocumentNonBlocking(doc(firestore, 'users', user.uid), { currentRoomId: null, isOnline: false, updatedAt: serverTimestamp() });
        await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'profile', user.uid), { currentRoomId: null, isOnline: false, updatedAt: serverTimestamp() });
      } catch (e) { console.error('[Room] Exit cleanup error:', e); }
    }
    setActiveRoom(null);
    setMinimizedRoom(null);
    try { router.back(); } catch { router.replace('/'); }
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
    const newLocked = currentLocked.includes(selectedSeatIdx) ? currentLocked.filter(s => s !== selectedSeatIdx) : [...currentLocked, selectedSeatIdx];
    await updateDocumentNonBlocking(doc(firestore, 'chatRooms', id), { lockedSeats: newLocked });
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
        isSeatMuted={room?.mutedSeats?.includes(idx) && occupant?.uid !== room?.ownerId}
        isLocked={isSeatLocked(idx)}
        onClick={() => handleSeatClick(idx)}
        isSpeaking={speakingInfo.isSpeaking}
        speakingIntensity={speakingInfo.intensity}
        activeEmoji={occupant?.activeEmoji}
        customEmojiMap={customEmojiMap}
        avatarFrameUrl={occupant?.activeFrameMediaUrl}
      />
    );
  }, [getOccupant, user?.uid, isMuted, isInSeat, room?.mutedSeats, room?.ownerId, isSeatLocked, handleSeatClick, getSeatSpeaking, customEmojiMap]);

  if (!room) return <View className="flex-1 bg-black items-center justify-center"><Text className="text-white/60 text-sm">Loading room...</Text></View>;

  const themeConfigBg = ROOM_THEMES.find(t => t.id === room?.roomThemeId);
  const backgroundSource = themeConfigBg 
    ? (typeof themeConfigBg.url === 'string' ? { uri: themeConfigBg.url } : themeConfigBg.url) 
    : { uri: room?.backgroundUrl || room?.coverUrl || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2000' };

  return (
    <ImageBackground key={room?.backgroundUrl || room?.coverUrl || 'default'} source={backgroundSource} className="flex-1" resizeMode="cover">
      <RoomAISystems roomId={id} messages={filteredMessages || []} participants={onlineParticipants} isOwner={isOwner} isModerator={isModerator} canManageRoom={canManageRoom} />
      <SafeAreaView className="flex-1">
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} className="absolute top-0 left-0 right-0 h-40 z-0" pointerEvents="none" />

        <RoomHeader roomTitle={room.name || room.title || 'Room'} roomId={room.id} roomNumber={room.roomNumber} onlineCount={participants.length} coverUrl={room.coverUrl} isOwner={isOwner} isFollowing={isFollowing} onOpenInfo={() => setIsInfoOpen(true)} onFollow={handleFollow} onOpenSettings={() => setIsSettingsOpen(true)} onOpenShare={() => setIsShareOpen(true)} onExit={() => setShowExitDialog(true)} onOpenUserList={() => setIsUserListOpen(true)} />



        <RoomTrophyBadge dailyGifts={room?.stats?.dailyGifts || 0} supporters={topSupporters || []} onPress={() => setShowTopSupporters(true)} />

        <View className="flex-1 z-10">
          {/* Seats — fixed, never scroll */}
          <View className="px-2">
            <MovieSyncBanner visible={!!room?.currentMovie} movieTitle={room?.currentMovie?.title} posterPath={room?.currentMovie?.posterPath} startedBy={room?.currentMovie?.startedBy} onJoin={() => { if (room?.currentMovie) { setMoviePlayerData({ tmdbId: room.currentMovie.tmdbId, title: room.currentMovie.title, posterPath: room.currentMovie.posterPath }); setShowMoviePlayer(true); }}} onDismiss={() => {}} />
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
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }} 
            style={{ overflow: 'visible' }} 
            showsVerticalScrollIndicator={false}
          >
            {((globalConfig?.globalAnnouncement || room?.announcement) && (!room?.chatClearedAt || (room?.chatClearedAt?.toDate?.() || 0) < (sessionJoinTime || new Date()))) && (
              <View className="ml-2 mr-16 bg-black/40 rounded-xl px-3 py-1 border border-white/10">
                {globalConfig?.globalAnnouncement && (
                  <Text className="text-white text-[11px] font-bold mb-1">{globalConfig.globalAnnouncement}</Text>
                )}
                {room?.announcement && (
                  <Text className="text-white/90 text-[11px] font-medium">{room.announcement}</Text>
                )}
              </View>
            )}
            <View className="mt-2 min-h-[300px]">
              <RoomChatArea messages={filteredMessages || []} chatClearedAt={room.chatClearedAt} onAvatarPress={(uid) => { const p = participants?.find(pp => pp.uid === uid); if (p) { setProfileCardUser(p); setShowProfileCard(true); }}} onImagePress={(url) => { setPreviewImageUrl(url); setShowImagePreview(true); }} targetLanguage={targetLanguage} sourceLanguage={sourceLanguage} />
            </View>
          </ScrollView>
        </View>

        {/* Floating Banners (Mid-Bottom Right) */}
        <View className="absolute bottom-64 right-2 z-50 items-end gap-2" pointerEvents="box-none">
          <RoomBanners onOpenSupport={() => setShowTopSupporters(true)} onOpenSpin={() => setShowLuckySpin(true)} onOpenChest={() => setShowGoldenChest(true)} />
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

        <GiftAnimationOverlay events={giftAnimEvents} />

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

        {room.currentMusicUrl && showMiniPlayer && (
          <View className="absolute bottom-32 left-4 right-16 z-50" pointerEvents="box-none">
            <MusicMiniPlayer title={room.currentMusicTitle || 'Playing...'} isPlaying={isMusicPlaying} isRepeatEnabled={isRepeatEnabled} currentTime={musicState.currentTime} duration={musicState.duration} onPlayPause={handleToggleMusic} onNext={() => handleNextMusic(roomMusicLibrary || [])} onPrevious={() => handlePreviousMusic(roomMusicLibrary || [])} onToggleRepeat={() => setIsRepeatEnabled(!isRepeatEnabled)} onSeek={(t) => handleSeekMusic(t)} onVolumeChange={(v) => setLocalVolume(v)} onClose={() => handleStopMusic()} onMinimize={() => setShowMiniPlayer(false)} onOpenLibrary={() => setIsPlayOpen(true)} canManage={canManageRoom} />
          </View>
        )}

        {room.currentMusicUrl && !showMiniPlayer && (
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
      <RoomSettingsSheet visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} room={room} participants={onlineParticipants} />
      <RoomShareSheet visible={isShareOpen} onClose={() => setIsShareOpen(false)} room={room} />
      <RoomUserList visible={isUserListOpen} onClose={() => setIsUserListOpen(false)} participants={onlineParticipants} ownerId={room.ownerId} moderatorIds={room.moderatorIds} onUserPress={(uid) => { setIsUserListOpen(false); const p = onlineParticipants?.find(pp => pp.uid === uid); if (p) { setProfileCardUser(p); setShowProfileCard(true); } }} />
      <RoomInfoSheet visible={isInfoOpen} onClose={() => setIsInfoOpen(false)} room={room} isOwner={isOwner} onUserPress={(uid) => { setIsInfoOpen(false); const p = onlineParticipants?.find(pp => pp.uid === uid); if (p) { setProfileCardUser(p); setShowProfileCard(true); } }} />
      <RoomPlaySheet
        visible={isPlayOpen}
        onClose={() => setIsPlayOpen(false)}
        roomId={id}
        room={room}
        participants={onlineParticipants}
        onOpenGames={() => { setIsPlayOpen(false); setTimeout(() => setShowGames(true), 350); }}
        onOpenYouTube={() => { setIsPlayOpen(false); setTimeout(() => setShowYouTube(true), 350); }}
        onOpenEntertainment={() => { setIsPlayOpen(false); setTimeout(() => setShowEntertainmentHub(true), 350); }}
        onOpenScreenMirror={() => { setIsPlayOpen(false); setTimeout(() => setShowScreenMirror(true), 350); }}
      />
      <RoomMicInvite visible={showMicInvite} onClose={() => setShowMicInvite(false)} onAccept={() => { if (inviteData.seatIndex) handleTakeSeat(inviteData.seatIndex); setShowMicInvite(false); }} onDecline={() => setShowMicInvite(false)} inviterName={inviteData.inviterName} seatIndex={inviteData.seatIndex} />
      <GiftPicker visible={isGiftPickerOpen} onClose={() => setIsGiftPickerOpen(false)} roomId={id} participants={onlineParticipants} initialRecipient={giftRecipient} onLocalGiftEvent={(evt) => setGiftAnimEvents(prev => [...prev.slice(-5), evt])} />
      <RoomLanguagePicker visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)} sourceLanguage={sourceLanguage} targetLanguage={targetLanguage} onSelectSourceLanguage={setSourceLanguage} onSelectLanguage={setTargetLanguage} />
      <RoomEmojiPickerDialog visible={isEmojiPickerOpen} onClose={() => setIsEmojiPickerOpen(false)} roomId={id} />
      <RoomTasksDialog visible={isTasksOpen} onClose={() => setIsTasksOpen(false)} taskProgress={taskProgress} achievedTasks={achievedTasks} claimedTasks={claimedTasks} onClaim={claimTask} totalRoomGifts={room.stats?.totalGifts || 0} />

      <RoomTopSupportersDialog visible={showTopSupporters} onClose={() => setShowTopSupporters(false)} supporters={topSupporters || []} />
      <RoomLuckySpinDialog visible={showLuckySpin} onClose={() => setShowLuckySpin(false)} roomId={id} />
      <RoomGoldenChestDialog visible={showGoldenChest} onClose={() => setShowGoldenChest(false)} roomId={id} />
      <ImagePreviewDialog visible={showImagePreview} onClose={() => setShowImagePreview(false)} imageUrl={previewImageUrl} />
      <RoomSoundboard visible={showSoundboard} onClose={() => setShowSoundboard(false)} roomId={id} />
      <GiftBattleCanvas visible={showGiftBattle} roomId={id} />
      <RoomMessagesDialog visible={isMessagesOpen} onClose={() => { setIsMessagesOpen(false); setMessageRecipient(null); }} roomId={id} initialRecipient={messageRecipient} />
      <RoomFollowersDialog visible={showFollowers} onClose={() => setShowFollowers(false)} roomId={id} />
      <RoomGamesDialog visible={showGames} onClose={() => setShowGames(false)} onSelectGame={(g, title, coverUrl) => { setActiveGame(g); }} roomId={id} />
      <RoomGameOverlay visible={!!activeGame} gameId={activeGame} onClose={() => setActiveGame(null)} roomId={id} />
      <YouTubeDialog visible={showYouTube} onClose={() => setShowYouTube(false)} roomId={id} isHost={isOwner || isModerator} canClose={canManageRoom} />
      <EntertainmentHubDialog visible={showEntertainmentHub} onClose={() => setShowEntertainmentHub(false)} roomId={id} isHost={isOwner || isModerator} canManage={canManageRoom} />
      <ScreenMirrorDialog visible={showScreenMirror} onClose={() => setShowScreenMirror(false)} roomId={id} userId={user?.uid || ''} isHost={isOwner || isModerator} agoraHook={agoraHook} />
      <SportsHubDialog visible={showSports} onClose={() => setShowSports(false)} />
      <MoviePlayer visible={showMoviePlayer} onClose={() => setShowMoviePlayer(false)} tmdbId={moviePlayerData?.tmdbId} title={moviePlayerData?.title} posterPath={moviePlayerData?.posterPath} />
      <MovieAdProtection isOpen={showMoviePlayer} videoUrl={moviePlayerData?.tmdbId ? `https://vidsrc.to/embed/movie/${moviePlayerData.tmdbId}` : null} />
      <LootGate 
        visible={showLootGate} 
        onClose={() => setShowLootGate(false)} 
        levelName={currentGateLevelName}
        levelIndex={currentGateIndex}
        topSupporters={topSupporters || []}
        isOwner={isOwner}
        currentUserId={user?.uid}
        onCrack={(idx) => { setShowLootGate(false); setTimeout(() => setShowLootingRoom(true), 300); }} 
      />
      <LootingRoom visible={showLootingRoom} onClose={() => setShowLootingRoom(false)} roomId={id} />
      <MountOverlay visible={showMountOverlay} type="car" username={user?.displayName || 'Someone'} onComplete={() => setShowMountOverlay(false)} />
      <RoomEchoDialog visible={showEcho} onClose={() => { setShowEcho(false); setEchoTarget(null); }} targetUser={echoTarget} />
      <RoomThemeArchitectDialog visible={showThemeArchitect} onClose={() => setShowThemeArchitect(false)} roomId={id} isOwner={isOwner} />
      <RoomSupportDialog visible={showSupportDialog} onClose={() => setShowSupportDialog(false)} totalGifts={room?.stats?.totalGifts || 0} />
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
        onFollow={(uid) => {}}
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
        onViewProfile={(uid) => { setShowProfileCard(false); const p = onlineParticipants?.find(pp => pp.uid === uid); if (p) { setFullProfileUser(p); setShowFullProfile(true); } }}
      />
      <FullProfileDialog open={showFullProfile} onOpenChange={setShowFullProfile} profile={fullProfileUser} stats={{ fans: 0, following: 0, friends: 0, visitors: 0 }} isOwnProfile={fullProfileUser?.uid === user?.uid} displayId={fullProfileUser?.accountNumber || fullProfileUser?.uid?.slice(0, 6)} />
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
    </ImageBackground>
  );
}
