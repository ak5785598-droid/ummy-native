import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useStorage } from '../../firebase/provider';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Trophy, Trash2, Check, Plus, Video, Image as ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';

interface FrameConfig {
  videoUrl: string;
  imageUrl: string;
  type: 'video' | 'image';
  isEnabled: boolean;
}

interface ThemeConfig {
  id?: string;
  name: string;
  backgroundUrl: string;
  backgroundType: 'image' | 'video';
  isActive: boolean;
  frameConfigs: {
    rank1: FrameConfig;
    rank2: FrameConfig;
    rank3: FrameConfig;
    top: FrameConfig;
  };
}

const defaultFrame: FrameConfig = {
  videoUrl: '',
  imageUrl: '',
  type: 'image',
  isEnabled: false
};

export function RankingThemesTab() {
  const storage = useStorage();
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [bgType, setBgType] = useState<'image' | 'video'>('image');
  const [isActive, setIsActive] = useState(false);
  const [rank1, setRank1] = useState<FrameConfig>({ ...defaultFrame });
  const [rank2, setRank2] = useState<FrameConfig>({ ...defaultFrame });
  const [rank3, setRank3] = useState<FrameConfig>({ ...defaultFrame });
  const [top, setTop] = useState<FrameConfig>({ ...defaultFrame });

  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    const unsub = firestore()
      .collection('leaderboardThemes')
      .onSnapshot((snap) => {
        const list: ThemeConfig[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ThemeConfig));
        setThemes(list);
        setLoading(false);
      }, err => {
        setLoading(false);
      });

    return () => unsub();
  }, []);

  const handlePickMedia = async (target: string, mediaType: 'images' | 'videos' = 'images') => {
    if (!storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Denied', 'Permission is required to choose files.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'videos' ? ['videos'] : ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingField(target);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const ext = mediaType === 'videos' ? 'mp4' : 'png';
      const path = `rankings/theme_${target}_${Date.now()}.${ext}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(sRef);

      if (target === 'bg') {
        setBgUrl(downloadURL);
        setBgType(mediaType === 'videos' ? 'video' : 'image');
      } else if (target === 'rank1') {
        setRank1(prev => ({ ...prev, imageUrl: downloadURL, isEnabled: true }));
      } else if (target === 'rank2') {
        setRank2(prev => ({ ...prev, imageUrl: downloadURL, isEnabled: true }));
      } else if (target === 'rank3') {
        setRank3(prev => ({ ...prev, imageUrl: downloadURL, isEnabled: true }));
      } else if (target === 'top') {
        setTop(prev => ({ ...prev, imageUrl: downloadURL, isEnabled: true }));
      }
      Alert.alert('Success', 'Media uploaded and configured.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !bgUrl) {
      Alert.alert('Incomplete Form', 'Please provide a name and background media.');
      return;
    }

    setSaving(true);
    try {
      const data: Omit<ThemeConfig, 'id'> = {
        name: name.trim(),
        backgroundUrl: bgUrl,
        backgroundType: bgType,
        isActive,
        frameConfigs: { rank1, rank2, rank3, top }
      };

      if (isActive) {
        // Deactivate other themes first
        const activeSnap = await firestore()
          .collection('leaderboardThemes')
          .where('isActive', '==', true)
          .get();
        const batch = firestore().batch();
        activeSnap.docs.forEach(doc => {
          batch.update(doc.ref, { isActive: false });
        });
        await batch.commit();
      }

      await firestore().collection('leaderboardThemes').add(data);
      Alert.alert('Success', 'Leaderboard Theme created!');
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setBgUrl('');
    setBgType('image');
    setIsActive(false);
    setRank1({ ...defaultFrame });
    setRank2({ ...defaultFrame });
    setRank3({ ...defaultFrame });
    setTop({ ...defaultFrame });
    setShowForm(false);
  };

  const toggleThemeActive = async (theme: ThemeConfig) => {
    try {
      const nextActive = !theme.isActive;
      if (nextActive) {
        // Deactivate others
        const activeSnap = await firestore()
          .collection('leaderboardThemes')
          .where('isActive', '==', true)
          .get();
        const batch = firestore().batch();
        activeSnap.docs.forEach(doc => {
          if (doc.id !== theme.id) {
            batch.update(doc.ref, { isActive: false });
          }
        });
        batch.update(firestore().collection('leaderboardThemes').doc(theme.id), { isActive: true });
        await batch.commit();
      } else {
        await firestore().collection('leaderboardThemes').doc(theme.id).update({ isActive: false });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Theme', 'Permanently remove this leaderboard theme?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('leaderboardThemes').doc(id).delete();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Trophy size={24} color="#6366f1" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
            Leaderboard Themes
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={{
            backgroundColor: showForm ? '#ef4444' : '#0f172a',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            {showForm ? 'Cancel' : 'Add Theme'}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm ? (
        <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 12, textTransform: 'uppercase' }}>
            New Leaderboard Theme
          </Text>

          <TextInput
            placeholder="Theme Name (e.g. Royal Gold)"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          {/* Background Upload */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>1. Theme Background</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => handlePickMedia('bg', 'images')}
                style={styles.uploadBtn}
                disabled={uploadingField !== null}
              >
                {uploadingField === 'bg' ? (
                  <ActivityIndicator size="small" color="#7c3aed" />
                ) : (
                  <>
                    <ImageIcon size={16} color="#7c3aed" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadBtnText}>Upload Image</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handlePickMedia('bg', 'videos')}
                style={styles.uploadBtn}
                disabled={uploadingField !== null}
              >
                {uploadingField === 'bg' ? (
                  <ActivityIndicator size="small" color="#7c3aed" />
                ) : (
                  <>
                    <Video size={16} color="#7c3aed" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadBtnText}>Upload Video</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {bgUrl ? (
              <View style={{ marginTop: 8, height: 100, borderRadius: 12, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                {bgType === 'video' ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>Video Configured</Text>
                  </View>
                ) : (
                  <Image cachePolicy="memory-disk" source={{ uri: bgUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                )}
              </View>
            ) : null}
          </View>

          {/* Rank Borders Uploads */}
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>2. Rank Borders Configuration</Text>
            {(['rank1', 'rank2', 'rank3', 'top'] as const).map(rankKey => {
              const border = rankKey === 'rank1' ? rank1 : rankKey === 'rank2' ? rank2 : rankKey === 'rank3' ? rank3 : top;
              return (
                <View key={rankKey} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                    {rankKey === 'rank1' ? 'ðŸ¥‡ Rank 1' : rankKey === 'rank2' ? 'ðŸ¥ˆ Rank 2' : rankKey === 'rank3' ? 'ðŸ¥‰ Rank 3' : 'â­ Rank 4+'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePickMedia(rankKey)}
                    style={styles.smallUploadBtn}
                    disabled={uploadingField !== null}
                  >
                    {uploadingField === rankKey ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : border.imageUrl ? (
                      <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '800' }}>Configured</Text>
                    ) : (
                      <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '800' }}>Choose Border</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Save Action */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#10b981',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' }}>
                Save Theme Config
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Themes Inventory */}
      <View style={{ marginBottom: 40 }}>
        {themes.map(theme => (
          <View
            key={theme.id}
            style={{
              padding: 16,
              backgroundColor: '#f8fafc',
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                {theme.name}
              </Text>
              <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 4 }}>
                Type: {theme.backgroundType?.toUpperCase()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => toggleThemeActive(theme)}
                style={{
                  backgroundColor: theme.isActive ? '#10b981' : '#fff',
                  borderWidth: 1,
                  borderColor: theme.isActive ? '#10b981' : '#cbd5e1',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {theme.isActive && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={{ color: theme.isActive ? '#fff' : '#64748b', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                  {theme.isActive ? 'Active' : 'Activate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => theme.id && handleDelete(theme.id)}
                style={{
                  padding: 8,
                  backgroundColor: '#fee2e2',
                  borderRadius: 10,
                }}
              >
                <Trash2 size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  uploadBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  uploadBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700'
  },
  smallUploadBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff'
  }
});
