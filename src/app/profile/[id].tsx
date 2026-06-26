import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { UserLevelBadge } from '@/components/user-level-badge';
import { getLevelFromSpent } from '@/hooks/use-user-level';

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, MessageCircle, MoreHorizontal, Crown, Gift, Activity, ChevronRight, Pencil, Users, Gem, Calendar, Globe, Phone, Sparkles, DollarSign, Medal, Settings, HelpCircle, UserPlus, Shield, ShoppingBag, HeartHandshake, Store, Package, Briefcase, LucideIcon } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { collection, query, where, orderBy, limit, doc, serverTimestamp, runTransaction, onSnapshot, getDoc, setDoc } from '../../firebase/firestore-compat';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '../../lib/non-blocking-writes';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { SocialRelationsDialog } from '../../components/profile/SocialRelationsDialog';
import { ReportUserDialog } from '../../components/profile/ReportUserDialog';
import { FullProfileDialog } from '../../components/profile/FullProfileDialog';
import { MedalModal } from '../../components/profile/MedalModal';
import { Image } from 'expo-image';
import { PremiumDiamond } from '@/components/PremiumDiamond';
import {
  SVGA_OfficialTag,
  SVGA_SellerTag,
  SVGA_ServiceTag,
  SVGA_HostTag,
  SVGA_CSLeaderTag,
  SVGA_CustomerServiceTag,
  SVGA_VIPBanner,
  SVGA_GlossyID,
  SVGA_GoldDollar,
  SVGA_LevelCrown,
  SVGA_StoreCart,
  SVGA_MedalStar,
  SVGA_BonusGift,
  SVGA_InviteHeart,
  SVGA_FamilyShield,
  SVGA_BagShirt,
  SVGA_CpHeart,
  SVGA_SellerBag,
  SVGA_Settings,
  SVGA_HelpCenter,
  SVGA_OfficialUser,
  SVGA_AboutInfo,
} from '../../components/profile/NativeSVGs';

// ============================================================
// ⚡ CONSTANTS ⚡
// ============================================================
const CREATOR_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';

// ============================================================
// ⚡ HELPER FUNCTIONS ⚡
// ============================================================

const formatCompactNumber = (num: number): string => {
  if (!num || num === 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const calculateAge = (birthday?: string): number | null => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// ============================================================
// ⚡ UI COMPONENTS ⚡
// ============================================================

const GenderAgeTag = React.memo(({ gender, birthday }: { gender?: string | null, birthday?: string }) => {
  const age = calculateAge(birthday);
  const bgColor = gender === 'Female' ? '#ec4899' : '#3b82f6';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: bgColor, marginLeft: 6 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: 'white', lineHeight: 14 }}>{gender === 'Female' ? '♀' : '♂'}</Text>
      {age !== null && <Text style={{ fontSize: 10, fontWeight: '800', color: 'white', lineHeight: 14, marginLeft: 4 }}>{age}</Text>}
    </View>
  );
});
GenderAgeTag.displayName = 'GenderAgeTag';

const StatItem = React.memo(({ label, value, onPress }: { label: string; value: number; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minWidth: 60 }}>
    <Text style={{ fontSize: 20, fontWeight: '600', color: '#1e293b', lineHeight: 24, marginBottom: 4 }}>{formatCompactNumber(value)}</Text>
    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
  </TouchableOpacity>
));
StatItem.displayName = 'StatItem';

const IconButton = React.memo(({ CustomIcon, label, onPress }: { CustomIcon: React.ComponentType<any>; label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 6 }}>
    <CustomIcon />
    <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
  </TouchableOpacity>
));
IconButton.displayName = 'IconButton';

const ProfileMenuItem = React.memo(({ CustomIcon, label, extra, extraColor, onPress, destructive }: { 
  CustomIcon: React.ComponentType<any>; 
  label: string; 
  extra?: string; 
  extraColor?: string; 
  onPress: () => void; 
  destructive?: boolean;
}) => (
  <TouchableOpacity onPress={onPress} style={{ 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingLeft: 16, 
    paddingRight: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#f8fafc' 
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ borderRadius: 12, overflow: 'hidden' }}>
        <CustomIcon />
      </View>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: '500', 
        color: destructive ? '#ef4444' : '#1F2937' 
      }}>
        {label}
      </Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {extra && <Text style={{ fontSize: 11, fontWeight: '500', color: extraColor || '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5 }}>{extra}</Text>}
      <ChevronRight size={16} color="#cbd5e1" />
    </View>
  </TouchableOpacity>
));
ProfileMenuItem.displayName = 'ProfileMenuItem';

// ============================================================
// BUDGET ID STYLES
// ============================================================
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

// ============================================================
// ⚡ MAIN PROFILE SCREEN ⚡
// ============================================================

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user: currentUser, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(id as string);

  const [liveID, setLiveID] = useState<string | null>(null);
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);
  const [followData, setFollowData] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialTab, setSocialTab] = useState<'followers' | 'following' | 'friends' | 'visitors'>('followers');
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [medalModalOpen, setMedalModalOpen] = useState(false);

  const isOwnProfile = currentUser?.uid === id;
  const userId = id || currentUser?.uid;

  // Real-time listener for account number
  useEffect(() => {
    if (!firestore || !userId) return;
    const userRef = doc(firestore, 'users', userId);
    const unsub = onSnapshot(userRef, (snap: any) => {
      if (snap.exists()) {
        setLiveID(snap.data().accountNumber || null);
      }
    });
    return () => unsub();
  }, [firestore, userId]);

  // Follow status
  useEffect(() => {
    if (!firestore || !currentUser?.uid || !id || currentUser.uid === id) return;
    const ref = doc(firestore, 'followers', `${currentUser.uid}_${id}`);
    getDoc(ref).then((snap: any) => {
      setFollowData(snap?.data?.() || null);
      setIsFollowing(typeof snap?.exists === 'function' ? snap.exists() : (snap?.exists || false));
    });
  }, [firestore, currentUser?.uid, id]);

  // Record visit (only for non-own profile)
  useEffect(() => {
    if (!firestore || !currentUser || !id || isOwnProfile) return;
    const visitRef = doc(firestore, 'users', id, 'profileVisitors', currentUser.uid);
    setDoc(visitRef, { visitorId: currentUser.uid, timestamp: serverTimestamp() }, { merge: true });
  }, [firestore, currentUser, id, isOwnProfile]);

  // Queries
  const fansQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'followers'), where('followingId', '==', userId));
  }, [firestore, userId]);

  const followingQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'followers'), where('followerId', '==', userId));
  }, [firestore, userId]);

  const visitorsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'profileVisitors'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore, userId]);

  const { data: fansData } = useCollection(fansQuery as any);
  const { data: followingData } = useCollection(followingQuery as any);
  const { data: visitorsData } = useCollection(visitorsQuery as any);

  const stats = useMemo(() => {
    const fans = fansData?.length || 0;
    const following = followingData?.length || 0;
    const visitors = visitorsData?.length || 0;
    const fanIds = new Set(fansData?.map((f: any) => f.followerId) || []) as Set<string>;
    const followingIds = (followingData?.map((f: any) => f.followingId) || []) as string[];
    const friends = followingIds.filter((fid: string) => fanIds.has(fid)).length;
    return { fans, following, friends, visitors };
  }, [fansData, followingData, visitorsData]);

  // ID generation
  const [fallbackID] = useState(() => {
    if (userId === CREATOR_ID) return '0000';
    let hash = 0;
    const str = userId || 'fallback';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash % 900000) + 100000).toString();
  });

  const currentDBId = liveID || profile?.accountNumber;
  const isCorrectFormat = currentDBId && String(currentDBId).trim().length > 0;
  const displayID = isCorrectFormat ? String(currentDBId) : fallbackID;

  // ID sync
  useEffect(() => {
    const syncUserID = async () => {
      if (!isOwnProfile || !profile || !firestore || !userId) return;
      if ((profile as any).accountNumberLocked) return;
      const currentID = profile.accountNumber;
      const hasValidID = currentID && String(currentID).trim().length > 0;
      const isCreator = userId === CREATOR_ID;

      if (isCreator && currentID === '0000') return;
      if (!isCreator && hasValidID) return;

      try {
        const uRef = doc(firestore, 'users', userId);
        const userSnap = await getDoc(uRef);
        const userData = userSnap?.data?.();
        
        if (userData) {
          const dbID = userData.accountNumber;
          const isDbIdValid = dbID && String(dbID).trim().length > 0;
          if ((isCreator && dbID === '0000') || (!isCreator && isDbIdValid)) {
            return;
          }
        }
        
        let finalID = '';
        if (isCreator) {
          finalID = '0000';
        } else {
          let isUnique = false;
          let attempts = 0;
          while (!isUnique && attempts < 10) {
            const randomID = Math.floor(100000 + Math.random() * 900000).toString();
            const idRef = doc(firestore, 'assigned_ids', randomID);
            const idSnap = await getDoc(idRef);
            if (!idSnap?.exists) {
              await setDoc(idRef, { uid: userId, createdAt: serverTimestamp(), lockedPermanently: true });
              finalID = randomID;
              isUnique = true;
            }
            attempts++;
          }
          if (!isUnique) finalID = Math.floor(100000 + Math.random() * 900000).toString();
        }
        
        const pRef = doc(firestore, 'users', userId, 'profile', userId);
        await setDoc(uRef, { accountNumber: finalID, accountNumberLocked: true, accountNumberLockedAt: serverTimestamp() }, { merge: true });
        await setDoc(pRef, { accountNumber: finalID, accountNumberLocked: true }, { merge: true });
      } catch (err: any) {
        console.warn("ID Generation error:", err);
      }
    };
    syncUserID();
  }, [isOwnProfile, profile, firestore, userId]);

  // Handlers
  const handleFollow = async () => {
    if (!firestore || !currentUser || !id || isProcessingFollow) return;
    setIsProcessingFollow(true);
    const fRef = doc(firestore, 'followers', `${currentUser.uid}_${id}`);
    try {
      if (isFollowing) {
        await deleteDocumentNonBlocking(fRef);
        setIsFollowing(false);
      } else {
        await setDocumentNonBlocking(fRef, { followerId: currentUser.uid, followingId: id, timestamp: serverTimestamp() }, { merge: true });
        setIsFollowing(true);
      }
    } catch (e) { console.error(e); } finally { setIsProcessingFollow(false); }
  };

  const handleCopyId = async () => {
    if (!displayID) return;
    await Clipboard.setStringAsync(displayID);
    Alert.alert('ID Copied', `ID: ${displayID} copied to clipboard`);
  };

  const handleWhatsAppInvite = () => {
    const message = `Hey! Download Ummy Chat and join me! My ID is: ${displayID}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const isAuthorizedAdmin = currentUser?.uid === CREATOR_ID || profile?.isAdmin === true;
  const isCertifiedSeller = profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) || isAuthorizedAdmin;

  // Loading state
  if (isUserLoading || isProfileLoading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#cbd5e1" />
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16 }}>
            Syncing Identity...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Non-own profile → FullProfileDialog
  if (!isOwnProfile) {
    return (
      <>
      <FullProfileDialog
        open={true}
        onOpenChange={(open: any) => { if (!open) router.back(); }}
        profile={profile}
        stats={stats}
        followData={followData}
        onFollow={handleFollow}
        isProcessingFollow={isProcessingFollow}
        isOwnProfile={false}
        displayId={displayID}
      />
      </>
    );
  }

  // ═══════════════════════════════════════════════════
  // ⚡ OWN PROFILE VIEW ⚡
  // ═══════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      {/* Background gradient header */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <View style={{ height: 24, backgroundColor: '#a78bfa' }} />
        <LinearGradient
          colors={['rgba(167,139,250,1)', 'rgba(167,139,250,0)']}
          style={{ height: 200 }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Edit Button */}
      <View style={{ position: 'absolute', top: 50, right: 24, zIndex: 100 }}>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ padding: 8 }}
        >
          <Pencil size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1, zIndex: 10 }}
        contentContainerStyle={{ paddingTop: 76 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: 440, alignSelf: 'center', paddingHorizontal: 20 }}>
          {/* Avatar + Info Row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 8, paddingLeft: 20 }}>
            {/* Avatar with Frame */}
            <TouchableOpacity onPress={() => setFullViewOpen(true)} style={{ marginLeft: -6 }}>
              <View style={{ 
                width: 88, height: 88, borderRadius: 44, 
                borderWidth: 2, borderColor: 'white', 
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
                shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
                overflow: 'hidden', backgroundColor: '#f8fafc'
              }}>
                {profile.avatarUrl ? (
                  <Image cachePolicy="memory-disk" source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#cbd5e1' }}>
                      {(profile.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Name + Tags */}
            <View style={{ flex: 1, minWidth: 0, paddingLeft: 14, paddingTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#1e293b', letterSpacing: -0.5 }} numberOfLines={1}>
                  {profile.username}
                </Text>
                <Text style={{ fontSize: 18 }}>🇮🇳</Text>
                <GenderAgeTag gender={(profile as any).gender} birthday={(profile as any).birthday} />
                <UserLevelBadge level={getLevelFromSpent(profile.wallet?.totalSpent || 0)} scale={1.1} />

              </View>

              {/* ID + Special Tags */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={handleCopyId}>
                  {profile.tags?.includes('Official') ? (
                    <SVGA_GlossyID label={`ID: ${displayID}`} />
                  ) : (profile.isAdmin || (profile.isBudgetId && profile.idColor && profile.idColor !== 'none')) ? (
                    <NativeBudgetTag
                      variant={
                        profile.isAdmin ? 'gold'
                        : profile.idColor as BudgetVariant
                      }
                      label={`ID: ${displayID}`}
                    />
                  ) : (
                    <View style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3.5 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>ID: {displayID}</Text>
                    </View>
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

          {/* Stats Row */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'flex-start', 
            gap: 32, 
            paddingVertical: 8, 
            paddingHorizontal: 4,
            borderBottomWidth: 1, 
            borderBottomColor: '#f1f5f9',
            marginBottom: 16,
            marginTop: 0,
          }}>
            <StatItem label="Fans" value={stats.fans} onPress={() => { setSocialTab('followers'); setSocialOpen(true); }} />
            <StatItem label="Following" value={stats.following} onPress={() => { setSocialTab('following'); setSocialOpen(true); }} />
            <StatItem label="Friends" value={stats.friends} onPress={() => { setSocialTab('friends'); setSocialOpen(true); }} />
            <StatItem label="Visitors" value={stats.visitors} onPress={() => { setSocialTab('visitors'); setSocialOpen(true); }} />
          </View>

          {/* Wallet Cards */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginHorizontal: -8 }}>
            {/* Coins Card */}
            <TouchableOpacity 
              onPress={() => router.push('/wallet')} 
              style={{ 
                flex: 1, 
                height: 85, 
                borderRadius: 16, 
                padding: 16, 
                overflow: 'hidden',
                shadowColor: '#fdb931',
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={['#FFD700', '#FDB931', '#9E7302']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 16 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <SVGA_GoldDollar />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#5C4000', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9 }}>Coins</Text>
              </View>
              <Text style={{ 
                fontSize: 18, fontWeight: '900', color: '#422E00', 
                letterSpacing: -0.5, marginTop: 8
              }} numberOfLines={1}>
                {formatCompactNumber(profile.wallet?.coins || 0)}
              </Text>
            </TouchableOpacity>

            {/* Diamonds Card */}
            <TouchableOpacity 
              onPress={() => router.push('/wallet')} 
              style={{ 
                flex: 1, 
                height: 85, 
                borderRadius: 16, 
                padding: 16, 
                overflow: 'hidden',
                shadowColor: '#3a7bd5',
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={['#00D2FF', '#3a7bd5', '#004e92']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 16 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <PremiumDiamond size={28} />
                <Text style={{ fontSize: 10, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9 }}>Diamonds</Text>
              </View>
              <Text style={{ 
                fontSize: 18, fontWeight: '900', color: 'white', 
                letterSpacing: -0.5, marginTop: 8
              }} numberOfLines={1}>
                {formatCompactNumber(profile.wallet?.diamonds || 0)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* VIP Banner */}
          <View style={{ marginHorizontal: -8 }}>
            <SVGA_VIPBanner onPress={() => router.push('/vips')} />
          </View>

          {/* Quick Action Icons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24 }}>
            <IconButton CustomIcon={SVGA_LevelCrown} label="Level" onPress={() => router.push('/level')} />
            <IconButton CustomIcon={SVGA_StoreCart} label="Store" onPress={() => router.push('/store')} />
            <IconButton CustomIcon={SVGA_MedalStar} label="Medal" onPress={() => setMedalModalOpen(true)} />
            <IconButton CustomIcon={SVGA_BonusGift} label="Bonus" onPress={() => router.push('/bonus')} />
          </View>

          {/* Menu Items */}
          <View style={{ paddingTop: 24, paddingBottom: 128 }}>
            {/* Section 1 */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f8', overflow: 'hidden', marginBottom: 12 }}>
              <ProfileMenuItem
                CustomIcon={SVGA_InviteHeart}
                label="Invite friends"
                onPress={handleWhatsAppInvite}
              />
              <ProfileMenuItem
                CustomIcon={SVGA_FamilyShield}
                label="Family"
                extraColor="#6366f1"
                onPress={() => router.push('/families')}
              />
              <ProfileMenuItem
                CustomIcon={SVGA_BagShirt}
                label="My Item"
                extraColor="#8b5cf6"
                onPress={() => router.push('/store?filter=purchased')}
              />
              <ProfileMenuItem
                CustomIcon={SVGA_CpHeart}
                label="Cp/friends"
                onPress={() => router.push('/cp-house')}
              />
              {isCertifiedSeller && (
                <ProfileMenuItem
                  CustomIcon={SVGA_SellerBag}
                  label="Seller center"
                  onPress={() => {}}
                />
              )}
              {isAuthorizedAdmin && (
                <ProfileMenuItem
                  CustomIcon={SVGA_OfficialUser}
                  label="Official Centre"
                  extraColor="#ea580c"
                  onPress={() => router.push('/admin')}
                />
              )}
            </View>

            {/* Section 2 */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f8', overflow: 'hidden' }}>
              <ProfileMenuItem
                CustomIcon={SVGA_Settings}
                label="Settings"
                onPress={() => router.push('/settings')}
              />
              <ProfileMenuItem
                CustomIcon={SVGA_HelpCenter}
                label="Help center"
                onPress={() => router.push('/help-center')}
              />
              <ProfileMenuItem
                CustomIcon={SVGA_AboutInfo}
                label="About"
                onPress={() => router.push('/about' as any)}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <MedalModal 
        open={medalModalOpen} 
        onClose={() => setMedalModalOpen(false)} 
        profile={profile} 
      />
      <SocialRelationsDialog 
        open={socialOpen} 
        onOpenChange={setSocialOpen} 
        userId={userId} 
        initialTab={socialTab} 
        username={profile.username} 
      />
      <FullProfileDialog 
        open={fullViewOpen} 
        onOpenChange={setFullViewOpen} 
        profile={profile} 
        stats={stats} 
        followData={followData} 
        onFollow={handleFollow} 
        isProcessingFollow={isProcessingFollow} 
        isOwnProfile={isOwnProfile} 
        displayId={displayID} 
        onReport={() => setReportOpen(true)}
      />
      <ReportUserDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetUser={{
          uid: profile.id || userId,
          username: profile.username,
          accountNumber: displayID,
        }}
      />
    </SafeAreaView>
  );
}