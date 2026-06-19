import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, PanResponder, Dimensions, Modal, StatusBar, Animated, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Heart, MessageCircle, Share2, Volume2, VolumeX,
  ChevronUp, ChevronDown
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useFirestore, useUser } from '../../firebase/provider';
import { doc, serverTimestamp, increment, runTransaction } from '@/firebase/firestore-compat';
import { Moment } from '../../lib/types';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

interface FullscreenMomentOverlayProps {
  moments: Moment[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onOpenComments: (momentId: string) => void;
}

export function FullscreenMomentOverlay({
  moments, initialIndex, visible, onClose, onOpenComments
}: FullscreenMomentOverlayProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const videoRefs = useRef<Record<string, Video>>({});

  const translateY = useRef(new Animated.Value(0)).current;
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMoment = moments[currentIndex];

  useEffect(() => {
    if (visible && currentIndex !== initialIndex) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (!visible) return;

    viewTimerRef.current = setTimeout(() => {
      trackView();
    }, 1500);

    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    };
  }, [currentIndex, visible]);

  const trackView = async () => {
    if (!firestore || !user?.uid || !currentMoment) return;

    try {
      const momentRef = doc(firestore, 'moments', currentMoment.id);
      const reachRef = doc(firestore, 'moments', currentMoment.id, 'reach', user.uid);

      await runTransaction(firestore, async (tx) => {
        tx.update(momentRef, { views: increment(1) });
        const reachSnap = await tx.get(reachRef);
        if (!reachSnap.exists) {
          tx.set(reachRef, { userId: user.uid, createdAt: serverTimestamp() });
          tx.update(momentRef, { reach: increment(1) });
        }
      });
    } catch (e) {
      console.error('[Fullscreen] View track error:', e);
    }
  };

  const handleLike = async () => {
    if (!firestore || !user?.uid || !currentMoment) return;
    const momentRef = doc(firestore, 'moments', currentMoment.id);
    const likeRef = doc(firestore, 'moments', currentMoment.id, 'likes', user.uid);

    const isCurrentlyLiked = likedMap[currentMoment.id];
    setLikedMap(prev => ({ ...prev, [currentMoment.id]: !isCurrentlyLiked }));
    setLikeCounts(prev => ({
      ...prev,
      [currentMoment.id]: (prev[currentMoment.id] ?? currentMoment.likes) + (isCurrentlyLiked ? -1 : 1),
    }));

    try {
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(likeRef);
        if (snap.exists) {
          tx.delete(likeRef);
          tx.update(momentRef, { likes: increment(-1) });
        } else {
          tx.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          tx.update(momentRef, { likes: increment(1) });
        }
      });
    } catch (e) {
      setLikedMap(prev => ({ ...prev, [currentMoment.id]: isCurrentlyLiked }));
    }
  };

  const handleShare = async () => {
    const moment = currentMoment;
    if (!moment) return;

    const shareText = `@${moment.username} on Ummy: ${moment.content || ''}`;
    try {
      await Clipboard.setStringAsync(shareText);
      Vibration.vibrate(50);
    } catch (e) {
      console.error('[Fullscreen] Share error:', e);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dy) > height * 0.2) {
          const direction = gesture.dy > 0 ? -1 : 1;
          const nextIndex = currentIndex + direction;
          if (nextIndex >= 0 && nextIndex < moments.length) {
            Animated.timing(translateY, {
              toValue: direction * height,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setCurrentIndex(nextIndex);
              translateY.setValue(0);
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleTapOverlay = () => {
    if (!hasInteracted) {
      setIsMuted(false);
      setHasInteracted(true);
    }
  };

  if (!visible || !currentMoment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StatusBar hidden />
      <View className="flex-1 bg-black">
        <Animated.View
          style={{ transform: [{ translateY }] }}
          className="flex-1"
          {...panResponder.panHandlers}
        >
          <TouchableOpacity activeOpacity={1} onPress={handleTapOverlay} className="flex-1">
            {currentMoment.videoUrl ? (
              <Video
                ref={ref => { if (ref) videoRefs.current[currentMoment.id] = ref; }}
                source={{ uri: currentMoment.videoUrl }}
                style={{ width, height }}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
                isMuted={isMuted}
              />
            ) : (
              <Image cachePolicy="memory-disk" source={{ uri: currentMoment.imageUrl || 'https://picsum.photos/600' }}
                style={{ width, height }}
                contentFit="contain"
              />
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
              className="absolute inset-0"
              pointerEvents="none"
            />
          </TouchableOpacity>

          <SafeAreaView className="absolute inset-0" pointerEvents="box-none">
            <View className="flex-row items-center justify-between px-4 pt-2">
              <TouchableOpacity onPress={onClose} className="p-2 bg-black/30 rounded-full">
                <X size={22} color="white" />
              </TouchableOpacity>

              {!hasInteracted && currentMoment.videoUrl && (
                <View className="bg-black/50 rounded-full px-3 py-1.5 flex-row items-center gap-1.5">
                  <VolumeX size={14} color="white" />
                  <Text className="text-white text-xs font-medium">Tap to unmute</Text>
                </View>
              )}

              {hasInteracted && (
                <TouchableOpacity
                  onPress={() => setIsMuted(!isMuted)}
                  className="p-2 bg-black/30 rounded-full"
                >
                  {isMuted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-1" />

            {moments.length > 1 && (
              <View className="absolute right-3 top-1/2 -translate-y-8">
                {currentIndex > 0 && <ChevronUp size={16} color="rgba(255,255,255,0.5)" />}
                {currentIndex < moments.length - 1 && <ChevronDown size={16} color="rgba(255,255,255,0.5)" />}
              </View>
            )}

            <View className="absolute right-4 bottom-28 items-center gap-5">
              <TouchableOpacity onPress={handleLike} className="items-center">
                <View className="w-12 h-12 rounded-full bg-black/30 items-center justify-center">
                  <Heart
                    size={24}
                    color={likedMap[currentMoment.id] ? '#f43f5e' : 'white'}
                    fill={likedMap[currentMoment.id] ? '#f43f5e' : 'transparent'}
                  />
                </View>
                <Text className="text-white text-xs mt-1 font-bold">
                  {likeCounts[currentMoment.id] ?? currentMoment.likes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => onOpenComments(currentMoment.id)} className="items-center">
                <View className="w-12 h-12 rounded-full bg-black/30 items-center justify-center">
                  <MessageCircle size={24} color="white" />
                </View>
                <Text className="text-white text-xs mt-1 font-bold">
                  {currentMoment.commentsCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleShare} className="items-center">
                <View className="w-12 h-12 rounded-full bg-black/30 items-center justify-center">
                  <Share2 size={22} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            <View className="px-4 pb-8">
              <View className="flex-row items-center gap-2 mb-2">
                <Image cachePolicy="memory-disk" source={{ uri: currentMoment.avatarUrl || 'https://picsum.photos/100' }}
                  className="w-9 h-9 rounded-full border border-white/50"
                />
                <Text className="text-white font-bold text-sm">{currentMoment.username}</Text>
                {currentMoment.userLevel ? (
                  <View className="bg-yellow-500 rounded px-1.5 py-0.5">
                    <Text className="text-[9px] font-black text-white">Lv.{currentMoment.userLevel}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-white/90 text-sm leading-5" numberOfLines={2}>
                {currentMoment.content}
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
