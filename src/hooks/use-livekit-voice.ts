import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

if (typeof (global as any).DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.EXPO_PUBLIC_LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.EXPO_PUBLIC_LIVEKIT_API_SECRET || '';

let lkModule: any = null;
let lkRoom: any = null;

async function loadLiveKit() {
  if (!lkModule) {
    try {
      lkModule = await import('livekit-client');
    } catch (e) {
      console.log('[LIVEKIT] Module load failed:', e);
      return null;
    }
  }
  return lkModule;
}

function hashUidToNumber(uid: string): number {
  let hash = 5381;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 33) ^ uid.charCodeAt(i);
  }
  return (hash >>> 0);
}

function generateToken(apiKey: string, apiSecret: string, identity: string, room: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400;

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: apiKey,
    sub: identity,
    identity,
    name: identity,
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    exp,
    nbf: now,
  }));

  const data = `${header}.${payload}`;

  let result = '';
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    const crypto = require('expo-crypto');
    const hmac = crypto.digestStringSync(
      crypto.CryptoDigestAlgorithm.SHA256,
      data,
      { key: apiSecret, encoding: crypto.CryptoEncoding.BASE64 }
    );
    result = `${data}.${hmac}`;
  } else {
    result = `${data}.dummy`;
  }
  return result;
}

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Ummy Chat needs microphone access for voice chat.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export function destroyLiveKitRoom() {
  if (lkRoom) {
    try {
      lkRoom.disconnect();
    } catch {}
    lkRoom = null;
  }
}

export function useLiveKitVoice(
  roomId: string | undefined,
  isInSeat: boolean,
  isMuted: boolean,
  uid: string | undefined,
  isSpeakerMuted: boolean = false,
  keepAlive: boolean = false
) {
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [speakingUsers, setSpeakingUsers] = useState<Record<number, number>>({});
  const roomRef = useRef<any>(null);
  const speakingUsersRef = useRef<Record<number, number>>({});
  const processedTracksRef = useRef<Set<string>>(new Set());
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;

  useEffect(() => {
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !roomId || !uid) return;
    if (connectionState === 'CONNECTED' || connectionState === 'CONNECTING') return;

    let cancelled = false;

    (async () => {
      try {
        setConnectionState('CONNECTING');

        const hasMic = await requestMicPermission();
        if (!hasMic || cancelled) {
          setConnectionState('DISCONNECTED');
          return;
        }

        const lk = await loadLiveKit();
        if (!lk || cancelled) {
          setConnectionState('DISCONNECTED');
          return;
        }

        const roomName = `room_${roomId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60)}`;
        const identity = `lk_${uid}`;
        const token = generateToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, identity, roomName);

        const room = new lk.Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        room.on(lk.RoomEvent.Connected, () => {
          if (cancelled) return;
          setConnectionState('CONNECTED');
          lkRoom = room;
          roomRef.current = room;
        });

        room.on(lk.RoomEvent.Disconnected, () => {
          if (cancelled) return;
          setConnectionState('DISCONNECTED');
          setRemoteUsers([]);
          processedTracksRef.current.clear();
        });

        room.on(lk.RoomEvent.TrackSubscribed, (track: any, pub: any, participant: any) => {
          if (cancelled) return;
          if (track.kind === lk.Track.Kind.Audio) {
            const trackId = pub.trackSid;
            if (processedTracksRef.current.has(trackId)) return;
            processedTracksRef.current.add(trackId);

            track.attach();

            const pUid = participant.identity?.replace('lk_', '') || '';
            const numUid = parseInt(pUid, 10) || hashUidToNumber(pUid);
            setRemoteUsers(prev => {
              if (prev.includes(numUid)) return prev;
              return [...prev, numUid];
            });
          }
        });

        room.on(lk.RoomEvent.TrackUnsubscribed, (track: any, pub: any, participant: any) => {
          const trackId = pub.trackSid;
          processedTracksRef.current.delete(trackId);
          track.detach();

          const pUid = participant.identity?.replace('lk_', '') || '';
          const numUid = parseInt(pUid, 10) || hashUidToNumber(pUid);
          setRemoteUsers(prev => prev.filter(u => u !== numUid));
        });

        room.on(lk.RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
          if (cancelled) return;
          const newSpeaking: Record<number, number> = {};
          for (const speaker of speakers) {
            const pUid = speaker.identity?.replace('lk_', '') || '';
            const numUid = parseInt(pUid, 10) || hashUidToNumber(pUid);
            newSpeaking[numUid] = Date.now();
          }
          speakingUsersRef.current = newSpeaking;
          setSpeakingUsers({ ...newSpeaking });
        });

        await room.connect(LIVEKIT_URL, token);

        if (cancelled) {
          await room.disconnect();
          return;
        }

        await room.localParticipant.setMicrophoneEnabled(!isMuted && !isSpeakerMuted);

      } catch (err) {
        console.log('[LIVEKIT] Connection error:', err);
        if (!cancelled) setConnectionState('DISCONNECTED');
      }
    })();

    return () => {
      cancelled = true;
      if (!keepAliveRef.current && roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch {}
        roomRef.current = null;
        lkRoom = null;
        setConnectionState('DISCONNECTED');
        setRemoteUsers([]);
        processedTracksRef.current.clear();
      }
    };
  }, [roomId, uid]);

  useEffect(() => {
    if (!roomRef.current || connectionState !== 'CONNECTED') return;
    try {
      roomRef.current.localParticipant?.setMicrophoneEnabled(!isMuted && !isSpeakerMuted);
    } catch {}
  }, [isMuted, isSpeakerMuted, connectionState]);

  useEffect(() => {
    return () => {
      if (!keepAliveRef.current && roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch {}
        roomRef.current = null;
        lkRoom = null;
      }
    };
  }, [roomId]);

  const startScreenShare = useCallback(async () => {}, []);
  const stopScreenShare = useCallback(async () => {}, []);
  const getSpeakingIntensity = useCallback((targetUid: number): number => {
    return speakingUsersRef.current[targetUid] || 0;
  }, []);

  return {
    remoteUsers,
    connectionState,
    engine: undefined,
    isScreenSharing: false,
    startScreenShare,
    stopScreenShare,
    speakingUsers,
    getSpeakingIntensity,
    activeProvider: 'livekit' as const,
  };
}
