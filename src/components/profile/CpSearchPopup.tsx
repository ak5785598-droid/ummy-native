import React, { useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Search, X, UserPlus, CheckCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useUser, useFirestore } from '../../firebase/provider';
import { collection, query, where, limit, doc, setDoc, serverTimestamp, getDocs } from '@/firebase/firestore-compat';
import { toCDN } from '../../lib/cdn';

interface CpSearchPopupProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
}

export function CpSearchPopup({ visible, onClose, profile }: CpSearchPopupProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sent, setSent] = useState(false);

  const resetState = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setSent(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); return; }
    if (!firestore) return;
    setSearching(true);
    try {
      const q1 = query(collection(firestore, 'users'), where('accountNumber', '==', text.trim()), limit(5));
      const q2 = query(collection(firestore, 'users'), where('username', '>=', text.toLowerCase()), where('username', '<=', text.toLowerCase() + '\uf8ff'), limit(5));
      const q3 = query(collection(firestore, 'users'), where('username', '>=', text), where('username', '<=', text + '\uf8ff'), limit(5));
      const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
      const results: any[] = [];
      const seen = new Set<string>();
      snap1.forEach((d: any) => { const data = d.data(); if (!seen.has(d.id) && d.id !== user?.uid) { seen.add(d.id); results.push({ id: d.id, ...data }); } });
      snap2.forEach((d: any) => { const data = d.data(); if (!seen.has(d.id) && d.id !== user?.uid) { seen.add(d.id); results.push({ id: d.id, ...data }); } });
      snap3.forEach((d: any) => { const data = d.data(); if (!seen.has(d.id) && d.id !== user?.uid) { seen.add(d.id); results.push({ id: d.id, ...data }); } });
      setSearchResults(results.slice(0, 8));
    } catch {}
    setSearching(false);
  }, [firestore]);

  const handleSendProposal = useCallback(async (type: 'CP' | 'Best Friend' | 'Besties') => {
    if (!firestore || !user?.uid || !selectedUser?.id || !profile?.id) {
      console.log('[CpSearchPopup] Guard failed:', { hasFirestore: !!firestore, uid: user?.uid, selectedUserId: selectedUser?.id, profileId: profile?.id });
      return;
    }
    try {
      await setDoc(doc(firestore, 'proposals', `${user.uid}_${selectedUser.id}`), {
        fromUid: user.uid,
        fromUsername: profile.username || '',
        fromAvatarUrl: profile.avatarUrl || '',
        toUid: selectedUser.id,
        toUsername: selectedUser.username || '',
        toAvatar: selectedUser.avatarUrl || '',
        type,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      console.log('[CpSearchPopup] Proposal sent successfully');
      setSent(true);
      setTimeout(() => { resetState(); onClose(); }, 2000);
    } catch (e) {
      console.log('[CpSearchPopup] Proposal send FAILED:', e?.message);
    }
  }, [firestore, user?.uid, selectedUser, profile, onClose, resetState]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity activeOpacity={1} onPress={handleClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#1E293B', borderRadius: 20, width: '85%', padding: 16 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UserPlus size={18} color="#EC4899" />
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Find Partner</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <X size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {!selectedUser && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Search size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search by name or ID..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600', paddingVertical: 10, paddingHorizontal: 8 }}
              />
              {searching && <ActivityIndicator size="small" color="#EC4899" />}
            </View>
          )}

          {/* Selected User */}
          {selectedUser && !sent && (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Image source={{ uri: toCDN(selectedUser.avatarUrl) || 'https://picsum.photos/200' }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#EC4899' }} cachePolicy="memory-disk" />
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 8 }}>{selectedUser.username}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>ID: {selectedUser.accountNumber || selectedUser.id}</Text>
            </View>
          )}

          {/* Sent Success */}
          {sent && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <CheckCircle size={36} color="#22C55E" />
              <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '800', marginTop: 8 }}>Proposal Sent!</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>Waiting for response</Text>
            </View>
          )}

          {/* Search Results */}
          {!selectedUser && searchResults.length > 0 && (
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {searchResults.map((u: any) => (
                <TouchableOpacity key={u.id} onPress={() => { setSelectedUser(u); setSearchResults([]); setSearchQuery(''); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6 }}>
                  <Image source={{ uri: toCDN(u.avatarUrl) || 'https://picsum.photos/200' }} style={{ width: 40, height: 40, borderRadius: 20 }} cachePolicy="memory-disk" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{u.username || 'Unknown'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>ID: {u.accountNumber || u.id}</Text>
                  </View>
                  <UserPlus size={16} color="#EC4899" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* No Results */}
          {!selectedUser && searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>No users found</Text>
          )}

          {/* Proposal Type Buttons */}
          {selectedUser && !sent && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {[
                { id: 'Best Friend', label: 'Best Friend', icon: '🫂' },
                { id: 'CP', label: 'CP Partner', icon: '💑' },
                { id: 'Besties', label: 'Besties', icon: '👯' },
              ].map(t => (
                <TouchableOpacity key={t.id} onPress={() => handleSendProposal(t.id as any)}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 20, marginBottom: 3 }}>{t.icon}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Hint */}
          {!selectedUser && searchQuery.length < 2 && !sent && (
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>
              Search by username or account number
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
