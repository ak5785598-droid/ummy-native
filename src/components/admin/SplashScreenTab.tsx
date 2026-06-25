import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Camera, Loader, BadgeCheck } from 'lucide-react-native';
import { useFirestore, useStorage } from '../../firebase/provider';
import { doc, setDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export function SplashScreenTab() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    const unsub = doc(firestore, 'appConfig', 'global').onSnapshot(
      (snap: any) => {
        if (snap.exists) {
          setConfig(snap.data());
        }
        setLoading(false);
      },
      (err: any) => {
        console.warn('[SplashScreenTab] Firestore Error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firestore]);

  const selectAndUploadLogo = async () => {
    if (!firestore || !storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingLogo(true);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `branding/logo_${Date.now()}.png`;
      const sRef = storageRef(storage, filename);
      await uploadBytes(sRef, blob, { contentType: 'image/png', cacheControl: 'public, max-age=2592000, immutable' });
      const downloadUrl = await getDownloadURL(sRef);

      await setDoc(doc(firestore, 'appConfig', 'global'), {
        customLogoUrl: downloadUrl,
      }, { merge: true });

      Alert.alert('Success', 'Global Logo synchronized successfully!');
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const selectAndUploadSplash = async () => {
    if (!firestore || !storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingSplash(true);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `branding/splash_bg_${Date.now()}.jpg`;
      const sRef = storageRef(storage, filename);
      await uploadBytes(sRef, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const downloadUrl = await getDownloadURL(sRef);

      await setDoc(doc(firestore, 'appConfig', 'global'), {
        splashScreenUrl: downloadUrl,
      }, { merge: true });

      Alert.alert('Success', 'Splash Background synchronized successfully!');
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploadingSplash(false);
    }
  };

  const handleResetLogo = async () => {
    if (!firestore) return;
    try {
      setUploadingLogo(true);
      await setDoc(doc(firestore, 'appConfig', 'global'), {
        customLogoUrl: null,
      }, { merge: true });
      Alert.alert('Success', 'Logo reset to default.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <BadgeCheck size={24} color="#7c3aed" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          Splash Screen & Logo
        </Text>
      </View>

      {/* Global Logo card */}
      <View style={{ padding: 20, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1.5, borderColor: '#f1f5f9', marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
            Brand Signature (Logo)
          </Text>
          {config?.customLogoUrl && (
            <TouchableOpacity onPress={handleResetLogo}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 100, height: 80, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 16 }}>
            {config?.customLogoUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: config.customLogoUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            ) : (
              <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>DEFAULT LOGO</Text>
            )}
            {uploadingLogo && (
              <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 16 }}>
              Upload a PNG/JPG signature to align brand identity across the application.
            </Text>
            <TouchableOpacity
              onPress={selectAndUploadLogo}
              disabled={uploadingLogo}
              style={{
                backgroundColor: '#7c3aed',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                alignItems: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                Upload Logo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Splash background card */}
      <View style={{ padding: 20, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1.5, borderColor: '#f1f5f9', marginBottom: 40 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', marginBottom: 16 }}>
          Splash Background
        </Text>

        <View style={{ alignSelf: 'center', width: 180, height: 320, borderRadius: 20, backgroundColor: '#0f172a', borderWidth: 4, borderColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 16 }}>
          {config?.splashScreenUrl ? (
            <Image cachePolicy="memory-disk" source={{ uri: config.splashScreenUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text style={{ color: '#fff', fontSize: 12, opacity: 0.3, fontWeight: '700' }}>Stars Active</Text>
          )}
          {uploadingSplash && (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
              <Loader size={24} color="#fff" />
            </View>
          )}
          <TouchableOpacity
            onPress={selectAndUploadSplash}
            disabled={uploadingSplash}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              backgroundColor: '#7c3aed',
              width: 38,
              height: 38,
              borderRadius: 19,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 4
            }}
          >
            <Camera size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
