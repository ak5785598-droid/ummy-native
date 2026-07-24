import React, { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Home, Compass, Mail, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useFirestore } from '../../firebase/provider';
import { collection, query, where, onSnapshot } from '@/firebase/firestore-compat';

const NeonIndicator = () => (
  <View className="absolute -top-3 w-8 h-1 rounded-full bg-pink-400 opacity-80" style={{ shadowColor: '#f472b6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 }} />
);

export default function TabLayout() {
  const { user, isLoading } = useUser();
  const firestore = useFirestore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hasUnread, setHasUnread] = useState(false);

  // Auth guard: redirect to login if user is signed out
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  // Monitor all private chats in background for global unread dot
  useEffect(() => {
    if (!firestore || !user?.uid) {
      setHasUnread(false);
      return;
    }

    const chatsQuery = query(
      collection(firestore, 'privateChats'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(chatsQuery, (snap: any) => {
      let unreadFound = false;
      snap.forEach((doc: any) => {
        const chat = doc.data();
        const lastSenderId = chat.lastSenderId;
        const readBy = chat.lastMessageReadBy || [];
        // If last message is from someone else and user hasn't read it yet
        if (lastSenderId && lastSenderId !== user.uid && !readBy.includes(user.uid)) {
          unreadFound = true;
        }
      });
      setHasUnread(unreadFound);
    }, () => {});

    return () => unsub();
  }, [firestore, user?.uid]);

  // Adjust tab bar height and bottom padding safely depending on the device notch/buttons
  const safeBottom = insets.bottom > 0 ? insets.bottom : 12;
  const tabHeight = 52 + safeBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a0b2e',
          borderTopWidth: 0,
          height: tabHeight,
          paddingBottom: safeBottom - 4,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center relative">
              {focused && <NeonIndicator />}
              <Home size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center relative">
              {focused && <NeonIndicator />}
              <Compass size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Message',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center relative">
              {focused && <NeonIndicator />}
              <Mail size={22} color={color} />
              {hasUnread && (
                <View 
                  className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 border border-white"
                  style={{
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.5,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center relative">
              {focused && <NeonIndicator />}
              <User size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
