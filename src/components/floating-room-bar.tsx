import React, { useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRoomContext } from '../context/room-context';
import { destroyAgoraEngine } from '../hooks/use-agora-native';
import { destroyMusicSound } from '../hooks/use-music-sync';
import { destroyZegoEngine } from '../hooks/use-zegocloud-voice';
import { destroyLiveKitRoom } from '../hooks/use-livekit-voice';
import { useVoiceEngine } from '../hooks/use-voice-engine';
import { Image } from 'expo-image';
import { toCDN } from '../lib/cdn';
import { doc, deleteDoc, increment, getDoc } from '@/firebase/firestore-compat';
import { useFirestore, useUser, useDoc } from '../firebase/provider';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BAR_SIZE = 64;
const PADDING = 16;

export function FloatingRoomBar() {
  const { activeRoom, isMinimized, setIsMinimized, setActiveRoom, minimizedRoom, setMinimizedRoom, isSpeakerMuted } = useRoomContext();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const room = activeRoom || minimizedRoom;

  const participantRef = useMemo(() => {
    if (!firestore || !room?.id || !user?.uid || !isMinimized) return null;
    return doc(firestore, 'chatRooms', room.id, 'participants', user.uid);
  }, [firestore, room?.id, user?.uid, isMinimized]);
  const { data: myParticipant } = useDoc<any>(participantRef);

  const isInSeat = (myParticipant?.seatIndex || 0) > 0;
  const isMuted = myParticipant?.isMuted ?? false;

  // PERSISTENT BACKGROUND VOICE STREAM: Holds voice audio 100% active when room is minimized
  useVoiceEngine({
    roomId: (isMinimized && room?.id) ? room.id : undefined,
    isInSeat,
    isMuted,
    uid: user?.uid,
    isSpeakerMuted,
    keepAlive: true,
  });
  
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - BAR_SIZE - PADDING, y: SCREEN_H - 200 })).current;
  const isDragging = useRef(false);
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        hasMoved.current = false;
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false, listener: () => { hasMoved.current = true; } }
      ),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        // Standard tap threshold check: if movement is tiny, treat as instant click
        const dragDist = Math.sqrt(gesture.dx * gesture.dx + gesture.dy * gesture.dy);
        if (dragDist < 10) {
          setActiveRoom(room);
          setMinimizedRoom(null);
          setIsMinimized(false);
          router.push(`/rooms/${room.id}`);
          isDragging.current = false;
          hasMoved.current = false;
          return;
        }

        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        let finalX = currentX;
        let finalY = currentY;

        if (currentX < PADDING) finalX = PADDING;
        if (currentX > SCREEN_W - BAR_SIZE - PADDING) finalX = SCREEN_W - BAR_SIZE - PADDING;
        if (currentY < 60) finalY = 60;
        if (currentY > SCREEN_H - BAR_SIZE - 60) finalY = SCREEN_H - BAR_SIZE - 60;

        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
          bounciness: 8,
        }).start();

        setTimeout(() => { isDragging.current = false; }, 50);
      },
    })
  ).current;

  if (!room || !isMinimized) return null;

  // Clean exit when closing from floating bar
  const handleExitRoom = async () => {
    destroyAgoraEngine();
    destroyZegoEngine();
    destroyLiveKitRoom();
    destroyMusicSound();
    if (firestore && room?.id && user?.uid) {
      try {
        const pRef = doc(firestore, 'chatRooms', room.id, 'participants', user.uid);
        await deleteDoc(pRef);
        const roomRef = doc(firestore, 'chatRooms', room.id);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          const currentCount = roomData?.participantCount || 0;
          if (currentCount > 0) {
            const { updateDoc } = await import('@/firebase/firestore-compat');
            updateDoc(roomRef, { participantCount: currentCount - 1 }).catch(() => {});
          }
        }
      } catch {}
    }
    setActiveRoom(null);
    setMinimizedRoom(null);
    setIsMinimized(false);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.floatingWrap, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        {/* Main circular DP */}
        <TouchableOpacity
          style={styles.floatingCircle}
          activeOpacity={0.85}
          onPress={() => {
            if (isDragging.current || hasMoved.current) return;
            setActiveRoom(room);
            setMinimizedRoom(null);
            setIsMinimized(false);
            router.push(`/rooms/${room.id}`);
          }}
        >
          <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.gradient}>
            {room.coverUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: toCDN(room.coverUrl) }} style={styles.roomImage} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>{(room.title || 'R')[0]}</Text>
              </View>
            )}
          </LinearGradient>
          {/* Online pulse dot */}
          <View style={styles.pulseDot}>
            <View style={styles.pulseDotInner} />
          </View>
        </TouchableOpacity>

        {/* Small cut/exit button */}
        <TouchableOpacity
          style={styles.cutButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handleExitRoom}
        >
          <X size={8} color="white" strokeWidth={3} />
        </TouchableOpacity>

        {/* Room title + listener count pill */}
        <View style={styles.infoPill}>
          <Users size={9} color="#a855f7" />
          <Text style={styles.infoText} numberOfLines={1}>
            {room.title || 'Room'}
          </Text>
          <Text style={styles.listenerCount}>{Math.max(0, room.participantCount || 0)}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  floatingWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  floatingCircle: {
    width: BAR_SIZE,
    height: BAR_SIZE,
    borderRadius: BAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  placeholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  pulseDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  cutButton: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a0b2e',
    zIndex: 10,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    gap: 4,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '600',
    maxWidth: 60,
  },
  listenerCount: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: '800',
  },
});
