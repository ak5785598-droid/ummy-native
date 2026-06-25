import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function AuthorityHubTab() {
  const [userIdInput, setUserIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  const handleSearch = async () => {
    if (!userIdInput.trim()) return;
    setLoading(true);
    setFoundUser(null);
    try {
      // Find user by accountNumber ID or document ID
      const querySnap = await firestore()
        .collection('users')
        .where('accountNumber', '==', userIdInput.trim())
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const doc = querySnap.docs[0];
        setFoundUser({ id: doc.id, ...doc.data() });
      } else {
        // Fallback to check if it's direct UID
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

  const toggleTag = async (tagName: string) => {
    if (!foundUser) return;
    const currentTags = foundUser.tags || [];
    const hasTag = currentTags.includes(tagName);
    const updatedTags = hasTag
      ? currentTags.filter((t: string) => t !== tagName)
      : [...currentTags, tagName];

    try {
      const uRef = firestore().collection('users').doc(foundUser.id);
      const pRef = firestore().collection('users').doc(foundUser.id).collection('profile').doc(foundUser.id);

      await uRef.update({ tags: updatedTags });
      // Update nested profile document if exists
      const pSnap = await pRef.get();
      if (pSnap.exists()) {
        await pRef.update({ tags: updatedTags });
      }

      setFoundUser((prev: any) => ({ ...prev, tags: updatedTags }));
      Alert.alert('Success', `Tag ${tagName} ${hasTag ? 'removed' : 'granted'} successfully.`);
    } catch (err: any) {
      Alert.alert('Error updating role', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Search User by Account ID or UID
      </Text>
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
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SEARCH</Text>}
        </TouchableOpacity>
      </View>

      {foundUser && (
        <View style={{ padding: 20, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
            {foundUser.username || 'User'}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Account ID: {foundUser.accountNumber || 'N/A'} (UID: {foundUser.id})
          </Text>

          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 10 }}>
            Authority Settings
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Official', 'Seller', 'Service', 'Host', 'CS Leader'].map(tag => {
              const active = (foundUser.tags || []).includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 99,
                    backgroundColor: active ? '#7c3aed' : '#e2e8f0',
                    borderWidth: 1,
                    borderColor: active ? '#7c3aed' : '#cbd5e1',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : '#475569' }}>
                    {tag} {active ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
