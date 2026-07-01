export type User = {
  id: string;
  accountNumber: string;
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  isOnline?: boolean;
  coverUrl?: string;
  gender?: 'Male' | 'Female' | null;
  country?: string | null;
  level?: {
    rich: number;
    charm: number;
  };
  frame?: 'CG' | 'Official' | 'Leader' | 'Seller' | 'None';
  tags?: string[];
  stats?: {
    sent?: number;
    followers?: number;
    fans?: number;
    totalGifts?: number;
    dailyFans?: number;
    dailyGiftsReceived?: number;
    weeklyGiftsReceived?: number;
    monthlyGiftsReceived?: number;
    dailyGameWins?: number;
    weeklyGameWins?: number;
    monthlyGameWins?: number;
    friends?: number;
    following?: number;
  };
  wallet?: {
    coins: number;
    diamonds: number;
    totalSpent: number;
    dailySpent: number;
    weeklySpent: number;
    monthlySpent: number;
  };
  inventory?: {
    activeFrame?: string;
    activeFrameMediaUrl?: string | null;
    activeTheme?: string;
    activeBubble?: string;
    activeWave?: string;
    activeEntryMediaUrl?: string | null;
    activeEntryEffect?: string;
    activeEntryVideoUrl?: string;
    ownedItems: string[];
    expiries?: Record<string, any>;
  };
  banStatus?: {
    isBanned: boolean;
    bannedUntil: any;
    reason: string;
  };
  createdAt?: any;
  updatedAt?: any;
  lastSignInAt?: any;
  currentRoomId?: string | null;
  isAdmin?: boolean;
  idColor?: 'red' | 'blue' | 'purple' | 'none';
  isBudgetId?: boolean;
  activityPoints?: number;
  dailyActivityPoints?: number;
  dailyActivityPointsDate?: string;
  totalBonusClaimed?: number;
  lastBonusClaimDate?: string;
  charmPoints?: number;
  svip?: number;
  mysteriousVisitor?: boolean;
  hideGiftRecord?: boolean;
  rankInvisible?: boolean;
  roomInvisible?: boolean;
  avoidBeingKicked?: boolean;
  medals?: string[];
  whatsapp?: string;
  showWhatsapp?: boolean;
  lastSeen?: any;
  blockedUsers?: string[];
  showLastSeen?: boolean;
  relationship?: { type: string; partnerUid?: string; partnerName?: string; partnerAvatar?: string; level?: number; startDate?: string };
};

export type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderBubble?: string | null;
  senderBubbleMediaUrl?: string | null;
  timestamp: any;
  type?: 'text' | 'gift' | 'entrance' | 'leave' | 'emoji' | 'lucky-rain' | 'lucky-bag' | 'system' | 'mic_invite';
  giftId?: string;
  giftName?: string;
  giftValue?: number;
  animationId?: string;
  recipientName?: string;
  recipientSeat?: number;
  recipientId?: string;
  luckyWin?: { multiplier: number; winAmount: number } | null;
  bagId?: string;
  amount?: number;
  imageUrl?: string | null;
  animationUrl?: string | null;
  videoUrl?: string | null;
  soundUrl?: string | null;
  tier?: 'normal' | 'epic' | 'legendary';
  content?: string;
  mediaUrl?: string | null;
  chatRoomId?: string;
  inviterName?: string;
  inviterAvatar?: string;
  targetUid?: string;
  targetSeatIndex?: number;
  isSfx?: boolean;
  sfxId?: string;
  entryEffectType?: string;
  entryVideoUrl?: string;
};

export type PrivateChat = {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastSenderId: string;
  lastMessageReadBy?: string[];
  updatedAt: any;
  pinnedBy?: string[];
};

export type PrivateMessage = {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  imageUrl?: string | null;
  audioUrl?: string | null;
};

export type RoomParticipant = {
  id?: string;
  uid: string;
  name: string;
  avatarUrl: string;
  seatIndex: number;
  isMuted: boolean;
  isSilenced?: boolean;
  joinedAt: any;
  activeFrame?: string;
  activeFrameMediaUrl?: string | null;
  activeWave?: string;
  activeBubble?: string;
  activeEmoji?: string | null;
  activeIdBadge?: string;
  sessionGifts?: number;
  accountNumber?: string;
  gender?: string;
  lastSeen?: any;
  updatedAt?: any;
};

export type Room = {
  id: string;
  roomNumber: string;
  slug: string;
  name?: string;
  title: string;
  topic: string;
  category: 'Popular' | 'Game' | 'Chat' | 'Singing' | 'Music' | 'Party';
  coverUrl: string;
  backgroundUrl?: string;
  roomThemeId?: string;
  announcement?: string;
  password?: string;
  ownerId: string;
  moderatorIds?: string[];
  lockedSeats?: number[];
  createdAt: any;
  participantCount?: number;
  isChatMuted?: boolean;
  isCalculatorActive?: boolean;
  currentMusicUrl?: string | null;
  currentMusicTitle?: string | null;
  currentMusicId?: string | null;
  currentMusicOwnerId?: string | null;
  currentMusicType?: 'youtube' | 'upload' | null;
  musicUpdatedAt?: any;
  musicUpdatedBy?: string | null;
  musicCurrentTime?: number;
  musicStartedAt?: any;
  musicStartOffset?: number;
  isMusicPlaying?: boolean;
  maxActiveMics?: number;
  isSuperMic?: boolean;
  isBrightMode?: boolean;
  stats?: {
    totalGifts: number;
    dailyGifts: number;
    weeklyGifts: number;
    monthlyGifts: number;
    lastWealthResetDate?: any;
  };
  levelPoints?: number;
  rocket?: {
    progress: number;
    target: number;
    countdownUntil: any | null;
    open?: boolean;
    lastLaunchTime?: any;
    lastResetDate?: string;
    level?: number;
  };
  language?: string;
  tags?: string[];
  isVoiceMuted?: boolean;
  mutedSeats?: number[];
  chatClearedAt?: any;
  isPinned?: boolean;
  currentMovie?: {
    tmdbId: string;
    title: string;
    posterPath: string;
    startedBy: string;
  };
  partners?: Record<string, any>;
  hostName?: string;
  hostAvatar?: string;
  updatedAt?: any;
  bannedUsers?: string[];
};

export type Gift = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  animationUrl?: string;
  videoUrl?: string;
  soundUrl?: string;
  tier?: 'normal' | 'epic' | 'legendary';
  category?: string;
  animationId?: string;
  createdAt?: any;
};

export type TopSupporter = {
  uid: string;
  username: string;
  avatarUrl: string | null;
  amount: number;
  dailyAmount: number;
  weeklyAmount: number;
  updatedAt: any;
};

export type Moment = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  userLevel: number;
  userCountry: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  type: 'image' | 'video' | null;
  likes: number;
  views: number;
  reach: number;
  commentsCount: number;
  createdAt: any;
};

export type Comment = {
  id: string;
  text: string;
  userId: string;
  username: string;
  avatarUrl: string;
  createdAt: any;
  parentId: string | null;
  likesCount: number;
};

export type MomentComment = Comment & {
  replies?: MomentComment[];
};

export type Proposal = {
  id: string;
  toUid: string;
  fromUid: string;
  status: 'pending' | 'accepted' | 'declined';
  type: string;
  timestamp: any;
};

export type CpPair = {
  id: string;
  participantIds: string[];
  type: string;
  cpValue: number;
  level: number;
  user1Name?: string;
  user1Avatar?: string;
  user2Name?: string;
  user2Avatar?: string;
  createdAt: any;
  updatedAt: any;
};

export type MusicTrack = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  type: 'upload';
  size: number;
  uploadedBy: string;
  uploaderName: string;
  createdAt: any;
};

export type GiftBattleState = {
  isActive: boolean;
  leftUser: { uid: string; name: string; avatarUrl: string } | null;
  rightUser: { uid: string; name: string; avatarUrl: string } | null;
  scoreLeft: number;
  scoreRight: number;
  winnerUid?: string | null;
  takeoverEffect?: 'gold' | 'neon' | 'cosmic' | null;
};

export type LeaderboardThemeConfig = {
  id?: string;
  name: string;
  backgroundUrl: string;
  backgroundType: 'image' | 'video';
  isActive: boolean;
  frameConfigs: {
    rank1: { videoUrl: string; imageUrl: string; type: 'video' | 'image'; isEnabled: boolean };
    rank2: { videoUrl: string; imageUrl: string; type: 'video' | 'image'; isEnabled: boolean };
    rank3: { videoUrl: string; imageUrl: string; type: 'video' | 'image'; isEnabled: boolean };
    top: { videoUrl: string; imageUrl: string; type: 'video' | 'image'; isEnabled: boolean };
  };
};
