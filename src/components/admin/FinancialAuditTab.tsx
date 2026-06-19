import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function FinancialAuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('coin_audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .onSnapshot(snap => {
        if (snap) {
          setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        console.warn('[FinancialAudit] Error:', err);
        setLoading(false);
      });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase' }}>
              No Audit Logs Found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const dateStr = item.timestamp?.toDate 
            ? item.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Pending...';
          return (
            <View style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>{dateStr}</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#22c55e' }}>+{item.amount || 0} Coins</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', marginTop: 4 }}>
                From: {item.adminName || 'Admin'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                To Account: {item.targetAccount || 'N/A'} (UID: {item.targetName || 'User'})
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}
