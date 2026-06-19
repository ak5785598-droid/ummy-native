import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { UserSearch, Wallet, Sparkles, History, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';

export function UserRecordsTab() {
  const [searchMode, setSearchMode] = useState<'id' | 'name'>('id');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [purging, setPurging] = useState(false);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    setSearching(true);
    setTargetUser(null);
    try {
      const inputVal = searchValue.trim();
      let found: any = null;

      if (searchMode === 'id') {
        const snap = await firestore()
          .collection('users')
          .where('accountNumber', '==', inputVal)
          .limit(1)
          .get();
        if (!snap.empty) {
          found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      } else {
        const snap = await firestore()
          .collection('users')
          .where('username', '>=', inputVal)
          .where('username', '<=', inputVal + '\uf8ff')
          .limit(1)
          .get();
        if (!snap.empty) {
          found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      if (found) {
        // Depth Sync: Get profile subcollection
        const pSnap = await firestore()
          .collection('users')
          .doc(found.id)
          .collection('profile')
          .doc(found.id)
          .get();
        if (pSnap.exists) {
          found = { ...found, ...pSnap.data() };
        }
        setTargetUser(found);
      } else {
        Alert.alert('Not Found', 'No user found with the given credentials.');
      }
    } catch (err: any) {
      Alert.alert('Search Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleResetWallet = () => {
    if (!targetUser) return;
    Alert.alert(
      'Wallet Purge',
      `Are you sure you want to PERMANENTLY RESET ${targetUser.username}'s wallet to 0?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Purge',
          style: 'destructive',
          onPress: async () => {
            setPurging(true);
            try {
              const uRef = firestore().collection('users').doc(targetUser.id);
              const pRef = firestore()
                .collection('users')
                .doc(targetUser.id)
                .collection('profile')
                .doc(targetUser.id);

              const batch = firestore().batch();
              const resetData = {
                'wallet.coins': 0,
                'wallet.diamonds': 0,
                'wallet.totalSpent': 0,
                'wallet.dailySpent': 0,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              };

              batch.update(uRef, resetData);
              batch.update(pRef, resetData);
              await batch.commit();

              setTargetUser((prev: any) => ({
                ...prev,
                wallet: { coins: 0, diamonds: 0, totalSpent: 0, dailySpent: 0 }
              }));
              Alert.alert('Success', 'Wallet successfully purged to 0.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setPurging(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <UserSearch size={24} color="#f43f5e" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          User Ledger
        </Text>
      </View>

      {/* Mode Selector */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setSearchMode('id')}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            backgroundColor: searchMode === 'id' ? '#fff' : 'transparent',
            borderRadius: 8,
            shadowColor: searchMode === 'id' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: searchMode === 'id' ? 2 : 0,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>ID Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSearchMode('name')}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            backgroundColor: searchMode === 'name' ? '#fff' : 'transparent',
            borderRadius: 8,
            shadowColor: searchMode === 'name' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: searchMode === 'name' ? 2 : 0,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>Username Search</Text>
        </TouchableOpacity>
      </View>

      {/* Input */}
      <View style={{ flexDirection: 'row', marginBottom: 24 }}>
        <TextInput
          placeholder={searchMode === 'id' ? 'Enter User ID...' : 'Enter Username...'}
          value={searchValue}
          onChangeText={setSearchValue}
          style={{
            flex: 1,
            height: 52,
            borderWidth: 1.5,
            borderColor: '#e2e8f0',
            borderRadius: 14,
            paddingHorizontal: 16,
            fontSize: 14,
            fontWeight: '600',
            color: '#1e293b',
            backgroundColor: '#f8fafc',
            marginRight: 10
          }}
        />
        <TouchableOpacity
          onPress={handleSearch}
          disabled={searching}
          style={{
            backgroundColor: '#0f172a',
            paddingHorizontal: 20,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            height: 52
          }}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Audit</Text>
          )}
        </TouchableOpacity>
      </View>

      {targetUser && (
        <View style={{ marginTop: 8 }}>
          {/* User Card */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1.5, borderColor: '#f1f5f9', marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#e2e8f0', marginRight: 16, overflow: 'hidden' }}>
              {targetUser.avatarUrl ? (
                <Image cachePolicy="memory-disk" source={{ uri: targetUser.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2' }}>
                  <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 20 }}>
                    {targetUser.username?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                {targetUser.username}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
                Account: {targetUser.accountNumber || targetUser.id}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={{ marginBottom: 24 }}>
            {/* Coins */}
            <View style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 20, borderWidth: 1.5, borderColor: '#dbeafe', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Wallet size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Wallet Balance
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e3a8a' }}>
                🪙 {targetUser.wallet?.coins?.toLocaleString() || 0}
              </Text>
            </View>

            {/* Diamonds */}
            <View style={{ padding: 16, backgroundColor: '#ecfeff', borderRadius: 20, borderWidth: 1.5, borderColor: '#cffafe', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Sparkles size={16} color="#0891b2" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Diamonds Accumulation
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#164e63' }}>
                💎 {targetUser.wallet?.diamonds?.toLocaleString() || 0}
              </Text>
            </View>

            {/* Total Spent */}
            <View style={{ padding: 16, backgroundColor: '#faf5ff', borderRadius: 20, borderWidth: 1.5, borderColor: '#f3e8ff' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <History size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Spend Value
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#581c87' }}>
                🔥 {targetUser.wallet?.totalSpent?.toLocaleString() || 0}
              </Text>
            </View>
          </View>

          {/* Purge Wallet */}
          <View style={{ padding: 24, backgroundColor: '#fef2f2', borderRadius: 24, borderWidth: 1.5, borderColor: '#fee2e2', alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', marginBottom: 8 }}>
              Wallet Purge
            </Text>
            <Text style={{ fontSize: 12, color: '#991b1b', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
              This is a supreme override action. It will reset the target user's coins, diamonds, and statistics back to zero.
            </Text>
            <TouchableOpacity
              onPress={handleResetWallet}
              disabled={purging}
              style={{
                flexDirection: 'row',
                backgroundColor: '#dc2626',
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
              }}
            >
              {purging ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Trash2 size={18} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase' }}>
                Global Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
