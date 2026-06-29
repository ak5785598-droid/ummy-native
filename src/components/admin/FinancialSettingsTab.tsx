import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function FinancialSettingsTab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = firestore()
      .doc('appConfig/global')
      .onSnapshot(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setConfig(d);
          setUpiId(d?.upiId || '');
          setUpiName(d?.upiName || '');
          setQrUrl(d?.paymentQrUrl || '');
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleSaveSettings = async () => {
    setUpdating(true);
    try {
      await firestore().doc('appConfig/global').set({
        upiId: upiId.trim(),
        upiName: upiName.trim(),
        paymentQrUrl: qrUrl.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      Alert.alert('Success', 'Financial parameters synchronized successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Financial Settings</Text>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Payment Mode (Display Only)</Text>
      <View style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#f1f5f9', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: '#475569', fontWeight: '800', textTransform: 'uppercase' }}>
          {config?.paymentMode || 'manual'}
        </Text>
      </View>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>UPI ID / VPA</Text>
      <TextInput value={upiId} onChangeText={setUpiId} placeholder="e.g. merchant@upi" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} autoCapitalize="none" />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Merchant / Business Name</Text>
      <TextInput value={upiName} onChangeText={setUpiName} placeholder="e.g. Ummy Chat Official" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>QR Code Image Link</Text>
      <TextInput value={qrUrl} onChangeText={setQrUrl} placeholder="Direct image URL" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 16 }} autoCapitalize="none" />

      {qrUrl ? (
        <Image cachePolicy="memory-disk" source={{ uri: qrUrl }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 16, backgroundColor: '#f1f5f9' }} contentFit="contain" />
      ) : (
        <View style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: '#e2e8f0', marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8' }}>NO MERCHANT QR ACTIVE</Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={handleSaveSettings}
        disabled={updating}
        style={{ height: 46, backgroundColor: '#10b981', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SAVE FINANCIAL METRICS</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
