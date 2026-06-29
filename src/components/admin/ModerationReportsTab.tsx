import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function ModerationReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('reports')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(snap => {
        if (snap) {
          setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleDismiss = async (reportId: string) => {
    try {
      await firestore().collection('reports').doc(reportId).delete();
      Alert.alert('Success', 'Report has been dismissed.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteContent = async (report: any) => {
    Alert.alert(
      'DELETE CONTENT',
      'This will delete the target reported post. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'DELETE', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete moment content
              await firestore().collection('moments').doc(report.targetId).delete();
              // Dismiss report
              await firestore().collection('reports').doc(report.id).delete();
              Alert.alert('Success', 'Content deleted successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase' }}>
              No Moderation Reports Pending
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const dateStr = item.timestamp?.toDate 
            ? item.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Pending...';
          return (
            <View style={{ padding: 16, backgroundColor: '#fff5f5', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#fee2e2' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#ef4444' }}>{dateStr}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#991b1b', textTransform: 'uppercase' }}>
                  {item.reason || 'Spam / Abuse'}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 6 }}>
                Reported User ID: {item.targetId || 'Unknown'}
              </Text>
              {item.details && (
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                  "{item.details}"
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity 
                  onPress={() => handleDeleteContent(item)}
                  style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Delete Post</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDismiss(item.id)}
                  style={{ flex: 1, backgroundColor: '#64748b', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
