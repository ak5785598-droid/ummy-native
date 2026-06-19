import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { RefreshCcw, Users } from 'lucide-react-native';
import { Image } from 'expo-image';

export function MemberDirectoryTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const syncDirectory = async () => {
    setLoading(true);
    try {
      const snap = await firestore()
        .collection('users')
        .limit(50)
        .get();

      const memberList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(memberList);
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDirectory();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Users size={24} color="#1e293b" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
            Tribal Archive
          </Text>
        </View>
        <TouchableOpacity
          onPress={syncDirectory}
          disabled={loading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
          ) : (
            <RefreshCcw size={16} color="#fff" style={{ marginRight: 6 }} />
          )}
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Sync</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {members.length === 0 && !loading ? (
          <Text style={{ textAlign: 'center', color: '#94a3b8', marginVertical: 40, fontWeight: '700' }}>
            Awaiting Synchronized Directory...
          </Text>
        ) : (
          members.map(member => (
            <View
              key={member.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0', marginRight: 12, overflow: 'hidden' }}>
                  {member.avatarUrl ? (
                    <Image cachePolicy="memory-disk" source={{ uri: member.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe' }}>
                      <Text style={{ color: '#0369a1', fontWeight: '800', fontSize: 16 }}>
                        {member.username?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                    {member.username || 'Unknown'}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
                    ID: {member.accountNumber || member.id}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#3b82f6' }}>
                  🪙 {member.wallet?.coins?.toLocaleString() || 0}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
