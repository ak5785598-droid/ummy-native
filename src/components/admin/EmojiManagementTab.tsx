import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function EmojiManagementTab() {
  const [emojiName, setEmojiName] = useState('');
  const [emojiTime, setEmojiTime] = useState('3');
  const [emojiUrl, setEmojiUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [emojis, setEmojis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('customEmojis')
      .onSnapshot(snap => {
        if (snap) {
          setEmojis(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      }, err => {
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const handleSyncEmoji = async () => {
    if (!emojiName.trim() || !emojiUrl.trim()) {
      Alert.alert('Validation Error', 'Emoji name and Image URL are required.');
      return;
    }

    setUpdating(true);
    try {
      const emojiId = `emoji_${Date.now()}`;
      await firestore().collection('customEmojis').doc(emojiId).set({
        id: emojiId,
        name: emojiName.trim(),
        imageUrl: emojiUrl.trim(),
        displayTime: parseInt(emojiTime) || 3,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Success', 'Custom emoji synchronized.');
      setEmojiName('');
      setEmojiUrl('');
      setEmojiTime('3');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firestore().collection('customEmojis').doc(id).delete();
      Alert.alert('Success', 'Emoji purged.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>Emoji Management</Text>

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Emoji Name</Text>
      <TextInput value={emojiName} onChangeText={setEmojiName} placeholder="e.g. Heart Eyes" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Display Time (Seconds)</Text>
      <TextInput value={emojiTime} onChangeText={setEmojiTime} placeholder="e.g. 3" keyboardType="number-pad" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 }} />

      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Static Image URL</Text>
      <TextInput value={emojiUrl} onChangeText={setEmojiUrl} placeholder="Direct image link" style={{ height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 16 }} />

      <TouchableOpacity 
        onPress={handleSyncEmoji}
        disabled={updating}
        style={{ height: 46, backgroundColor: '#10b981', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>SYNC CUSTOM EMOJI</Text>}
      </TouchableOpacity>

      <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 }}>Emoji Ledger</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#10b981" />
      ) : (
        emojis.map(e => (
          <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{e.name}</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Time: {e.displayTime || 3}s</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(e.id)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fee2e2', borderRadius: 6 }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800' }}>DELETE</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
