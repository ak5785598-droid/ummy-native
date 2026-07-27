import { useEffect, useRef, useState, useCallback } from 'react';
import createAgoraRtcEngine, { IRtcEngine, ChannelProfileType, ClientRoleType, VideoSourceType } from 'react-native-agora';
import { Platform, PermissionsAndroid, AppState, AppStateStatus, NativeModules } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { doc, setDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-compat';
import { useFirestore } from '../firebase/provider';
import { getRtcToken } from '../lib/agora-token';

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
const APP_CERTIFICATE = 'a5f1c37c7b47428ca68a86dab48464a2';

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
        const micGranted = await requestMicPermission();
        console.log('[Agora] Mic permission:', micGranted ? 'GRANTED' : 'DENIED');

        const engine = createAgoraRtcEngine();
        singletonEngine = engine;
        singletonRoomId = roomId;
        engineRef.current = engine;
        
        engine.initialize({ appId: APP_ID });
        engine.enableAudio();
        engine.adjustRecordingSignalVolume(100);
        engine.adjustPlaybackSignalVolume(100);
        // Use Communication mode — all users see each other via onUserJoined.
        // In Live Broadcasting mode, audience members are INVISIBLE to each other,
        // so onUserJoined never fires and audio subscription never happens.
        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.enableAudioVolumeIndication(200, 3, true);

        // Route to loudspeaker by default
        try { engine.setEnableSpeakerphone(true); } catch {}

        // Set audio mode for voice — DO NOT use DoNotMix as it steals audio focus from Agora
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
          onJoinChannelSuccess: (connection, elapsed) => {
            console.log('[Agora] Join channel SUCCESS, elapsed:', elapsed);
            if (isMounted) {
              setConnectionState('CONNECTED');
              // ONLY ensure speaker is on and remote audio is unmuted.
              // DO NOT override role/publishMicrophoneTrack here — the isInSeat
              // useEffect is the single source of truth for publishing state.
              // Overriding here causes race conditions with the seat effect.
              try {
                engine.setEnableSpeakerphone(true);
                engine.muteAllRemoteAudioStreams(false);
                engine.adjustPlaybackSignalVolume(100);
                console.log('[Agora] Post-join: speaker ON, remote audio UNMUTED');
              } catch (e) {
                console.log('[Agora] Post-join setup error:', e);
              }
            }
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
            if (isMounted && speakers && speakers.length > 0) {
              const map: Record<number, number> = {};
              speakers.forEach(s => {
                if (s.uid !== undefined && s.volume !== undefined && s.volume > 0) {
                  map[s.uid] = s.volume;
                }
              });
              const now = Date.now();
              if (now - lastSpeakingUpdateRef.current >= 200) {
                lastSpeakingUpdateRef.current = now;
                speakingUsersRef.current = map;
                if (Object.keys(map).length > 0) {
                  console.log('[Agora] Volume:', Object.entries(map).map(([k,v]) => `${k}:${v}`).join(', '));
                }
              }
            }
          },
        });

        const numericUid = hashUidToNumber(uid);
        console.log('[Agora] Channel:', roomId, 'NumericUID:', numericUid);

        // DIAGNOSTIC: Try empty token first (test mode) vs server token (secure mode)
        // Error 110 = token invalid. If empty "" works → project is in TEST mode
        let token = '';
        try {
          token = await getRtcToken(APP_ID, APP_CERTIFICATE, roomId!, numericUid);
          console.log('[Agora] Token (first 20 chars):', token.substring(0, 20));
        } catch (tokenErr) {
          console.warn('[Agora] Token fetch failed, trying without token:', tokenErr);
        }

        console.log('[Agora] Joining with token length:', token.length, '| UID:', numericUid, '| InSeat:', isInSeat);
        // Communication mode: everyone is visible → onUserJoined fires for all → audio subscription works
        // Mic is OFF until user takes a seat (publishMicrophoneTrack: false)
        engine.joinChannel(token, roomId, numericUid, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          publishMicrophoneTrack: false,  // mic off until seat taken — isInSeat effect enables it
          autoSubscribeAudio: true,       // always receive ALL other users' audio
          publishCameraTrack: false,
          autoSubscribeVideo: false,
        });
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

      // CRITICAL: Always leave AND release the Agora channel when room component unmounts
      // Without release(), createAgoraRtcEngine() returns same undestroyed instance next time
      if (singletonEngine) {
        try {
          singletonEngine.muteLocalAudioStream(true);
          singletonEngine.enableLocalAudio(false);
          singletonEngine.leaveChannel();
          singletonEngine.release(); // ← MUST call release() to fully destroy engine
        } catch {}
        // Stop foreground service — mic no longer needed
        stopVoiceService();
        // Reset singleton so next room creates a fresh engine
        singletonEngine = null;
        singletonRoomId = null;
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
    const engine = engineRef.current || singletonEngine;
    if (!engine) return;
    console.log('[Agora] isInSeat effect:', { isInSeat, isMuted, hasEngine: !!engine });
    if (isInSeat) {
      // Seat taken: enable mic and publish audio
      // No role switching needed in Communication mode — just control the mic
      engine.enableLocalAudio(true);
      engine.muteLocalAudioStream(isMuted);
      engine.muteAllRemoteAudioStreams(false);
      engine.adjustRecordingSignalVolume(100);
      engine.adjustPlaybackSignalVolume(100);
      engine.setEnableSpeakerphone(true);
      engine.updateChannelMediaOptions({
        publishMicrophoneTrack: !isMuted,  // publish mic when seated + not muted
        autoSubscribeAudio: true,
        publishCameraTrack: false,
      });
      console.log('[Agora] Seat taken: mic ON, publishing audio');
    } else {
      // No seat: mute mic, keep receiving all remote audio
      engine.muteLocalAudioStream(true);
      engine.enableLocalAudio(false);
      engine.muteAllRemoteAudioStreams(false);  // always hear others
      engine.adjustPlaybackSignalVolume(100);
      engine.setEnableSpeakerphone(true);
      engine.updateChannelMediaOptions({
        publishMicrophoneTrack: false,  // don't publish when not seated
        autoSubscribeAudio: true,
        publishCameraTrack: false,
      });
      console.log('[Agora] No seat: mic OFF, still receiving all remote audio');
    }
  }, [isInSeat, isMuted]);


  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || connectionState !== 'CONNECTED') return;
    // Mute/unmute all remote streams when speaker toggle changes OR when engine connects
    engine.muteAllRemoteAudioStreams(isSpeakerMuted);
    // Also set playback volume to 0 as secondary enforcement
    engine.adjustPlaybackSignalVolume(isSpeakerMuted ? 0 : 100);
  }, [isSpeakerMuted, connectionState]);


  // AppState resilience: maintain audio capture & playback when screen locks or app backgrounded
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Screen off / background — DO NOT call Audio.setAudioModeAsync here!
        // Re-calling with DoNotMix interrupts Bluetooth and forces speaker routing.
        // The foreground service keeps audio alive; just maintain mic state.
        if (engineRef.current && isInSeat) {
          try {
            // Only update mic state — do NOT call enableAudio() as it resets routing
            engineRef.current.enableLocalAudio(!isMuted);
            engineRef.current.muteLocalAudioStream(isMuted);
            // Re-assert loudspeaker routing when coming back from background
            engineRef.current.setEnableSpeakerphone(true);
          } catch {}
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
