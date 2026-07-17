import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Clipboard, Alert, Animated, Easing } from 'react-native';
import { X, Heart, MessageCircle, Shield, Crown, Mic, MicOff, Gift, AtSign, UserX, Star, Zap, Sparkles, UserPlus, MoreVertical, Copy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SVGA_OfficialTag, SVGA_SellerTag, SVGA_CSLeaderTag, SVGA_CustomerServiceTag, SVGA_ServiceTag, SVGA_HostTag, SVGA_GlossyID, SVGA_SuperAdminTag, SVGA_ManagerTag, SVGA_AuditorTag, SVGA_AdminTag } from '../profile/NativeSVGs';
import { ActiveIDBadge, SovereignIDBadge } from '@/components/native-id-badge';
import { Image } from 'expo-image';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useCollection, useFirestore } from '../../firebase/provider';
import { collection, query, where, limit } from '@/firebase/firestore-compat';
import { AvatarFrame } from '../profile/AvatarFrame';
import { toCDN } from '../../lib/cdn';
import { isInventoryItemExpired } from '../../lib/types';
import { getLevelFromSpent } from '../../hooks/use-user-level';
import { UserLevelBadge } from '../user-level-badge';

function CpHeartBadge({ level }: { level: number }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const animRight = React.useRef(new Animated.Value(0)).current;
  const animLeft = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  React.useEffect(() => {
    const r = Animated.loop(Animated.sequence([Animated.delay(1500), Animated.timing(animRight, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }), Animated.timing(animRight, { toValue: 0, duration: 10, useNativeDriver: true })]));
    const l = Animated.loop(Animated.sequence([Animated.delay(2200), Animated.timing(animLeft, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }), Animated.timing(animLeft, { toValue: 0, duration: 10, useNativeDriver: true })]));
    r.start(); l.start();
    return () => { r.stop(); l.stop(); };
  }, []);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        {[{ ty: -14, s: 11 }, { ty: -4, s: 13 }, { ty: 4, s: 10 }, { ty: 12, s: 12 }].map((p, i) => {
          const tx = animRight.interpolate({ inputRange: [0, 1], outputRange: [0, 52] });
          const ty = animRight.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] });
          const op = animRight.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 1, 0] });
          const sc = animRight.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.4] });
          return (<Animated.Text key={`r${i}`} style={{ position: 'absolute', fontSize: p.s, opacity: op, zIndex: 10, color: i % 2 === 0 ? '#EC4899' : '#F43F5E', fontWeight: '900', transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }}>{'\u2665'}</Animated.Text>);
        })}
        {[{ ty: -12, s: 8 }, { ty: -2, s: 10 }, { ty: 6, s: 7 }, { ty: 14, s: 9 }].map((p, i) => {
          const tx = animLeft.interpolate({ inputRange: [0, 1], outputRange: [0, -52] });
          const ty = animLeft.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] });
          const op = animLeft.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 1, 0] });
          const sc = animLeft.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.4] });
          return (<Animated.View key={`l${i}`} style={{ position: 'absolute', width: p.s, height: p.s, borderRadius: p.s / 2, backgroundColor: i % 2 === 0 ? '#60A5FA' : '#3B82F6', opacity: op, zIndex: 10, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }} />);
        })}
        <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, backgroundColor: 'rgba(244,63,94,0.12)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)' }}>
            <Text style={{ fontSize: 14, color: '#F43F5E', fontWeight: '900' }}>{String.fromCodePoint(0x2764)}</Text>
          </View>
          {level > 0 && (<Text style={{ fontSize: 11, color: '#F43F5E', fontWeight: '900', marginTop: 2, letterSpacing: 0.3 }}>Lv.{level}</Text>)}
        </Animated.View>
      </View>
    </View>
  );
}

function PartnerAvatar({ partnerUid }: { partnerUid: string }) {
  const { profile: partnerProfile } = useUserProfile(partnerUid);
  return (
    <AvatarFrame
      frameMediaUrl={isInventoryItemExpired(partnerProfile?.inventory || {}, partnerProfile?.inventory?.activeFrame) ? null : ((partnerProfile as any)?.activeFrameMediaUrl || (partnerProfile as any)?.inventory?.activeFrameMediaUrl || null)}
      size={62}
    >
      <Image cachePolicy="memory-disk" source={{ uri: toCDN(partnerProfile?.avatarUrl) || 'https://picsum.photos/200' }}
        style={{ width: 62, height: 62 }}
        contentFit="cover"
      />
    </AvatarFrame>
  );
}
const COUNTRY_FLAGS: Record<string, string> = {
  india: String.fromCodePoint(0x1F1EE, 0x1F1F3), pakistan: String.fromCodePoint(0x1F1F5, 0x1F1F0), bangladesh: String.fromCodePoint(0x1F1E7, 0x1F1E9), nepal: String.fromCodePoint(0x1F1F3, 0x1F1F5), sri_lanka: String.fromCodePoint(0x1F1F1, 0x1F1F0),
  usa: String.fromCodePoint(0x1F1FA, 0x1F1F8), uk: String.fromCodePoint(0x1F1EC, 0x1F1E7), canada: String.fromCodePoint(0x1F1E8, 0x1F1E6), australia: String.fromCodePoint(0x1F1E6, 0x1F1FA), germany: String.fromCodePoint(0x1F1E9, 0x1F1EA),
  france: String.fromCodePoint(0x1F1EB, 0x1F1F7), japan: String.fromCodePoint(0x1F1EF, 0x1F1F5), china: String.fromCodePoint(0x1F1E8, 0x1F1F3), south_korea: String.fromCodePoint(0x1F1F0, 0x1F1F7), brazil: String.fromCodePoint(0x1F1E7, 0x1F1F7),
  russia: String.fromCodePoint(0x1F1F7, 0x1F1FA), turkey: String.fromCodePoint(0x1F1F9, 0x1F1F7), egypt: String.fromCodePoint(0x1F1EA, 0x1F1EC), nigeria: String.fromCodePoint(0x1F1F3, 0x1F1EC), south_africa: String.fromCodePoint(0x1F1FF, 0x1F1E6),
  indonesia: String.fromCodePoint(0x1F1EE, 0x1F1E9), philippines: String.fromCodePoint(0x1F1F5, 0x1F1ED), thailand: String.fromCodePoint(0x1F1F9, 0x1F1ED), vietnam: String.fromCodePoint(0x1F1FB, 0x1F1F3), malaysia: String.fromCodePoint(0x1F1F2, 0x1F1FE),
  uae: String.fromCodePoint(0x1F1E6, 0x1F1EA), saudi_arabia: String.fromCodePoint(0x1F1F8, 0x1F1E6), iran: String.fromCodePoint(0x1F1EE, 0x1F1F7), afghanistan: String.fromCodePoint(0x1F1E6, 0x1F1EB), myanmar: String.fromCodePoint(0x1F1F2, 0x1F1F2),
};

const COUNTRY_NAMES: Record<string, string> = {
  india: 'IND', pakistan: 'PAK', bangladesh: 'BGD', nepal: 'NPL', sri_lanka: 'LKA',
  usa: 'USA', uk: 'GBR', canada: 'CAN', australia: 'AUS', germany: 'DEU',
  france: 'FRA', japan: 'JPN', china: 'CHN', south_korea: 'KOR', brazil: 'BRA',
  russia: 'RUS', turkey: 'TUR', egypt: 'EGY', nigeria: 'NGA', south_africa: 'ZAF',
  indonesia: 'IDN', philippines: 'PHL', thailand: 'THA', vietnam: 'VNM', malaysia: 'MYS',
  uae: 'ARE', saudi_arabia: 'SAU', iran: 'IRQ', afghanistan: 'AFG', myanmar: 'MMR',
};

interface RoomProfileCardProps {
  visible: boolean;
  onClose: () => void;
  user: {
    uid: string;
    name: string;
    avatarUrl: string;
    accountNumber?: string;
    gender?: string | null;
    isInSeat?: boolean;
    seatIndex?: number;
    isMuted?: boolean;
  } | null;
  isOwner?: boolean;
  isModerator?: boolean;
  isMe?: boolean;
  canManage?: boolean;
  onSendMessage?: (uid: string) => void;
  onFollow?: (uid: string) => void;
  onReport?: (uid: string) => void;
  onMute?: (uid: string, current: boolean) => void;
  onKick?: (uid: string) => void;
  onLeaveSeat?: (uid: string) => void;
  onToggleMod?: (uid: string) => void;
  onSendGift?: (uid: string) => void;
  onMention?: (username: string) => void;
  onPropose?: (target: { uid: string; name: string; avatarUrl: string }) => void;
  onViewProfile?: (uid: string) => void;
  onEcho?: (target: { uid: string; name: string; avatarUrl: string }) => void;
  isLocked?: boolean;
  onLockSeat?: (seatIndex: number) => void;
  isBanned?: boolean;
  onBan?: (uid: string) => void;
}

const getSVIPColor = (level: number): string => {
  if (level >= 1 && level <= 6) return '#0ea5e9';
  if (level >= 7 && level <= 10) return '#9333ea';
  if (level >= 11 && level <= 15) return '#dc2626';
  return '#7c3aed';
};

const SVIPBadge = ({ level }: { level: number }) => {
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!level || level < 1) return;
    (async () => {
      try {
        const db = require('@react-native-firebase/firestore').default;
        const snap = await db().collection('settings').doc('svipConfig').get();
        if (snap.exists()) {
          const data = snap.data();
          const url = data?.levels?.[String(level)]?.badgeUrl;
          if (url) setBadgeUrl(url);
        }
      } catch (e) {}
    })();
  }, [level]);

  if (!level || level < 1) return null;

  return (
    <View style={{ width: 70, height: 20, justifyContent: 'center' }}>
      <Image 
        source={
          level === 1 ? require('../../../assets/images/themes/svip_strip_1.png') :
          level === 2 ? require('../../../assets/images/themes/svip_strip_2.png') :
          level === 3 ? require('../../../assets/images/themes/svip_strip_3.png') :
          level === 4 ? require('../../../assets/images/themes/svip_strip_4.png') :
          level === 5 ? require('../../../assets/images/themes/svip_strip_5.png') :
          level === 6 ? require('../../../assets/images/themes/svip_strip_6.png') :
          level === 7 ? require('../../../assets/images/themes/svip_strip_7.png') :
          level === 8 ? require('../../../assets/images/themes/svip_strip_8.png') :
          level === 9 ? require('../../../assets/images/themes/svip_strip_9.png') :
          level === 10 ? require('../../../assets/images/themes/svip_strip_10.png') :
          level === 11 ? require('../../../assets/images/themes/svip_strip_11.png') :
          level === 12 ? require('../../../assets/images/themes/svip_strip_12.png') :
          level === 13 ? require('../../../assets/images/themes/svip_strip_13.png') :
          level === 14 ? require('../../../assets/images/themes/svip_strip_14.png') :
          level === 15 ? require('../../../assets/images/themes/svip_strip_15.png') :
          level === 16 ? require('../../../assets/images/themes/svip_strip_16.png') :
          level === 17 ? require('../../../assets/images/themes/svip_strip_17.png') :
          require('../../../assets/images/themes/svip_strip_18.png')
        }
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="fill"
      />
      {badgeUrl ? (
        <Image 
          source={{ uri: toCDN(badgeUrl) }} 
          style={{ 
            position: 'absolute', 
            left: (level >= 16 && level <= 18) ? -2 : -5, 
            top: (level >= 16 && level <= 18) ? -2 : -5, 
            width: (level >= 16 && level <= 18) ? 24 : 30, 
            height: (level >= 16 && level <= 18) ? 24 : 30 
          }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
};

export function RoomProfileCard({
  visible, onClose, user, isOwner, isModerator, isMe, canManage,
  onSendMessage, onFollow, onReport, onMute, onKick,
  onLeaveSeat, onToggleMod, onSendGift, onMention, onPropose, onViewProfile,
  onEcho, isLocked, onLockSeat, isBanned, onBan
}: RoomProfileCardProps) {
  const { profile } = useUserProfile(user?.uid);
  const [firestoreMedals, setFirestoreMedals] = useState<any[]>([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const cpLevel = profile?.relationship?.level || 0;

  const handleCopyId = () => {
    const displayId = String(user?.accountNumber || profile?.accountNumber || '');
    if (displayId) {
      Clipboard.setString(displayId);
      Alert.alert('ID Copied', `ID: ${displayId} copied to clipboard`);
    }
  };

  useEffect(() => {
    if (!visible) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('medalsList').onSnapshot((snap: any) => {
        if (snap) {
          setFirestoreMedals(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        }
      }, (error: any) => {});
      return () => unsub();
    } catch (e) {
    }
  }, [visible]);

  const hasTags = profile?.tags?.includes('Official') || 
                  profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) || 
                  profile?.tags?.includes('CS Leader') || 
                  profile?.tags?.includes('Customer Service') || 
                  profile?.tags?.includes('Service') || 
                  profile?.tags?.includes('Host');

  const hasMedals = profile?.medals && profile.medals.length > 0;

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-transparent justify-end">
        {/* Transparent dismiss area above the sheet */}
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />

        <View className="bg-white rounded-t-[3rem] w-full pb-8 items-center relative" style={{ overflow: 'visible', paddingTop: 52 }}>
          {/* Overlapping Avatar — Dual for CP, Single otherwise */}
          <View className="absolute top-[-48] left-0 right-0 z-50" style={{ alignItems: 'center' }}>
            {profile?.relationship && profile.relationship.type !== 'None' && profile.relationship.partnerUid ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', width: 180 }}>
                {/* User Avatar — Center */}
                <TouchableOpacity style={{ zIndex: 2, marginLeft: 30 }} onPress={() => { onClose(); onViewProfile?.(user.uid); }} activeOpacity={0.8}>
                  <AvatarFrame
                    frameMediaUrl={isInventoryItemExpired(profile?.inventory || {}, profile?.inventory?.activeFrame) ? null : ((profile as any)?.activeFrameMediaUrl || (profile as any)?.inventory?.activeFrameMediaUrl || null)}
                    size={80}
                  >
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile?.avatarUrl || user.avatarUrl) || 'https://picsum.photos/200' }}
                      style={{ width: 80, height: 80 }}
                      contentFit="cover"
                    />
                  </AvatarFrame>
                </TouchableOpacity>
                {/* Animated Heart with CP Level */}
                <View style={{ zIndex: 3, marginLeft: -10, marginRight: -10, marginTop: 12 }}>
                  <CpHeartBadge level={cpLevel} />
                </View>
                {/* Partner Avatar — Right */}
                <TouchableOpacity style={{ zIndex: 1, marginLeft: 2 }} onPress={() => { onClose(); onViewProfile?.(profile.relationship.partnerUid); }} activeOpacity={0.8}>
                  <PartnerAvatar partnerUid={profile.relationship.partnerUid} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { onClose(); onViewProfile?.(user.uid); }} className="shadow-lg" activeOpacity={0.8}>
                <AvatarFrame
                  frameMediaUrl={isInventoryItemExpired(profile?.inventory || {}, profile?.inventory?.activeFrame) ? null : ((profile as any)?.activeFrameMediaUrl || (profile as any)?.inventory?.activeFrameMediaUrl || null)}
                  size={96}
                >
                  <Image cachePolicy="memory-disk" source={{ uri: toCDN(profile?.avatarUrl || user.avatarUrl) || 'https://picsum.photos/200' }}
                    style={{ width: 96, height: 96 }}
                    contentFit="cover"
                  />
                </AvatarFrame>
              </TouchableOpacity>
            )}
          </View>

          {/* Close Button (right) + More Menu (left) */}
          <View style={{ position: 'absolute', top: 4, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between', zIndex: 50 }}>
            {(canManage || !isMe) && (
              <View>
                <TouchableOpacity onPress={() => setShowMoreMenu(!showMoreMenu)} style={{ padding: 6, backgroundColor: '#E2E8F0', borderRadius: 20 }}>
                  <MoreVertical size={18} color="#64748b" />
                </TouchableOpacity>
                {showMoreMenu && (
                  <TouchableOpacity className="absolute inset-0" onPress={() => setShowMoreMenu(false)} activeOpacity={1}>
                    <View style={{ position: 'absolute', top: 36, left: 0, backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, minWidth: 140, overflow: 'hidden' }}>
                      {canManage && onToggleMod && (
                        <TouchableOpacity onPress={() => { setShowMoreMenu(false); onClose(); onToggleMod(user.uid); }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED' }}>{isModerator ? 'Demote' : 'Set Admin'}</Text>
                        </TouchableOpacity>
                      )}
                      {canManage && onBan && (
                        <TouchableOpacity onPress={() => { setShowMoreMenu(false); onClose(); onBan(user.uid); }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>{isBanned ? 'Unban' : 'Ban'}</Text>
                        </TouchableOpacity>
                      )}
                      {!isMe && onReport && (
                        <TouchableOpacity onPress={() => { setShowMoreMenu(false); onClose(); onReport(user.uid); }} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Report User</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={{ padding: 6, backgroundColor: '#E2E8F0', borderRadius: 20 }}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Name & Badges */}
          <View className={`flex-row items-center gap-1.5 flex-wrap justify-center ${hasTags || hasMedals ? 'mb-3' : 'mb-1.5'}`}>
            <Text className="text-[#1E293B] text-2xl font-black">{profile?.username || user.name}</Text>
            {(profile?.gender || user.gender) !== 'female' ? (
              <View className="bg-blue-100 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-blue-600 text-xs font-bold">{String.fromCodePoint(0x2642)}</Text>
              </View>
            ) : (
              <View className="bg-pink-100 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-pink-600 text-xs font-bold">{String.fromCodePoint(0x2640)}</Text>
              </View>
            )}
            {profile?.country ? (
              <View className="bg-slate-100 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <Text style={{ fontSize: 12 }}>{COUNTRY_FLAGS[profile.country] || String.fromCodePoint(0x1F30D)}</Text>
                <Text className="text-slate-500 text-[10px] font-bold uppercase">{COUNTRY_NAMES[profile.country] || profile.country}</Text>
              </View>
            ) : null}
            {(() => {
              const richLevel = getLevelFromSpent(profile?.wallet?.totalSpent || 0);
              return richLevel > 0 ? <UserLevelBadge level={richLevel} scale={1.1} /> : null;
            })()}
          </View>

          {/* Tags + ID Badge */}
          <View className="mt-0.5 flex-row flex-wrap items-center justify-center gap-3 px-6">
            {profile?.tags?.includes('Official') && <SVGA_OfficialTag />}
            {profile?.tags?.includes('Super Admin') && <SVGA_SuperAdminTag />}
            {profile?.tags?.includes('Manager') && <SVGA_ManagerTag />}
            {profile?.tags?.includes('Auditor') && <SVGA_AuditorTag />}
            {profile?.tags?.includes('Admin') && <SVGA_AdminTag />}
            {profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) && <SVGA_SellerTag />}
            {profile?.tags?.includes('CS Leader') && <SVGA_CSLeaderTag />}
            {profile?.tags?.includes('Customer Service') && <SVGA_CustomerServiceTag />}
            {profile?.tags?.includes('Service') && <SVGA_ServiceTag />}
            {profile?.tags?.includes('Host') && <SVGA_HostTag />}
            {profile?.tags?.some((t: string) => t.includes('Official') || t.includes('official')) ? (
              <TouchableOpacity onPress={handleCopyId}>
                <SVGA_GlossyID label={`ID: ${user?.accountNumber || profile?.accountNumber || '0000'}`} />
              </TouchableOpacity>
            ) : profile?.activeIdBadge ? (
              <TouchableOpacity onPress={handleCopyId}>
                <ActiveIDBadge badgeData={profile.activeIdBadge} fallbackNumber={user?.accountNumber || profile?.accountNumber || '0000'} />
              </TouchableOpacity>
            ) : (profile?.isAdmin || (profile?.isBudgetId && profile?.idColor && profile?.idColor !== 'none')) ? (
              <TouchableOpacity onPress={handleCopyId}>
                <SovereignIDBadge color={profile.isAdmin ? 'gold' : profile.idColor} number={user?.accountNumber || profile?.accountNumber || '0000'} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCopyId} style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4.5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>ID: {user?.accountNumber || profile?.accountNumber || '0000'}</Text>
                <Copy size={10} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Medals Row */}
          <View className="flex-row flex-wrap justify-center gap-2 -mt-1 px-6">
            {(profile?.svip || 0) > 0 && (
              <View className="items-center justify-center">
                <SVIPBadge level={profile?.svip || 0} />
              </View>
            )}
            {profile?.medals && profile.medals.length > 0 && profile.medals.map((mId: string, idx: number) => {
              const fsMedal = firestoreMedals?.find((m: any) => m.id === mId);
              return (
                <View key={idx} className="items-center justify-center">
                  {fsMedal?.imageUrl ? (
                    <Image 
                      cachePolicy="memory-disk" 
                      source={{ uri: toCDN(fsMedal.imageUrl) }} 
                      className="w-9 h-9" 
                      contentFit="contain"
                    />
                  ) : (
                    <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                      <Text style={{ fontSize: 16 }}>🏅</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Fans & Gift */}
          <View className={`flex-row items-center gap-3 mb-1 ${hasMedals ? '-mt-2.5' : (hasTags ? 'mt-1.5' : '-mt-2')}`}>
            <Text className="text-slate-400 text-[11px] font-black uppercase">{(profile?.stats?.fans || 0).toLocaleString()} FANS</Text>
            {onSendGift && (
              <TouchableOpacity onPress={() => { onClose(); onSendGift(user.uid); }}
                style={{ width: 30, height: 30, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
                  <Gift size={14} color="white" fill="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Regular user actions (only for other users) */}
          {!isMe && (
            <View style={{ paddingHorizontal: 24, width: '100%', marginTop: 4, alignSelf: 'stretch' }}>
              {/* All actions in ONE row */}
              <View style={{ flexDirection: 'row', gap: 28, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity onPress={() => onSendMessage?.(user.uid)}
                  style={{ paddingHorizontal: 12, height: 32, borderRadius: 10, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <MessageCircle size={12} color="white" />
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>Msg</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onFollow?.(user.uid)}
                  style={{ paddingHorizontal: 12, height: 32, borderRadius: 10, backgroundColor: '#A855F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Heart size={12} color="white" fill="white" />
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>Follow</Text>
                </TouchableOpacity>
                {onMention && (
                  <TouchableOpacity onPress={() => { onClose(); onMention(profile?.username || user.name); }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <AtSign size={16} color="#475569" />
                  </TouchableOpacity>
                )}
                {onEcho && (
                  <TouchableOpacity onPress={() => { onClose(); onEcho({ uid: user.uid, name: profile?.username || user.name, avatarUrl: profile?.avatarUrl || user.avatarUrl }); }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
                {onPropose && (
                  <TouchableOpacity onPress={() => { onClose(); onPropose({ uid: user.uid, name: profile?.username || user.name, avatarUrl: profile?.avatarUrl || user.avatarUrl }); }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} color="#EC4899" fill="#EC4899" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          {/* SEAT LEAVE (compact green button) */}
          {isMe && (user.isInSeat || (user.seatIndex !== undefined && user.seatIndex > 0)) && onLeaveSeat && (
            <View className="w-full items-center mt-3">
              <TouchableOpacity 
                onPress={() => { onLeaveSeat(user.uid); onClose(); }} 
                className="w-[65%] h-11 rounded-2xl bg-[#00E676] items-center justify-center flex-row gap-1.5 active:scale-95 transition-all shadow-md shadow-green-500/20"
              >
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <Mic size={14} color="white" />
                </View>
                <Text className="text-white font-black text-xs uppercase tracking-widest">SEAT LEAVE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Admin controls panel — hidden for room owner */}
          {canManage && !isMe && !isOwner && (
            <View className="w-full border-t border-slate-100 mt-4 pt-4 px-6">
              <View className="flex-row items-center justify-between px-2">
                <TouchableOpacity onPress={() => { onMute?.(user.uid, user.isMuted || false); onClose(); }}>
                  <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 active:text-blue-600">
                    {user.isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
                <Text className="text-slate-200 text-sm">|</Text>
                <TouchableOpacity 
                  disabled={!user.isInSeat}
                  onPress={() => { if (user.isInSeat) { onLeaveSeat?.(user.uid); } onClose(); }}
                >
                  <Text className={`text-[10px] font-black uppercase tracking-wider ${user.isInSeat ? 'text-orange-500 active:text-orange-600' : 'text-slate-300'}`}>
                    Leave
                  </Text>
                </TouchableOpacity>
                <Text className="text-slate-200 text-sm">|</Text>
                <TouchableOpacity 
                  disabled={!user.isInSeat}
                  onPress={() => { 
                    if (user.isInSeat && user.seatIndex !== undefined) { 
                      onLockSeat?.(user.seatIndex); 
                    } 
                    onClose(); 
                  }}
                >
                  <Text className={`text-[10px] font-black uppercase tracking-wider ${user.isInSeat ? 'text-indigo-500 active:text-indigo-600' : 'text-slate-300'}`}>
                    {isLocked ? 'Unlock' : 'Lock'}
                  </Text>
                </TouchableOpacity>
                <Text className="text-slate-200 text-sm">|</Text>
                <TouchableOpacity onPress={() => { onKick?.(user.uid); onClose(); }}>
                  <Text className="text-[10px] font-black uppercase tracking-wider text-red-500 active:text-red-600">
                    Kick out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Report profile removed — now in 3-dot menu */}
        </View>
      </View>
    </Modal>
  );
}

function AdminChip({ icon: Icon, label, color, onPress }: { icon: any; label: string; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="px-3 py-2 rounded-full bg-white/10 flex-row items-center gap-1">
      <Icon size={12} color={color || 'white'} />
      <Text className="text-white text-[10px] font-bold uppercase" style={{ color: color || 'white' }}>{label}</Text>
    </TouchableOpacity>
  );
}
