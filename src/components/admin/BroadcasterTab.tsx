import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function BroadcasterTab() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'Please fill both title and content.');
      return;
    }

    setLoading(true);
    try {
      const usersSnap = await firestore().collection('users').get();
      const batch = firestore().batch();

      usersSnap.docs.forEach(userDoc => {
        const notifRef = firestore()
          .collection('users')
          .doc(userDoc.id)
          .collection('notifications')
          .doc();

        batch.set(notifRef, {
          title: title,
          content: content,
          type: 'system',
          timestamp: firestore.FieldValue.serverTimestamp(),
          isRead: false
        });
      });

      await batch.commit();
      Alert.alert('Success', 'Global broadcast dispatched to all devices.');
      setTitle('');
      setContent('');
    } catch (err: any) {
      Alert.alert('Broadcast Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Broadcaster System</Text>
      
      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Broadcast Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Server Maintenance Alert"
        style={{ height: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, fontSize: 14 }}
      />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Broadcast Message</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Type content..."
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, fontSize: 14, textAlignVertical: 'top' }}
      />

      <TouchableOpacity 
        onPress={handleBroadcast}
        disabled={loading}
        style={{ height: 50, backgroundColor: '#7c3aed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>DISPATCH BROADCAST</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
