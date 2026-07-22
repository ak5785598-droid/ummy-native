import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Keyboard, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search as SearchIcon, X, Hash, User, MessageCircle, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFirebase, useUser } from '../firebase/provider';
import { collection, query, where, getDocs, limit } from '@/firebase/firestore-compat';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { getLevelFromSpent } from '../hooks/use-user-level';
import { UserLevelBadge } from '@/components/user-level-badge';

interface SearchResult {
  type: 'user' | 'room';
  id: string;
  title: string;
  avatarUrl?: string;
  subtitle?: string;
  badge?: string;
  levelValue?: number;
  password?: string;
  ownerId?: string;
  moderatorIds?: string[];
}

export default function SearchScreen() {
  const router = useRouter();
  const { firestore, isHydrated } = useFirebase();
  const [activeTab, setActiveTab] = useState<'user' | 'room'>('user');
  const [query_text, setQueryText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useUser();
  const [lockedRoomTarget, setLockedRoomTarget] = useState<SearchResult | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPassModal, setShowPassModal] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query_text.trim() || !firestore) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      await performSearch();
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query_text, activeTab, firestore]);

  const performSearch = async () => {
    const input = query_text.trim();
    if (!input || !firestore) return;

    setIsSearching(true);
    setHasSearched(true);
    const isNumeric = /^\d+$/.test(input);
    const found: SearchResult[] = [];

    try {
      if (activeTab === 'user') {
        const qs = [
          query(collection(firestore, 'users'), where('accountNumber', '==', input), limit(5)),
          query(collection(firestore, 'users'), where('activeIdBadge.displayId', '==', input), limit(5)),
          query(collection(firestore, 'users'), where('username', '>=', input), where('username', '<=', input + '\uf8ff'), limit(5)),
        ];
        if (isNumeric) {
          qs.push(query(collection(firestore, 'users'), where('accountNumber', '==', Number(input)), limit(5)));
          qs.push(query(collection(firestore, 'users'), where('activeIdBadge.displayId', '==', Number(input)), limit(5)));
        }

        for (const q of qs) {
          const snap = await getDocs(q);
          snap.forEach((doc: any) => {
            const d = doc.data();
            if (!found.find(f => f.id === doc.id)) {
              // Set correct display ID using activeIdBadge if available
              const displayId = d.activeIdBadge?.displayId || d.accountNumber || 'No ID';
              found.push({
                type: 'user',
                id: doc.id,
                title: d.username || d.name || 'User',
                avatarUrl: d.avatarUrl,
                subtitle: `ID: ${displayId}`,
                badge: `Lv.${getLevelFromSpent(d.wallet?.totalSpent || 0)}`,
                levelValue: getLevelFromSpent(d.wallet?.totalSpent || 0),
              });
            }
          });
        }
      } else {
        const qs = [
          query(collection(firestore, 'chatRooms'), where('roomNumber', '==', input), limit(5)),
        ];
        if (isNumeric) {
          qs.push(query(collection(firestore, 'chatRooms'), where('roomNumber', '==', Number(input)), limit(5)));
        }

        for (const q of qs) {
          const snap = await getDocs(q);
          snap.forEach((doc: any) => {
            const d = doc.data();
            if (!found.find(f => f.id === doc.id)) {
              found.push({
                type: 'room',
                id: doc.id,
                title: d.title || d.name || 'Room',
                avatarUrl: d.coverUrl,
                subtitle: `Room #${d.roomNumber || '0000'}`,
                badge: `${d.participantCount || 0} online`,
                password: d.password,
                ownerId: d.ownerId,
                moderatorIds: d.moderatorIds || [],
              });
            }
          });
        }
      }
    } catch (e) {}

    setResults(found);
    setIsSearching(false);
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'user') {
      router.push(`/profile/${result.id}`);
    } else {
      const isOwner = user?.uid && result.ownerId === user.uid;
      const isMod = user?.uid && result.moderatorIds?.includes(user.uid);

      if (result.password && !isOwner && !isMod) {
        setLockedRoomTarget(result);
        setEnteredPin('');
        setShowPassModal(true);
        return;
      }
      router.push(`/rooms/${result.id}`);
    }
  };

  const handleUnlockAndEnter = () => {
    if (!lockedRoomTarget) return;
    if (enteredPin.trim() === lockedRoomTarget.password) {
      const id = lockedRoomTarget.id;
      setShowPassModal(false);
      setLockedRoomTarget(null);
      setEnteredPin('');
      router.push(`/rooms/${id}`);
    } else {
      Alert.alert('Access Denied', 'Incorrect Room Password PIN. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 flex-row items-center">
          <SearchIcon size={18} color="#94a3b8" />
          <TextInput
            ref={inputRef}
            value={query_text}
            onChangeText={setQueryText}
            placeholder="Search users or rooms..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-2 text-base text-slate-800"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={performSearch}
          />
          {query_text.length > 0 && (
            <TouchableOpacity onPress={() => { setQueryText(''); setResults([]); setHasSearched(false); }} className="p-1">
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="flex-row mx-4 mt-3 bg-slate-100 rounded-full p-0.5">
        <TouchableOpacity
          onPress={() => setActiveTab('user')}
          className={`flex-1 py-2 rounded-full items-center flex-row justify-center gap-1 ${activeTab === 'user' ? 'bg-white shadow-sm' : ''}`}
        >
          <User size={14} color={activeTab === 'user' ? '#1e293b' : '#94a3b8'} />
          <Text className={`text-xs font-bold ${activeTab === 'user' ? 'text-slate-800' : 'text-slate-400'}`}>User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('room')}
          className={`flex-1 py-2 rounded-full items-center flex-row justify-center gap-1 ${activeTab === 'room' ? 'bg-white shadow-sm' : ''}`}
        >
          <Hash size={14} color={activeTab === 'room' ? '#1e293b' : '#94a3b8'} />
          <Text className={`text-xs font-bold ${activeTab === 'room' ? 'text-slate-800' : 'text-slate-400'}`}>Room</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 pt-4">
        {isSearching ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text className="text-slate-400 text-xs mt-2 font-medium">Synchronizing...</Text>
          </View>
        ) : hasSearched && results.length === 0 ? (
          <View className="py-20 items-center">
            <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-3">
              <X size={28} color="#94a3b8" />
            </View>
            <Text className="text-slate-400 text-sm font-medium">No Match Found</Text>
            <Text className="text-slate-300 text-xs mt-1">Try a different ID or name</Text>
          </View>
        ) : results.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {results.map((result) => (
              <TouchableOpacity
                key={`${result.type}-${result.id}`}
                onPress={() => handleSelect(result)}
                className="flex-row items-center bg-white rounded-2xl p-4 mb-2 border border-slate-100 shadow-sm"
              >
                {result.avatarUrl ? (
                  <Image cachePolicy="memory-disk" source={{ uri: result.avatarUrl }} className="w-16 h-16 rounded-full mr-4" />
                ) : (
                  <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mr-4">
                    <User size={24} color="#8b5cf6" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-800">{result.title}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">{result.subtitle}</Text>
                  {result.levelValue !== undefined && (
                    <View className="mt-1">
                      <UserLevelBadge level={result.levelValue} scale={0.6} />
                    </View>
                  )}
                </View>
                <View className="bg-slate-50 rounded-full p-2">
                  {result.type === 'room' ? (
                    <MessageCircle size={18} color="#64748b" />
                  ) : (
                    <User size={18} color="#64748b" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View className="py-20 items-center">
            <SearchIcon size={40} color="#e2e8f0" />
            <Text className="text-slate-400 text-sm mt-3 font-medium">Enter a name or ID to search</Text>
            <Text className="text-slate-300 text-xs mt-1">Search by username, account number, or room number</Text>
          </View>
        )}
      </View>

      <Modal
        visible={showPassModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPassModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Lock size={28} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
              Locked Room
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', textAlign: 'center', marginBottom: 20 }}>
              This voice room is private. Please enter the 4-digit room password PIN to enter.
            </Text>

            <TextInput
              value={enteredPin}
              onChangeText={setEnteredPin}
              placeholder="Enter Room PIN"
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={10}
              style={{
                width: '100%',
                height: 50,
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                borderRadius: 14,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: 4,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                marginBottom: 20
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setShowPassModal(false)}
                style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnlockAndEnter}
                style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Unlock & Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
