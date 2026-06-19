import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { Users, Search, Upload, Trash2, ImageIcon } from 'lucide-react-native';
import { useFirestore, useStorage } from '../../firebase/provider';
import { doc, updateDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export function FamilyManagementTab() {
  const firestore = useFirestore();
  const storage = useStorage();

  const [searchQuery, setSearchQuery] = useState('');
  const [families, setFamilies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFamilyId, setUploadingFamilyId] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const unsub = firestore.collection('families').onSnapshot(
      (snapshot: any) => {
        const list = snapshot.docs.map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setFamilies(list);
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('[FamilyManagement] Firestore snapshot error:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [firestore]);

  const filteredFamilies = useMemo(() => {
    return families.filter((f: any) => 
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [families, searchQuery]);

  const handleBannerUpload = async (familyId: string) => {
    if (!storage || !firestore) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload files.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      setUploadingFamilyId(familyId);

      const response = await fetch(uri);
      const blob = await response.blob();

      const storagePath = `families/${familyId}/banner_${Date.now()}`;
      const fileRef = storageRef(storage, storagePath);
      
      await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(fileRef);

      const familyDocRef = doc(firestore, 'families', familyId);
      await updateDoc(familyDocRef, {
        bannerUrl: downloadURL,
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Family cover banner updated!');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload banner media.');
    } finally {
      setUploadingFamilyId(null);
    }
  };

  const handleClearBanner = (familyId: string) => {
    if (!firestore) return;

    Alert.alert(
      'Remove Cover Banner',
      'Are you sure you want to clear the cover banner for this family?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const familyDocRef = doc(firestore, 'families', familyId);
              await updateDoc(familyDocRef, {
                bannerUrl: '',
                updatedAt: new Date().toISOString()
              });
              Alert.alert('Success', 'Cover banner cleared.');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to clear banner.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Management 🏡</Text>
        <Text style={styles.subtitle}>
          Search and manage all user families. Upload or replace custom image or video cover banners for families.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          placeholder="Search families by name or founder..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Families Scroll Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredFamilies.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No families found</Text>
          </View>
        ) : (
          filteredFamilies.map((family) => {
            const isUploading = uploadingFamilyId === family.id;
            return (
              <View key={family.id} style={styles.familyCard}>
                <View style={styles.cardHeader}>
                  {family.logoUrl ? (
                    <Image cachePolicy="memory-disk" source={{ uri: family.logoUrl }} style={styles.logo} />
                  ) : (
                    <View style={styles.fallbackLogo}>
                      <Text style={styles.fallbackLogoText}>
                        {family.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardMeta}>
                    <Text style={styles.familyName}>{family.name}</Text>
                    <Text style={styles.familyStats}>
                      Founder: {family.ownerName || 'Unknown'} • Members: {family.memberCount || 0}
                    </Text>
                  </View>
                </View>

                {/* Banner Actions */}
                <View style={styles.bannerRow}>
                  <View style={styles.bannerPreviewContainer}>
                    {family.bannerUrl ? (
                      <Image cachePolicy="memory-disk" source={{ uri: family.bannerUrl }} style={styles.bannerPreview} />
                    ) : (
                      <View style={styles.bannerFallback}>
                        <ImageIcon size={16} color="#cbd5e1" />
                        <Text style={styles.bannerFallbackText}>Default Banner</Text>
                      </View>
                    )}
                    {family.bannerUrl && (
                      <TouchableOpacity 
                        onPress={() => handleClearBanner(family.id)}
                        style={styles.trashBadge}
                      >
                        <Trash2 size={12} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleBannerUpload(family.id)}
                    disabled={isUploading}
                    style={[styles.uploadButton, isUploading && styles.disabledButton]}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Upload size={14} color="#fff" />
                    )}
                    <Text style={styles.uploadButtonText}>
                      {family.bannerUrl ? 'Replace' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  familyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fallbackLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLogoText: {
    color: '#065f46',
    fontWeight: '900',
    fontSize: 16,
  },
  cardMeta: {
    flex: 1,
  },
  familyName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  familyStats: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bannerPreviewContainer: {
    width: 120,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bannerFallbackText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  trashBadge: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
