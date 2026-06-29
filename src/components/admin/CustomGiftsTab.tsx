import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Sparkles, Clock, Check, X, ShieldAlert } from 'lucide-react-native';
import { Image } from 'expo-image';

export function CustomGiftsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = firestore()
      .collection('customizedGiftRequests')
      .onSnapshot(snap => {
        if (snap) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort by date desc
          list.sort((a: any, b: any) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
            return bTime - aTime;
          });
          setRequests(list);
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });

    return () => unsub();
  }, []);

  const handleApprove = async (req: any) => {
    setProcessingId(req.id);
    try {
      await firestore()
        .collection('customizedGiftRequests')
        .doc(req.id)
        .update({
          status: 'approved',
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      Alert.alert('Approved', `Request for ${req.username} approved! Please create the gift in Gift Management under 'Customized' category.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: any) => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject this request? It will AUTOMATICALLY refund 50,000 coins to ${req.username}'s wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Refund',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(req.id);
            try {
              const uRef = firestore().collection('users').doc(req.uid);
              const pRef = firestore()
                .collection('users')
                .doc(req.uid)
                .collection('profile')
                .doc(req.uid);
              const reqRef = firestore().collection('customizedGiftRequests').doc(req.id);

              const batch = firestore().batch();
              batch.update(pRef, { 'wallet.coins': firestore.FieldValue.increment(50000) });
              batch.update(reqRef, {
                status: 'rejected',
                updatedAt: firestore.FieldValue.serverTimestamp()
              });
              await batch.commit();

              Alert.alert('Rejected', 'Request rejected and 50,000 coins refunded.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Sparkles size={24} color="#db2777" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          Customized Gift Requests
        </Text>
      </View>

      {requests.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#94a3b8', marginVertical: 40, fontWeight: '700' }}>
          No Customized Requests Found
        </Text>
      ) : (
        requests.map(req => (
          <View
            key={req.id}
            style={{
              padding: 16,
              backgroundColor: '#f8fafc',
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              marginBottom: 12,
            }}
          >
            {/* User Details */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                  {req.username || 'Unknown User'}
                </Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>
                  UID: {req.uid}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#f97316' }}>
                  🪙 {(req.coinsPaid || 50000).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>
                  Deducted
                </Text>
              </View>
            </View>

            {/* Request Status Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {req.status === 'pending' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' }}>
                    <Clock size={12} color="#d97706" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#d97706', textTransform: 'uppercase' }}>Pending Review</Text>
                  </View>
                ) : req.status === 'approved' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Check size={12} color="#15803d" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>Approved</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' }}>
                    <X size={12} color="#b91c1c" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#b91c1c', textTransform: 'uppercase' }}>Rejected</Text>
                  </View>
                )}
              </View>

              {req.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleApprove(req)}
                    disabled={processingId !== null}
                    style={{
                      backgroundColor: '#10b981',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Approve</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleReject(req)}
                    disabled={processingId !== null}
                    style={{
                      backgroundColor: '#ef4444',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Reject</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Processed</Text>
              )}
            </View>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
