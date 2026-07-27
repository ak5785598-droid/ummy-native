import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Dimensions } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function GlobalActivityBanner() {
  const [eventData, setEventData] = useState<{
    userName: string;
    giftName: string;
    roomNumber: string | number;
    type?: string;
    levelName?: string;
    levelNumber?: number | string;
    rewardText?: string;
  } | null>(null);

  // Stable animated values — never recreated
  const translateY = useRef(new Animated.Value(-60)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShowing  = useRef(false);
  const isAnimating = useRef(false);

  const hide = () => {
    isAnimating.current = true;
    // Slide LEFT and fade out
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isShowing.current = false;
      isAnimating.current = false;
      setEventData(null);
      // Reset position for next show
      translateX.setValue(0);
      translateY.setValue(-60);
      opacity.setValue(0);
    });
  };

  const show = (data: {
    userName: string;
    giftName: string;
    roomNumber: string | number;
    type?: string;
    levelName?: string;
    levelNumber?: number | string;
    rewardText?: string;
  }) => {
    // Cancel any pending hide
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    // If already showing, hide first then show new
    if (isShowing.current && isAnimating.current) return;

    isShowing.current = true;
    setEventData(data);

    // Reset to off-screen top, then slide DOWN into view
    translateX.setValue(0);
    translateY.setValue(-60);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // After 5s — slide out to the LEFT
    hideTimer.current = setTimeout(() => {
      hide();
    }, 5000);
  };

  useEffect(() => {
    const unsub = firestore()
      .collection('globalActivity')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .onSnapshot(
        (snap) => {
          if (snap.empty) return;
          const doc = snap.docs[0].data();
          if (!doc?.timestamp) return;

          // Only show if within last 60 seconds
          try {
            const t = typeof doc.timestamp.toDate === 'function'
              ? doc.timestamp.toDate().getTime()
              : new Date(doc.timestamp).getTime();
            if (Date.now() - t > 60000) return;
          } catch {
            return;
          }

          show({
            userName: doc.userName || 'Someone',
            giftName: doc.giftName || 'Gift',
            roomNumber: doc.roomNumber ?? '',
            type: doc.type || 'gift',
            levelName: doc.levelName || '',
            levelNumber: doc.levelNumber || '',
            rewardText: doc.rewardText || '',
          });
        },
        () => { /* silent */ }
      );

    return () => {
      unsub();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { opacity, transform: [{ translateY }, { translateX }] },
      ]}
    >
      {/* System label */}
      <Animated.View style={styles.inner}>
        <Text style={styles.label}>🏆 </Text>
        <Text style={styles.labelText}>SYSTEM  </Text>
        <Text style={styles.sep}>|  </Text>
        <Text style={styles.msg} numberOfLines={1}>
          {eventData ? (
            eventData.type === 'room_level' || eventData.type === 'level_unlock' ? (
              <>
                <Text style={styles.white}>🎉 LEVEL UNLOCKED! </Text>
                <Text style={styles.green}>Room #{eventData.roomNumber}</Text>
                <Text style={styles.white}> reached </Text>
                <Text style={styles.yellow}>{eventData.levelName || `Level ${eventData.levelNumber}`}</Text>
                {eventData.rewardText ? (
                  <Text style={styles.purple}> ({eventData.rewardText})</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.white}>✨ WOW! </Text>
                <Text style={styles.yellow}>{eventData.userName}</Text>
                <Text style={styles.white}> sent a </Text>
                <Text style={styles.purple}>{eventData.giftName}</Text>
                <Text style={styles.white}> in Room </Text>
                <Text style={styles.green}>#{eventData.roomNumber}</Text>
              </>
            )
          ) : null}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 700,
    alignItems: 'center',
    paddingTop: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    maxWidth: 480,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 0, 95, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.4)',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  label:     { fontSize: 11 },
  labelText: { fontSize: 9, fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5 },
  sep:       { fontSize: 10, color: 'rgba(255,255,255,0.2)' },
  msg:       { flex: 1, fontSize: 10, fontWeight: 'bold' },
  white:     { color: '#ffffff' },
  yellow:    { color: '#fbbf24', fontWeight: '900' },
  purple:    { color: '#a78bfa', fontWeight: '900' },
  green:     { color: '#34d399', fontWeight: '900' },
});
