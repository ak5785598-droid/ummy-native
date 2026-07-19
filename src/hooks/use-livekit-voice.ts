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

  // Pure JS HMAC-SHA256 implementation to prevent native ExpoCrypto crashes
  const hmac = jsHmacSha256(data, apiSecret);
  return `${data}.${hmac}`;
}

function jsHmacSha256(message: string, secret: string): string {
  function sha256(ascii: string): number[] {
    function rightRotate(value: number, amount: number) {
      return (value >>> amount) | (value << (32 - amount));
    }
    
    const words: number[] = [];
    const asciiLength = ascii.length;
    for (let i = 0; i < asciiLength; i++) {
      words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
    }
    
    words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
    const wordsLength = ((asciiLength + 8) >> 6) * 16 + 14;
    words[wordsLength] = asciiLength * 8;
    
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    
    for (let i = 0; i < wordsLength; i += 16) {
      const w: number[] = [];
      for (let j = 0; j < 16; j++) w[j] = words[i + j] || 0;
      for (let j = 16; j < 64; j++) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let j = 0; j < 64; j++) {
        const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
        const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;
        
        h = g; g = f; f = e;
        e = (d + temp1) | 0;
        d = c; c = b; b = a;
        a = (temp1 + temp2) | 0;
      }
      
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    
    return [h0, h1, h2, h3, h4, h5, h6, h7];
  }

  const secretBytes = [];
  for (let i = 0; i < secret.length; i++) secretBytes.push(secret.charCodeAt(i));
  
  const blockBytes = 64;
  let keyBytes = [...secretBytes];
  if (keyBytes.length > blockBytes) {
    const hashed = sha256(secret);
    keyBytes = [];
    hashed.forEach(word => {
      keyBytes.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
    });
  }
  while (keyBytes.length < blockBytes) keyBytes.push(0);

  const ipad = keyBytes.map(b => b ^ 0x36);
  const opad = keyBytes.map(b => b ^ 0x5c);

  const ipadStr = ipad.map(b => String.fromCharCode(b)).join('') + message;
  const innerHash = sha256(ipadStr);
  
  const innerHashBytes: number[] = [];
  innerHash.forEach(word => {
    innerHashBytes.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  });
  
  const opadStr = opad.map(b => String.fromCharCode(b)).join('') + innerHashBytes.map(b => String.fromCharCode(b)).join('');
  const outerHash = sha256(opadStr);

  const outerHashBytes: number[] = [];
  outerHash.forEach(word => {
    outerHashBytes.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  });

  const base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let b64 = "";
  let i = 0;
  while (i < outerHashBytes.length) {
    const b0 = outerHashBytes[i++];
    const b1 = i < outerHashBytes.length ? outerHashBytes[i++] : NaN;
    const b2 = i < outerHashBytes.length ? outerHashBytes[i++] : NaN;
    
    const enc1 = b0 >> 2;
    const enc2 = ((b0 & 3) << 4) | (isNaN(b1) ? 0 : b1 >> 4);
    const enc3 = isNaN(b1) ? NaN : (((b1 & 15) << 2) | (isNaN(b2) ? 0 : b2 >> 6));
    const enc4 = isNaN(b2) ? NaN : b2 & 63;
    
    b64 += base64chars.charAt(enc1) + base64chars.charAt(enc2);
    if (!isNaN(enc3)) b64 += base64chars.charAt(enc3);
    if (!isNaN(enc4)) b64 += base64chars.charAt(enc4);
  }
  return b64.replace(/=/g, ""); // strip padding for JWT URL-safe base64
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
