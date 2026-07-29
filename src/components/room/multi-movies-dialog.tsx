import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Dimensions, PanResponder, Animated, BackHandler, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X, GripHorizontal, ChevronLeft, MessageSquare, Send } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

const MIRRORS = [
  'https://multimovies.study/',
  'https://multimovies.place/',
  'https://multimovies.net.in/',
];

const MULTIMOVIES_URL = MIRRORS[0];

const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

interface MultiMoviesDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  isOwner?: boolean;
  userId?: string;
  username?: string;
}

export function MultiMoviesDialog({ visible, onClose, roomId, isOwner, userId, username }: MultiMoviesDialogProps) {
  const webViewRef = useRef<WebView>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [mirrorIndex, setMirrorIndex] = useState(0);
  const [sourceUri, setSourceUri] = useState(MIRRORS[0]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [watchers, setWatchers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && isOwner && roomId) {
      try {
        const db = require('@react-native-firebase/firestore').default;
        db().collection('chatRooms').doc(roomId).update({
          currentMovie: {
            title: 'Movie Stream',
            hubType: 'hub3',
            startedAt: Date.now(),
          }
        }).catch(() => {
          db().collection('chatRooms').doc(roomId).set({
            currentMovie: {
              title: 'Movie Stream',
              hubType: 'hub3',
              startedAt: Date.now(),
            }
          }, { merge: true }).catch(() => {});
        });
      } catch (e) {}
    }
  }, [visible, isOwner, roomId]);


  // Watchers & Chat Listeners
  useEffect(() => {
    if (!visible || !roomId || !userId) return;
    try {
      const db = require('@react-native-firebase/firestore').default;
      const watcherRef = db().collection('chatRooms').doc(roomId).collection('movieWatchers').doc(userId);
      watcherRef.set({ uid: userId, username: username || 'User', joinedAt: Date.now() }, { merge: true }).catch(() => {});


      const unsubWatchers = db().collection('chatRooms').doc(roomId).collection('movieWatchers').onSnapshot((snap: any) => {
        if (snap) setWatchers(snap.docs.map((d: any) => d.data()));
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

  useEffect(() => {
    if (showOverlay) {
      loadTimer.current = setTimeout(() => setShowOverlay(false), 6000);
    }
    return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
  }, [showOverlay]);

  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        onClose();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [visible, canGoBack, onClose]);

  const { width: screenWidth } = Dimensions.get('window');
  const playerWidth = screenWidth;
  const playerHeight = Dimensions.get('window').height * (showChat ? 0.72 : 0.60);

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
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const handleShouldStartLoad = (request: any) => {
    const url = request.url.toLowerCase();
    const adDomains = ['doubleclick.net', 'googlesyndication', 'googleadservices', 'adskeeper', 'propellerads', 'popcash', 'popads', 'adsterra', 'monetag', 'exoclick', 'juicyads', 'trafficjunky'];
    if (adDomains.some(d => url.includes(d))) {
      return false;
    }
    return true;
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack || false);
    const url = (navState.url || '').toLowerCase();
    const adDomains = ['doubleclick.net', 'googlesyndication', 'googleadservices', 'adskeeper', 'propellerads', 'popcash', 'popads', 'adsterra', 'monetag'];
    if (adDomains.some(d => url.includes(d))) {
      webViewRef.current?.stopLoading();
      webViewRef.current?.goBack();
    }
  };

  const handleLoadEnd = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        window.open = function() { return null; };
        if (!document.getElementById('__mmStyle')) {
          var s = document.createElement('style');
          s.id = '__mmStyle';
          s.textContent = 'footer, .ad, .ads, [class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"], [class*="logo"], [id*="logo"], header a[href="/"], .navbar-brand { display: none !important; visibility: hidden !important; }';
          document.head.appendChild(s);
        }
        var running = false;
        function hideAll() {
          if (running) return;
          running = true;
          try {
            window.open = function() { return null; };
            // Hide MultiMovies text, logo & Red Join Telegram channel header banner
            document.querySelectorAll('header *, nav *, [class*="header"] *, [class*="logo"] *, a, p, div, span').forEach(function(el) {
              var txt = (el.textContent || '').trim().toLowerCase();
              if (txt === 'multimovies' || txt === 'multi movies' || txt === 'multimovies.watch' || txt === 'multimovies.study') {
                el.style.display = 'none';
                if (el.parentElement && el.parentElement.tagName === 'A') {
                  el.parentElement.style.display = 'none';
                }
              }
              if (txt.includes('join our telegram') || txt.includes('telegram channel') || (el.getAttribute('href')||'').includes('t.me')) {
                el.style.display = 'none';
              }
            });
          } finally { running = false; }
        }
        hideAll();
        if (!window.__mmObs) {
          window.__mmObs = new MutationObserver(function() { setTimeout(hideAll, 500); });
          window.__mmObs.observe(document.body, { childList: true, subtree: true });
        }
      })();
      true;
    `);
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => setShowOverlay(false), 2000);
  };


  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Animated.View
          style={{
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            width: playerWidth,
            height: playerHeight,
            backgroundColor: '#0f0f0f',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justify: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: '#0c0c14',
              borderBottomWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View {...panResponder.panHandlers} style={{ paddingHorizontal: 6, paddingVertical: 4, marginRight: 2 }}>
                <GripHorizontal size={18} color="rgba(255,255,255,0.5)" />
              </View>
              {canGoBack && (
                <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={{ padding: 4 }}>
                  <ChevronLeft size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              )}
              <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>Movie Hub 3</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity 
                onPress={() => {
                  const names = watchers.map((w: any) => w.username || 'User').join('\n• ');
                  Alert.alert('Live Watchers 👁️', watchers.length > 0 ? `Currently Watching (${watchers.length}):\n\n• ${names}` : 'You are the only one watching right now.');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 4, gap: 4, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' }}
              >
                <Text style={{ color: '#60a5fa', fontSize: 10, fontWeight: '800' }}>👁️ {Math.max(1, watchers.length)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowChat(!showChat)} style={{ padding: 5, backgroundColor: showChat ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', borderRadius: 8, marginRight: 4 }}>
                <MessageSquare size={15} color={showChat ? '#60a5fa' : 'rgba(255,255,255,0.6)'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Player View */}
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <WebView
              ref={webViewRef}
              key={sourceUri}
              source={{ uri: sourceUri }}
              style={{ flex: 1, backgroundColor: 'black' }}
              userAgent={MOBILE_USER_AGENT}
              startInLoadingState
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              javaScriptCanOpenWindowsAutomatically={false}
              javaScriptEnabled
              domStorageEnabled
              allowsBackForwardNavigationGestures
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              mixedContentMode="always"
              injectedJavaScriptBeforeContentLoaded={`
                (function() {
                  var style = document.createElement('style');
                  style.innerHTML = 'footer, .ad, .ads, [class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"], [class*="logo"], [id*="logo"], header a[href="/"], .navbar-brand, a[href*="t.me"], a[href*="telegram"] { display: none !important; visibility: hidden !important; opacity: 0 !important; }';
                  (document.head || document.documentElement).appendChild(style);
                })();
                true;
              `}
              originWhitelist={['*']}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadEnd={handleLoadEnd}
              onError={() => {
                setShowOverlay(false);
                if (mirrorIndex < MIRRORS.length - 1) {
                  const nextIdx = mirrorIndex + 1;
                  setMirrorIndex(nextIdx);
                  setSourceUri(MIRRORS[nextIdx]);
                }
              }}
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                  <ActivityIndicator size="large" color="#f59e0b" />
                </View>
              )}
            />
            {showOverlay && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12 }}>Loading Movie Hub 3...</Text>
              </View>
            )}
          </View>

          {/* Live Chat Drawer */}
          {showChat && (
            <View style={{ height: 130, backgroundColor: '#09090e', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'space-between' }}>
              <ScrollView ref={scrollViewRef} style={{ flex: 1, marginBottom: 4 }} showsVerticalScrollIndicator={false}>
                {messages.length === 0 ? (
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
                    💬 Say something about this movie!
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
