import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { X, Film, Tv, Search, Play, StopCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFirestore, useUser } from '../../firebase/provider';
import { doc, updateDoc, serverTimestamp, onSnapshot } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

const TMDB_KEY = '256c0aa5870239cdb08556653ba48637';

interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  media_type?: 'movie' | 'tv';
}

interface RoomMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  startedBy: string;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

interface EntertainmentHubDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  canManage?: boolean;
}

const VIDSRC_URL = (tmdbId: number, mediaType: 'movie' | 'tv', season?: number, episode?: number) => {
  if (mediaType === 'tv' && season && episode) {
    return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=0066ff&secondaryColor=001133&iconColor=0066ff&title=true&poster=true&autoplay=true`;
  }
  return `https://vidlink.pro/movie/${tmdbId}?primaryColor=B20710&secondaryColor=170000&iconColor=B20710&title=true&poster=true&autoplay=true`;
};

export function EntertainmentHubDialog({ visible, onClose, roomId, isHost, canManage }: EntertainmentHubDialogProps) {
  const insets = useSafeAreaInsets();
  const firestore = useFirestore();
  const { user } = useUser();

  const [tab, setTab] = useState<'movies' | 'series'>('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [roomMovie, setRoomMovie] = useState<RoomMovie | null>(null);

  // Listen to room's currentMovie in real-time (same as web app)
  useEffect(() => {
    if (!firestore || !roomId || !visible) return;
    const unsub = onSnapshot(doc(firestore, 'chatRooms', roomId) as any, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.currentMovie) {
          setRoomMovie(data.currentMovie as RoomMovie);
        } else {
          setRoomMovie(null);
        }
      }
    });
    return () => unsub();
  }, [firestore, roomId, visible]);

  // Load trending on open
  useEffect(() => {
    if (!visible) return;
    fetchTrending();
  }, [visible, tab]);

  const fetchTrending = async () => {
    try {
      const type = tab === 'movies' ? 'movie' : 'tv';
      const res = await fetch(`https://api.themoviedb.org/3/trending/${type}/week?api_key=${TMDB_KEY}`);
      const data = await res.json();
      setTrending((data.results || []).slice(0, 12));
    } catch {
      setTrending([]);
    }
  };

  const searchTMDB = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const type = tab === 'movies' ? 'movie' : 'tv';
      const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [searchQuery, tab]);

  // Host syncs movie to room via Firestore (same as web app's handlePlayMovieForRoom)
  const handleSyncForRoom = useCallback(async (item: TMDBMovie) => {
    if (!firestore || !roomId || !user?.uid || !isHost) return;
    const title = item.title || item.name || 'Unknown';
    Alert.alert(
      'Sync for Room',
      `Play "${title}" for everyone in the room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync for All',
          onPress: async () => {
            try {
              await updateDoc(doc(firestore, 'chatRooms', roomId) as any, {
                currentMovie: {
                  tmdbId: item.id,
                  title,
                  posterPath: item.poster_path || null,
                  startedAt: serverTimestamp(),
                  startedBy: user.uid,
                  mediaType: tab === 'movies' ? 'movie' : 'tv',
                },
                updatedAt: serverTimestamp(),
              });
              Alert.alert('✅ Synced!', `${title} is now playing for the room.`);
              onClose();
            } catch (e) {
              Alert.alert('Error', 'Failed to sync movie for room.');
            }
          },
        },
      ]
    );
  }, [firestore, roomId, user?.uid, isHost, tab, onClose]);

  // Stop room movie (host/mod only)
  const handleStopRoomMovie = useCallback(async () => {
    if (!firestore || !roomId || !canManage) return;
    Alert.alert('Stop Movie', 'Stop the movie for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(firestore, 'chatRooms', roomId) as any, {
              currentMovie: null,
              updatedAt: serverTimestamp(),
            });
          } catch {}
        },
      },
    ]);
  }, [firestore, roomId, canManage]);

  // Watch personally via vidsrc link
  const handleWatchPersonal = useCallback((item: TMDBMovie) => {
    const mediaType = tab === 'movies' ? 'movie' : 'tv';
    const url = VIDSRC_URL(item.id, mediaType);
    Linking.openURL(url);
  }, [tab]);

  const displayList = results.length > 0 ? results : trending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: '#0c0c14',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          height: '90%',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
          paddingBottom: insets.bottom,
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99 }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
            <View>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>Movie Mirror</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', marginTop: 1 }}>
                {roomMovie ? `🎬 ${roomMovie.title} is synced` : 'Search & sync movies/series'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canManage && roomMovie && (
                <TouchableOpacity
                  onPress={handleStopRoomMovie}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <StopCircle size={12} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>Stop</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            {(['movies', 'series'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTab(t); setResults([]); setSearchQuery(''); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: tab === t ? (t === 'movies' ? '#7c3aed' : '#0891b2') : 'rgba(255,255,255,0.07)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {t === 'movies' ? <Film size={12} color="white" /> : <Tv size={12} color="white" />}
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{t === 'series' ? 'TV Series' : 'Movies'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${tab === 'movies' ? 'movies' : 'TV series'}...`}
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{ flex: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, color: 'white', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              returnKeyType="search"
              onSubmitEditing={searchTMDB}
            />
            <TouchableOpacity
              onPress={searchTMDB}
              style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}
            >
              <Search size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Section Label */}
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 2 }}>
            {results.length > 0 ? `${results.length} Results` : 'Trending This Week'}
          </Text>

          {/* Results Grid */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 14 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color="#7c3aed" size="large" />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {displayList.slice(0, 18).map((item) => (
                  <View key={item.id} style={{ width: '30%', marginBottom: 4 }}>
                    <TouchableOpacity
                      onPress={() => isHost ? handleSyncForRoom(item) : handleWatchPersonal(item)}
                      activeOpacity={0.75}
                    >
                      {item.poster_path ? (
                        <Image cachePolicy="memory-disk" source={{ uri: `https://image.tmdb.org/t/p/w300${item.poster_path}` }}
                          style={{ width: '100%', aspectRatio: 2/3, borderRadius: 10, backgroundColor: '#1a1a2e' }}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={{ width: '100%', aspectRatio: 2/3, borderRadius: 10, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
                          <Film size={28} color="rgba(255,255,255,0.2)" />
                        </View>
                      )}
                      {/* Sync badge for host */}
                      {isHost && (
                        <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: 4 }}>
                          <Play size={10} color="white" fill="white" />
                        </View>
                      )}
                      {/* Currently synced badge */}
                      {roomMovie?.tmdbId === item.id && (
                        <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: '#7c3aed', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ color: 'white', fontSize: 8, fontWeight: '800' }}>LIVE</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', marginTop: 5, textAlign: 'center' }} numberOfLines={2}>
                      {item.title || item.name}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textAlign: 'center' }}>
                      {item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || ''}
                      {item.vote_average ? ` ⭐ ${item.vote_average.toFixed(1)}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Bottom hint */}
          {!isHost && (
            <View style={{ paddingHorizontal: 18, paddingBottom: 12, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center' }}>
                Tap to watch personally · Host can sync for the whole room
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
