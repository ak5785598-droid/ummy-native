import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Camera, ChevronRight, Globe, User } from 'lucide-react-native';
import { useUser, useFirestore } from '../../firebase/provider';
import { doc, serverTimestamp, setDoc } from '@/firebase/firestore-compat';

const { width, height } = Dimensions.get('window');

const PRESET_AVATARS = [
  { id: 'a1', emoji: '🦁', color: '#fbbf24' },
  { id: 'a2', emoji: '🐯', color: '#f97316' },
  { id: 'a3', emoji: '🦊', color: '#ef4444' },
  { id: 'a4', emoji: '🐼', color: '#64748b' },
  { id: 'a5', emoji: '🐸', color: '#22c55e' },
  { id: 'a6', emoji: '🐨', color: '#8b5cf6' },
  { id: 'a7', emoji: '🦋', color: '#ec4899' },
  { id: 'a8', emoji: '🦅', color: '#3b82f6' },
  { id: 'a9', emoji: '🐙', color: '#14b8a6' },
  { id: 'a10', emoji: '🦄', color: '#a855f7' },
];

const GENDER_OPTIONS = ['Male', 'Female'] as const;
const COUNTRY_OPTIONS = ['India', 'Pakistan', 'Bangladesh', 'United Arab Emirates', 'Saudi Arabia', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'];

export default function OnboardingScreen() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const [step, setStep] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<typeof GENDER_OPTIONS[number] | null>(null);
  const [country, setCountry] = useState(COUNTRY_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const steps = ['Avatar', 'Username', 'Gender', 'Country'];

  const animateToStep = (newStep: number) => {
    Animated.timing(slideAnim, {
      toValue: -newStep * width,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setStep(newStep);
  };

  const handleComplete = async () => {
    if (!user || !firestore) return;
    if (!username.trim()) { Alert.alert('Error', 'Please enter a username'); return; }
    if (!gender) { Alert.alert('Error', 'Please select your gender'); return; }

    setIsSubmitting(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);

      const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${selectedAvatar.emoji}&backgroundColor=${selectedAvatar.color.replace('#', '')}`;

      const updates = {
        username: username.trim(),
        avatarUrl,
        gender,
        country,
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, updates, { merge: true });
      await setDoc(profileRef, updates, { merge: true });

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error("Save profile error: ", error);
      Alert.alert('Error', error?.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <View className="w-screen px-6" key="avatar">
            <Text className="text-2xl font-bold text-white text-center mb-2">Choose Your Avatar</Text>
            <Text className="text-sm text-white/70 text-center mb-8">Pick an avatar that represents you</Text>
            <View className="flex-row flex-wrap justify-center gap-3 mb-8">
              {PRESET_AVATARS.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setSelectedAvatar(a)}
                  className={`w-16 h-16 rounded-2xl items-center justify-center ${selectedAvatar.id === a.id ? 'border-2 border-white' : 'border border-white/20'}`}
                  style={{ backgroundColor: a.color + '40' }}
                >
                  <Text className="text-3xl">{a.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="items-center">
              <View className="w-28 h-28 rounded-full items-center justify-center mb-4 border-2 border-white/30" style={{ backgroundColor: selectedAvatar.color + '60' }}>
                <Text className="text-6xl">{selectedAvatar.emoji}</Text>
              </View>
            </View>
          </View>
        );
      case 1:
        return (
          <View className="w-screen px-6" key="username">
            <Text className="text-2xl font-bold text-white text-center mb-2">Your Username</Text>
            <Text className="text-sm text-white/70 text-center mb-8">This is how others will see you</Text>
            <View className="w-full max-w-sm">
              <View className="flex-row items-center bg-white/10 border border-white/20 rounded-2xl px-4">
                <User size={20} color="rgba(255,255,255,0.5)" />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  maxLength={24}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="flex-1 h-14 ml-3 text-white text-lg font-bold"
                  autoCapitalize="none"
                />
              </View>
              <Text className="text-xs text-white/50 mt-2 ml-1">{username.length}/24 characters</Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View className="w-screen px-6" key="gender">
            <Text className="text-2xl font-bold text-white text-center mb-2">Your Gender</Text>
            <Text className="text-sm text-white/70 text-center mb-4">Cannot be changed later</Text>
            <View className="flex-row gap-4 w-full max-w-sm">
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 h-20 rounded-2xl items-center justify-center border-2 ${gender === g ? 'border-white bg-white/20' : 'border-white/10 bg-white/5'}`}
                >
                  <Text className={`text-lg font-bold ${gender === g ? 'text-white' : 'text-white/60'}`}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View className="w-screen px-6" key="country">
            <Text className="text-2xl font-bold text-white text-center mb-2">Your Country</Text>
            <Text className="text-sm text-white/70 text-center mb-8">Help us personalize your experience</Text>
            <ScrollView className="w-full max-w-sm max-h-80" showsVerticalScrollIndicator={false}>
              {COUNTRY_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCountry(c)}
                  className={`w-full h-14 px-4 rounded-xl flex-row items-center justify-between mb-2 ${country === c ? 'bg-white/20 border border-white/30' : 'bg-white/5 border border-white/10'}`}
                >
                  <View className="flex-row items-center">
                    <Globe size={18} color={country === c ? 'white' : 'rgba(255,255,255,0.5)'} />
                    <Text className={`ml-3 font-bold ${country === c ? 'text-white' : 'text-white/70'}`}>{c}</Text>
                  </View>
                  {country === c && <Check size={18} color="white" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
    }
  };

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  return (
    <View className="flex-1">
      <LinearGradient colors={['#ff8ebb', '#ffade0', '#f472b6']} className="absolute inset-0" />
      <View className="absolute inset-0 bg-black/30" />

      <View className="flex-row justify-center gap-2 pt-16 pb-6">
        {steps.map((_, i) => (
          <View key={i} className={`h-1.5 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`} style={{ width: 40 }} />
        ))}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Animated.View className="flex-row" style={{ transform: [{ translateX: slideAnim }], width: width * 4 }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} className="items-center justify-start pt-8" style={{ width }}>
              {renderStep(i)}
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View className="px-6 pb-12">
        {step > 0 && (
          <TouchableOpacity onPress={() => animateToStep(step - 1)} className="mb-3 items-center">
            <Text className="text-white/70 font-semibold">Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => step < 3 ? animateToStep(step + 1) : handleComplete()}
          disabled={isSubmitting || (step === 1 && !username.trim()) || (step === 2 && !gender)}
          className="w-full h-14 rounded-2xl bg-white items-center justify-center shadow-lg flex-row gap-2"
        >
          <Text className="text-[#140028] font-bold text-lg">
            {isSubmitting ? 'Saving...' : step < 3 ? 'Continue' : 'Complete Setup'}
          </Text>
          {step < 3 && <ChevronRight size={20} color="#140028" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
