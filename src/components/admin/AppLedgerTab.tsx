import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function AppLedgerTab() {
  const [stats, setStats] = useState({ totalCoins: 0, totalDiamonds: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchLedgerStats = async () => {
    try {
      const usersSnap = await firestore().collection('users').get();
      let coins = 0;
      let diamonds = 0;
      
      usersSnap.docs.forEach(doc => {
        const u = doc.data();
        coins += u.wallet?.coins || 0;
        diamonds += u.wallet?.diamonds || 0;
      });

      setStats({
        totalCoins: coins,
        totalDiamonds: diamonds,
        totalUsers: usersSnap.size
      });
    } catch (err: any) {
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchLedgerStats();
  }, []);

  const handleSyncLedger = () => {
    setSyncing(true);
    fetchLedgerStats().then(() => Alert.alert('Success', 'Global ledger metrics synchronized.'));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const LedgerCard = ({ label, value, color }: any) => (
    <View style={{ padding: 18, backgroundColor: `${color}10`, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: color, marginBottom: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '900', color: '#1f2937', marginTop: 4 }}>{value.toLocaleString()}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>Economic Ledger</Text>
        <TouchableOpacity onPress={handleSyncLedger} disabled={syncing} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#3b82f6', borderRadius: 8 }}>
          {syncing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>SYNC LEDGER</Text>}
        </TouchableOpacity>
      </View>

      <LedgerCard label="Total Coins in Tribe" value={stats.totalCoins} color="#fbbf24" />
      <LedgerCard label="Total Diamonds Accumulated" value={stats.totalDiamonds} color="#06b6d4" />
      <LedgerCard label="Total Registered Users" value={stats.totalUsers} color="#7c3aed" />
    </ScrollView>
  );
}
