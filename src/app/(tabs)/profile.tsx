import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Share, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, AVPlaybackStatus } from 'expo-av';
import { ChevronLeft, MoreHorizontal, Pencil, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useUser, useFirestore, useDoc } from '../../firebase/provider';
import { collection, query, where, orderBy, limit, doc, serverTimestamp, setDoc } from '@/firebase/firestore-compat';
import firestore from '@react-native-firebase/firestore';

// Subcomponents
import { 
  SVGA_OfficialTag, SVGA_GlossyID, SVGA_VIPBanner, SVGA_SellerTag, SVGA_ServiceTag, SVGA_HostTag,
  SVGA_CSLeaderTag, SVGA_CustomerServiceTag,
  SVGA_GoldDollar, SVGA_LevelCrown, SVGA_StoreCart, SVGA_MedalStar, SVGA_BonusGift, SVGA_InviteHeart, 
  SVGA_FamilyShield, SVGA_BagShirt, SVGA_CpHeart, SVGA_SellerBag, SVGA_Settings, SVGA_HelpCenter, SVGA_OfficialUser, SVGA_AboutInfo 
} from '../../components/profile/NativeSVGs';

// Modals
import { MedalModal } from '../../components/profile/MedalModal';
import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { SocialRelationsDialog } from '../../components/profile/SocialRelationsDialog';
import { SellerTransferDialog } from '../../components/profile/SellerTransferDialog';
import { FullProfileDialog } from '../../components/profile/FullProfileDialog';
import { ReportUserDialog } from '../../components/profile/ReportUserDialog';
import { OfficialCenterDialog } from '../../components/profile/OfficialCenterDialog';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const calculateAge = (birthday: any) => {
  if (!birthday) return null;
  let birthDate: Date;
  if (typeof birthday === 'object' && birthday.seconds) {
    birthDate = new Date(birthday.seconds * 1000);
  } else if (birthday.toDate) {
    birthDate = birthday.toDate();
  } else {
    birthDate = new Date(birthday);
  }
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const GenderAgeTag = ({ gender, birthday }: { gender: string | null | undefined, birthday?: string }) => {
  const age = calculateAge(birthday || '');
  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'}`} style={{ marginLeft: 8 }}>
      <Text className="text-[10px] font-bold text-white">{gender === 'Female' ? '♀' : '♂'}</Text>
      {age !== null && <Text className="text-[10px] font-bold text-white"> {age}</Text>}
    </View>
  );
};

const AvatarFrame = ({ frameId, frameMediaUrl, size = 'md', children }: { frameId?: string | null, frameMediaUrl?: string | null, size?: 'sm' | 'md' | 'lg' | 'xl', children: React.ReactNode }) => {
  const videoRef = useRef<Video>(null);
  const sizeMap = {
    sm: 40,
    md: 60,
    lg: 80,
    xl: 88
  };
  const pixelSize = sizeMap[size];
  const frameSize = size === 'xl' ? 140 : pixelSize * 1.55;
  const isVideo = frameMediaUrl && (frameMediaUrl.includes('.mp4') || frameMediaUrl.includes('.mov') || frameMediaUrl.includes('.webm') || frameMediaUrl.includes('video/'));

  useEffect(() => {
    if (isVideo && videoRef.current) {
      const timer = setTimeout(() => { videoRef.current?.playAsync?.(); }, 150);
      return () => clearTimeout(timer);
    }
  }, [isVideo]);

  return (
    <View style={{ width: frameSize, height: frameSize, borderRadius: frameSize / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {frameMediaUrl && frameMediaUrl !== 'None' && frameMediaUrl !== '' && isVideo && (
        <Video
          ref={videoRef}
          source={{ uri: frameMediaUrl }}
          style={{
            position: 'absolute',
            width: frameSize,
            height: frameSize,
            zIndex: 10,
          }}
          resizeMode="cover"
          shouldPlay
          isLooping
          isMuted
          useNativeControls={false}
        />
      )}
      {frameMediaUrl && frameMediaUrl !== 'None' && frameMediaUrl !== '' && !isVideo && (
        <Image cachePolicy="memory-disk" source={{ uri: frameMediaUrl }}
          style={{
            position: 'absolute',
            width: frameSize,
            height: frameSize,
            borderRadius: frameSize / 2,
            overflow: 'hidden',
            zIndex: 10,
          }}
          contentFit="cover"
        />
      )}
      <View style={{ width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2, overflow: 'hidden', zIndex: 11 }}>
        {children}
      </View>
    </View>
  );
};

const StatItem = ({ label, value, onPress }: { label: string, value: number, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minWidth: 60 }}>
    <Text style={{ fontSize: 20, fontWeight: '600', color: '#1f2937', marginBottom: 2 }}>{value || 0}</Text>
    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
  </TouchableOpacity>
);

const IconButton = ({ icon: Icon, label, onPress }: { icon: any, label: string, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="items-center gap-1.5 flex-1">
    <Icon />
    <Text className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</Text>
  </TouchableOpacity>
);

const ProfileMenuItem = ({ icon: Icon, label, extraColor, iconColor, onPress, extra }: any) => (
  <TouchableOpacity onPress={onPress} className="w-full flex-row items-center justify-between py-4 pl-4 pr-3 bg-white border-b border-slate-50">
    <View className="flex-row items-center gap-4">
      <View className={`p-1.5 rounded-xl ${iconColor || 'bg-slate-50'}`}>
        <Icon />
      </View>
      <Text className="font-medium text-[16px] text-[#1F2937]">{label}</Text>
    </View>
    <View className="flex-row items-center gap-1">
      {extra && <Text className={`text-[11px] font-medium uppercase tracking-wider ${extraColor}`}>{extra}</Text>}
      <ChevronRight size={16} color="#cbd5e1" />
    </View>
  </TouchableOpacity>
);

// ─── Native Budget Tag (mirrors web BudgetTag variants) ────────────────────
type BudgetVariant = 'gold' | 'diamond' | 'silver' | 'purple' | 'emerald' | 'rose' | 'rainbow' | 'none';
const BUDGET_STYLES: Record<BudgetVariant, { colors: string[]; icon: string }> = {
  gold:    { colors: ['#fbbf24', '#f59e0b', '#b45309'], icon: '👑' },
  diamond: { colors: ['#22d3ee', '#0891b2', '#155e75'], icon: '💎' },
  silver:  { colors: ['#94a3b8', '#475569', '#1e293b'], icon: '🛡️' },
  purple:  { colors: ['#a855f7', '#7e22ce', '#581c87'], icon: '✨' },
  emerald: { colors: ['#10b981', '#059669', '#064e3b'], icon: '💎' },
  rose:    { colors: ['#f43f5e', '#e11d48', '#881337'], icon: '👑' },
  rainbow: { colors: ['#ff0066', '#a855f7', '#3b82f6'], icon: '✨' },
  none:    { colors: ['#94a3b8', '#64748b', '#475569'], icon: '🪪' },
};
const NativeBudgetTag = ({ variant = 'gold', label }: { variant?: BudgetVariant; label?: string }) => {
  const style = BUDGET_STYLES[variant] || BUDGET_STYLES.none;
  return (
    <View style={{ borderRadius: 8, overflow: 'hidden' }}>
      <LinearGradient
        colors={style.colors as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Text style={{ fontSize: 10 }}>{style.icon}</Text>
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: -0.2, textTransform: 'uppercase' }}>
          {label || 'Budget'}
        </Text>
        <Text style={{ fontSize: 8 }}>✨</Text>
      </LinearGradient>
    </View>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const firestoreDb = useFirestore();

  const profileId = currentUser?.uid;
  const userDocRef = profileId && firestoreDb ? doc(firestoreDb, 'users', profileId) : null;
  const { data: profile } = useDoc(userDocRef);

  // ── Real profile doc: wallet + idColor + isBudgetId ───────────────────
  const [wallet, setWallet] = useState<{ coins: number; diamonds: number }>({ coins: 0, diamonds: 0 });
  const [idColor, setIdColor] = useState<string>('none');
  const [isBudgetId, setIsBudgetId] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    const unsub = firestore()
      .doc(`users/${profileId}/profile/${profileId}`)
      .onSnapshot(snap => {
        if (snap.exists()) {
          const d = snap.data() as any;
          setWallet({ coins: d?.wallet?.coins ?? 0, diamonds: d?.wallet?.diamonds ?? 0 });
          setIdColor(d?.idColor || 'none');
          setIsBudgetId(d?.isBudgetId || false);
        }
      }, err => console.warn('[Profile] profile doc error:', err));
    return () => unsub();
  }, [profileId]);

  // ── Real-time Stats via one-time fetch (not live listeners) ──────────────
  const [fansData, setFansData] = useState<any[]>([]);
  const [followingData, setFollowingData] = useState<any[]>([]);
  const [visitorsData, setVisitorsData] = useState<any[]>([]);

  useEffect(() => {
    if (!profileId || !firestore) return;
    let active = true;
    const fetchStats = async () => {
      try {
        const [fansSnap, followingSnap, visitorsSnap] = await Promise.all([
          firestore().collection('followers').where('followingId', '==', profileId).get(),
          firestore().collection('followers').where('followerId', '==', profileId).get(),
          firestore().collection('users').doc(profileId).collection('profileVisitors').orderBy('timestamp', 'desc').limit(50).get(),
        ]);
        if (!active) return;
        setFansData(fansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setFollowingData(followingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVisitorsData(visitorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
    };
    fetchStats();
    return () => { active = false; };
  }, [profileId, firestore]);

  // ── Computed stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const fans = fansData.length;
    const following = followingData.length;
    const visitors = visitorsData.length;
    const fanIds = new Set(fansData.map((f: any) => f.followerId));
    const followingIds = followingData.map((f: any) => f.followingId);
    const friends = followingIds.filter(id => fanIds.has(id)).length;
    return { fans, following, friends, visitors };
  }, [fansData, followingData, visitorsData]);

  // Modals State
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialTab, setSocialTab] = useState<'followers' | 'following' | 'friends' | 'visitors'>('followers');
  const [medalModalOpen, setMedalModalOpen] = useState(false);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [officialCenterOpen, setOfficialCenterOpen] = useState(false);

  const isAuthorizedAdmin = currentUser?.uid === '901piBzTQ0VzCtAvlyyobwvAaTs1' || profile?.isAdmin === true;
  const isCertifiedSeller = profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) || isAuthorizedAdmin;
  const displayID = profile?.accountNumber || '000000';

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(String(displayID));
  };

  const handleWhatsAppInvite = async () => {
    try {
      await Share.share({
        message: `Hey! Download Ummy Chat and join me! My ID is: ${displayID}`,
      });
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  if (!profile) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Identity...</Text>
      </View>
    );
  }


  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Background Gradients */}
      <View className="absolute top-0 left-0 right-0 h-24 bg-purple-400 z-0" />
      <LinearGradient colors={['rgba(192,132,252,1)', 'rgba(192,132,252,0)']} className="absolute top-24 left-0 right-0 h-32 z-0" />

      {/* Header */}
      <View className="absolute top-10 right-5 z-50">
        <EditProfileDialog profile={profile} trigger={
          <TouchableOpacity className="p-2 active:opacity-65">
            <Pencil size={24} color="#4b5563" />
          </TouchableOpacity>
        } />
      </View>

      <ScrollView className="flex-1 z-10" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-3">
          
          {/* Profile Card */}
          <View className="flex-row items-center gap-1 mb-0 pt-0">
            <TouchableOpacity onPress={() => setFullViewOpen(true)} style={{ marginLeft: -6 }}>
              <AvatarFrame
                frameId={profile.inventory?.activeFrame}
                frameMediaUrl={profile.inventory?.activeFrameMediaUrl}
                size="xl"
              >
                <View className="w-full h-full rounded-full border-2 border-white overflow-hidden shadow-xl">
                  <Image cachePolicy="memory-disk" source={{ uri: profile.avatarUrl || 'https://picsum.photos/200' }} className="w-full h-full" />
                </View>
              </AvatarFrame>
            </TouchableOpacity>

            <View className="flex-1 -ml-5 pt-3">
              <View className="flex-row items-center flex-wrap gap-1.5">
                <Text className="text-[22px] font-bold text-slate-800 tracking-tighter" numberOfLines={1}>{profile.username}</Text>
                <Text className="text-lg">🇮🇳</Text>
                <GenderAgeTag gender={profile.gender} birthday={profile.birthday} />
              </View>

              <View className="flex-row flex-wrap items-center gap-2 -mt-1.5">
                <TouchableOpacity onPress={handleCopyId}>
                  {profile.tags?.includes('Official') ? (
                    <SVGA_GlossyID label={`ID: ${displayID}`} />
                  ) : (
                    <NativeBudgetTag
                      variant={
                        profile.isAdmin ? 'gold'
                        : isBudgetId && idColor && idColor !== 'none' ? idColor as BudgetVariant
                        : 'silver'
                      }
                      label={`ID: ${displayID}`}
                    />
                  )}
                </TouchableOpacity>
                {profile.tags?.includes('Official') && <SVGA_OfficialTag />}
                {profile.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) && <SVGA_SellerTag />}
                {profile.tags?.includes('CS Leader') && <SVGA_CSLeaderTag />}
                {profile.tags?.includes('Customer Service') && <SVGA_CustomerServiceTag />}
                {profile.tags?.includes('Service') && <SVGA_ServiceTag />}
                {profile.tags?.includes('Host') && <SVGA_HostTag />}
              </View>
            </View>
          </View>

          {/* Stats Bar */}
          <View 
            className="py-2 px-1 mb-4 pl-1" 
            style={{ 
              flexDirection: 'row', 
              justifyContent: 'flex-start', 
              gap: 32, 
              borderBottomWidth: 1, 
              borderBottomColor: '#f1f5f9', 
              marginTop: -22, 
              marginLeft: 4 
            }}
          >
            <StatItem label="Fans" value={stats.fans} onPress={() => { setSocialTab('followers'); setSocialOpen(true); }} />
            <StatItem label="Following" value={stats.following} onPress={() => { setSocialTab('following'); setSocialOpen(true); }} />
            <StatItem label="Friends" value={stats.friends} onPress={() => { setSocialTab('friends'); setSocialOpen(true); }} />
            <StatItem label="Visitors" value={stats.visitors} onPress={() => { setSocialTab('visitors'); setSocialOpen(true); }} />
          </View>

          {/* Wallets */}
          <View className="flex-row gap-3 -mt-4 mb-1">
            <TouchableOpacity onPress={() => router.push('/wallet')} className="flex-1 h-[85px] rounded-2xl p-4 overflow-hidden">
              <LinearGradient colors={['#FFD700', '#FDB931', '#9E7302']} start={{x:0, y:0}} end={{x:1, y:1}} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View className="flex-row items-center gap-2 z-10">
                <SVGA_GoldDollar />
                <Text className="text-[10px] font-black text-[#5C4000] uppercase tracking-widest">Coins</Text>
              </View>
              <Text className="font-black text-[20px] text-[#422E00] tracking-tighter absolute bottom-4 left-5">
                {wallet.coins?.toFixed(1) || '0.0'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/wallet')} className="flex-1 h-[85px] rounded-2xl p-4 overflow-hidden">
              <LinearGradient colors={['#00D2FF', '#3a7bd5', '#004e92']} start={{x:0, y:0}} end={{x:1, y:1}} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View className="flex-row items-center gap-2 z-10">
                <View className="h-7 w-7 bg-white/20 rounded-full items-center justify-center border border-white/30"><Text>💎</Text></View>
                <Text className="text-[10px] font-black text-white uppercase tracking-widest">Diamonds</Text>
              </View>
              <Text className="font-black text-[20px] text-white tracking-tighter absolute bottom-4 left-5">
                {wallet.diamonds?.toFixed(1) || '0.0'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: -8 }}>
            <SVGA_VIPBanner onPress={() => router.push('/vips' as any)} />
          </View>

          {/* Quick Actions */}
          <View className="flex-row justify-between items-center -mx-7 mt-4">
            <IconButton icon={SVGA_LevelCrown} label="Level" onPress={() => router.push('/level' as any)} />
            <IconButton icon={SVGA_StoreCart} label="Store" onPress={() => router.push('/store' as any)} />
            <IconButton icon={SVGA_MedalStar} label="Medal" onPress={() => setMedalModalOpen(true)} />
            <IconButton icon={SVGA_BonusGift} label="Bonus" onPress={() => router.push('/bonus' as any)} />
          </View>

          {/* Menus */}
          <View className="pt-6 pb-32">
            <View className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
              <ProfileMenuItem icon={SVGA_InviteHeart} label="Invite friends" iconColor="bg-pink-50" onPress={handleWhatsAppInvite} />
              <ProfileMenuItem icon={SVGA_FamilyShield} label="Family" iconColor="bg-orange-50" extraColor="text-indigo-500" onPress={() => router.push('/families' as any)} />
              <ProfileMenuItem icon={SVGA_BagShirt} label="My Item" iconColor="bg-purple-50" extraColor="text-purple-500" onPress={() => router.push('/store' as any)} />
              <ProfileMenuItem icon={SVGA_CpHeart} label="Cp/friends" iconColor="bg-pink-50" onPress={() => router.push('/cp-house' as any)} />
              
              {isCertifiedSeller && (
                <SellerTransferDialog trigger={
                  <View pointerEvents="none">
                    <ProfileMenuItem icon={SVGA_SellerBag} label="Seller center" iconColor="bg-red-50" onPress={() => {}} />
                  </View>
                } />
              )}
              
              {isAuthorizedAdmin && (
                <ProfileMenuItem icon={SVGA_OfficialUser} label="Official Centre" iconColor="bg-orange-50" extraColor="text-orange-600" onPress={() => setOfficialCenterOpen(true)} />
              )}
            </View>

            <View className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <ProfileMenuItem icon={SVGA_Settings} label="Settings" iconColor="bg-slate-50" onPress={() => router.push('/settings')} />
              <ProfileMenuItem icon={SVGA_HelpCenter} label="Help center" iconColor="bg-sky-50" onPress={() => router.push('/help-center' as any)} />
              <ProfileMenuItem icon={SVGA_AboutInfo} label="About" iconColor="bg-slate-50" onPress={() => router.push('/about' as any)} />
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Render Modals */}
      <MedalModal open={medalModalOpen} onClose={() => setMedalModalOpen(false)} profile={profile} />
      <SocialRelationsDialog open={socialOpen} onOpenChange={setSocialOpen} userId={profileId} initialTab={socialTab} username={profile.username} />
      <FullProfileDialog open={fullViewOpen} onOpenChange={setFullViewOpen} profile={profile} stats={stats} isOwnProfile={true} displayId={displayID} />
      <ReportUserDialog open={reportOpen} onOpenChange={setReportOpen} targetUser={profile} />
      <OfficialCenterDialog open={officialCenterOpen} onOpenChange={setOfficialCenterOpen} isAuthorized={isAuthorizedAdmin} />

    </SafeAreaView>
  );
}
