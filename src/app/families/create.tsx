import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Camera, ShieldCheck, Trophy } from 'lucide-react-native';
import { useFirebase, useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { doc, setDoc, serverTimestamp, increment } from '../../firebase/firestore-compat';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import storage from '@react-native-firebase/storage';

const CREATE_COST = 100000;

export default function CreateFamilyPage() {
  const router = useRouter();
  const { firestore, isHydrated } = useFirebase();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerLocalUri, setBannerLocalUri] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const canAfford = (userProfile?.wallet?.coins || 0) >= CREATE_COST;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setBannerLocalUri(result.assets[0].uri);
      setBannerUrl('');
    }
  };

  const uploadBanner = async (uri: string): Promise<string> => {
    const filename = `families/banners/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
    return await reference.getDownloadURL();
  };

  const handleCreate = async () => {
    if (!user || !userProfile || !firestore) return;

    if (name.length < 3) {
      Alert.alert('Name too short', 'Family name must be at least 3 characters.');
      return;
    }

    if (!canAfford) {
      Alert.alert('Insufficient Coins', `You need ${CREATE_COST.toLocaleString()} coins to create a family.`);
      return;
    }

    setIsSubmitting(true);
    const familyId = `FAM_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    try {
      let finalBannerUrl = bannerUrl || `https://picsum.photos/seed/${familyId}/400`;
      if (bannerLocalUri) {
        setIsUploading(true);
        finalBannerUrl = await uploadBanner(bannerLocalUri);
        setIsUploading(false);
      }

      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const familyRef = doc(firestore, 'families', familyId);

      await setDoc(userRef, {
        familyId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(profileRef, {
        'wallet.coins': increment(-CREATE_COST),
        familyId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(familyRef, {
        id: familyId,
        name,
        description,
        bannerUrl: finalBannerUrl,
        ownerId: user.uid,
        ownerName: userProfile.username || 'Founder',
        ownerAvatar: userProfile.avatarUrl || '',
        memberCount: 1,
        level: 1,
        totalWealth: 0,
        members: [user.uid],
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      Alert.alert('Family Established!', `Welcome to the ${name} legacy.`, [
        { text: 'OK', onPress: () => router.push(`/families/${familyId}`) }
      ]);
    } catch (err) {
      console.error('Family creation failed:', err);
      Alert.alert('Creation Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a0533' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase' }}>Found a Legacy</Text>
        </View>

        {/* Form Card */}
        <View style={{ marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          {/* Banner Preview */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={pickImage} style={{
              width: 96, height: 96, borderRadius: 24,
              borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(168,85,247,0.3)',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              backgroundColor: 'rgba(168,85,247,0.1)'
            }}>
              {bannerLocalUri ? (
                <Image source={{ uri: bannerLocalUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Camera size={32} color="#a855f7" />
              )}
            </TouchableOpacity>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
              {bannerLocalUri ? 'Tap to change' : 'Upload Banner'}
            </Text>
          </View>

          {/* Family Name */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Family Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. The Immortals"
              placeholderTextColor="rgba(255,255,255,0.15)"
              style={{
                height: 52, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
                paddingHorizontal: 16, color: 'white', fontSize: 14, fontWeight: '700',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
              }}
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Legacy Motto</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What defines your family?"
              placeholderTextColor="rgba(255,255,255,0.15)"
              multiline
              numberOfLines={3}
              style={{
                height: 80, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
                paddingHorizontal: 16, paddingTop: 14, color: 'white', fontSize: 14, fontWeight: '700',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', textAlignVertical: 'top'
              }}
            />
          </View>

          {/* Cost */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' }}>
            <View>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '800' }}>Creation Cost</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', marginTop: 2 }}>One-time payment</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#EAB308', fontSize: 20, fontWeight: '900' }}>{CREATE_COST.toLocaleString()}</Text>
              <Text style={{ color: '#EAB308', fontSize: 12, fontWeight: '700' }}>🪙</Text>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isSubmitting || !canAfford || name.length < 3}
            activeOpacity={0.8}
            style={{
              backgroundColor: (!isSubmitting && canAfford && name.length >= 3) ? '#4ADE80' : 'rgba(255,255,255,0.1)',
              borderRadius: 20, paddingVertical: 16, alignItems: 'center',
              shadowColor: (!isSubmitting && canAfford && name.length >= 3) ? '#4ADE80' : 'transparent',
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{
                color: (!isSubmitting && canAfford && name.length >= 3) ? '#000' : 'rgba(255,255,255,0.3)',
                fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1
              }}>{isUploading ? 'Uploading...' : 'Create Family'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Rewards */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 20 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <ShieldCheck size={22} color="#4ADE80" />
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 8, textAlign: 'center' }}>Verified Badge</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Trophy size={22} color="#EAB308" />
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 8, textAlign: 'center' }}>Global Leaderboard</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
