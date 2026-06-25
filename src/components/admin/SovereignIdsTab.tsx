import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function SovereignIdsTab() {
  const [userIdInput, setUserIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  const [newSovereignId, setNewSovereignId] = useState('');
  const [selectedIdColor, setSelectedIdColor] = useState('none');
  const [isSovereignAdmin, setIsSovereignAdmin] = useState(false);
  const [isSovereignBudget, setIsSovereignBudget] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleSearch = async () => {
    if (!userIdInput.trim()) return;
    setLoading(true);
    setFoundUser(null);
    try {
      const querySnap = await firestore()
        .collection('users')
        .where('accountNumber', '==', userIdInput.trim())
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const doc = querySnap.docs[0];
        setFoundUser({ id: doc.id, ...doc.data() });
      } else {
        const docSnap = await firestore().collection('users').doc(userIdInput.trim()).get();
        if (docSnap.exists()) {
          setFoundUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert('Not Found', 'No user matches this ID or UID.');
        }
      }
    } catch (err: any) {
      Alert.alert('Search Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!foundUser) return;
    setUpdating(true);
    try {
      const uRef = firestore().collection('users').doc(foundUser.id);
      const pRef = firestore().collection('users').doc(foundUser.id).collection('profile').doc(foundUser.id);

      const batch = firestore().batch();
      
      const payload: any = {
        idColor: selectedIdColor,
        isBudgetId: isSovereignBudget,
        isAdmin: isSovereignAdmin,
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      if (newSovereignId.trim()) {
        payload.accountNumber = newSovereignId.trim();
      }

      batch.update(uRef, payload);
      const pSnap = await pRef.get();
      if (pSnap.exists()) {
        batch.update(pRef, payload);
      }

      await batch.commit();
      Alert.alert('Success', 'Sovereign Identity parameters updated.');
      setFoundUser((prev: any) => ({ ...prev, ...payload }));
      setNewSovereignId('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Sovereign ID Control</Text>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Search User ID</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TextInput
          value={userIdInput}
          onChangeText={setUserIdInput}
          placeholder="e.g. 100023 or UID"
          style={{ flex: 1, height: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, fontSize: 14 }}
        />
        <TouchableOpacity 
          onPress={handleSearch}
          style={{ width: 80, height: 48, backgroundColor: '#7c3aed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>LOCATE</Text>}
        </TouchableOpacity>
      </View>

      {foundUser && (
        <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Image cachePolicy="memory-disk" source={{ uri: foundUser.avatarUrl || 'https://picsum.photos/200' }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{foundUser.username || 'User'}</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Account: {foundUser.accountNumber || 'N/A'}</Text>
            </View>
          </View>

          {/* New Sovereign ID Input */}
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Override ID Number</Text>
          <TextInput
            value={newSovereignId}
            onChangeText={setNewSovereignId}
            placeholder="Permanent custom ID (e.g. 777)"
            style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }}
          />

          {/* Identity Colors signature */}
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Identity Color Signature</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {['none', 'gold', 'rose', 'diamond', 'purple', 'emerald'].map(c => {
              const active = selectedIdColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedIdColor(c)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: active ? '#7c3aed' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#475569', textTransform: 'uppercase' }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Toggles */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Supreme Administrator Access</Text>
              <TouchableOpacity onPress={() => setIsSovereignAdmin(prev => !prev)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isSovereignAdmin ? '#22c55e' : '#cbd5e1', borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{isSovereignAdmin ? 'ACTIVE' : 'DISABLE'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Budget ID tag badge active</Text>
              <TouchableOpacity onPress={() => setIsSovereignBudget(prev => !prev)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isSovereignBudget ? '#22c55e' : '#cbd5e1', borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{isSovereignBudget ? 'ACTIVE' : 'DISABLE'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleUpdate}
            disabled={updating}
            style={{ height: 44, backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SAVE SOVEREIGN IDENTITY</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
