import { useEffect, useRef, useState, useCallback } from 'react';
import createAgoraRtcEngine, { IRtcEngine, ChannelProfileType, ClientRoleType, VideoSourceType } from 'react-native-agora';
import { Platform, PermissionsAndroid, AppState, AppStateStatus, NativeModules } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { doc, setDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-compat';
import { useFirestore } from '../firebase/provider';

const { VoiceForegroundService } = NativeModules;

function startVoiceService() {
  if (Platform.OS === 'android' && VoiceForegroundService) {
    try { VoiceForegroundService.startService(); } catch {}
  }
}

function stopVoiceService() {
  if (Platform.OS === 'android' && VoiceForegroundService) {
    try { VoiceForegroundService.stopService(); } catch {}
  }
}

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || 'cd76c7f91f144d4681e2002dc15db9ff';

// Module-level singleton: engine persists across screen mounts/unmounts
let singletonEngine: IRtcEngine | null = null;
let singletonRoomId: string | null = null;

async function requestMicPermission() {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Ummy Chat needs access to your microphone so you can speak in the room.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const perm = await Audio.requestPermissionsAsync();
      return perm.granted;
    }
  } catch (err) {
    return false;
  }
}

function hashUidToNumber(uid: string): number {
  if (!uid) return 0;
  let hash = 5381;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 33) ^ uid.charCodeAt(i);
  }
  return (hash >>> 0);
}

/**
 * Destroy the singleton engine completely (called on full exit, not minimize)
 */
export function destroyAgoraEngine() {
  if (singletonEngine) {
    try {
      singletonEngine.leaveChannel();
      singletonEngine.release();
    } catch {}
    singletonEngine = null;
    singletonRoomId = null;
    stopVoiceService();
  }
}

export function useAgoraNative(
  roomId: string | undefined, 
  isInSeat: boolean, 
  isMuted: boolean, 
  uid: string | undefined, 
  isSpeakerMuted: boolean = false
) {
  const firestore = useFirestore();
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Record<number, number>>({});
  const engineRef = useRef<IRtcEngine | null>(null);
  const speakingUsersRef = useRef<Record<number, number>>({});
  const lastSpeakingUpdateRef = useRef(0);

  useEffect(() => {
    if (!APP_ID || !roomId || !uid || APP_ID === 'dummy_id_replace_me') return;
    
    let isMounted = true;

    // Reuse existing singleton engine for same room
    if (singletonEngine && singletonRoomId === roomId) {
      engineRef.current = singletonEngine;
      setConnectionState('CONNECTED');
      return () => {
        isMounted = false;
      };
    }

    // CRITICAL: Always destroy old engine when roomId changes
    if (singletonEngine) {
      try { singletonEngine.leaveChannel(); singletonEngine.release(); } catch {}
      singletonEngine = null;
      singletonRoomId = null;
    }

    const init = async () => {
      try {
        await requestMicPermission();

        const engine = createAgoraRtcEngine();
        singletonEngine = engine;
        singletonRoomId = roomId;
        engineRef.current = engine;
        
        engine.initialize({ appId: APP_ID });
        engine.enableAudio();
        engine.adjustRecordingSignalVolume(100);
        engine.adjustPlaybackSignalVolume(100);
        engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
        engine.setClientRole(isInSeat ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience);
        engine.enableAudioVolumeIndication(200, 3, true);

        // Keep audio active in background on Expo/Android/iOS
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        }).catch(() => {});

        engine.registerEventHandler({
          onUserJoined: (connection, remoteUid) => {
            console.log('[Agora] User joined:', remoteUid);
            if (isMounted) setRemoteUsers((prev) => [...prev, remoteUid]);
          },
          onUserOffline: (connection, remoteUid) => {
            if (isMounted) setRemoteUsers((prev) => prev.filter((id) => id !== remoteUid));
          },
          onJoinChannelSuccess: () => {
            console.log('[Agora] Join channel SUCCESS');
            if (isMounted) setConnectionState('CONNECTED');
          },
          onConnectionFailed: (connection, reason) => {
            console.log('[Agora] Connection FAILED:', reason);
            if (isMounted) setConnectionState('DISCONNECTED');
          },
          onJoinChannelRejected: (connection, reason) => {
            console.log('[Agora] Join channel REJECTED:', reason);
            if (isMounted) setConnectionState('DISCONNECTED');
          },
          onError: (code, msg) => {
            console.log('[Agora] Error:', code, msg);
            // Service suspended / quota exceeded / invalid app id / connection error
            if ([101, 102, 109, 110, 119, 120, 1027, 1028].includes(code) || code < 0) {
              if (isMounted) setConnectionState('DISCONNECTED');
            }
          },
          onAudioVolumeIndication: (connection, speakers) => {
            if (isMounted && speakers) {
              const map: Record<number, number> = {};
              speakers.forEach(s => {
                if (s.uid !== undefined && s.volume !== undefined) {
                  map[s.uid] = s.volume;
                }
              });
              const now = Date.now();
              if (now - lastSpeakingUpdateRef.current >= 500) {
                lastSpeakingUpdateRef.current = now;
                speakingUsersRef.current = map;
              }
            }
          },
        });

        const numericUid = hashUidToNumber(uid);
        engine.joinChannel('', roomId, numericUid, {});
        startVoiceService();
      } catch (e) {
        console.error('[Agora] Initialization error:', e);
        if (isMounted) setConnectionState('DISCONNECTED');
      }
    };

    init();

    // Restore full audio session when app comes back from background (foreground)
    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', (nextState: string) => {
      if (nextState === 'active') {
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        }).catch(() => {});
        // Re-assert local audio capture in case it was suspended
        if (engineRef.current && isInSeat) {
          engineRef.current.enableAudio();
          engineRef.current.enableLocalAudio(!isMuted);
          engineRef.current.muteLocalAudioStream(isMuted);
        }
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [roomId, uid]);

  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (Object.keys(speakingUsersRef.current).length > 0) {
        setSpeakingUsers({...speakingUsersRef.current});
        speakingUsersRef.current = {};
      }
    }, 500);
    return () => clearInterval(flushInterval);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isInSeat) {
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      engine.enableLocalAudio(true);
      engine.muteLocalAudioStream(isMuted);
      engine.adjustRecordingSignalVolume(100);
      engine.adjustPlaybackSignalVolume(100);
    } else {
      engine.setClientRole(ClientRoleType.ClientRoleAudience);
      engine.muteLocalAudioStream(true);
      engine.enableLocalAudio(false);
    }
  }, [isInSeat, isMuted, connectionState]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.muteAllRemoteAudioStreams(isSpeakerMuted);
  }, [isSpeakerMuted]);

  // AppState resilience: maintain audio capture & playback when screen locks or app backgrounded
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        console.log('[Agora] Background/Lock — re-asserting continuous background audio');
        // 1) Re-assert audio session mode
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            allowsRecordingIOS: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            shouldDuckAndroid: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          });
        } catch {}
        // 2) Re-enable Agora engine audio + local mic capture
        if (engineRef.current) {
          try {
            engineRef.current.enableAudio();
            if (isInSeat) {
              engineRef.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
              engineRef.current.enableLocalAudio(!isMuted);
              engineRef.current.muteLocalAudioStream(isMuted);
            }
          } catch {}
          // 3) Delayed retry — Android may suspend briefly; re-assert after 1s
          setTimeout(() => {
            if (engineRef.current) {
              try {
                engineRef.current.enableAudio();
                if (isInSeat) {
                  engineRef.current.enableLocalAudio(!isMuted);
                  engineRef.current.muteLocalAudioStream(isMuted);
                }
              } catch {}
            }
          }, 1000);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isInSeat, isMuted]);

  const startScreenShare = useCallback(async () => {
    if (!engineRef.current || !roomId) return;
    try {
      engineRef.current.startScreenCapture({
        captureAudio: true,
        captureVideo: true,
      } as any);
      engineRef.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      setIsScreenSharing(true);

      if (firestore && roomId) {
        await setDoc(doc(firestore, 'chatRooms', roomId, 'features', 'screenShare'), {
          startedBy: uid,
          startedAt: serverTimestamp(),
          active: true,
        });
      }
    } catch (e) { }
  }, [roomId, uid, firestore]);

  const stopScreenShare = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      engineRef.current.stopScreenCapture();
      setIsScreenSharing(false);
      if (firestore && roomId) {
        await deleteDoc(doc(firestore, 'chatRooms', roomId, 'features', 'screenShare')).catch(() => {});
      }
    } catch (e) { }
  }, [roomId, firestore]);

  const getSpeakingIntensity = useCallback((targetUid: number): number => {
    return speakingUsers[targetUid] || 0;
  }, [speakingUsers]);

  return {
    remoteUsers,
    connectionState,
    engine: engineRef.current,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    speakingUsers,
    getSpeakingIntensity,
  };
}
