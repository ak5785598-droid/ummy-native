import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { BadgeCheck, RefreshCcw } from 'lucide-react-native';
import { Image } from 'expo-image';

const ELITE_TAGS = [
  { id: 'Official', label: 'Official' },
  { id: 'CS Leader', label: 'CS Leader' },
  { id: 'Customer Service', label: 'Customer Service' },
  { id: 'Seller', label: 'Seller' },
  { id: 'Official center', label: 'Official center' },
  { id: 'Seller center', label: 'Seller center' },
];

export function TagsTab() {
  const [searchMode, setSearchMode] = useState<'id' | 'name'>('id');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [updatingTag, setUpdatingTag] = useState<string | null>(null);

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
        Alert.alert('Not Found', 'No user found.');
      }
    } catch (err: any) {
      Alert.alert('Search Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  const toggleTag = async (tagId: string) => {
    if (!targetUser) return;
    setUpdatingTag(tagId);
    const tags = targetUser.tags || [];
    const hasTag = tags.includes(tagId);
    let newTags;
    if (hasTag) {
      newTags = tags.filter((t: string) => t !== tagId);
    } else {
      newTags = [...tags, tagId];
    }

    try {
      const uRef = firestore().collection('users').doc(targetUser.id);
      const pRef = firestore()
        .collection('users')
        .doc(targetUser.id)
        .collection('profile')
        .doc(targetUser.id);

      const batch = firestore().batch();
      batch.update(uRef, { tags: newTags, updatedAt: firestore.FieldValue.serverTimestamp() });
      batch.update(pRef, { tags: newTags, updatedAt: firestore.FieldValue.serverTimestamp() });
      await batch.commit();

      setTargetUser((prev: any) => ({ ...prev, tags: newTags }));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdatingTag(null);
    }
  };

  const handlePurgeTags = async () => {
    if (!targetUser) return;
    Alert.alert('Purge Tags', `Are you sure you want to remove all tags from ${targetUser.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Purge All',
        style: 'destructive',
        onPress: async () => {
          try {
            const uRef = firestore().collection('users').doc(targetUser.id);
            const pRef = firestore()
              .collection('users')
              .doc(targetUser.id)
              .collection('profile')
              .doc(targetUser.id);

            const batch = firestore().batch();
            batch.update(uRef, { tags: [], updatedAt: firestore.FieldValue.serverTimestamp() });
            batch.update(pRef, { tags: [], updatedAt: firestore.FieldValue.serverTimestamp() });
            await batch.commit();

            setTargetUser((prev: any) => ({ ...prev, tags: [] }));
            Alert.alert('Success', 'All tags successfully removed.');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <BadgeCheck size={24} color="#7c3aed" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>
          Assign Tags
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
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Locate</Text>
          )}
        </TouchableOpacity>
      </View>

      {targetUser && (
        <View style={{ marginTop: 8 }}>
          {/* User Card */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1.5, borderColor: '#f1f5f9', marginBottom: 24 }}>
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

          {/* Tags Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {ELITE_TAGS.map((tag) => {
              const active = targetUser.tags?.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  disabled={updatingTag !== null}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: active ? '#7c3aed' : '#e2e8f0',
                    backgroundColor: active ? '#f5f3ff' : '#fff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    minWidth: '47%',
                    justifyContent: 'center',
                  }}
                >
                  {updatingTag === tag.id ? (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#7c3aed' : '#475569', textTransform: 'uppercase' }}>
                      {tag.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Purge Button */}
          <TouchableOpacity
            onPress={handlePurgeTags}
            style={{
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              borderWidth: 1.5,
              borderColor: '#fee2e2',
              borderRadius: 16,
              marginBottom: 40,
            }}
          >
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Purge All Tags
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
