import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Dimensions, PanResponder, Animated, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X, Film, GripHorizontal, MessageSquare, Send } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

interface MoviePlayerProps {
  visible: boolean;
  onClose: () => void;
  tmdbId?: string;
  title?: string;
  posterPath?: string;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  roomId?: string;
  userId?: string;
  username?: string;
}

export function MoviePlayer({ visible, onClose, tmdbId, title, mediaType, season, episode, roomId, userId, username }: MoviePlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const [watchers, setWatchers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Watchers & Chat Firestore Listeners
  useEffect(() => {
    if (!visible || !roomId || !userId) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const watcherRef = db().collection('chatRooms').doc(roomId).collection('movieWatchers').doc(userId);
      watcherRef.set({ uid: userId, username: username || 'User', joinedAt: Date.now() }, { merge: true }).catch(() => {});


      const unsubWatchers = db().collection('chatRooms').doc(roomId).collection('movieWatchers').onSnapshot((snap: any) => {
        if (snap) {
          setWatchers(snap.docs.map((d: any) => d.data()));
        }
      });

      const unsubChat = db().collection('chatRooms').doc(roomId).collection('movieChats')
        .orderBy('timestamp', 'asc')
        .limitToLast(30)
        .onSnapshot((snap: any) => {
          if (snap) {
            setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
          }
        });

      return () => {
        unsubWatchers();
        unsubChat();
        watcherRef.delete().catch(() => {});
      };
    } catch (e) {}
  }, [visible, roomId, userId, username]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !roomId || !userId) return;
    const msg = inputText.trim();
    setInputText('');
    try {
      const db = require('@react-native-firebase/firestore').default;
      await db().collection('chatRooms').doc(roomId).collection('movieChats').add({
        text: msg,
        senderUid: userId,
        senderName: username || 'User',
        timestamp: Date.now()
      });
    } catch (e) {}
  };

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const playerWidth = screenWidth;
  const videoViewportHeight = playerWidth * (9 / 16);
  const playerCardHeight = videoViewportHeight + (showChat ? 190 : 46);

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

  const videoUrl = tmdbId
    ? mediaType === 'tv' && season && episode
      ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=0066ff&secondaryColor=001133&iconColor=0066ff&title=true&poster=true&autoplay=true`
      : `https://vidlink.pro/movie/${tmdbId}?primaryColor=B20710&secondaryColor=170000&iconColor=B20710&title=true&poster=true&autoplay=true`
    : null;

  const handleShouldStartLoad = (request: any) => {
    const url = request.url;
    if (
      url.includes('vidlink.pro') ||
      url.includes('vidsrc') ||
      url === 'about:blank' ||
      url === videoUrl
    ) {
      return true;
    }
    return false;
  };

  const handleNavigationStateChange = (navState: any) => {
    if (
      navState.url &&
      videoUrl &&
      !navState.url.includes('vidlink.pro') &&
      !navState.url.includes('vidsrc') &&
      navState.url !== 'about:blank'
    ) {
      webViewRef.current?.stopLoading();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={{
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          width: playerWidth,
          height: playerCardHeight,
          backgroundColor: '#0f0f0f',
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 10
        }}>
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0c0c14', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View {...panResponder.panHandlers} style={{ paddingHorizontal: 6, paddingVertical: 4, marginRight: 2 }}>
                <GripHorizontal size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold', flex: 1 }} numberOfLines={1}>{title || 'Movie'}</Text>
            </View>

            {/* Watchers Badge */}
            <TouchableOpacity 
              onPress={() => {
                const names = watchers.map((w: any) => w.username || 'User').join('\n• ');
                Alert.alert('Live Watchers 👁️', watchers.length > 0 ? `Currently Watching (${watchers.length}):\n\n• ${names}` : 'You are the only one watching right now.');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 6, gap: 4, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' }}
            >
              <Text style={{ color: '#60a5fa', fontSize: 10, fontWeight: '800' }}>👁️ {Math.max(1, watchers.length)}</Text>
            </TouchableOpacity>

            {/* Toggle Chat Button */}
            <TouchableOpacity onPress={() => setShowChat(!showChat)} style={{ padding: 5, backgroundColor: showChat ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', borderRadius: 8, marginRight: 6 }}>
              <MessageSquare size={15} color={showChat ? '#60a5fa' : 'rgba(255,255,255,0.6)'} />
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={18} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>

          {/* Video Player */}
          <View style={{ height: videoViewportHeight, backgroundColor: 'black' }}>
            {videoUrl ? (
              <WebView
                ref={webViewRef}
                source={{ uri: videoUrl }}
                style={{ flex: 1 }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                startInLoadingState
                setSupportMultipleWindows={false}
                javaScriptCanOpenWindowsAutomatically={false}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                onNavigationStateChange={handleNavigationStateChange}
                renderLoading={() => (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                    <ActivityIndicator color="white" />
                  </View>
                )}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Film size={48} color="rgba(255,255,255,0.15)" />
                <Text style={{ color: 'white', opacity: 0.2, fontSize: 13, marginTop: 12 }}>No movie selected</Text>
              </View>
            )}
          </View>

          {/* Live Movie Chat Section */}
          {showChat && (
            <View style={{ height: 144, backgroundColor: '#09090e', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'space-between' }}>
              {/* Chat Feed */}
              <ScrollView ref={scrollViewRef} style={{ flex: 1, marginBottom: 6 }} showsVerticalScrollIndicator={false}>
                {messages.length === 0 ? (
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
                    💬 Be the first to comment on this movie!
                  </Text>
                ) : (
                  messages.map((m) => (
                    <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '700' }}>{m.senderName}:</Text>
                      <Text style={{ color: 'white', fontSize: 11, flex: 1 }}>{m.text}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Chat Input Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Say something about this movie..."
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={{ flex: 1, color: 'white', fontSize: 11, height: 32, paddingVertical: 0 }}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity onPress={handleSendMessage} disabled={!inputText.trim()} style={{ opacity: inputText.trim() ? 1 : 0.4 }}>
                  <Send size={15} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
