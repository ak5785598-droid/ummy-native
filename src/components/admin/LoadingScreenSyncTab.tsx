import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Camera, Loader } from 'lucide-react-native';
import { useFirestore, useStorage } from '../../firebase/provider';
import { doc, setDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export function LoadingScreenSyncTab() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    const unsub = doc(firestore, 'system', 'config').onSnapshot(
      (snap: any) => {
        if (snap.exists) {
          setConfig(snap.data());
        }
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('[LoadingScreenSync] Firestore Error:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [firestore]);

  const handlePickAndUpload = async () => {
    if (!firestore || !storage) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload files.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      setIsUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `branding/loading_bg_${Date.now()}.jpg`;
      const sRef = storageRef(storage, filename);
      
      await uploadBytes(sRef, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const downloadUrl = await getDownloadURL(sRef);
      
      await setDoc(doc(firestore, 'system', 'config'), {
        appLoadingBackgroundUrl: downloadUrl,
      }, { merge: true });

      Alert.alert('Success', 'App loading background synced successfully!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to upload loading background.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    if (!firestore) return;

    Alert.alert(
      'Reset Background',
      'Are you sure you want to reset to the default app loading background?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploading(true);
              await setDoc(doc(firestore, 'system', 'config'), {
                appLoadingBackgroundUrl: null,
              }, { merge: true });
              Alert.alert('Success', 'Reset to default loading background.');
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', 'Failed to reset loading background.');
            } finally {
              setIsUploading(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loading Screen Sync 🖼️</Text>
        <Text style={styles.subtitle}>
          Manage the background image shown during app initialization and dimension transitions.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Global Loading Background</Text>
          {config?.appLoadingBackgroundUrl && (
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset to Default</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.previewContainer}>
          {config?.appLoadingBackgroundUrl ? (
            <Image cachePolicy="memory-disk" source={{ uri: config.appLoadingBackgroundUrl }} 
              style={styles.previewImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.defaultPlaceholder}>
              <Loader size={36} color="#94a3b8" />
              <Text style={styles.placeholderText}>Default Syncing</Text>
            </View>
          )}

          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.uploadingText}>Uploading Image...</Text>
            </View>
          )}

          <TouchableOpacity 
            onPress={handlePickAndUpload} 
            disabled={isUploading}
            style={styles.cameraButton}
          >
            <Camera size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 450,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  defaultPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
