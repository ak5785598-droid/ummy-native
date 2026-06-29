import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView } from 'react-native';
import { Crown, Upload, Trash2, Palette, Sparkles, Save } from 'lucide-react-native';
import { useFirestore, useStorage } from '../../firebase/provider';
import { doc, getDoc, setDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export function VipManagementTab() {
  const firestore = useFirestore();
  const storage = useStorage();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    bgType: 'dynamic', // 'dynamic' | 'image' | 'video'
    bgUrl: '',
    levels: {}
  });

  const [uploadingGlobalBg, setUploadingGlobalBg] = useState(false);
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!firestore) return;
    
    const fetchConfig = async () => {
      try {
        const docRef = doc(firestore, 'settings', 'svipConfig');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            bgType: data.bgType || 'dynamic',
            bgUrl: data.bgUrl || '',
            levels: data.levels || {}
          });
        }
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [firestore]);

  const handleGlobalBgUpload = async () => {
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
      setUploadingGlobalBg(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const storagePath = `settings/vip_bg_${Date.now()}`;
      const fileRef = storageRef(storage, storagePath);
      
      await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(fileRef);

      setConfig((prev: any) => ({ ...prev, bgUrl: downloadURL }));
      Alert.alert('Success', 'Background uploaded. Remember to Save changes!');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload background.');
    } finally {
      setUploadingGlobalBg(false);
    }
  };

  const handleLevelAssetUpload = async (level: number, type: 'badge' | 'video' | 'bg' | 'imageUrl') => {
    if (!storage || !firestore) return;

    const uploadKey = `${level}_${type}`;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload files.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      setUploadingState(prev => ({ ...prev, [uploadKey]: true }));

      const response = await fetch(uri);
      const blob = await response.blob();

      const storagePath = `settings/svip_level_${level}_${type}_${Date.now()}`;
      const fileRef = storageRef(storage, storagePath);
      
      await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(fileRef);

      setConfig((prev: any) => {
        const levels = { ...prev.levels };
        levels[level] = {
          ...levels[level],
          [`${type}Url`]: downloadURL
        };
        return { ...prev, levels };
      });

      Alert.alert('Uploaded', `${type} uploaded locally. Remember to click Save Settings!`);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload file');
    } finally {
      setUploadingState(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleSaveVipConfig = async () => {
    if (!firestore) return;
    
    setIsSaving(true);
    try {
      const docRef = doc(firestore, 'settings', 'svipConfig');
      await setDoc(docRef, config, { merge: true });
      Alert.alert('Success', 'VIP Settings Saved Live!');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Failed to update VIP configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>VIP Management ðŸ‘‘</Text>
        <Text style={styles.subtitle}>
          Configure the 18-level SVIP Club experience. Upload custom badge graphics, 3D animated video loops, level images, and override page background themes.
        </Text>
      </View>

      {/* Global Background Card */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Palette size={18} color="#d97706" />
          <Text style={styles.sectionTitle}>Global VIP Branding</Text>
        </View>

        <Text style={styles.label}>Background Theme Type</Text>
        <View style={styles.selectContainer}>
          {['dynamic', 'image', 'video'].map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setConfig((prev: any) => ({ ...prev, bgType: type }))}
              style={[styles.selectOption, config.bgType === type && styles.selectOptionActive]}
            >
              <Text style={[styles.selectOptionText, config.bgType === type && styles.selectOptionTextActive]}>
                {type === 'dynamic' ? 'Dynamic Space' : type === 'image' ? 'Image BG' : 'Video BG'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {config.bgType !== 'dynamic' && (
          <View style={styles.uploadRow}>
            <TouchableOpacity 
              onPress={handleGlobalBgUpload} 
              disabled={uploadingGlobalBg}
              style={[styles.uploadButton, { flex: 1 }]}
            >
              {uploadingGlobalBg ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>
                  {config.bgUrl ? 'Update Background' : 'Upload Background'}
                </Text>
              )}
            </TouchableOpacity>

            {config.bgUrl && (
              <View style={styles.thumbnailContainer}>
                <Image cachePolicy="memory-disk" source={{ uri: config.bgUrl }} style={styles.thumbnail} />
                <TouchableOpacity 
                  onPress={() => setConfig((prev: any) => ({ ...prev, bgUrl: '' }))}
                  style={styles.trashBadge}
                >
                  <Trash2 size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 18 Levels Sync */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <View style={styles.sectionHeader}>
          <Sparkles size={18} color="#d97706" />
          <Text style={styles.sectionTitle}>Level Asset Synchronizers</Text>
        </View>

        <View style={styles.levelsList}>
          {Array.from({ length: 18 }).map((_, index) => {
            const level = index + 1;
            const lvlConfig = config.levels[level] || {};

            return (
              <View key={level} style={styles.levelRow}>
                <View style={styles.levelLeft}>
                  <Text style={styles.levelLabel}>SVIP {level}</Text>
                </View>

                <View style={styles.levelRight}>
                  {/* Badge Upload */}
                  <View style={styles.subUploadCell}>
                    <Text style={styles.cellLabel}>Badge</Text>
                    <TouchableOpacity 
                      onPress={() => handleLevelAssetUpload(level, 'badge')}
                      style={[styles.cellButton, lvlConfig.badgeUrl && styles.cellButtonActive]}
                    >
                      {uploadingState[`${level}_badge`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.cellButtonText, lvlConfig.badgeUrl && styles.cellButtonTextActive]}>
                          {lvlConfig.badgeUrl ? 'Done' : 'Upload'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Animation Video Upload */}
                  <View style={styles.subUploadCell}>
                    <Text style={styles.cellLabel}>Video</Text>
                    <TouchableOpacity 
                      onPress={() => handleLevelAssetUpload(level, 'video')}
                      style={[styles.cellButton, lvlConfig.videoUrl && styles.cellButtonActive]}
                    >
                      {uploadingState[`${level}_video`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.cellButtonText, lvlConfig.videoUrl && styles.cellButtonTextActive]}>
                          {lvlConfig.videoUrl ? 'Done' : 'Upload'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Level Image Upload */}
                  <View style={styles.subUploadCell}>
                    <Text style={styles.cellLabel}>Image</Text>
                    <TouchableOpacity 
                      onPress={() => handleLevelAssetUpload(level, 'imageUrl')}
                      style={[styles.cellButton, lvlConfig.imageUrlUrl && styles.cellButtonActive]}
                    >
                      {uploadingState[`${level}_imageUrl`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.cellButtonText, lvlConfig.imageUrlUrl && styles.cellButtonTextActive]}>
                          {lvlConfig.imageUrlUrl ? 'Done' : 'Upload'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Background Upload */}
                  <View style={styles.subUploadCell}>
                    <Text style={styles.cellLabel}>BG</Text>
                    <TouchableOpacity 
                      onPress={() => handleLevelAssetUpload(level, 'bg')}
                      style={[styles.cellButton, lvlConfig.bgUrl && styles.cellButtonActive]}
                    >
                      {uploadingState[`${level}_bg`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.cellButtonText, lvlConfig.bgUrl && styles.cellButtonTextActive]}>
                          {lvlConfig.bgUrl ? 'Done' : 'Upload'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Save Trigger */}
      <TouchableOpacity 
        onPress={handleSaveVipConfig} 
        disabled={isSaving}
        style={[styles.saveButton, isSaving && styles.disabledButton]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Save size={20} color="#fff" />
        )}
        <Text style={styles.saveButtonText}>Save VIP Settings</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  selectContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  selectOption: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOptionActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  selectOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  selectOptionTextActive: {
    color: '#b45309',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  uploadButton: {
    height: 48,
    backgroundColor: '#d97706',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  trashBadge: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelsList: {
    gap: 12,
  },
  levelRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelLeft: {
    width: '20%',
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#b45309',
  },
  levelRight: {
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  subUploadCell: {
    flex: 1,
    alignItems: 'center',
  },
  cellLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cellButton: {
    width: '100%',
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellButtonActive: {
    borderColor: '#fcd34d',
    backgroundColor: '#fef3c7',
  },
  cellButtonText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  cellButtonTextActive: {
    color: '#b45309',
  },
  saveButton: {
    height: 54,
    backgroundColor: '#d97706',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
