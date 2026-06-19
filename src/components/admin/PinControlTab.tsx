import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { Pin, Loader } from 'lucide-react-native';
import { useFirestore } from '../../firebase/provider';
import { doc, getDoc, updateDoc } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

export function PinControlTab() {
  const firestore = useFirestore();
  const [roomSearchId, setRoomSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [targetRoom, setTargetRoom] = useState<any | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const handleRoomPinSearch = async () => {
    if (!roomSearchId.trim() || !firestore) return;

    setIsSearching(true);
    setTargetRoom(null);

    try {
      // Search by exact roomNumber inside rooms collection
      const roomsRef = firestore.collection('rooms');
      const snap = await roomsRef.where('roomNumber', '==', roomSearchId.trim()).get();

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setTargetRoom({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert('Not Found', 'Room frequency not found.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'An error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleRoomPin = async () => {
    if (!firestore || !targetRoom) return;

    setIsPinning(true);
    const nextPinState = !targetRoom.isPinned;
    try {
      const roomDocRef = doc(firestore, 'rooms', targetRoom.id);
      await updateDoc(roomDocRef, {
        isPinned: nextPinState,
        updatedAt: new Date().toISOString()
      });

      setTargetRoom((prev: any) => ({ ...prev, isPinned: nextPinState }));
      Alert.alert('Success', `Room has been ${nextPinState ? 'pinned to top' : 'unpinned'}.`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to change pin state.');
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Pin Control 📌</Text>
        <Text style={styles.subtitle}>
          Search for a chat room by its Room ID and pin/unpin it globally at the top of discover boards.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Enter Room Number (e.g. 1000021)"
          placeholderTextColor="#94a3b8"
          value={roomSearchId}
          onChangeText={setRoomSearchId}
          onSubmitEditing={handleRoomPinSearch}
          style={styles.input}
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          onPress={handleRoomPinSearch} 
          disabled={isSearching || !roomSearchId.trim()}
          style={[styles.searchButton, (!roomSearchId.trim() || isSearching) && styles.disabledButton]}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Find</Text>
          )}
        </TouchableOpacity>
      </View>

      {targetRoom && (
        <View style={styles.card}>
          <View style={styles.roomHeader}>
            {targetRoom.coverUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: targetRoom.coverUrl }} style={styles.roomCover} />
            ) : (
              <View style={styles.fallbackCover}>
                <Text style={styles.fallbackText}>R</Text>
              </View>
            )}
            <View style={styles.roomMeta}>
              <Text style={styles.roomName}>{targetRoom.name || targetRoom.title}</Text>
              <Text style={styles.roomNumber}>Room ID: {targetRoom.roomNumber}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, targetRoom.isPinned ? styles.pinnedBadge : styles.unpinnedBadge]}>
                  <Text style={[styles.statusText, targetRoom.isPinned ? styles.pinnedText : styles.unpinnedText]}>
                    {targetRoom.isPinned ? 'PINNED ACTIVE' : 'NOT PINNED'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleToggleRoomPin}
            disabled={isPinning}
            style={[
              styles.actionButton, 
              targetRoom.isPinned ? styles.unpinButton : styles.pinButton,
              isPinning && styles.disabledButton
            ]}
          >
            {isPinning ? (
              <ActivityIndicator size="small" color={targetRoom.isPinned ? '#ef4444' : '#fff'} />
            ) : (
              <Text style={[styles.actionButtonText, targetRoom.isPinned ? styles.unpinButtonText : styles.pinButtonText]}>
                {targetRoom.isPinned ? 'Unpin Frequency' : 'Pin to Top'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  searchButton: {
    height: 48,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  disabledButton: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  roomHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
  },
  roomCover: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  fallbackCover: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#64748b',
  },
  roomMeta: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  roomNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinnedBadge: {
    backgroundColor: '#d1fae5',
  },
  unpinnedBadge: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  pinnedText: {
    color: '#065f46',
  },
  unpinnedText: {
    color: '#475569',
  },
  actionButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButton: {
    backgroundColor: '#059669',
  },
  unpinButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pinButtonText: {
    color: '#fff',
  },
  unpinButtonText: {
    color: '#dc2626',
  },
});
