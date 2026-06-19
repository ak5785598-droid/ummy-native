import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '../firebase/provider';
import { doc, getDoc } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isLoading } = useUser();

  // Web exact: showContent starts false, becomes true after 50ms
  const [showContent, setShowContent] = useState(false);

  // Main image animations (web: scale 1.15->1, opacity 0->1, duration 1s easeOut)
  const scaleAnim = useRef(new Animated.Value(1.15)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Text slide up + fade in (web: delay 0.4s, duration 0.7s)
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(30)).current;

  // 3 pulsing dots (web: scale [1, 1.4, 1], opacity [0.3, 1, 0.3], duration 1s, repeat, delay i*0.2)
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  // Pre-hydration pulsing placeholder (web: animate-pulse, 50ms delay)
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Web exact: pre-hydration pulse animation (loops while placeholder visible)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Web exact: setTimeout 50ms -> showContent = true
    const timer = setTimeout(() => {
      setShowContent(true);
      pulse.stop();

      // Main image scale + fade in (web: duration 1s easeOut)
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Text slide up + fade in (web: delay 0.4s, duration 0.7s)
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(textY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);
    }, 50);

    // 3 pulsing dots (web: scale [1, 1.4, 1], opacity [0.3, 1, 0.3], duration 1s, repeat, delay i*0.2)
    const createDotAnimation = (dotValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(dotValue, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dotValue, {
              toValue: 0.3,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 200);
    const anim3 = createDotAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      pulse.stop();
      clearTimeout(timer);
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  // Web exact: redirect at 2800ms (2.8 seconds)
  useEffect(() => {
    if (isLoading) return;

    const redirectTimer = setTimeout(() => {
      const checkAuth = async () => {
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        if (!firestore) {
          router.replace('/(tabs)');
          return;
        }

        try {
          const userRef = doc(firestore, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists && (snap.data()?.onboardingComplete || snap.data()?.username)) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/onboarding');
          }
        } catch {
          router.replace('/(tabs)');
        }
      };

      checkAuth();
    }, 2800);

    return () => clearTimeout(redirectTimer);
  }, [router, user, isLoading, firestore]);

  // Dot scale interpolation (web: scale [1, 1.4, 1])
  const dot1Scale = dot1.interpolate({
    inputRange: [0.3, 1],
    outputRange: [1, 1.4],
  });
  const dot2Scale = dot2.interpolate({
    inputRange: [0.3, 1],
    outputRange: [1, 1.4],
  });
  const dot3Scale = dot3.interpolate({
    inputRange: [0.3, 1],
    outputRange: [1, 1.4],
  });

  return (
    // Web exact: bg-gradient-to-b from-[#ff8ebb] via-[#ffade0] to-[#f472b6]
    <LinearGradient
      colors={['#ff8ebb', '#ffade0', '#f472b6']}
      style={styles.container}
    >
      {/* Web exact: Pre-hydration placeholder - pulsing zoomed-in logo */}
      {!showContent && (
        <View style={styles.placeholderContainer}>
          <Animated.View
            style={[
              styles.placeholder,
              { opacity: pulseAnim },
            ]}
          >
            <Image
              source={require('../../assets/images/splash_bg.png')}
              style={styles.placeholderImage}
              contentFit="cover"
            />
          </Animated.View>
        </View>
      )}

      {/* Web exact: Full-screen animated splash */}
      {showContent && (
        <Animated.View
          style={[
            styles.splashImageContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Image
            source={require('../../assets/images/splash_bg.png')}
            style={styles.splashImage}
            contentFit="cover"
          />

          {/* Web exact: bg-black/10 overlay */}
          <View style={styles.overlay} />

          {/* Web exact: Bottom content with tagline + dots */}
          <Animated.View
            style={[
              styles.bottomContent,
              {
                opacity: textOpacity,
                transform: [{ translateY: textY }],
              },
            ]}
          >
            {/* Web exact: text-[20px] text-[#222222] font-normal font-sans tracking-normal drop-shadow-sm */}
            <Text style={styles.tagline}>
              Ummy - Connect Your Tribe
            </Text>

            {/* Web exact: mt-8 flex items-center gap-2 */}
            <View style={styles.dotsContainer}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot1,
                    transform: [{ scale: dot1Scale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot2,
                    transform: [{ scale: dot2Scale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot3,
                    transform: [{ scale: dot3Scale }],
                  },
                ]}
              />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Web exact: Pre-hydration placeholder (w-48 h-48 = 192px, rounded-3xl, overflow-hidden, border-4 border-white/20)
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 192,
    height: 192,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    // Web exact: backgroundSize: '350%' (zoomed in on characters)
    transform: [{ scale: 3.5 }],
  },
  // Main splash image container
  splashImageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
  // Web exact: bg-black/10
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // Web exact: absolute w-full bottom-24 flex flex-col items-center z-10
  bottomContent: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Web exact: text-[20px] text-[#222222] font-normal font-sans tracking-normal drop-shadow-sm
  tagline: {
    fontSize: 20,
    color: '#222222',
    fontWeight: '400',
    letterSpacing: 0,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Web exact: mt-8 flex items-center gap-2
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  // Web exact: h-2 w-2 bg-black/40 rounded-full
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
