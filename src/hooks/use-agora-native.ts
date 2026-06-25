import { useEffect, useRef, useState, useCallback } from 'react';
import createAgoraRtcEngine, { IRtcEngine, ChannelProfileType, ClientRoleType, VideoSourceType } from 'react-native-agora';
import { Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';
import { doc, setDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-compat';
import { useFirestore } from '../firebase/provider';

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || 'b63172cb1555417ba90145c91b350578';

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
    console.warn('[Agora Native] Permission request error:', err);
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
  }
}

export function useAgoraNative(
  roomId: string | undefined, 
  isInSeat: boolean, 
  isMuted: boolean, 
  uid: string | undefined, 
  isSpeakerMuted: boolean = false,
  keepAlive: boolean = false
) {
  const firestore = useFirestore();
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Record<number, number>>({});
  const engineRef = useRef<IRtcEngine | null>(null);
  const speakingUsersRef = useRef<Record<number, number>>({});
  const lastSpeakingUpdateRef = useRef(0);
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;

  useEffect(() => {
    if (!APP_ID || !roomId || !uid || APP_ID === 'dummy_id_replace_me') return;
    
    let isMounted = true;

    // Reuse existing singleton engine for same room
    if (singletonEngine && singletonRoomId === roomId) {
      engineRef.current = singletonEngine;
      setConnectionState('CONNECTED');
      return () => {
        isMounted = false;
        if (!keepAliveRef.current) {
          destroyAgoraEngine();
          engineRef.current = null;
        }
      };
    }

    // Destroy any stale engine from different room
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
        engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
        engine.setClientRole(isInSeat ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience);
        engine.enableAudioVolumeIndication(200, 3, true);

        engine.registerEventHandler({
          onUserJoined: (connection, remoteUid) => {
            if (isMounted) setRemoteUsers((prev) => [...prev, remoteUid]);
          },
          onUserOffline: (connection, remoteUid) => {
            if (isMounted) setRemoteUsers((prev) => prev.filter((id) => id !== remoteUid));
          },
          onJoinChannelSuccess: () => {
            if (isMounted) setConnectionState('CONNECTED');
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
                setSpeakingUsers({...map});
              } else {
                speakingUsersRef.current = map;
              }
            }
          }
        });

        engine.enableAudio();

        // Configure audio session for background — user ki voice room me jaye jab app background ho
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: true,
        }).catch(() => {});

        const numericUid = hashUidToNumber(uid);
        
        engine.muteLocalAudioStream(isMuted);

        engine.joinChannel('', roomId, numericUid, {
            clientRoleType: isInSeat ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience
        });

        setConnectionState('CONNECTING');
      } catch (e) {
        console.error('[Agora Native] Init failed:', e);
      }
    };

    init();

    // Restore audio session when app comes back from background
    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', (nextState: string) => {
      if (nextState === 'active') {
        // App foreground me aaya — audio session restore karo
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: true,
        }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
      if (!keepAliveRef.current) {
        destroyAgoraEngine();
        engineRef.current = null;
      }
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
      engine.muteLocalAudioStream(isMuted);
      engine.enableLocalAudio(!isMuted);
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
    } catch (e) { console.error('[ScreenShare] Start error:', e); }
  }, [roomId, uid, firestore]);

  const stopScreenShare = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      engineRef.current.stopScreenCapture();
      setIsScreenSharing(false);
      if (firestore && roomId) {
        await deleteDoc(doc(firestore, 'chatRooms', roomId, 'features', 'screenShare')).catch(() => {});
      }
    } catch (e) { console.error('[ScreenShare] Stop error:', e); }
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
