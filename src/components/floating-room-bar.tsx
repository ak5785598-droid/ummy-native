import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRoomContext } from '../context/room-context';
import { destroyAgoraEngine } from '../hooks/use-agora-native';
import { destroyMusicSound } from '../hooks/use-music-sync';
import { Image } from 'expo-image';
import { toCDN } from '../lib/cdn';
import { doc, deleteDoc, increment, getDoc } from '@/firebase/firestore-compat';
import { useFirestore } from '../firebase/provider';
import { useUser } from '../firebase/provider';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BAR_SIZE = 64;
const PADDING = 16;

export function FloatingRoomBar() {
  const { activeRoom, isMinimized, setIsMinimized, setActiveRoom, minimizedRoom, setMinimizedRoom } = useRoomContext();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const room = activeRoom || minimizedRoom;
  
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

  const handleExitRoom = async () => {
    destroyAgoraEngine();
    destroyMusicSound();

    if (firestore && user?.uid && room?.id) {
      try {
        const participantRef = doc(firestore, 'chatRooms', room.id, 'participants', user.uid);
        const participantSnap = await getDoc(participantRef);
        if (participantSnap.exists) {
          await deleteDoc(participantRef);
          const roomRef = doc(firestore, 'chatRooms', room.id);
          await import('@/firebase/firestore-compat').then(m =>
            m.updateDoc(roomRef, { participantCount: increment(-1) })
          );
        }
      } catch {}
    }

    setActiveRoom(null);
    setMinimizedRoom(null);
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
          <Text style={styles.listenerCount}>{room.participantCount || 0}</Text>
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
