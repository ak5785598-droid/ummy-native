import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useStorage } from '../../firebase/provider';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { ShoppingBag, Plus, Trash2, Video, Image as ImageIcon, Search } from 'lucide-react-native';
import { Image } from 'expo-image';

export function BoutiqueHubTab() {
  const storage = useStorage();
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notForSaleMap, setNotForSaleMap] = useState<Record<string, boolean>>({});

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [duration, setDuration] = useState('7');
  const [category, setCategory] = useState<'Frame' | 'Bubble' | 'Theme' | 'Wave' | 'Entry'>('Frame');
  const [imageUri, setImageUri] = useState('');
  const [videoUri, setVideoUri] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search NFS
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Listen for storeItems
    const unsubItems = firestore()
      .collection('storeItems')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        if (snap) {
          setStoreItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });

    // Listen for appConfig global (contains notForSale map)
    const unsubConfig = firestore()
      .collection('appConfig')
      .doc('global')
      .onSnapshot(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setNotForSaleMap(d?.storeNotForSale || {});
        }
      }, (error: any) => {});

    return () => {
      unsubItems();
      unsubConfig();
    };
  }, []);

  const handlePickImage = async () => {
    if (!storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingImage(true);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `store/item_${Date.now()}.png`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(sRef);
      setImageUri(downloadURL);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickVideo = async () => {
    if (!storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingVideo(true);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `store/anim_${Date.now()}.mp4`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(sRef);
      setVideoUri(downloadURL);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUploadItem = async () => {
    if (!name.trim() || !imageUri) {
      Alert.alert('Incomplete Form', 'Name and display image are required.');
      return;
    }

    setSubmitting(true);
    try {
      const itemRef = firestore().collection('storeItems').doc();
      const itemData = {
        id: itemRef.id,
        name: name.trim(),
        url: imageUri,
        videoUrl: videoUri,
        price: parseInt(price) || 0,
        duration: parseInt(duration) || 7,
        category: category,
        createdAt: firestore.FieldValue.serverTimestamp()
      };

      await itemRef.set(itemData);
      Alert.alert('Success', 'Boutique asset uploaded successfully!');
      setName('');
      setPrice('0');
      setDuration('7');
      setImageUri('');
      setVideoUri('');
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to remove this boutique asset?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('storeItems').doc(id).delete();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const toggleNotForSale = async (itemId: string) => {
    const currentlyNfs = !!notForSaleMap[itemId];
    try {
      const ref = firestore().collection('appConfig').doc('global');
      await ref.update({
        [`storeNotForSale.${itemId}`]: currentlyNfs ? firestore.FieldValue.delete() : true,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <ShoppingBag size={24} color="#7c3aed" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          Boutique Sync
        </Text>
      </View>

      {/* Uploader Section */}
      <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 }}>
        <Text style={styles.sectionTitle}>Create New Asset</Text>
        
        <TextInput
          placeholder="Asset Name (e.g. Neon Frame)"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price (Coins)</Text>
            <TextInput
              placeholder="e.g. 500"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Duration (Days)</Text>
            <TextInput
              placeholder="e.g. 7"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {(['Frame', 'Bubble', 'Theme', 'Wave', 'Entry'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: category === cat ? '#7c3aed' : '#cbd5e1',
                backgroundColor: category === cat ? '#f5f3ff' : '#fff'
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: category === cat ? '#7c3aed' : '#475569' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity onPress={handlePickImage} style={styles.uploadBtn} disabled={uploadingImage}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : imageUri ? (
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>Image Added</Text>
            ) : (
              <>
                <ImageIcon size={14} color="#7c3aed" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Upload Image</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickVideo} style={styles.uploadBtn} disabled={uploadingVideo}>
            {uploadingVideo ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : videoUri ? (
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>Video Added</Text>
            ) : (
              <>
                <Video size={14} color="#7c3aed" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Upload Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleUploadItem}
          disabled={submitting}
          style={{
            backgroundColor: '#0f172a',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>
              Sync Boutique Asset
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Inventory & Control List */}
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Boutique Control & NFS Settings</Text>

        <TextInput
          placeholder="Search inventory..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.input}
        />

        {storeItems
          .filter(item => (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
          .map(item => {
            const isNfs = !!notForSaleMap[item.id];
            return (
              <View
                key={item.id}
                style={{
                  padding: 16,
                  backgroundColor: '#f8fafc',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#e2e8f0', marginRight: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                    {item.url ? (
                      <Image cachePolicy="memory-disk" source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <ImageIcon size={20} color="#94a3b8" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{item.name}</Text>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>
                      {item.category} â€¢ ðŸª™ {item.price} â€¢ {item.duration} Days
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => toggleNotForSale(item.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isNfs ? '#fef2f2' : '#f0fdf4',
                      borderWidth: 1,
                      borderColor: isNfs ? '#fca5a5' : '#bbf7d0',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '800', color: isNfs ? '#ef4444' : '#10b981', textTransform: 'uppercase' }}>
                      {isNfs ? 'NFS' : 'Active'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id)}
                    style={{
                      padding: 8,
                      backgroundColor: '#fee2e2',
                      borderRadius: 8,
                    }}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
      </View>
      <View style={{ height: 40 }} />
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
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
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
  }
});
