import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function DirectMessengerTab() {
  const [userIdInput, setUserIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

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

  const handleSendDm = async () => {
    if (!foundUser || !title.trim() || !content.trim()) return;
    setSending(true);
    try {
      await firestore()
        .collection('users')
        .doc(foundUser.id)
        .collection('notifications')
        .add({
          title: title,
          content: content,
          type: 'direct_system',
          timestamp: firestore.FieldValue.serverTimestamp(),
          isRead: false,
        });

      Alert.alert('Success', 'Private message sent to user.');
      setTitle('');
      setContent('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Direct Messenger</Text>

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image cachePolicy="memory-disk" source={{ uri: foundUser.avatarUrl || 'https://picsum.photos/200' }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{foundUser.username || 'User'}</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Account: {foundUser.accountNumber || 'N/A'}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 }}>Message Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Wallet Reward"
            style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff' }}
          />

          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>Message Content</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Type message..."
            multiline
            numberOfLines={3}
            style={{ minHeight: 72, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, backgroundColor: '#fff', textAlignVertical: 'top' }}
          />

          <TouchableOpacity 
            onPress={handleSendDm}
            disabled={sending || !title.trim() || !content.trim()}
            style={{ marginTop: 16, height: 44, backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SEND SYNC</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
