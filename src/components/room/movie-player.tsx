import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Dimensions, PanResponder, Animated } from 'react-native';
import { X, Film, GripHorizontal } from 'lucide-react-native';
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
}

export function MoviePlayer({ visible, onClose, tmdbId, title, mediaType, season, episode }: MoviePlayerProps) {
  const webViewRef = useRef<WebView>(null);
  
  const { width: screenWidth } = Dimensions.get('window');
  const playerWidth = screenWidth; // Edge-to-edge full width
  const videoViewportHeight = playerWidth * (9 / 16); // Restore to standard 16:9 ratio
  const playerCardHeight = videoViewportHeight + 46; // Header offset

  // Draggable position state using Animated ValueXY
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
    // Allow the original stream URL and its internal api endpoints (vidlink.pro or vidsrc)
    if (
      url.includes('vidlink.pro') ||
      url.includes('vidsrc') ||
      url === 'about:blank' ||
      url === videoUrl
    ) {
      return true;
    }
    // Block any other domains (advertisers, popups, redirects) from loading or launching external apps
    return false;
  };

  const handleNavigationStateChange = (navState: any) => {
    // Fallback: If any redirect slips through and changes the loaded URL
    if (
      navState.url &&
      videoUrl &&
      !navState.url.includes('vidlink.pro') &&
      !navState.url.includes('vidsrc') &&
      navState.url !== 'about:blank'
    ) {
      webViewRef.current?.stopLoading();
      webViewRef.current?.injectJavaScript(`window.location.href = "${videoUrl}";`);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0c0c14', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {/* Drag Handle Icon - PanResponder binded specifically here */}
              <View {...panResponder.panHandlers} style={{ paddingHorizontal: 6, paddingVertical: 4, marginRight: 2 }}>
                <GripHorizontal size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold', flex: 1 }} numberOfLines={1}>{title || 'Movie'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={18} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <View style={{ flex: 1, backgroundColor: 'black' }}>
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
        </Animated.View>
      </View>
    </Modal>
  );
}
