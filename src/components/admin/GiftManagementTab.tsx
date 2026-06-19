import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useStorage } from '../../firebase/provider';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Gift, Trash2, Video, Image as ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';

export function GiftManagementTab() {
  const storage = useStorage();
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('99');
  const [category, setCategory] = useState<'Hot' | 'Luxury' | 'Event' | 'Lucky' | 'Customized'>('Hot');
  const [animationId, setAnimationId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = firestore()
      .collection('gifts')
      .orderBy('price', 'asc')
      .onSnapshot(snap => {
        if (snap) {
          setGifts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        console.warn(err);
        setLoading(false);
      });

    return () => unsub();
  }, []);

  const handlePickThumbnail = async () => {
    if (!storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required.');
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

      const path = `gifts/thumb_${Date.now()}.png`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(sRef);
      setThumbnailUrl(downloadURL);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickVideo = async () => {
    if (!storage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required.');
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

      const path = `gifts/anim_${Date.now()}.mp4`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await getDownloadURL(sRef);
      setVideoUrl(downloadURL);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreateGift = async () => {
    if (!name.trim() || !thumbnailUrl) {
      Alert.alert('Missing Info', 'Name and display image are mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      const giftRef = firestore().collection('gifts').doc();
      const giftData = {
        id: giftRef.id,
        name: name.trim(),
        imageUrl: thumbnailUrl,
        videoUrl: videoUrl,
        price: parseInt(price) || 0,
        category: category,
        animationId: animationId.trim() || null,
        createdAt: firestore.FieldValue.serverTimestamp()
      };

      await giftRef.set(giftData);
      Alert.alert('Success', 'Gift created and synchronized.');
      setName('');
      setPrice('99');
      setAnimationId('');
      setThumbnailUrl('');
      setVideoUrl('');
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    Alert.alert('Delete Gift', 'Are you sure you want to remove this gift from the vaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('gifts').doc(id).delete();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
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
        <Gift size={24} color="#f97316" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          Gift Vault Management
        </Text>
      </View>

      {/* Creation form */}
      <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 }}>
        <Text style={styles.sectionTitle}>Add New Hybrid Gift</Text>

        <TextInput
          placeholder="Gift Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price (Coins)</Text>
            <TextInput
              placeholder="e.g. 99"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Legacy Anim ID</Text>
            <TextInput
              placeholder="Optional"
              value={animationId}
              onChangeText={setAnimationId}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {(['Hot', 'Luxury', 'Event', 'Lucky', 'Customized'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: category === cat ? '#f97316' : '#cbd5e1',
                backgroundColor: category === cat ? '#fff7ed' : '#fff'
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: category === cat ? '#f97316' : '#475569' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity onPress={handlePickThumbnail} style={styles.uploadBtn} disabled={uploadingImage}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : thumbnailUrl ? (
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>Display Icon Set</Text>
            ) : (
              <>
                <ImageIcon size={14} color="#f97316" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Upload Display</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickVideo} style={styles.uploadBtn} disabled={uploadingVideo}>
            {uploadingVideo ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : videoUrl ? (
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>Video Animation Set</Text>
            ) : (
              <>
                <Video size={14} color="#f97316" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Upload Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleCreateGift}
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
              Create Hybrid Gift
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Gifts listing */}
      <View style={{ marginBottom: 40 }}>
        <Text style={styles.sectionTitle}>Vault Inventory ({gifts.length} Gifts)</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {gifts.map(gift => (
            <View
              key={gift.id}
              style={{
                width: '48%',
                padding: 12,
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                marginBottom: 10,
                position: 'relative'
              }}
            >
              <TouchableOpacity
                onPress={() => handleDeleteGift(gift.id)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  padding: 6,
                  backgroundColor: '#fee2e2',
                  borderRadius: 8,
                  zIndex: 2,
                }}
              >
                <Trash2 size={12} color="#ef4444" />
              </TouchableOpacity>

              <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {gift.imageUrl ? (
                  <Image cachePolicy="memory-disk" source={{ uri: gift.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                ) : (
                  <Gift size={24} color="#cbd5e1" />
                )}
              </View>

              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1e293b', textAlign: 'center' }} numberOfLines={1}>
                {gift.name}
              </Text>
              <Text style={{ fontSize: 10, color: '#f97316', fontWeight: '800', marginTop: 4 }}>
                🪙 {gift.price}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                <View style={{ backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 7, fontWeight: '800', color: '#475569' }}>{gift.category}</Text>
                </View>
                {gift.videoUrl ? (
                  <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 7, fontWeight: '800', color: '#1e40af' }}>VIDEO</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
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
