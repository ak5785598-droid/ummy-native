import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { Heart, Trash2, Palette, Save, Users } from 'lucide-react-native';
import { useFirestore, useStorage } from '../../firebase/provider';
import { doc, getDoc, updateDoc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export function CpManagementTab() {
  const firestore = useFirestore();
  const storage = useStorage();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCpBg, setUploadingCpBg] = useState(false);
  const [uploadingFriendBg, setUploadingFriendBg] = useState(false);
  
  const [config, setConfig] = useState<any>({
    cpBgType: 'dynamic', // 'dynamic' | 'image' | 'video'
    cpBgUrl: '',
    cpHeaderTheme: '#FF91B5',
    friendBgType: 'dynamic', // 'dynamic' | 'image' | 'video'
    friendBgUrl: '',
    friendHeaderTheme: '#60a5fa'
  });

  useEffect(() => {
    if (!firestore) return;
    
    const fetchConfig = async () => {
      try {
        const docRef = doc(firestore, 'appConfig', 'global');
        const snap = await getDoc(docRef);
        if (snap.exists) {
          const data = snap.data();
          setConfig({
            cpBgType: data.cpBgType || 'dynamic',
            cpBgUrl: data.cpBgUrl || '',
            cpHeaderTheme: data.cpHeaderTheme || '#FF91B5',
            friendBgType: data.friendBgType || 'dynamic',
            friendBgUrl: data.friendBgUrl || '',
            friendHeaderTheme: data.friendHeaderTheme || '#60a5fa'
          });
        }
      } catch (err) {
        console.error("Error loading CP/Friend Config:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [firestore]);

  const handleMediaUpload = async (target: 'cp' | 'friend') => {
    if (!storage || !firestore) return;

    const bgType = target === 'cp' ? config.cpBgType : config.friendBgType;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload files.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: bgType === 'video' ? ['videos'] : ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      if (target === 'cp') setUploadingCpBg(true);
      else setUploadingFriendBg(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const storagePath = `settings/${target}_bg_${Date.now()}`;
      const fileRef = storageRef(storage, storagePath);
      
      await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(fileRef);

      setConfig((prev: any) => ({
        ...prev,
        [`${target}BgUrl`]: downloadURL
      }));
      Alert.alert('Success', 'Media uploaded locally. Click Save Settings to publish!');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload background.');
    } finally {
      if (target === 'cp') setUploadingCpBg(false);
      else setUploadingFriendBg(false);
    }
  };

  const handleSaveCpConfig = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const docRef = doc(firestore, 'appConfig', 'global');
      await updateDoc(docRef, {
        cpBgType: config.cpBgType,
        cpBgUrl: config.cpBgUrl,
        cpHeaderTheme: config.cpHeaderTheme,
        friendBgType: config.friendBgType,
        friendBgUrl: config.friendBgUrl,
        friendHeaderTheme: config.friendHeaderTheme,
        updatedAt: new Date().toISOString()
      });
      Alert.alert('Success', 'CP & Friend House Background settings saved!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Save Failed', err.message || 'Failed to update configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>CP / Friend Room Settings 💖</Text>
        <Text style={styles.subtitle}>
          Configure backgrounds, upload custom background images or video loops, and set fallback gradient colors for both the CP and Friend sub-tabs inside CP House.
        </Text>
      </View>

      {/* CP Config Card */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Heart size={18} color="#ec4899" style={{ fill: '#ec4899' }} />
          <Text style={styles.sectionTitle}>CP Tab Branding Settings</Text>
        </View>

        <Text style={styles.label}>Background Type</Text>
        <View style={styles.selectContainer}>
          {['dynamic', 'image', 'video'].map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setConfig((prev: any) => ({ ...prev, cpBgType: type }))}
              style={[styles.selectOption, config.cpBgType === type && styles.selectOptionActive]}
            >
              <Text style={[styles.selectOptionText, config.cpBgType === type && styles.selectOptionTextActive]}>
                {type === 'dynamic' ? 'Dynamic' : type === 'image' ? 'Image BG' : 'Video BG'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Theme Fallback Color (Hex)</Text>
        <View style={styles.colorRow}>
          <TextInput 
            value={config.cpHeaderTheme}
            onChangeText={t => setConfig((prev: any) => ({ ...prev, cpHeaderTheme: t }))}
            style={styles.textInput}
            placeholder="#FF91B5"
          />
          <View style={[styles.colorIndicator, { backgroundColor: config.cpHeaderTheme || '#FF91B5' }]} />
        </View>

        {config.cpBgType !== 'dynamic' && (
          <View style={styles.uploadRow}>
            <TouchableOpacity 
              onPress={() => handleMediaUpload('cp')} 
              disabled={uploadingCpBg}
              style={[styles.uploadButton, { flex: 1 }]}
            >
              {uploadingCpBg ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>
                  {config.cpBgUrl ? 'Update Media' : 'Upload File'}
                </Text>
              )}
            </TouchableOpacity>

            {config.cpBgUrl && (
              <View style={styles.thumbnailContainer}>
                <Image cachePolicy="memory-disk" source={{ uri: config.cpBgUrl }} style={styles.thumbnail} />
                <TouchableOpacity 
                  onPress={() => setConfig((prev: any) => ({ ...prev, cpBgUrl: '' }))}
                  style={styles.trashBadge}
                >
                  <Trash2 size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Friend Config Card */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <View style={styles.sectionHeader}>
          <Users size={18} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Friend Tab Branding Settings</Text>
        </View>

        <Text style={styles.label}>Background Type</Text>
        <View style={styles.selectContainer}>
          {['dynamic', 'image', 'video'].map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setConfig((prev: any) => ({ ...prev, friendBgType: type }))}
              style={[styles.selectOption, config.friendBgType === type && styles.selectOptionActiveBlue]}
            >
              <Text style={[styles.selectOptionText, config.friendBgType === type && styles.selectOptionTextActiveBlue]}>
                {type === 'dynamic' ? 'Dynamic' : type === 'image' ? 'Image BG' : 'Video BG'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Theme Fallback Color (Hex)</Text>
        <View style={styles.colorRow}>
          <TextInput 
            value={config.friendHeaderTheme}
            onChangeText={t => setConfig((prev: any) => ({ ...prev, friendHeaderTheme: t }))}
            style={styles.textInput}
            placeholder="#60a5fa"
          />
          <View style={[styles.colorIndicator, { backgroundColor: config.friendHeaderTheme || '#60a5fa' }]} />
        </View>

        {config.friendBgType !== 'dynamic' && (
          <View style={styles.uploadRow}>
            <TouchableOpacity 
              onPress={() => handleMediaUpload('friend')} 
              disabled={uploadingFriendBg}
              style={[styles.uploadButtonBlue, { flex: 1 }]}
            >
              {uploadingFriendBg ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>
                  {config.friendBgUrl ? 'Update Media' : 'Upload File'}
                </Text>
              )}
            </TouchableOpacity>

            {config.friendBgUrl && (
              <View style={styles.thumbnailContainer}>
                <Image cachePolicy="memory-disk" source={{ uri: config.friendBgUrl }} style={styles.thumbnail} />
                <TouchableOpacity 
                  onPress={() => setConfig((prev: any) => ({ ...prev, friendBgUrl: '' }))}
                  style={styles.trashBadge}
                >
                  <Trash2 size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        onPress={handleSaveCpConfig} 
        disabled={isSaving}
        style={[styles.saveButton, isSaving && styles.disabledButton]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Save size={20} color="#fff" />
        )}
        <Text style={styles.saveButtonText}>Save Settings</Text>
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
    backgroundColor: '#fdf2f8',
    borderColor: '#fbcfe8',
  },
  selectOptionActiveBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  selectOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  selectOptionTextActive: {
    color: '#db2777',
  },
  selectOptionTextActiveBlue: {
    color: '#2563eb',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  colorIndicator: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  uploadButton: {
    height: 48,
    backgroundColor: '#db2777',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonBlue: {
    height: 48,
    backgroundColor: '#2563eb',
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
  saveButton: {
    height: 54,
    backgroundColor: '#db2777',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    shadowColor: '#db2777',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
