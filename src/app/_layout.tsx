import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { getSdks } from '../firebase/core';
import { FirebaseProvider } from '../firebase/provider';
import { RoomProvider } from '../context/room-context';
import { VoiceActivityProvider } from '../context/voice-activity-context';
import { GlobalPresenceManager } from '../components/global-presence-manager';
import { GlobalBanGuard } from '../components/global-ban-guard';
import { FloatingRoomBar } from '../components/floating-room-bar';
import { ProfileInitializer } from '../components/profile-initializer';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';

export default function RootLayout() {
  const [firebaseServices, setFirebaseServices] = useState<any>(null);
  
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_Medium: Inter_500Medium,
    Inter_SemiBold: Inter_600SemiBold,
    Inter_Bold: Inter_700Bold,
    Outfit: Outfit_400Regular,
    Outfit_Medium: Outfit_500Medium,
    Outfit_SemiBold: Outfit_600SemiBold,
    Outfit_Bold: Outfit_700Bold,
  });

  useEffect(() => {
    const services = getSdks();
    setFirebaseServices(services);
  }, []);

  if (!firebaseServices || !fontsLoaded) {
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      firestore={firebaseServices.firestore}
      auth={firebaseServices.auth}
      storage={firebaseServices.storage}
      database={firebaseServices.database}
    >
      <RoomProvider>
        <VoiceActivityProvider>
          <ProfileInitializer />
          <GlobalPresenceManager />
          <GlobalBanGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="rooms" />
            <Stack.Screen name="search" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="games" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="vips" />
            <Stack.Screen name="help-center" />
            <Stack.Screen name="cp-house" />
            <Stack.Screen name="level" />
            <Stack.Screen name="store" />
            <Stack.Screen name="bonus" />
            <Stack.Screen name="families" />
          </Stack>
          <FloatingRoomBar />
        </VoiceActivityProvider>
      </RoomProvider>
    </FirebaseProvider>
  );
}
