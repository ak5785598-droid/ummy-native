import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView } from 'react-native';
import { Camera, ImageIcon, Loader } from 'lucide-react-native';
import { useFirestore, useStorage } from '../../firebase/provider';
import { doc, setDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

const ACTIVE_GAME_FREQUENCIES = [
  { id: 'roulette', title: 'Roulette', slug: 'roulette' },
  { id: 'ludo', title: 'Ludo Masters', slug: 'ludo' },
  { id: 'fruit-party', title: 'Fruit Party', slug: 'fruit-party' },
  { id: 'forest-party', title: 'Wild Party', slug: 'forest-party' },
];

export function GameLoadingSyncTab() {
  const firestore = useFirestore();
  const storage = useStorage();
  
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingGameSlug, setUploadingGameSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;

    // Listen to real-time changes of the games collection
    const unsub = firestore.collection('games').onSnapshot(
      (snapshot: any) => {
        const firestoreGames = snapshot.docs.map((doc: any) => ({
          slug: doc.id,
          ...doc.data(),
        }));

        const mergedGames = ACTIVE_GAME_FREQUENCIES.map(base => {
          const match = firestoreGames.find((g: any) => g.slug === base.slug);
          return match ? { ...base, ...match } : base;
        });

        setGames(mergedGames);
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('[GameLoadingSync] Error loading games:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [firestore]);

  const handlePickAndUpload = async (game: any) => {
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
      setUploadingGameSlug(game.slug);

      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `games/${game.slug}/loading_bg_${Date.now()}.jpg`;
      const sRef = storageRef(storage, filename);
      
      await uploadBytes(sRef, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const downloadUrl = await getDownloadURL(sRef);
      
      await setDoc(doc(firestore, 'games', game.slug), {
        loadingBackgroundUrl: downloadUrl,
        updatedAt: new Date().toISOString(), // Fallback standard representation
      }, { merge: true });

      Alert.alert('Success', `${game.title} Loading Background synchronized!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to upload background.');
    } finally {
      setUploadingGameSlug(null);
    }
  };

  const handleReset = async (game: any) => {
    if (!firestore) return;

    Alert.alert(
      'Reset Background',
      `Are you sure you want to reset ${game.title} loading background to default?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingGameSlug(game.slug);
              await setDoc(doc(firestore, 'games', game.slug), {
                loadingBackgroundUrl: null,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              Alert.alert('Success', `Reset ${game.title} background.`);
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', 'Failed to reset background.');
            } finally {
              setUploadingGameSlug(null);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Loading Sync 🎮</Text>
        <Text style={styles.subtitle}>
          Upload custom backgrounds for specific game loading screens.
        </Text>
      </View>

      <View style={styles.gamesGrid}>
        {games.map(game => (
          <View key={game.slug} style={styles.gameCard}>
            <View style={styles.previewContainer}>
              {game.loadingBackgroundUrl ? (
                <Image cachePolicy="memory-disk" source={{ uri: game.loadingBackgroundUrl }} 
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.defaultPlaceholder}>
                  <ImageIcon size={32} color="#cbd5e1" style={styles.placeholderIcon} />
                  <Text style={styles.placeholderText}>Standard Sync</Text>
                </View>
              )}

              {uploadingGameSlug === game.slug && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadingText}>Syncing...</Text>
                </View>
              )}

              <TouchableOpacity 
                onPress={() => handlePickAndUpload(game)} 
                disabled={uploadingGameSlug !== null}
                style={styles.cameraButton}
              >
                <Camera size={16} color="#7c3aed" />
              </TouchableOpacity>
            </View>

            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              {game.loadingBackgroundUrl && (
                <TouchableOpacity onPress={() => handleReset(game)} disabled={uploadingGameSlug !== null}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  defaultPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    opacity: 0.3,
    marginBottom: 4,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  gameTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 6,
  },
  resetText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
