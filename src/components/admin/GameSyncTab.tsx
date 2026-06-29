import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function GameSyncTab() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editSlug, setEditSlug] = useState('');
  const [loadingBgUrl, setLoadingBgUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = firestore()
      .collection('games')
      .onSnapshot(snap => {
        if (snap) {
          setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleSaveSync = async () => {
    if (!editSlug.trim()) return;
    setUpdating(true);
    try {
      await firestore().collection('games').doc(editSlug).set({
        slug: editSlug,
        loadingBackgroundUrl: loadingBgUrl.trim(),
        coverUrl: coverUrl.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      Alert.alert('Success', 'Game screen variables successfully synchronized.');
      setEditSlug('');
      setLoadingBgUrl('');
      setCoverUrl('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (game: any) => {
    setEditSlug(game.slug);
    setLoadingBgUrl(game.loadingBackgroundUrl || '');
    setCoverUrl(game.coverUrl || '');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Game Sync Console</Text>

      {editSlug ? (
        <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>Editing: {editSlug}</Text>

          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Cover Image URL</Text>
          <TextInput value={coverUrl} onChangeText={setCoverUrl} placeholder="Cover image url" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Loading Screen Background URL</Text>
          <TextInput value={loadingBgUrl} onChangeText={setLoadingBgUrl} placeholder="Loading screen background url" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={handleSaveSync} disabled={updating} style={{ flex: 1, height: 44, backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SAVE SYNC</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditSlug('')} style={{ height: 44, paddingHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#475569', fontWeight: '800' }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: 20, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>Select an active game below to configure cover assets or loading screen backgrounds.</Text>
        </View>
      )}

      <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 12 }}>Game List</Text>
      {games.map(game => (
        <View key={game.slug} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image cachePolicy="memory-disk" source={{ uri: game.coverUrl || 'https://picsum.photos/100' }} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#cbd5e1' }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{game.slug.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={() => handleEdit(game)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e2e8f0', borderRadius: 8 }}>
            <Text style={{ color: '#475569', fontSize: 11, fontWeight: '800' }}>EDIT</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
