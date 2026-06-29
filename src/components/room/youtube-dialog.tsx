import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, Keyboard, ScrollView, Dimensions, PanResponder, Animated } from 'react-native';
import { X, Play, Pause, SkipBack, SkipForward, Search as SearchIcon, GripHorizontal, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFirestore, useUser } from '../../firebase/provider';
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from '@/firebase/firestore-compat';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';

const YoutubeIcon = (props: any) => <FontAwesome5 name="youtube" size={props.size} color={props.color} />;

const YOUTUBE_API_KEY = 'AIzaSyCpgMk-aZA6EzMBeSjPN9QVGeKvK1Pyduo';

function getYouTubeHtml(videoId: string, isHost: boolean) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: black; overflow: hidden; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var player;
    window.onYouTubeIframeAPIReady = function() {
      player = new YT.Player('player', {
        videoId: '${videoId}',
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: ${isHost ? 1 : 0},
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: 'https://ummychat.in'
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange
        }
      });
    };

    function onPlayerReady(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'ready' }));
    }

    function onPlayerStateChange(event) {
      var stateName = 'unstarted';
      if (event.data == YT.PlayerState.PLAYING) stateName = 'playing';
      else if (event.data == YT.PlayerState.PAUSED) stateName = 'paused';
      else if (event.data == YT.PlayerState.ENDED) stateName = 'ended';

      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: 'stateChange',
        state: stateName,
        time: player.getCurrentTime()
      }));
    }

    window.handleNativeCommand = function(data) {
      if (!player) return;
      if (data.command === 'play') {
        player.playVideo();
      } else if (data.command === 'pause') {
        player.pauseVideo();
      } else if (data.command === 'seek') {
        player.seekTo(data.time, true);
      } else if (data.command === 'volume') {
        player.setVolume(data.volume);
      } else if (data.command === 'loadVideo') {
        player.loadVideoById(data.videoId);
      }
    };

    setInterval(function() {
      if (player && typeof player.getCurrentTime === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'timeUpdate',
          time: player.getCurrentTime()
        }));
      }
    }, 1000);
  </script>
</body>
</html>
  `;
}

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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [initialVideoId, setInitialVideoId] = useState(state.videoId);

  useEffect(() => {
    if (visible && state.videoId) {
      setInitialVideoId(state.videoId);
    }
  }, [visible]);

  const webViewRef = useRef<WebView>(null);
  const webViewReadyRef = useRef(false);

  const injectCommand = useCallback((cmd: object) => {
    if (webViewRef.current && webViewReadyRef.current) {
      const js = `if (window.handleNativeCommand) { window.handleNativeCommand(${JSON.stringify(cmd)}); }; true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, []);

  const { width: screenWidth } = Dimensions.get('window');
  const playerWidth = screenWidth;
  const videoViewportHeight = playerWidth * (9 / 16);
  
  const isVideoLoaded = !!state.videoId;
  const isHostControlsVisible = isHost && isVideoLoaded && mode === 'player';
  
  // Calculate dynamic container height based on play/search/url states
  const playerCardHeight = mode === 'player'
    ? (isVideoLoaded ? (videoViewportHeight + 88 + (isHostControlsVisible ? 78 : 0)) : 220)
    : '75%';

  // Draggable gesture hooks
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  const updateState = useCallback(async (updates: Partial<YouTubeState>) => {
    if (!firestore || !roomId || !isHost) return;
    try {
      await setDoc(
        doc(firestore, 'chatRooms', roomId, 'youtube', 'state') as any,
        { ...updates, updatedAt: serverTimestamp(), startedBy: user?.uid },
        { merge: true }
      );
    } catch (e) {
    }
  }, [firestore, roomId, isHost, user?.uid]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === 'ready') {
        webViewReadyRef.current = true;
        // Sync states immediately on load
        if (state.videoId) {
          injectCommand({ command: 'loadVideo', videoId: state.videoId });
        }
        injectCommand({ command: state.isPlaying ? 'play' : 'pause' });
        if (state.currentTime > 0) {
          injectCommand({ command: 'seek', time: state.currentTime });
        }
        injectCommand({ command: 'volume', volume: state.volume || 100 });
      } else if (data.event === 'stateChange') {
        if (data.state === 'playing' && !state.isPlaying && isHost) {
          updateState({ isPlaying: true });
        } else if (data.state === 'paused' && state.isPlaying && isHost) {
          updateState({ isPlaying: false });
        }
      } else if (data.event === 'timeUpdate') {
        if (isHost && Math.abs(data.time - (state.currentTime || 0)) > 3) {
          updateState({ currentTime: Math.round(data.time) });
        }
      }
    } catch (e) {
    }
  }, [state, isHost, updateState, injectCommand]);

  const lastStateRef = useRef<YouTubeState>(EMPTY_STATE);

  useEffect(() => {
    if (!webViewReadyRef.current) return;

    if (state.videoId && state.videoId !== lastStateRef.current.videoId) {
      injectCommand({ command: 'loadVideo', videoId: state.videoId });
    }

    if (state.isPlaying !== lastStateRef.current.isPlaying) {
      injectCommand({ command: state.isPlaying ? 'play' : 'pause' });
    }

    if (state.currentTime !== undefined && Math.abs((state.currentTime || 0) - (lastStateRef.current.currentTime || 0)) > 3) {
      injectCommand({ command: 'seek', time: state.currentTime });
    }

    if (state.volume !== lastStateRef.current.volume) {
      injectCommand({ command: 'volume', volume: state.volume });
    }

    lastStateRef.current = state;
  }, [state, injectCommand]);

  useEffect(() => {
    if (!firestore || !roomId || !visible) return;
    const ref = doc(firestore, 'chatRooms', roomId, 'youtube', 'state');
    const unsub = onSnapshot(ref as any, (snap: any) => {
      setState(snap.exists() ? (snap.data() as YouTubeState) : EMPTY_STATE);
    }, (error: any) => {});
    return () => unsub();
  }, [firestore, roomId, visible]);

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

  const searchYouTube = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    Keyboard.dismiss();
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=15&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      if (data.items) {
        setSearchResults(data.items);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Playlist index tracking for Next/Prev
  const currentIndex = searchResults.findIndex(item => item.id?.videoId === state.videoId);

  const handlePlayNext = useCallback(() => {
    if (currentIndex !== -1 && currentIndex < searchResults.length - 1) {
      const nextItem = searchResults[currentIndex + 1];
      const videoId = nextItem.id?.videoId;
      if (videoId) {
        handleLoadVideo(videoId, nextItem.snippet?.title);
      }
    }
  }, [currentIndex, searchResults, handleLoadVideo]);

  const handlePlayPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevItem = searchResults[currentIndex - 1];
      const videoId = prevItem.id?.videoId;
      if (videoId) {
        handleLoadVideo(videoId, prevItem.snippet?.title);
      }
    }
  }, [currentIndex, searchResults, handleLoadVideo]);

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
          }
          onClose();
        },
      },
    ]);
  }, [firestore, roomId, canClose, onClose]);

  const handleShouldStartLoad = useCallback((request: any) => {
    const url = request.url;
    // Allow only http and https web requests, blocking custom app deep-link schemes (intent://, youtube://, market://)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    // Block redirections to App Store/Play Store
    if (url.includes('play.google.com') || url.includes('apps.apple.com')) {
      return false;
    }
    return true;
  }, []);

  const embedUrl = state.videoId
    ? `https://www.youtube.com/embed/${state.videoId}?autoplay=${state.isPlaying ? 1 : 0}&controls=${isHost ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
    : '';

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={{
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          backgroundColor: '#0f0f0f',
          borderRadius: 24,
          width: playerWidth,
          height: playerCardHeight,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 10
        }}>

          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 18, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {/* Drag Handle Icon - PanResponder binded specifically here */}
              <View {...panResponder.panHandlers} style={{ paddingHorizontal: 6, paddingVertical: 4, marginRight: 2 }}>
                <GripHorizontal size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#ff0000', alignItems: 'center', justifyContent: 'center' }}>
                  <YoutubeIcon size={12} color="white" />
                </View>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: -0.3 }}>YouTube Sync</Text>
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
                onSubmitEditing={searchYouTube}
              />
              <TouchableOpacity
                onPress={searchYouTube}
                disabled={!searchQuery.trim() || isSearching}
                style={{ height: 42, paddingHorizontal: 16, backgroundColor: searchQuery.trim() ? '#dc2626' : 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              >
                <SearchIcon size={14} color="white" />
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Search</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flex: 1, backgroundColor: 'black' }}>
            {mode === 'player' && state.videoId ? (
              <WebView
                ref={webViewRef}
                source={{ 
                  html: getYouTubeHtml(initialVideoId, isHost),
                  baseUrl: 'https://ummychat.in'
                }}
                style={{ flex: 1 }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                onMessage={handleMessage}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                onError={() => {}}
              />
            ) : mode === 'search' ? (
              isSearching ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#dc2626" />
                </View>
              ) : searchResults.length > 0 ? (
                <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
                  {searchResults.map((item, index) => {
                    const videoId = item.id?.videoId;
                    if (!videoId) return null;
                    return (
                      <TouchableOpacity
                        key={`${videoId}_${index}`}
                        onPress={() => handleLoadVideo(videoId, item.snippet?.title)}
                        style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}
                      >
                        <Image
                          cachePolicy="memory-disk"
                          source={{ uri: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url }}
                          style={{ width: 120, height: 68, borderRadius: 8, backgroundColor: '#1a1a2e' }}
                          contentFit="cover"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }} numberOfLines={2}>
                            {item.snippet?.title ? item.snippet.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : ''}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 }}>
                            {item.snippet?.channelTitle}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <YoutubeIcon size={52} color="rgba(255,255,255,0.1)" />
                  <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                    Search YouTube videos
                  </Text>
                </View>
              )
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
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
              paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0f0f0f',
            }}>
              {/* Prev Song Button */}
              <TouchableOpacity 
                onPress={handlePlayPrev} 
                disabled={currentIndex <= 0}
                style={{ opacity: currentIndex <= 0 ? 0.3 : 1, padding: 6 }}
              >
                <ChevronLeft size={20} color="white" />
              </TouchableOpacity>

              {/* Seek -100s Button */}
              <TouchableOpacity 
                onPress={() => updateState({ currentTime: Math.max(0, (state.currentTime || 0) - 100) })}
                style={{ alignItems: 'center', padding: 6 }}
              >
                <SkipBack size={20} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, marginTop: 2 }}>-100s</Text>
              </TouchableOpacity>

              {/* Play / Pause Toggle */}
              <TouchableOpacity
                onPress={() => updateState({ isPlaying: !state.isPlaying })}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' }}
              >
                {state.isPlaying ? <Pause size={20} color="white" /> : <Play size={20} color="white" fill="white" />}
              </TouchableOpacity>

              {/* Seek +100s Button */}
              <TouchableOpacity 
                onPress={() => updateState({ currentTime: (state.currentTime || 0) + 100 })}
                style={{ alignItems: 'center', padding: 6 }}
              >
                <SkipForward size={20} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, marginTop: 2 }}>+100s</Text>
              </TouchableOpacity>

              {/* Next Song Button */}
              <TouchableOpacity 
                onPress={handlePlayNext} 
                disabled={currentIndex === -1 || currentIndex >= searchResults.length - 1}
                style={{ opacity: (currentIndex === -1 || currentIndex >= searchResults.length - 1) ? 0.3 : 1, padding: 6 }}
              >
                <ChevronRight size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
