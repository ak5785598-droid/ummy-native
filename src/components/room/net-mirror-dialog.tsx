import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Dimensions, PanResponder, Animated, BackHandler } from 'react-native';
import { X, GripHorizontal, ChevronLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

const NETMIRROR_URL = 'https://netmirror.global';
const NETMIRROR_ALLOWED = ['net27.cc', 'netmirror.global'];

const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

interface NetMirrorDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function NetMirrorDialog({ visible, onClose }: NetMirrorDialogProps) {
  const webViewRef = useRef<WebView>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [sourceUri, setSourceUri] = useState(NETMIRROR_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showOverlay) {
      loadTimer.current = setTimeout(() => setShowOverlay(false), 6000);
    }
    return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
  }, [showOverlay]);

  useEffect(() => {
    if (!visible) return;
    pollRef.current = setInterval(() => {
      if (!webViewRef.current) return;
      try {
        const currentUrl = (webViewRef.current as any).props?.source?.uri || '';
        if (currentUrl && !NETMIRROR_ALLOWED.some(d => currentUrl.includes(d)) && !currentUrl.includes('about:blank')) {
          webViewRef.current.stopLoading();
          setSourceUri(NETMIRROR_URL);
        }
      } catch {}
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [visible]);

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
  const playerHeight = Dimensions.get('window').height * 0.60;

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
    const url = request.url;
    if (
      NETMIRROR_ALLOWED.some(d => url.includes(d)) ||
      url === 'about:blank' ||
      url.startsWith('data:')
    ) {
      return true;
    }
    return false;
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack || false);
    if (
      navState.url &&
      !NETMIRROR_ALLOWED.some(d => navState.url.includes(d)) &&
      navState.url !== 'about:blank' &&
      !navState.url.startsWith('data:')
    ) {
      webViewRef.current?.stopLoading();
      setSourceUri(NETMIRROR_URL);
    }
  };

  const handleLoadEnd = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        var meta = document.querySelector('meta[name="viewport"]');
        if (meta) { meta.setAttribute('content', 'width=device-width, initial-scale=0.65, maximum-scale=1.0, user-scalable=no'); }
        var s = document.createElement('style');
        s.textContent = 'footer{display:none!important;}';
        document.head.appendChild(s);
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        var running = false;
        function hideAll() {
          if (running) return;
          running = true;
          try {
            document.querySelectorAll('a[href*="t.me"], a[href*="telegram"]').forEach(function(el) {
              var p = el.parentElement;
              if (p && p.parentElement) p = p.parentElement;
              if (p) p.style.display = 'none';
            });
            document.querySelectorAll('h1, h2, h3, a, span, button, div[role="button"]').forEach(function(el) {
              var t = (el.textContent||'').trim();
              if (t === 'Join our Telegram.' || t === 'Join our Telegram' || t === 'Download' || t === 'How To Download' || t === 'How to Download' || t === 'How to download' || t === 'NetMirror' || t === 'netmirror') {
                el.style.display = 'none';
              }
            });
            document.querySelectorAll('p, div, span').forEach(function(el) {
              var t = (el.textContent||'').trim();
              if (t === 'Ads will stop when the video is in full screen.' || t === 'Ads will stop when the video is in full screen') {
                el.parentElement.style.display = 'none';
              }
            });
            var el2 = document.querySelector('a[href*="netmirror"]');
            if (el2) { var np = el2.closest('header, nav, .header, .navbar'); if (np) np.style.display = 'none'; }
          } finally { running = false; }
        }

        hideAll();
        if (!window.__nmObs) {
          window.__nmObs = new MutationObserver(function() { setTimeout(hideAll, 500); });
          window.__nmObs.observe(document.body, { childList: true, subtree: true });
        }
      })();
      true;
    `);
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => setShowOverlay(false), 2000);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Animated.View
          style={{
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            width: playerWidth,
            height: playerHeight,
            backgroundColor: '#0f0f0f',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
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
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

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
              originWhitelist={['*']}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadEnd={handleLoadEnd}
              onError={(e) => {
                setShowOverlay(false);
              }}
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                  <ActivityIndicator size="large" color="#22c55e" />
                </View>
              )}
            />
            {showOverlay && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12 }}>Loading NetMirror...</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
