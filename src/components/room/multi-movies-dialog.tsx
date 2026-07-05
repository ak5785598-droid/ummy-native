import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Dimensions, PanResponder, Animated, BackHandler } from 'react-native';
import { X, GripHorizontal, ChevronLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

const MULTIMOVIES_URL = 'https://multimovies.watch/';
const MULTIMOVIES_ALLOWED = ['multimovies.watch', 'multimovies.wtf'];

const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

interface MultiMoviesDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function MultiMoviesDialog({ visible, onClose }: MultiMoviesDialogProps) {
  const webViewRef = useRef<WebView>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [sourceUri, setSourceUri] = useState(MULTIMOVIES_URL);
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
    return () => {};
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
    const url = request.url.toLowerCase();
    const adDomains = ['doubleclick.net', 'googlesyndication', 'googleadservices', 'adskeeper', 'propellerads', 'popcash', 'popads', 'adsterra', 'monetag', 'exoclick', 'juicyads', 'trafficjunky', 'adsrvr.org', 'outbrain.com', 'taboola.com', 'criteo.com', 'adnxs.com', 'moatads.com', 'amazon-adsystem.com', 'facebook.net/tr', 'hotjar.com', 'clarity.ms', 'mixpanel.com', 'segment.com', 'branch.io', 'appsflyer.com', 'adjust.com', 'singular.net', 'instabug.com', 'bugsnag.com', 'sentry.io'];
    if (adDomains.some(d => url.includes(d))) {
      return false;
    }
    if (url.includes('about:blank') || url.startsWith('data:')) return true;
    return true;
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack || false);
    const url = (navState.url || '').toLowerCase();
    const adDomains = ['doubleclick.net', 'googlesyndication', 'googleadservices', 'adskeeper', 'propellerads', 'popcash', 'popads', 'adsterra', 'monetag', 'exoclick', 'juicyads', 'trafficjunky', 'adsrvr.org', 'outbrain.com', 'taboola.com', 'criteo.com', 'adnxs.com', 'moatads.com', 'amazon-adsystem.com', 'facebook.net/tr', 'hotjar.com', 'clarity.ms'];
    if (adDomains.some(d => url.includes(d))) {
      webViewRef.current?.stopLoading();
      webViewRef.current?.goBack();
    }
  };

  const handleLoadEnd = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        window.open = function() { return null; };
        window.alert = function() {};
        window.confirm = function() { return false; };

        var origCreate = document.createElement;
        document.createElement = function(tag) {
          var el = origCreate.call(document, tag);
          if (tag.toLowerCase() === 'script') {
            var origSetSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
            if (origSetSrc && origSetSrc.set) {
              Object.defineProperty(el, 'src', {
                set: function(val) {
                  if (val && (val.includes('oddlysicklyaccurate') || val.includes('adsboosters') || val.includes('revelationplaitmarshy'))) {
                    return;
                  }
                  origSetSrc.set.call(el, val);
                },
                get: function() { return origSetSrc.get.call(el); }
              });
            }
          }
          return el;
        };

        document.querySelectorAll('script[src]').forEach(function(s) {
          var src = s.src || '';
          if (src.includes('oddlysicklyaccurate') || src.includes('adsboosters') || src.includes('revelationplaitmarshy')) {
            s.remove();
          }
        });

        function cleanLinks() {
          document.querySelectorAll('a[target="_blank"]').forEach(function(el) { el.removeAttribute('target'); });
          document.querySelectorAll('a, div, button, img, span').forEach(function(el) {
            el.onclick = null;
            el.removeAttribute('onclick');
            el.onmousedown = null;
            el.removeAttribute('onmousedown');
          });
        }
        cleanLinks();

        document.addEventListener('click', function(e) {
          var el = e.target;
          for (var i = 0; i < 8 && el; i++) {
            var t = (el.textContent||'').trim().toLowerCase();
            if (t === 'download' || t === 'how to download' || t === 'how to download?' || t === 'download now') {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
            if (el.tagName === 'A') {
              var href = (el.href||'').toLowerCase();
              var bad = ['doubleclick','googlesyndication','googleadservices','adskeeper','propellerads','popcash','popads','adsterra','monetag','exoclick','adsrvr','outbrain','taboola','criteo','bit.ly','shorte','bc.vc','ouo.io','oddlysicklyaccurate','adsboosters','revelationplaitmarshy'];
              if (bad.some(function(d) { return href.includes(d); })) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }
            el = el.parentElement;
          }
        }, true);

        document.querySelectorAll('.module_home_ads, #block-42, #oscuridad').forEach(function(el) {
          el.style.display = 'none';
        });

        var running = false;
        function hideAll() {
          if (running) return;
          running = true;
          try {
            cleanLinks();
            document.querySelectorAll('.module_home_ads, #block-42, #oscuridad').forEach(function(el) {
              el.style.display = 'none';
            });
            document.querySelectorAll('img[alt="Multimovies"], img[alt="multimovies"]').forEach(function(el) {
              el.style.display = 'none';
            });
            document.querySelectorAll('.ancr-group, .ancr-wrap, .ancr-container, .ancr-content, .ancr-inner').forEach(function(el) {
              el.style.display = 'none';
            });
            document.querySelectorAll('a, button, div, span').forEach(function(el) {
              var t = (el.textContent||'').trim().toLowerCase();
              if (t === 'download' || t === 'how to download' || t === 'how to download?' || t === 'download now') {
                el.style.display = 'none';
              }
            });
            // Remove transparent ad overlays on top of video player
            document.querySelectorAll('div').forEach(function(el) {
              var cs = window.getComputedStyle(el);
              var r = el.getBoundingClientRect();
              // Transparent overlays with high z-index covering player area
              if ((cs.position === 'fixed' || cs.position === 'absolute') && parseInt(cs.zIndex) > 50 && r.width > 100 && r.height > 100) {
                var bg = cs.backgroundColor;
                var opacity = parseFloat(cs.opacity);
                // If transparent/semi-transparent overlay
                if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || opacity < 0.3 || bg.includes('rgba(0,0,0,0.')) {
                  el.style.pointerEvents = 'none';
                }
              }
            });
            // Remove onclick from all elements inside player/video area
            document.querySelectorAll('video, video ~ *, .plyr *, .jwplayer *, .plyr, .jwplayer, [class*="player"] *, [class*="Player"] *').forEach(function(el) {
              el.onclick = null;
              el.removeAttribute('onclick');
              el.onmousedown = null;
              el.removeAttribute('onmousedown');
              el.onmouseup = null;
              el.removeAttribute('onmouseup');
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
                  <ActivityIndicator size="large" color="#f59e0b" />
                </View>
              )}
            />
            {showOverlay && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12 }}>Loading MultiMovies...</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
