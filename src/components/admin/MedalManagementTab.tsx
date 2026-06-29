import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

export function MedalManagementTab() {
  const [medalName, setMedalName] = useState('');
  const [medalImage, setMedalImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [medals, setMedals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual assign state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const unsub = firestore()
      .collection('medalsList')
      .onSnapshot(snap => {
        if (snap) {
          setMedals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        console.warn('[Medals] Load error:', err);
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!result.canceled && result.assets[0]) {
      setMedalImage(result.assets[0].uri);
    }
  };

  const handleSyncMedal = async () => {
    if (!medalName.trim()) {
      Alert.alert('Validation Error', 'Medal name is required.');
      return;
    }
    if (!medalImage) {
      Alert.alert('Validation Error', 'Please select a medal image.');
      return;
    }

    setUpdating(true);
    try {
      const docId = medalName.trim().toLowerCase().replace(/\s+/g, '-');
      const response = await fetch(medalImage);
      const blob = await response.blob();
      const storageRef = storage().ref(`medals/${docId}.png`);
      await storageRef.put(blob, { contentType: 'image/png' });
      const imageUrl = await storageRef.getDownloadURL();

      await firestore().collection('medalsList').doc(docId).set({
        id: docId,
        name: medalName.trim(),
        imageUrl,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Medal uploaded successfully.');
      setMedalName('');
      setMedalImage(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, imageUrl?: string) => {
    try {
      if (imageUrl) {
        try { const ref = storage().refFromURL(imageUrl); await ref.delete(); } catch (e) {}
      }
      await firestore().collection('medalsList').doc(id).delete();
      Alert.alert('Success', 'Medal deleted.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const q = await firestore().collection('users').where('username', '==', searchQuery.trim()).limit(1).get();
      if (q.empty) {
        // Try by UID
        const doc = await firestore().collection('users').doc(searchQuery.trim()).get();
        if (doc.exists) {
          const profileSnap = await firestore().collection('users').doc(doc.id).collection('profile').doc(doc.id).get();
          setSearchResult({ id: doc.id, ...doc.data(), ...(profileSnap.exists ? profileSnap.data() : {}) });
        } else {
          Alert.alert('Not Found', 'No user found.');
        }
      } else {
        const userDoc = q.docs[0];
        const profileSnap = await firestore().collection('users').doc(userDoc.id).collection('profile').doc(userDoc.id).get();
        setSearchResult({ id: userDoc.id, ...userDoc.data(), ...(profileSnap.exists ? profileSnap.data() : {}) });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAssignMedal = async () => {
    if (!searchResult || !selectedMedal) {
      Alert.alert('Error', 'Select a user and a medal.');
      return;
    }
    setAssigning(true);
    try {
      const profileRef = firestore().collection('users').doc(searchResult.id).collection('profile').doc(searchResult.id);
      await profileRef.update({ medals: firestore.FieldValue.arrayUnion(selectedMedal) });
      Alert.alert('Success', `Medal "${selectedMedal}" assigned to ${searchResult.username || searchResult.id}`);
      setSearchResult(null);
      setSearchQuery('');
      setSelectedMedal('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveMedal = async (medalId: string) => {
    if (!searchResult) return;
    try {
      const profileRef = firestore().collection('users').doc(searchResult.id).collection('profile').doc(searchResult.id);
      await profileRef.update({ medals: firestore.FieldValue.arrayRemove(medalId) });
      setSearchResult((prev: any) => ({ ...prev, medals: (prev.medals || []).filter((m: string) => m !== medalId) }));
      Alert.alert('Success', `Medal "${medalId}" removed.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Medal Management</Text>

      {/* Upload Section */}
      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Medal Name</Text>
      <TextInput value={medalName} onChangeText={setMedalName} placeholder="e.g. Top Contributor" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Medal Image</Text>
      <TouchableOpacity onPress={pickImage} style={{ height: 100, borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 10, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        {medalImage ? (
          <Image source={{ uri: medalImage }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        ) : (
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>Tap to select image</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSyncMedal} disabled={updating} style={{ height: 46, backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>UPLOAD MEDAL</Text>}
      </TouchableOpacity>

      {/* Manual Assign Section */}
      <View style={{ height: 1, backgroundColor: '#e2e8f0', marginBottom: 24 }} />
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 12 }}>Assign Medal to User</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Username or UID" style={{ flex: 1, height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff' }} />
        <TouchableOpacity onPress={handleSearchUser} disabled={searching} style={{ height: 44, paddingHorizontal: 16, backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
          {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>SEARCH</Text>}
        </TouchableOpacity>
      </View>

      {searchResult && (
        <View style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#86efac', marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>{searchResult.username || searchResult.name || searchResult.id}</Text>
          <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>UID: {searchResult.id}</Text>
          {searchResult.medals && searchResult.medals.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {searchResult.medals.map((mId: string) => (
                <TouchableOpacity key={mId} onPress={() => handleRemoveMedal(mId)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#fca5a5' }}>
                  <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700' }}>{mId} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 4 }}>SELECT MEDAL</Text>
              <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', maxHeight: 120 }}>
                <ScrollView nestedScrollEnabled>
                  {medals.map(m => (
                    <TouchableOpacity key={m.id} onPress={() => setSelectedMedal(m.id)} style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: selectedMedal === m.id ? '#ede9fe' : 'transparent', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 11, fontWeight: selectedMedal === m.id ? '800' : '600', color: selectedMedal === m.id ? '#7c3aed' : '#334155' }}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity onPress={handleAssignMedal} disabled={assigning || !selectedMedal} style={{ height: 40, paddingHorizontal: 16, backgroundColor: selectedMedal ? '#22c55e' : '#94a3b8', borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}>
              {assigning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>ASSIGN</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* All Medals List */}
      <View style={{ height: 1, backgroundColor: '#e2e8f0', marginBottom: 24 }} />
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 }}>All Medals ({medals.length})</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#7c3aed" />
      ) : (
        medals.map(m => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 8 }}>
            {m.imageUrl ? (
              <Image source={{ uri: m.imageUrl }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }} contentFit="cover" />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                <Text>🏅</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{m.name}</Text>
              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{m.id}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(m.id, m.imageUrl)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fee2e2', borderRadius: 6 }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800' }}>DELETE</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
