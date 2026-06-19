import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { ChevronLeft, Pencil, Heart, MessageCircle, MoreHorizontal, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import {
  SVGA_OfficialTag,
  SVGA_SellerTag,
  SVGA_ServiceTag,
  SVGA_HostTag,
  SVGA_CSLeaderTag,
  SVGA_CustomerServiceTag,
  SVGA_GlossyID,
} from './NativeSVGs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Simple Inlined AvatarFrame for Native ───
const AvatarFrame = ({ frameMediaUrl, size, children }: any) => {
  const videoRef = React.useRef<Video>(null);
  const frameSize = size * 1.55;
  const isVideo = frameMediaUrl && (frameMediaUrl.includes('.mp4') || frameMediaUrl.includes('.mov') || frameMediaUrl.includes('.webm') || frameMediaUrl.includes('video/'));

  React.useEffect(() => {
    if (isVideo && videoRef.current) {
      const timer = setTimeout(() => { videoRef.current?.playAsync?.(); }, 150);
      return () => clearTimeout(timer);
    }
  }, [isVideo]);

  return (
    <View style={{ width: frameSize, height: frameSize, borderRadius: frameSize / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {frameMediaUrl && frameMediaUrl !== 'None' && frameMediaUrl !== '' && isVideo && (
        <Video
          ref={videoRef}
          source={{ uri: frameMediaUrl }}
          style={{ position: 'absolute', width: frameSize, height: frameSize, zIndex: 10 }}
          resizeMode="cover"
          shouldPlay
          isLooping
          isMuted
          useNativeControls={false}
        />
      )}
      {frameMediaUrl && frameMediaUrl !== 'None' && frameMediaUrl !== '' && !isVideo && (
        <Image cachePolicy="memory-disk" source={{ uri: frameMediaUrl }}
          style={{ position: 'absolute', width: frameSize, height: frameSize, borderRadius: frameSize / 2, overflow: 'hidden', zIndex: 10 }}
          contentFit="cover"
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', zIndex: 11 }}>
        {children}
      </View>
    </View>
  );
};

// ─── Simple calculateAge function matching web ───
const calculateAge = (birthday: string) => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// ─── Simple GenderAgeTag for Native matching web ───
const GenderAgeTag = ({ gender, birthday }: any) => {
  const age = calculateAge(birthday || '');
  const isFemale = gender === 'Female';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: isFemale ? '#EC4899' : '#3B82F6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.5,
        elevation: 1,
      }}
    >
      <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' }}>
        {isFemale ? '♀' : '♂'}
      </Text>
      {age !== null && (
        <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: 'bold', marginLeft: 3 }}>
          {age}
        </Text>
      )}
    </View>
  );
};

export function FullProfileDialog({
  open,
  onOpenChange,
  profile,
  stats,
  isOwnProfile,
  displayId,
  onChat,
  onFollow,
  isProcessingFollow,
  followData,
}: any) {
  const [activeTab, setActiveTab] = useState<'medal' | 'vehicle' | 'frame' | 'gift'>('medal');

  if (!profile) return null;

  const images = profile.spaceImages || [];
  // User ID seedha text format mein, koi badge ya budget nahi
  const displayID = displayId || profile.accountNumber || '000000';
  const hasOfficialTag = profile.isOfficial || profile.tags?.includes('Official');
  const isSeller = profile.isSeller || profile.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t));

  const resolvedBackground = useMemo(() => {
    if (images.length > 0) {
      return { type: 'image', data: images[0] };
    }
    return { type: 'fallback', data: profile.avatarUrl };
  }, [images, profile.avatarUrl]);

  return (
    <Modal visible={open} onRequestClose={() => onOpenChange(false)} animationType="slide" statusBarTranslucent>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Top Section - Background banner */}
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.35, backgroundColor: '#0F172A', overflow: 'hidden' }}>
            <Image cachePolicy="memory-disk" source={{ uri: resolvedBackground.data || 'https://picsum.photos/400' }}
              style={{ width: '100%', height: '100%', opacity: 0.8 }}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Header overlay */}
            <View style={{ position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
              <TouchableOpacity onPress={() => onOpenChange(false)} style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}>
                <ChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}>
                <MoreHorizontal size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Card & Info */}
          <View style={{ marginTop: -40, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingTop: 20 }}>
            {/* Centered Avatar Frame Wrapper */}
            <View style={{ alignItems: 'center', marginTop: -64, marginBottom: 8 }}>
              <AvatarFrame
                frameMediaUrl={profile.inventory?.activeFrameMediaUrl}
                size={88}
              >
                <Image cachePolicy="memory-disk" source={{ uri: profile.avatarUrl || 'https://picsum.photos/200' }} style={{ width: '100%', height: '100%' }} />
              </AvatarFrame>
            </View>

            {/* Name + GenderAge + Flag */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>{profile.username}</Text>
              <GenderAgeTag gender={profile.gender} birthday={profile.birthday} />
              <Text style={{ fontSize: 20 }}>🇮🇳</Text>
            </View>

            {/* User ID - Sirf plain text, koi badge nahi, koi shiny gradient nahi */}
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', letterSpacing: 1 }}>
                ID: {displayID}
              </Text>
            </View>

            {/* Tags / Badges - Official, Seller wagera ke liye */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              {hasOfficialTag && <SVGA_OfficialTag />}
              {isSeller && <SVGA_SellerTag />}
              {profile.tags?.includes('CS Leader') && <SVGA_CSLeaderTag />}
              {profile.tags?.includes('Customer Service') && <SVGA_CustomerServiceTag />}
              {profile.tags?.includes('Service') && <SVGA_ServiceTag />}
              {profile.tags?.includes('Host') && <SVGA_HostTag />}
            </View>

            {/* Stats Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{stats?.fans || 0}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>Fans</Text>
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{stats?.following || 0}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>Following</Text>
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{stats?.friends || 0}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>Friend</Text>
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{stats?.visitors || 0}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>Visitors</Text>
              </View>
            </View>

            {/* Signature Bio */}
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Signature Bio</Text>
              <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20 }}>
                {profile.bio || "Synchronized with the Ummy frequency."}
              </Text>
              {profile.birthday && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                  <Calendar size={14} color="#94A3B8" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{profile.birthday}</Text>
                </View>
              )}
            </View>

            {/* Tab Navigation */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginTop: 24 }}>
              {['medal', 'vehicle', 'frame', 'gift'].map((tab: any) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: isActive ? 2 : 0, borderBottomColor: '#2563EB' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isActive ? '#2563EB' : '#94A3B8', textTransform: 'uppercase' }}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab Content Panel */}
            <View style={{ minHeight: 150, paddingTop: 16 }}>
              {activeTab === 'medal' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {profile.medals && profile.medals.length > 0 ? (
                    profile.medals.map((mId: string, idx: number) => (
                      <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                        <Text style={{ fontSize: 24 }}>🏅</Text>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{mId}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Medal Earned</Text>
                  )}
                </View>
              )}

              {activeTab === 'vehicle' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {profile.inventory?.ownedItems?.filter((id: string) => id.includes('vehicle') || id.includes('car')).length > 0 ? (
                    profile.inventory.ownedItems
                      .filter((id: string) => id.includes('vehicle') || id.includes('car'))
                      .map((id: string, idx: number) => (
                        <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                          <Text style={{ fontSize: 24 }}>🚗</Text>
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{id}</Text>
                        </View>
                      ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Vehicle Owned</Text>
                  )}
                </View>
              )}

              {activeTab === 'frame' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {profile.inventory?.ownedItems?.filter((id: string) => id.includes('frame') || id.includes('ring')).length > 0 ? (
                    profile.inventory.ownedItems
                      .filter((id: string) => id.includes('frame') || id.includes('ring'))
                      .map((id: string, idx: number) => (
                        <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                          <Text style={{ fontSize: 24 }}>🖼️</Text>
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{id}</Text>
                        </View>
                      ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Frame Owned</Text>
                  )}
                </View>
              )}

              {activeTab === 'gift' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {profile.stats?.receivedGifts && Object.keys(profile.stats.receivedGifts).length > 0 ? (
                    Object.entries(profile.stats.receivedGifts).map(([giftId, count]: any, idx: number) => (
                      <View key={idx} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', width: (SCREEN_WIDTH - 64) / 4 }}>
                        <Text style={{ fontSize: 24 }}>🎁</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#EC4899', marginTop: 2 }}>x{count}</Text>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>{giftId}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>No Gift Received</Text>
                  )}
                </View>
              )}
            </View>

          </View>
        </ScrollView>

        {/* Bottom Actions - Follow aur Chat buttons + Tab navigation niche fixed */}
        {!isOwnProfile && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
            paddingHorizontal: 20,
            paddingVertical: 12,
            paddingBottom: 34, // safe area ke liye extra padding
            flexDirection: 'row',
            gap: 12,
          }}>
            {/* Follow Button */}
            <TouchableOpacity
              onPress={onFollow}
              disabled={isProcessingFollow}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: '#EC4899',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: followData ? '#EC4899' : 'transparent',
              }}
            >
              <Heart 
                size={18} 
                color={followData ? '#FFFFFF' : '#EC4899'} 
                fill={followData ? '#FFFFFF' : 'transparent'} 
              />
              <Text style={{ 
                fontSize: 15, 
                fontWeight: '800', 
                color: followData ? '#FFFFFF' : '#EC4899' 
              }}>
                {followData ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            {/* Chat Button */}
            <TouchableOpacity
              onPress={() => {
                onOpenChange(false);
                if (onChat) onChat(profile);
              }}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#2563EB',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <MessageCircle size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Agar own profile hai to sirf edit button dikhao niche */}
        {isOwnProfile && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
            paddingHorizontal: 20,
            paddingVertical: 12,
            paddingBottom: 34,
          }}>
            <TouchableOpacity
              style={{
                height: 48,
                borderRadius: 24,
                backgroundColor: '#F1F5F9',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Pencil size={18} color="#64748B" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#64748B' }}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
    }
