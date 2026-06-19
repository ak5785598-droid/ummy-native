import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { X, Play, Pause, SkipBack, SkipForward, Search as SearchIcon } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFirestore, useUser } from '../../firebase/provider';
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from '@/firebase/firestore-compat';
import { WebView, WebViewNavigation } from 'react-native-webview';

const YoutubeIcon = (props: any) => <FontAwesome5 name="youtube" size={props.size} color={props.color} />;

interface YouTubeState {
  videoId: string;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  updatedAt?: any;
  startedBy?: string;
}

interface YouTubeDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  canClose?: boolean;
}

const EMPTY_STATE: YouTubeState = { videoId: '', title: '', isPlaying: false, currentTime: 0, volume: 100 };

const EXTRACT_VIDEO_ID = (url: string): string => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return '';
};

export function YouTubeDialog({ visible, onClose, roomId, isHost, canClose }: YouTubeDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [state, setState] = useState<YouTubeState>(EMPTY_STATE);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'player' | 'search' | 'url'>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const searchWebViewRef = useRef<any>(null);

  useEffect(() => {
    if (!firestore || !roomId || !visible) return;
    const ref = doc(firestore, 'chatRooms', roomId, 'youtube', 'state');
    const unsub = onSnapshot(ref as any, (snap: any) => {
      setState(snap.exists() ? (snap.data() as YouTubeState) : EMPTY_STATE);
    });
    return () => unsub();
  }, [firestore, roomId, visible]);

  const updateState = useCallback(async (updates: Partial<YouTubeState>) => {
    if (!firestore || !roomId || !isHost) return;
    try {
      await setDoc(
        doc(firestore, 'chatRooms', roomId, 'youtube', 'state') as any,
        { ...updates, updatedAt: serverTimestamp(), startedBy: user?.uid },
        { merge: true }
      );
    } catch (e) {
      console.error('[YouTube] Failed to update state:', e);
    }
  }, [firestore, roomId, isHost, user?.uid]);

  const handleLoadVideo = useCallback(async (videoId: string, title?: string) => {
    setIsLoading(true);
    await updateState({ videoId, title: title || videoId, isPlaying: true, currentTime: 0, volume: 100 });
    setInputUrl('');
    setMode('player');
    setIsLoading(false);
  }, [updateState]);

  const handleUrlLoad = useCallback(() => {
    const id = EXTRACT_VIDEO_ID(inputUrl.trim());
    if (!id) {
      Alert.alert('Invalid URL', 'Paste a valid YouTube URL or video ID.');
      return;
    }
    handleLoadVideo(id, inputUrl.trim());
  }, [inputUrl, handleLoadVideo]);

  const handleSearchNavigate = useCallback((navState: WebViewNavigation) => {
    const url = navState.url;
    const id = EXTRACT_VIDEO_ID(url);
    if (id && isHost) {
      handleLoadVideo(id, url);
    }
    return true;
  }, [isHost, handleLoadVideo]);

  const handleCloseForAll = useCallback(async () => {
    if (!firestore || !roomId || !canClose) return;
    Alert.alert('Stop YouTube', 'Close YouTube for everyone in the room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop for All',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(firestore, 'chatRooms', roomId, 'youtube', 'state') as any);
          } catch (e) {
            console.error('[YouTube] Failed to close for all:', e);
          }
          onClose();
        },
      },
    ]);
  }, [firestore, roomId, canClose, onClose]);

  const embedUrl = state.videoId
    ? `https://www.youtube.com/embed/${state.videoId}?autoplay=${state.isPlaying ? 1 : 0}&controls=${isHost ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`
    : '';

  const searchUrl = searchQuery.trim()
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery.trim())}`
    : 'https://www.youtube.com';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: '#0f0f0f',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          height: '88%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99 }} />
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 18, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#ff0000', alignItems: 'center', justifyContent: 'center' }}>
                <YoutubeIcon size={16} color="white" />
              </View>
              <View>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: -0.3 }}>YouTube Sync</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600' }}>
                  {state.videoId ? (state.isPlaying ? 'Playing' : 'Paused') : 'No video loaded'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canClose && (
                <TouchableOpacity
                  onPress={handleCloseForAll}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>Stop All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <TouchableOpacity
              onPress={() => setMode('player')}
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: mode === 'player' ? '#dc2626' : 'transparent' }}
            >
              <Text style={{ color: mode === 'player' ? 'white' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700' }}>Player</Text>
            </TouchableOpacity>
            {isHost && (
              <TouchableOpacity
                onPress={() => { setMode('search'); Keyboard.dismiss(); }}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: mode === 'search' ? '#dc2626' : 'transparent' }}
              >
                <Text style={{ color: mode === 'search' ? 'white' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700' }}>Search</Text>
              </TouchableOpacity>
            )}
            {isHost && (
              <TouchableOpacity
                onPress={() => setMode('url')}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: mode === 'url' ? '#dc2626' : 'transparent' }}
              >
                <Text style={{ color: mode === 'url' ? 'white' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700' }}>URL</Text>
              </TouchableOpacity>
            )}
          </View>

          {mode === 'url' && isHost && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              <TextInput
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="Paste YouTube URL or video ID..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={{ flex: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, color: 'white', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                returnKeyType="go"
                onSubmitEditing={handleUrlLoad}
              />
              <TouchableOpacity
                onPress={handleUrlLoad}
                disabled={!inputUrl.trim() || isLoading}
                style={{ height: 42, paddingHorizontal: 16, backgroundColor: inputUrl.trim() ? '#dc2626' : 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Load</Text>}
              </TouchableOpacity>
            </View>
          )}

          {mode === 'search' && isHost && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search YouTube videos..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={{ flex: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, color: 'white', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                returnKeyType="search"
                onSubmitEditing={() => { Keyboard.dismiss(); }}
              />
              <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                disabled={!searchQuery.trim()}
                style={{ height: 42, paddingHorizontal: 16, backgroundColor: searchQuery.trim() ? '#dc2626' : 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              >
                <SearchIcon size={14} color="white" />
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Search</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flex: 1, backgroundColor: 'black' }}>
            {mode === 'player' && embedUrl ? (
              <WebView
                source={{ uri: embedUrl }}
                style={{ flex: 1 }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                onError={(e) => console.warn('[YouTube WebView] error:', e.nativeEvent.description)}
              />
            ) : mode === 'search' ? (
              <WebView
                ref={searchWebViewRef}
                source={{ uri: searchUrl }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                onShouldStartLoadWithRequest={handleSearchNavigate}
                userAgent="Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                onError={(e) => console.warn('[YouTube Search] error:', e.nativeEvent.description)}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <YoutubeIcon size={52} color="rgba(255,255,255,0.1)" />
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                  {isHost ? 'Search or paste a URL to start' : 'Waiting for host to load a video...'}
                </Text>
              </View>
            )}
          </View>

          {isHost && state.videoId && mode === 'player' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
              paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0f0f0f',
            }}>
              <TouchableOpacity onPress={() => updateState({ currentTime: Math.max(0, (state.currentTime || 0) - 10) })}>
                <SkipBack size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateState({ isPlaying: !state.isPlaying })}
                style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' }}
              >
                {state.isPlaying ? <Pause size={22} color="white" /> : <Play size={22} color="white" fill="white" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateState({ currentTime: (state.currentTime || 0) + 10 })}>
                <SkipForward size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
