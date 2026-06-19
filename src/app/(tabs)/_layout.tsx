import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Compass, Mail, User } from 'lucide-react-native';

const NeonIndicator = () => (
  <View className="absolute -top-3 w-8 h-1 rounded-full bg-pink-400 opacity-80" style={{ shadowColor: '#f472b6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 }} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a0b2e',
          borderTopWidth: 0,
          minHeight: 72,
          paddingBottom: 22,
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
            </View>
          ),
          tabBarStyle: { display: 'none' }
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
