import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function RewardsTab() {
  const [userIdInput, setUserIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  const [coins, setCoins] = useState('');
  const [assetId, setAssetId] = useState('');
  const [days, setDays] = useState('7');
  const [updating, setUpdating] = useState(false);

  const handleSearch = async () => {
    if (!userIdInput.trim()) return;
    setLoading(true);
    setFoundUser(null);
    try {
      const querySnap = await firestore()
        .collection('users')
        .where('accountNumber', '==', userIdInput.trim())
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const doc = querySnap.docs[0];
        setFoundUser({ id: doc.id, ...doc.data() });
      } else {
        const docSnap = await firestore().collection('users').doc(userIdInput.trim()).get();
        if (docSnap.exists()) {
          setFoundUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert('Not Found', 'No user matches this ID or UID.');
        }
      }
    } catch (err: any) {
      Alert.alert('Search Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCoins = async () => {
    if (!foundUser || !coins.trim()) return;
    const amount = parseInt(coins);
    if (isNaN(amount) || amount <= 0) return;
    
    setUpdating(true);
    try {
      const uRef = firestore().collection('users').doc(foundUser.id);
      const pRef = firestore().collection('users').doc(foundUser.id).collection('profile').doc(foundUser.id);

      const batch = firestore().batch();
      batch.update(uRef, { 'wallet.coins': firestore.FieldValue.increment(amount) });
      const pSnap = await pRef.get();
      if (pSnap.exists()) {
        batch.update(pRef, { 'wallet.coins': firestore.FieldValue.increment(amount) });
      }

      // Record logs
      const logRef = firestore().collection('coin_audit_logs').doc();
      batch.set(logRef, {
        id: logRef.id,
        adminId: '901piBzTQ0VzCtAvlyyobwvAaTs1',
        adminName: 'Creator Admin',
        adminRole: 'Creator',
        targetId: foundUser.id,
        targetName: foundUser.username || 'Unknown User',
        targetAccount: foundUser.accountNumber || 'N/A',
        amount: amount,
        reason: 'Manual Admin Dispatch',
        timestamp: firestore.FieldValue.serverTimestamp(),
        type: 'manual_dispatch'
      });

      await batch.commit();
      Alert.alert('Success', `${amount} Coins successfully dispatched.`);
      setCoins('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendAsset = async () => {
    if (!foundUser || !assetId.trim()) return;
    const d = parseInt(days) || 7;
    setUpdating(true);
    try {
      const pRef = firestore().collection('users').doc(foundUser.id).collection('profile').doc(foundUser.id);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + d);

      await pRef.update({
        'inventory.ownedItems': firestore.FieldValue.arrayUnion(assetId.trim()),
        [`inventory.expiries.${assetId.trim()}`]: firestore.Timestamp.fromDate(expiry),
      });

      Alert.alert('Success', `Asset ${assetId} sent for ${d} Days.`);
      setAssetId('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Rewards Center</Text>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Recipient ID</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TextInput
          value={userIdInput}
          onChangeText={setUserIdInput}
          placeholder="e.g. 100023 or UID"
          style={{ flex: 1, height: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, fontSize: 14 }}
        />
        <TouchableOpacity 
          onPress={handleSearch}
          style={{ width: 80, height: 48, backgroundColor: '#7c3aed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>FIND</Text>}
        </TouchableOpacity>
      </View>

      {foundUser && (
        <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Image cachePolicy="memory-disk" source={{ uri: foundUser.avatarUrl || 'https://picsum.photos/200' }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{foundUser.username || 'User'}</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Account: {foundUser.accountNumber || 'N/A'}</Text>
            </View>
          </View>

          {/* Coin Dispatch */}
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Coin Dispatch</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TextInput
              value={coins}
              onChangeText={setCoins}
              placeholder="e.g. 10000"
              keyboardType="number-pad"
              style={{ flex: 1, height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff' }}
            />
            <TouchableOpacity 
              onPress={handleSendCoins}
              disabled={updating || !coins.trim()}
              style={{ width: 100, height: 44, backgroundColor: '#22c55e', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>DISPATCH</Text>
            </TouchableOpacity>
          </View>

          {/* Send Elite Asset */}
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Send Elite Asset (Frames/Boutique)</Text>
          <TextInput
            value={assetId}
            onChangeText={setAssetId}
            placeholder="Asset ID (e.g. honor-2026)"
            style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 10 }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={days}
              onChangeText={setDays}
              placeholder="Days (e.g. 7)"
              keyboardType="number-pad"
              style={{ flex: 1, height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff' }}
            />
            <TouchableOpacity 
              onPress={handleSendAsset}
              disabled={updating || !assetId.trim()}
              style={{ width: 100, height: 44, backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>SEND ITEM</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
