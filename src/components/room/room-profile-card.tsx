import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Heart, MessageCircle, Shield, Crown, Mic, MicOff, Gift, AtSign, UserX, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SVGA_OfficialTag } from '../profile/NativeSVGs';
import { Image } from 'expo-image';

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
}

export function RoomProfileCard({
  visible, onClose, user, isOwner, isModerator, isMe, canManage,
  onSendMessage, onFollow, onReport, onMute, onKick,
  onLeaveSeat, onToggleMod, onSendGift, onMention, onPropose, onViewProfile
}: RoomProfileCardProps) {
  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-transparent justify-end">
        {/* Transparent dismiss area above the sheet */}
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />

        <View className="bg-white rounded-t-[3rem] w-full pt-16 pb-8 items-center relative" style={{ overflow: 'visible' }}>
          {/* Overlapping Avatar */}
          <View className="absolute top-[-48] left-0 right-0 items-center z-50">
            <TouchableOpacity onPress={() => { onClose(); onViewProfile?.(user.uid); }} className="shadow-lg rounded-full" activeOpacity={0.8}>
              <Image cachePolicy="memory-disk" source={{ uri: user.avatarUrl || 'https://picsum.photos/200' }}
                className="w-24 h-24 rounded-full border-4 border-white bg-slate-100"
              />
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} className="absolute top-6 right-6 p-1 z-50 bg-slate-100 rounded-full">
            <X size={18} color="#64748b" />
          </TouchableOpacity>

          {/* Name & Badges */}
          <View className="flex-row items-center gap-1.5 mt-2">
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
            <View className="bg-slate-100 px-2 py-0.5 rounded-full">
              <Text className="text-slate-500 text-[10px] font-bold uppercase">IN IND</Text>
            </View>
          </View>

          {/* Official Tag (High fidelity bear version from native-svgs) */}
          <View className="mt-2.5">
            <SVGA_OfficialTag />
          </View>

          {/* User ID, Fans and extra info stats row */}
          <View className="flex-row items-center gap-4 mt-4 mb-4">
            <View className="bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/50">
              <Text className="text-slate-600 text-[11px] font-black uppercase">ID: {user.accountNumber || '0000'}</Text>
            </View>
            <View className="h-4 w-[1px] bg-slate-200" />
            <Text className="text-slate-400 text-[11px] font-black uppercase">0 FANS</Text>
            <View className="h-4 w-[1px] bg-slate-200" />
            <TouchableOpacity
              onPress={() => { onClose(); onSendGift?.(user.uid); }}
              className="w-7 h-7 rounded-full bg-purple-500 items-center justify-center active:scale-90"
            >
              <Gift size={14} color="white" />
            </TouchableOpacity>
          </View>

          {/* Regular user actions (only for other users) */}
          {!isMe && (
            <View className="px-6 w-full py-4 flex-row flex-wrap gap-2">
              <ActionButton icon={MessageCircle} label="Message" onPress={() => onSendMessage?.(user.uid)} />
              <ActionButton icon={Heart} label="Follow" color="purple" onPress={() => onFollow?.(user.uid)} />
              {onSendGift && (
                <ActionButton icon={Gift} label="Gift" color="pink" onPress={() => { onClose(); onSendGift?.(user.uid); }} />
              )}
              {onMention && (
                <ActionButton icon={AtSign} label="Mention" onPress={() => { onClose(); onMention?.(user.name); }} />
              )}
              {onPropose && (
                <ActionButton icon={Heart} label="Propose" color="rose" onPress={() => { onClose(); onPropose?.({ uid: user.uid, name: user.name, avatarUrl: user.avatarUrl }); }} />
              )}
            </View>
          )}
          {/* SEAT LEAVE (bright green full width button) */}
          {isMe && (user.isInSeat || (user.seatIndex !== undefined && user.seatIndex > 0)) && onLeaveSeat && (
            <View className="w-full px-6 mt-2">
              <TouchableOpacity 
                onPress={() => { onLeaveSeat(user.uid); onClose(); }} 
                className="w-full h-14 rounded-full bg-[#00E676] items-center justify-center flex-row gap-2 active:scale-95 transition-all shadow-md shadow-green-500/25"
              >
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <Mic size={18} color="white" />
                </View>
                <Text className="text-white font-black text-sm uppercase tracking-wider">SEAT LEAVE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Admin controls panel */}
          {canManage && !isMe && (
            <View className="px-6 w-full pt-4 pb-2 border-t border-slate-100">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 text-center">Admin Controls</Text>
              <View className="flex-row flex-wrap justify-center gap-2">
                <AdminChip icon={MicOff} label="Mute" onPress={() => { onMute?.(user.uid, false); onClose(); }} />
                <AdminChip icon={UserX} label="Kick" color="#ef4444" onPress={() => { onKick?.(user.uid); onClose(); }} />
                <AdminChip icon={Shield} label={isModerator ? 'Demote' : 'Mod'} color="#3b82f6" onPress={() => { onToggleMod?.(user.uid); onClose(); }} />
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

function ActionButton({ icon: Icon, label, color, onPress }: { icon: any; label: string; color?: string; onPress: () => void }) {
  const bgColor = color === 'purple' ? 'bg-purple-600' : color === 'pink' ? 'bg-pink-600' : color === 'rose' ? 'bg-rose-600' : 'bg-white/10';
  return (
    <TouchableOpacity onPress={onPress} className={`${bgColor} flex-1 min-w-[80px] rounded-2xl py-2.5 items-center justify-center flex-row gap-1.5`}>
      <Icon size={14} color="white" />
      <Text className="text-white text-[11px] font-bold">{label}</Text>
    </TouchableOpacity>
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
