import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Search, Clock, CalendarDays, History } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';

export function SeatTimingTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchedUser(null);

    try {
      let userData = null;

      // Try searching by exact document ID first
      const userDocRef = firestore().doc(`users/${searchQuery.trim()}`);
      const userDocSnap = await userDocRef.get();

      if (userDocSnap.exists) {
        userData = { id: userDocSnap.id, ...userDocSnap.data() };
      } else {
        // Try searching by accountNumber
        const accountSnapshot = await firestore()
          .collection('users')
          .where('accountNumber', '==', searchQuery.trim())
          .get();

        if (!accountSnapshot.empty) {
          const docSnap = accountSnapshot.docs[0];
          userData = { id: docSnap.id, ...docSnap.data() };
        } else {
          // Try searching by exact Username
          const usernameSnapshot = await firestore()
            .collection('users')
            .where('username', '==', searchQuery.trim())
            .get();

          if (!usernameSnapshot.empty) {
            const docSnap = usernameSnapshot.docs[0];
            userData = { id: docSnap.id, ...docSnap.data() };
          }
        }
      }

      if (userData) {
        setSearchedUser(userData);
      } else {
        setError('User not found. Please check the ID or Username.');
      }
    } catch (err: any) {
      console.error('Error searching user:', err);
      setError('An error occurred while searching.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatMinutes = (mins: number) => {
    if (!mins) return '0 mins';
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${remainingMins}m`;
  };

  // Sort dates from newest to oldest
  const seatTimeEntries = searchedUser?.seatTime 
    ? Object.entries(searchedUser.seatTime).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Seat Timing Tracker ⏱️</Text>
        <Text style={styles.subtitle}>Search for a user to see how much time they have spent on room seats.</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Enter User ID or Exact Username..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          onPress={handleSearch} 
          disabled={isLoading || !searchQuery.trim()}
          style={[styles.searchButton, (!searchQuery.trim() || isLoading) && styles.disabledButton]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Search size={18} color="#fff" />
          )}
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results Display */}
      {searchedUser && (
        <View style={styles.resultsContainer}>
          {/* Profile Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>User Profile</Text>
            <View style={styles.profileContent}>
              {searchedUser.avatarUrl ? (
                <Image cachePolicy="memory-disk" source={{ uri: searchedUser.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {(searchedUser.username || 'U')[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.username}>{searchedUser.username || 'Unknown User'}</Text>
              <Text style={styles.userId}>ID: {searchedUser.id}</Text>
            </View>
          </View>

          {/* Total Time Stats */}
          <View style={[styles.card, styles.statsCard]}>
            <View style={styles.statsHeader}>
              <Clock size={20} color="#818cf8" />
              <Text style={styles.statsCardTitle}>Total Seat Time</Text>
            </View>
            <View style={styles.statsContent}>
              <Text style={styles.totalTimeText}>
                {formatMinutes(searchedUser.totalSeatTime || 0)}
              </Text>
              <Text style={styles.statsLabel}>Lifetime duration on mic</Text>
            </View>
          </View>

          {/* Daily Breakdown */}
          <View style={styles.card}>
            <View style={styles.breakdownHeader}>
              <CalendarDays size={20} color="#64748b" />
              <Text style={styles.cardTitle}>Daily Breakdown</Text>
            </View>
            
            <View style={styles.breakdownList}>
              {seatTimeEntries.length > 0 ? (
                seatTimeEntries.map(([date, minutes]: [string, any]) => (
                  <View key={date} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View style={styles.historyIconContainer}>
                        <History size={14} color="#6366f1" />
                      </View>
                      <Text style={styles.breakdownDate}>{date}</Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.rowTimeText}>{formatMinutes(minutes)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Clock size={32} color="#cbd5e1" style={styles.emptyIcon} />
                  <Text style={styles.emptyText}>No seat time recorded yet</Text>
                </View>
              )}
            </View>
          </View>
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
    backgroundColor: '#6366f1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#818cf8',
    marginBottom: 12,
  },
  avatarFallback: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#475569',
  },
  username: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  userId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#64748b',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsContent: {
    marginTop: 8,
  },
  totalTimeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1d4ed8',
  },
  statsLabel: {
    fontSize: 12,
    color: '#1e3a8a',
    opacity: 0.7,
    marginTop: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 12,
  },
  breakdownList: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyIconContainer: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  breakdownDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  breakdownRight: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rowTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
