import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function RechargeRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('rechargeRequests')
      .where('status', '==', 'pending')
      .onSnapshot(snap => {
        if (snap) {
          setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        console.warn('[RechargeRequests] Error:', err);
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleAction = (requestId: string, action: 'approve' | 'reject') => {
    Alert.alert(
      `${action.toUpperCase()} REQUEST`,
      `Are you sure you want to ${action} this recharge request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action.toUpperCase(), 
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const reqRef = firestore().collection('rechargeRequests').doc(requestId);
              await reqRef.update({
                status: action === 'approve' ? 'approved' : 'rejected',
                processedAt: firestore.FieldValue.serverTimestamp()
              });
              Alert.alert('Success', `Request has been ${action}d.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Operation failed');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase' }}>
              No Pending Recharge Requests
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const dateStr = item.createdAt?.toDate 
            ? item.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Pending...';
          return (
            <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>{dateStr}</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>₹{item.amount || 0}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 4 }}>
                User: {item.username || 'Unknown'} (ID: {item.accountNumber || 'N/A'})
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Method: {item.paymentMethod || 'UPI'}
              </Text>
              {item.utr && (
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 2 }}>
                  UTR/Txn ID: {item.utr}
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity 
                  onPress={() => handleAction(item.id, 'approve')}
                  style={{ flex: 1, backgroundColor: '#22c55e', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleAction(item.id, 'reject')}
                  style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
