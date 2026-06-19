import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function LevelManagementTab() {
  const [levelName, setLevelName] = useState('');
  const [levelRange, setLevelRange] = useState('');
  const [levelBudget, setLevelBudget] = useState('');
  const [levelFrameId, setLevelFrameId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'budget' | 'rewards' | 'frame'>('budget');
  const [updating, setUpdating] = useState(false);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('levelsList')
      .onSnapshot(snap => {
        if (snap) {
          setLevels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        console.warn('[Levels] Load error:', err);
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleSyncLevel = async () => {
    if (!levelName.trim() || !levelRange.trim()) {
      Alert.alert('Validation Error', 'Level name and range are required.');
      return;
    }

    setUpdating(true);
    try {
      const levelId = `${activeSubTab}_${Date.now()}`;
      const payload: any = {
        id: levelId,
        name: levelName.trim(),
        range: levelRange.trim(),
        type: activeSubTab,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      if (activeSubTab === 'budget' && levelBudget.trim()) {
        payload.budget = parseInt(levelBudget) || 0;
      } else if (activeSubTab === 'frame' && levelFrameId.trim()) {
        payload.frameId = levelFrameId.trim();
      }

      await firestore().collection('levelsList').doc(levelId).set(payload);
      Alert.alert('Success', 'Level configuration synchronized.');
      setLevelName('');
      setLevelRange('');
      setLevelBudget('');
      setLevelFrameId('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firestore().collection('levelsList').doc(id).delete();
      Alert.alert('Success', 'Level deleted.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Level Management</Text>

      {/* Sub Tabs Toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, p: 2, marginBottom: 16 }}>
        {['budget', 'rewards', 'frame'].map((tab: any) => {
          const active = activeSubTab === tab;
          return (
            <TouchableOpacity key={tab} onPress={() => setActiveSubTab(tab)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? '#7c3aed' : 'transparent', borderRadius: 8 }}>
              <Text style={{ color: active ? '#fff' : '#64748b', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Level Name</Text>
      <TextInput value={levelName} onChangeText={setLevelName} placeholder="e.g. Gold Tier" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Level Range</Text>
      <TextInput value={levelRange} onChangeText={setLevelRange} placeholder="e.g. Lv.10 - Lv.20" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      {activeSubTab === 'budget' && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Budget Value</Text>
          <TextInput value={levelBudget} onChangeText={setLevelBudget} placeholder="e.g. 5000" keyboardType="number-pad" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 16 }} />
        </>
      )}

      {activeSubTab === 'frame' && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Frame ID</Text>
          <TextInput value={levelFrameId} onChangeText={setLevelFrameId} placeholder="e.g. platinum-badge" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 16 }} />
        </>
      )}

      <TouchableOpacity 
        onPress={handleSyncLevel}
        disabled={updating}
        style={{ height: 46, backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SYNC LEVEL CONFIG</Text>}
      </TouchableOpacity>

      <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 }}>Levels Ledger</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#7c3aed" />
      ) : (
        levels.filter(l => l.type === activeSubTab).map(l => (
          <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{l.name}</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Range: {l.range} {l.budget ? `(Budget: ${l.budget})` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(l.id)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fee2e2', borderRadius: 6 }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800' }}>DELETE</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
