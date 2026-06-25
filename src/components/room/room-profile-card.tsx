import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Heart, MessageCircle, Shield, Crown, Mic, MicOff, Gift, AtSign, UserX, Star, Zap, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SVGA_OfficialTag, SVGA_SellerTag, SVGA_CSLeaderTag, SVGA_CustomerServiceTag, SVGA_ServiceTag, SVGA_HostTag } from '../profile/NativeSVGs';
import { Image } from 'expo-image';
import { useUserProfile } from '../../hooks/use-user-profile';
import { AvatarFrame } from '../profile/AvatarFrame';

const COUNTRY_FLAGS: Record<string, string> = {
  india: '🇮🇳', pakistan: '🇵🇰', bangladesh: '🇧🇩', nepal: '🇳🇵', sri_lanka: '🇱🇰',
  usa: '🇺🇸', uk: '🇬🇧', canada: '🇨🇦', australia: '🇦🇺', germany: '🇩🇪',
  france: '🇫🇷', japan: '🇯🇵', china: '🇨🇳', south_korea: '🇰🇷', brazil: '🇧🇷',
  russia: '🇷🇺', turkey: '🇹🇷', egypt: '🇪🇬', nigeria: '🇳🇬', south_africa: '🇿🇦',
  indonesia: '🇮🇩', philippines: '🇵🇭', thailand: '🇹🇭', vietnam: '🇻🇳', malaysia: '🇲🇾',
  uae: '🇦🇪', saudi_arabia: '🇸🇦', iran: '🇮🇶', afghanistan: '🇦🇫', myanmar: '🇲🇲',
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
}

export function RoomProfileCard({
  visible, onClose, user, isOwner, isModerator, isMe, canManage,
  onSendMessage, onFollow, onReport, onMute, onKick,
  onLeaveSeat, onToggleMod, onSendGift, onMention, onPropose, onViewProfile,
  onEcho, isLocked, onLockSeat
}: RoomProfileCardProps) {
  const { profile } = useUserProfile(user?.uid);
  const [firestoreMedals, setFirestoreMedals] = useState<any[]>([]);

  useEffect(() => {
    try {
      const db = require('@react-native-firebase/firestore').default;
      const unsub = db().collection('medalsList').onSnapshot((snap: any) => {
        if (snap) {
          setFirestoreMedals(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('[Medals] Failed to subscribe to medalsList:', e);
    }
  }, []);

  const hasTags = profile?.tags?.includes('Official') || 
                  profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) || 
                  profile?.tags?.includes('CS Leader') || 
                  profile?.tags?.includes('Customer Service') || 
                  profile?.tags?.includes('Service') || 
                  profile?.tags?.includes('Host') || 
                  (profile?.relationship && profile.relationship.type !== 'None');

  const hasMedals = profile?.medals && profile.medals.length > 0;

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-transparent justify-end">
        {/* Transparent dismiss area above the sheet */}
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />

        <View className="bg-white rounded-t-[3rem] w-full pb-8 items-center relative" style={{ overflow: 'visible', paddingTop: 52 }}>
          {/* Overlapping Avatar */}
          <View className="absolute top-[-48] left-0 right-0 items-center z-50">
            <TouchableOpacity onPress={() => { onClose(); onViewProfile?.(user.uid); }} className="shadow-lg" activeOpacity={0.8}>
              <AvatarFrame
                frameMediaUrl={profile?.activeFrameMediaUrl || profile?.inventory?.activeFrameMediaUrl || null}
                size={96}
              >
                <Image cachePolicy="memory-disk" source={{ uri: user.avatarUrl || 'https://picsum.photos/200' }}
                  style={{ width: 96, height: 96 }}
                  contentFit="cover"
                />
              </AvatarFrame>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 4, right: 4, padding: 6, zIndex: 50, backgroundColor: '#E2E8F0', borderRadius: 20 }}>
            <X size={18} color="#64748b" />
          </TouchableOpacity>

          {/* Name & Badges */}
          <View className={`flex-row items-center gap-1.5 ${hasTags || hasMedals ? 'mb-3' : 'mb-1.5'}`}>
            <Text className="text-[#1E293B] text-2xl font-black">{user.name}</Text>
            {user.gender !== 'female' ? (
              <View className="bg-blue-100 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-blue-600 text-xs font-bold">♂</Text>
              </View>
            ) : (
              <View className="bg-pink-100 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-pink-600 text-xs font-bold">♀</Text>
              </View>
            )}
            {profile?.country ? (
              <View className="bg-slate-100 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <Text style={{ fontSize: 12 }}>{COUNTRY_FLAGS[profile.country] || '🌍'}</Text>
                <Text className="text-slate-500 text-[10px] font-bold uppercase">{COUNTRY_NAMES[profile.country] || profile.country}</Text>
              </View>
            ) : null}
          </View>

          {/* Tags */}
          {(profile?.tags?.includes('Official') || profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) || profile?.tags?.includes('CS Leader') || profile?.tags?.includes('Customer Service') || profile?.tags?.includes('Service') || profile?.tags?.includes('Host') || (profile?.relationship && profile.relationship.type !== 'None')) && (
            <View className="mt-1.5 flex-row flex-wrap gap-1 justify-center px-6">
              {profile?.tags?.includes('Official') && <SVGA_OfficialTag />}
              {profile?.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) && <SVGA_SellerTag />}
              {profile?.tags?.includes('CS Leader') && <SVGA_CSLeaderTag />}
              {profile?.tags?.includes('Customer Service') && <SVGA_CustomerServiceTag />}
              {profile?.tags?.includes('Service') && <SVGA_ServiceTag />}
              {profile?.tags?.includes('Host') && <SVGA_HostTag />}
              {profile?.relationship && profile.relationship.type !== 'None' && (
                <View className="flex-row items-center gap-1 px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-full h-[18px]">
                  <Heart size={9} color="#F43F5E" fill="#F43F5E" />
                  <Text className="text-[9px] font-black uppercase text-rose-500 tracking-tight">
                    {profile.relationship.type}: {profile.relationship.partnerName}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Medals Row */}
          {profile?.medals && profile.medals.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-2 -mt-1 px-6">
              {profile.medals.map((mId: string, idx: number) => {
                const fsMedal = firestoreMedals?.find((m: any) => m.id === mId);
                return (
                  <View key={idx} className="items-center justify-center">
                    {fsMedal?.imageUrl ? (
                      <Image 
                        cachePolicy="memory-disk" 
                        source={{ uri: fsMedal.imageUrl }} 
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
          )}

          {/* User ID, Fans & Gift */}
          <View className={`flex-row items-center gap-3 mb-1 ${hasMedals ? '-mt-2.5' : (hasTags ? 'mt-1.5' : '-mt-2')}`}>
            <View className="bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/50">
              <Text className="text-slate-600 text-[11px] font-black uppercase">ID: {user.accountNumber || '0000'}</Text>
            </View>
            <View className="h-4 w-[1px] bg-slate-200" />
            <Text className="text-slate-400 text-[11px] font-black uppercase">0 FANS</Text>
            <View className="h-4 w-[1px] bg-slate-200" />
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
                  <TouchableOpacity onPress={() => { onClose(); onMention(user.name); }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <AtSign size={16} color="#475569" />
                  </TouchableOpacity>
                )}
                {onEcho && (
                  <TouchableOpacity onPress={() => { onClose(); onEcho({ uid: user.uid, name: user.name, avatarUrl: user.avatarUrl }); }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
                {onPropose && (
                  <TouchableOpacity onPress={() => { onClose(); onPropose({ uid: user.uid, name: user.name, avatarUrl: user.avatarUrl }); }}
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

          {/* Admin controls panel */}
          {canManage && !isMe && (
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

          {/* Report profile (only for other users) */}
          {!isMe && (
            <TouchableOpacity onPress={() => onReport?.(user.uid)} className="px-6 pt-4">
              <Text className="text-red-500 text-xs font-bold text-center">Report User</Text>
            </TouchableOpacity>
          )}
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
