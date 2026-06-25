import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function SystemControlTab() {
  const [syncingIds, setSyncingIds] = useState(false);
  const [resettingEconomy, setResettingEconomy] = useState(false);

  const handleGlobalIdentitySync = () => {
    Alert.alert(
      'GLOBAL IDENTITY SYNC',
      'This will re-index all user account numbers to follow the standard format. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'START SYNC',
          onPress: async () => {
            setSyncingIds(true);
            try {
              const usersSnap = await firestore().collection('users').get();
              const batch = firestore().batch();
              let counter = 1000;

              usersSnap.docs.forEach(userDoc => {
                const uData = userDoc.data();
                if (!uData.accountNumber) {
                  batch.update(firestore().collection('users').doc(userDoc.id), {
                    accountNumber: String(counter++),
                    updatedAt: firestore.FieldValue.serverTimestamp()
                  });
                }
              });

              await batch.commit();
              Alert.alert('Success', 'Global re-indexing operation successfully executed.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setSyncingIds(false);
            }
          }
        }
      ]
    );
  };

  const handleGlobalEconomyReset = () => {
    Alert.alert(
      'ECONOMY RESET',
      'WARNING: This will permanently reset coins and diamonds for EVERY account. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'EXECUTE ECONOMIC RESET',
          style: 'destructive',
          onPress: async () => {
            setResettingEconomy(true);
            try {
              const usersSnap = await firestore().collection('users').get();
              const batch = firestore().batch();

              usersSnap.docs.forEach(userDoc => {
                batch.update(firestore().collection('users').doc(userDoc.id), {
                  'wallet.coins': 0,
                  'wallet.diamonds': 0,
                  updatedAt: firestore.FieldValue.serverTimestamp()
                });
              });

              await batch.commit();
              Alert.alert('Success', 'Global system wallets economy successfully purged.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setResettingEconomy(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 16 }}>System Control Tab</Text>

      {/* Global ID Sync Card */}
      <View style={{ padding: 18, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Global Identity Sync</Text>
        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 14 }}>
          Re-index users that do not follow numerical standard format.
        </Text>
        <TouchableOpacity 
          onPress={handleGlobalIdentitySync}
          disabled={syncingIds}
          style={{ height: 40, backgroundColor: '#0f172a', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
        >
          {syncingIds ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>START GLOBAL SYNC</Text>}
        </TouchableOpacity>
      </View>

      {/* Economy Reset Card */}
      <View style={{ padding: 18, backgroundColor: '#fdf2f2', borderRadius: 16, borderWidth: 1, borderColor: '#fde2e2' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#991b1b' }}>Economy Purge & Reset</Text>
        <Text style={{ fontSize: 11, color: '#b91c1c', marginTop: 4, marginBottom: 14 }}>
          Wipe all coins and reset user balances back to 0.
        </Text>
        <TouchableOpacity 
          onPress={handleGlobalEconomyReset}
          disabled={resettingEconomy}
          style={{ height: 40, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
        >
          {resettingEconomy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>EXECUTE ECONOMY RESET</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
