import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function LootManagementTab() {
  const [lootConfig, setLootConfig] = useState<any>({ entryLimit: 20, duration: 60, gatePriority: 'top_sender' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .doc('appConfig/lootSettings')
      .onSnapshot(snap => {
        if (snap.exists()) {
          setLootConfig(snap.data());
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handlePriorityChange = async (priority: string) => {
    try {
      await firestore().doc('appConfig/lootSettings').set({
        gatePriority: priority
      }, { merge: true });
      Alert.alert('Success', 'Loot settings updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Loot Configuration</Text>
      <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
        Entry Limit (fastest clickers): {lootConfig.entryLimit || 20} users
      </Text>
      <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
        Duration: {lootConfig.duration || 60} seconds
      </Text>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Gate Opener Priority
      </Text>

      {['top_sender', 'owner_first', 'random'].map(opt => {
        const active = lootConfig.gatePriority === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => handlePriorityChange(opt)}
            style={{
              padding: 14,
              backgroundColor: active ? '#7c3aed' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: active ? '#7c3aed' : '#e2e8f0',
            }}
          >
            <Text style={{ color: active ? '#fff' : '#475569', fontWeight: '800', fontSize: 12 }}>
              {opt === 'top_sender' ? 'Top Sender â†’ 2nd â†’ 3rd â†’ Owner' : opt === 'owner_first' ? 'Owner â†’ Top Sender' : 'Random Eligible User'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
