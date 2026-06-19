import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function MedalManagementTab() {
  const [medalId, setMedalId] = useState('');
  const [medalName, setMedalName] = useState('');
  const [medalDescription, setMedalDescription] = useState('');
  const [medalTier, setMedalTier] = useState('common');
  const [activeSubTab, setActiveSubTab] = useState<'achievement' | 'gift' | 'activity'>('achievement');
  const [updating, setUpdating] = useState(false);
  const [medals, setMedals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleSyncMedal = async () => {
    if (!medalId.trim() || !medalName.trim()) {
      Alert.alert('Validation Error', 'Medal ID and Name are required.');
      return;
    }

    setUpdating(true);
    try {
      const payload = {
        id: medalId.trim().toLowerCase().replace(/\s+/g, '-'),
        name: medalName.trim(),
        description: medalDescription.trim(),
        tier: medalTier,
        category: activeSubTab,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('medalsList').doc(payload.id).set(payload);
      Alert.alert('Success', 'Medal parameters synchronized.');
      setMedalId('');
      setMedalName('');
      setMedalDescription('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firestore().collection('medalsList').doc(id).delete();
      Alert.alert('Success', 'Medal purged.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Medal Management</Text>

      {/* Sub Tabs Toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, p: 2, marginBottom: 16 }}>
        {['achievement', 'gift', 'activity'].map((tab: any) => {
          const active = activeSubTab === tab;
          return (
            <TouchableOpacity key={tab} onPress={() => setActiveSubTab(tab)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? '#7c3aed' : 'transparent', borderRadius: 8 }}>
              <Text style={{ color: active ? '#fff' : '#64748b', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Medal ID</Text>
      <TextInput value={medalId} onChangeText={setMedalId} placeholder="e.g. top-contributor" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Medal Name</Text>
      <TextInput value={medalName} onChangeText={setMedalName} placeholder="e.g. Top Contributor" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Description</Text>
      <TextInput value={medalDescription} onChangeText={setMedalDescription} placeholder="Description text" style={{ minHeight: 60, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, backgroundColor: '#fff', marginBottom: 12, textAlignVertical: 'top' }} multiline />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Tier Status</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {['common', 'rare', 'epic', 'legendary'].map(t => {
          const active = medalTier === t;
          return (
            <TouchableOpacity key={t} onPress={() => setMedalTier(t)} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: active ? '#7c3aed' : '#e2e8f0', borderRadius: 8 }}>
              <Text style={{ color: active ? '#fff' : '#475569', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity 
        onPress={handleSyncMedal}
        disabled={updating}
        style={{ height: 46, backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SYNC MEDAL CONFIG</Text>}
      </TouchableOpacity>

      <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 }}>Medals Ledger</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#7c3aed" />
      ) : (
        medals.filter(m => m.category === activeSubTab).map(m => (
          <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 8 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{m.name} ({m.tier})</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>{m.description || 'No description'}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(m.id)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fee2e2', borderRadius: 6 }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800' }}>PURGE</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
