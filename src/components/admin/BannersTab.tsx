import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .doc('appConfig/banners')
      .onSnapshot(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setBanners(d?.slides || []);
        }
        setLoading(false);
      }, err => {
        console.warn('[Banners] Load error:', err);
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleUpdate = async (index: number, key: string, val: string) => {
    const updated = [...banners];
    updated[index] = { ...updated[index], [key]: val };
    try {
      await firestore().doc('appConfig/banners').set({ slides: updated }, { merge: true });
    } catch (err: any) {
      Alert.alert('Error updating banner', err.message);
    }
  };

  const handleAddSlot = async () => {
    const updated = [...banners, { id: Date.now(), title: 'New Banner', link: '', imageUrl: '' }];
    try {
      await firestore().doc('appConfig/banners').set({ slides: updated }, { merge: true });
    } catch (err: any) {
      Alert.alert('Error adding slot', err.message);
    }
  };

  const handlePurge = async (index: number) => {
    const updated = banners.filter((_, i) => i !== index);
    try {
      await firestore().doc('appConfig/banners').set({ slides: updated }, { merge: true });
    } catch (err: any) {
      Alert.alert('Error deleting banner', err.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>Banner List</Text>
        <TouchableOpacity onPress={handleAddSlot} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#7c3aed', borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>+ ADD SLOT</Text>
        </TouchableOpacity>
      </View>

      {banners.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase' }}>No Banners Configured</Text>
        </View>
      ) : (
        banners.map((item, index) => (
          <View key={index} style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 }}>
            {item.imageUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: item.imageUrl }} style={{ width: '100%', height: 120, borderRadius: 12, backgroundColor: '#e2e8f0', marginBottom: 12 }} contentFit="cover" />
            ) : (
              <View style={{ width: '100%', height: 120, borderRadius: 12, backgroundColor: '#cbd5e1', marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>NO IMAGE INSTALLED</Text>
              </View>
            )}

            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Banner Title</Text>
            <TextInput value={item.title} onChangeText={(val) => handleUpdate(index, 'title', val)} style={{ height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, fontSize: 13, backgroundColor: '#fff', marginBottom: 10 }} />

            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Image URL</Text>
            <TextInput value={item.imageUrl} onChangeText={(val) => handleUpdate(index, 'imageUrl', val)} placeholder="Direct image link" style={{ height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, fontSize: 13, backgroundColor: '#fff', marginBottom: 10 }} />

            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Redirect Link</Text>
            <TextInput value={item.link} onChangeText={(val) => handleUpdate(index, 'link', val)} placeholder="e.g. /store" style={{ height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

            <TouchableOpacity onPress={() => handlePurge(index)} style={{ height: 36, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Purge Slot</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
