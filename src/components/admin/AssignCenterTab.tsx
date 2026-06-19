import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { ShieldCheck, Plus, UserX, Gavel } from 'lucide-react-native';
import { Image } from 'expo-image';

export function AssignCenterTab() {
  const [searchMode, setSearchMode] = useState<'id' | 'name'>('id');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [updatingSeller, setUpdatingSeller] = useState(false);
  const [updatingOfficial, setUpdatingOfficial] = useState(false);

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

  const handleToggleSellerCenter = async () => {
    if (!targetUser) return;
    const tags = targetUser.tags || [];
    const sellerTags = ['Seller', 'Seller center', 'Coin Seller'];
    const isCurrentlyActive = tags.some((t: string) => sellerTags.includes(t));

    setUpdatingSeller(true);
    try {
      const uRef = firestore().collection('users').doc(targetUser.id);
      const pRef = firestore()
        .collection('users')
        .doc(targetUser.id)
        .collection('profile')
        .doc(targetUser.id);

      let newTags;
      if (isCurrentlyActive) {
        newTags = tags.filter((t: string) => !sellerTags.includes(t));
      } else {
        newTags = [...tags, 'Seller'];
      }

      const updateData = { tags: newTags, updatedAt: firestore.FieldValue.serverTimestamp() };
      const batch = firestore().batch();
      batch.update(uRef, updateData);
      batch.update(pRef, updateData);
      await batch.commit();

      setTargetUser((prev: any) => ({ ...prev, tags: newTags }));
      Alert.alert('Success', isCurrentlyActive ? 'Seller Center Revoked' : 'Seller Center Activated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdatingSeller(false);
    }
  };

  const handleToggleOfficialCenter = async () => {
    if (!targetUser) return;
    const tags = targetUser.tags || [];
    const adminTags = ['Official center', 'Admin'];
    const isCurrentlyActive = tags.some((t: string) => adminTags.includes(t));

    setUpdatingOfficial(true);
    try {
      const uRef = firestore().collection('users').doc(targetUser.id);
      const pRef = firestore()
        .collection('users')
        .doc(targetUser.id)
        .collection('profile')
        .doc(targetUser.id);

      let newTags;
      let newIsAdmin;
      if (isCurrentlyActive) {
        newTags = tags.filter((t: string) => !adminTags.includes(t));
        newIsAdmin = false;
      } else {
        newTags = [...tags, 'Official center'];
        newIsAdmin = true;
      }

      const updateData = {
        tags: newTags,
        isAdmin: newIsAdmin,
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      const batch = firestore().batch();
      batch.update(uRef, updateData);
      batch.update(pRef, updateData);
      await batch.commit();

      setTargetUser((prev: any) => ({ ...prev, ...updateData }));
      Alert.alert('Success', isCurrentlyActive ? 'Admin Portal Revoked' : 'Admin Portal Activated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdatingOfficial(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <ShieldCheck size={24} color="#6366f1" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          Center Management
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
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Find</Text>
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
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe' }}>
                  <Text style={{ color: '#0369a1', fontWeight: '800', fontSize: 20 }}>
                    {targetUser.username?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                {targetUser.username}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
                Account: {targetUser.accountNumber || targetUser.id}
              </Text>
            </View>
          </View>

          {/* Current Roles Display */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {targetUser.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) && (
              <View style={{ backgroundColor: '#f97316', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Seller</Text>
              </View>
            )}
            {targetUser.tags?.some((t: string) => ['Official center', 'Admin'].includes(t)) && (
              <View style={{ backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Admin</Text>
              </View>
            )}
          </View>

          {/* Control Section */}
          <View style={{ gap: 16, marginBottom: 40 }}>
            {/* Seller Center */}
            <View style={{ p: 16, backgroundColor: '#fdf8f6', borderRadius: 24, borderWidth: 1.5, borderColor: '#ffedd5', padding: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#f97316', textTransform: 'uppercase', marginBottom: 6 }}>
                Seller Center
              </Text>
              <Text style={{ fontSize: 12, color: '#c2410c', marginBottom: 16, lineHeight: 18 }}>
                Activate to authorize user to sell coins and manage coin inventory.
              </Text>
              <TouchableOpacity
                onPress={handleToggleSellerCenter}
                disabled={updatingSeller}
                style={{
                  flexDirection: 'row',
                  backgroundColor: targetUser.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) ? '#fee2e2' : '#f97316',
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: targetUser.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) ? 1.5 : 0,
                  borderColor: '#fca5a5'
                }}
              >
                {updatingSeller ? (
                  <ActivityIndicator size="small" color={targetUser.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) ? '#ef4444' : '#fff'} />
                ) : targetUser.tags?.some((t: string) => ['Seller', 'Seller center', 'Coin Seller'].includes(t)) ? (
                  <>
                    <UserX size={18} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Revoke Seller</Text>
                  </>
                ) : (
                  <>
                    <Plus size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Activate Seller</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Official Center */}
            <View style={{ p: 16, backgroundColor: '#f5f3ff', borderRadius: 24, borderWidth: 1.5, borderColor: '#e0e7ff', padding: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', marginBottom: 6 }}>
                Official Center (Admin)
              </Text>
              <Text style={{ fontSize: 12, color: '#4338ca', marginBottom: 16, lineHeight: 18 }}>
                Grant access to the administrator portal credentials.
              </Text>
              <TouchableOpacity
                onPress={handleToggleOfficialCenter}
                disabled={updatingOfficial}
                style={{
                  flexDirection: 'row',
                  backgroundColor: targetUser.tags?.some((t: string) => ['Official center', 'Admin'].includes(t)) ? '#fee2e2' : '#6366f1',
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: targetUser.tags?.some((t: string) => ['Official center', 'Admin'].includes(t)) ? 1.5 : 0,
                  borderColor: '#fca5a5'
                }}
              >
                {updatingOfficial ? (
                  <ActivityIndicator size="small" color={targetUser.tags?.some((t: string) => ['Official center', 'Admin'].includes(t)) ? '#ef4444' : '#fff'} />
                ) : targetUser.tags?.some((t: string) => ['Official center', 'Admin'].includes(t)) ? (
                  <>
                    <Gavel size={18} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Revoke Admin</Text>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Activate Admin Portal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
