import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';

const ZEGO_APP_ID = parseInt(process.env.EXPO_PUBLIC_ZEGO_APP_ID || '139273378', 10);
const ZEGO_APP_SIGN = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || '62ea7b1ae5eecd2075a8ccedf1701b7b013b982bba2264ac4987f3bb0926c868';

function hashUidToNumber(uid: string): number {
  if (!uid) return 0;
  let hash = 5381;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 33) ^ uid.charCodeAt(i);
  }
  return (hash >>> 0);
}

function hashRoomId(roomId: string): string {
  return `room_${roomId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 60)}`;
}

async function requestMicPermission(): Promise<boolean> {
  try {
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
  } catch {
    return false;
  }
}

let singletonEngine: any = null;
let singletonRoomId: string | null = null;

export function destroyZegoEngine() {
  if (singletonEngine) {
    try {
      const zegoRoomId = singletonRoomId ? hashRoomId(singletonRoomId) : '';
      if (zegoRoomId) {
        singletonEngine.logoutRoom(zegoRoomId);
      }
      singletonEngine.destroyEngine?.();
    } catch {}
    singletonEngine = null;
    singletonRoomId = null;
  }
}

export function useZegoCloudVoice(
  roomId: string | undefined,
  isInSeat: boolean,
  isMuted: boolean,
  uid: string | undefined,
  isSpeakerMuted: boolean = false
) {
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [speakingUsers, setSpeakingUsers] = useState<Record<number, number>>({});
  const engineRef = useRef<any>(null);
  const speakingUsersRef = useRef<Record<number, number>>({});
  const processedStreamsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ZEGO_APP_ID || !ZEGO_APP_SIGN || !roomId || !uid) return;
    // Remove early return guard — room change needs to re-join

    let cancelled = false;

    (async () => {
      try {
        setConnectionState('CONNECTING');

        const hasMic = await requestMicPermission();
        if (!hasMic || cancelled) {
          setConnectionState('DISCONNECTED');
          return;
        }

        // Lazy load native module — wrapped in try-catch to prevent native crash killing React
        let ZegoModule: any;
        try {
          ZegoModule = require('zego-express-engine-reactnative');
        } catch (e) {
          console.log('[ZEGO] Native module not available:', e);
          if (!cancelled) setConnectionState('DISCONNECTED');
          return;
        }
        const ZegoExpressEngine = ZegoModule?.default;
        if (!ZegoExpressEngine) {
          console.log('[ZEGO] ZegoExpressEngine default export not found');
          if (!cancelled) setConnectionState('DISCONNECTED');
          return;
        }
        const { ZegoScenario, ZegoRoomState, ZegoEngineProfile, ZegoRoomConfig, ZegoPublishChannel } = ZegoModule || {};

        let engine: any;
        // Always logout from old room first if engine exists
        if (singletonEngine) {
          engine = singletonEngine;
          try {
            const oldRoomId = singletonRoomId ? hashRoomId(singletonRoomId) : '';
            if (oldRoomId) await engine.logoutRoom(oldRoomId);
          } catch {}
        } else {
          try {
            const profile = new ZegoEngineProfile(ZEGO_APP_ID, ZEGO_APP_SIGN, ZegoScenario.StandardChatroom);
            engine = await ZegoExpressEngine.createEngineWithProfile(profile);
            singletonEngine = engine;
          } catch (e) {
            console.log('[ZEGO] Engine creation failed (non-fatal):', e);
            if (!cancelled) setConnectionState('DISCONNECTED');
            return;
          }
        }
        engineRef.current = engine;

        if (cancelled) return;

        engine.on('roomStateUpdate', (roomID: string, state: any) => {
          if (cancelled) return;
          console.log('[ZEGO] roomStateUpdate:', roomID, 'state:', state, '(3=Connected, 0=Disconnected)');
          if (state === ZegoRoomState.Connected) {
            setConnectionState('CONNECTED');
            singletonRoomId = roomID;
          } else if (state === ZegoRoomState.Disconnected) {
            setConnectionState('DISCONNECTED');
          }
        });

        engine.on('roomStreamUpdate', async (_roomID: string, updateType: number, streamList: any[]) => {
          if (cancelled) return;
          console.log('[ZEGO] roomStreamUpdate: type=' + updateType + ' streams=' + streamList.length);
          if (updateType === 1) {
            for (const stream of streamList) {
              const streamUid = parseInt(stream.streamID.split('_')[1] || '0', 10);
              if (streamUid === hashUidToNumber(uid || '')) continue;
              if (processedStreamsRef.current.has(stream.streamID)) continue;
              processedStreamsRef.current.add(stream.streamID);

              try {
                await engine.startPlayingStream(stream.streamID, undefined, undefined);
              } catch (e) {
                console.log('[ZEGO] Failed to play stream:', stream.streamID, e);
              }

              setRemoteUsers(prev => {
                if (prev.includes(streamUid)) return prev;
                return [...prev, streamUid];
              });
            }
          } else if (updateType === 0) {
            for (const stream of streamList) {
              const streamUid = parseInt(stream.streamID.split('_')[1] || '0', 10);
              try {
                await engine.stopPlayingStream(stream.streamID);
              } catch {}
              processedStreamsRef.current.delete(stream.streamID);
              setRemoteUsers(prev => prev.filter(u => u !== streamUid));
              speakingUsersRef.current[streamUid] = 0;
            }
          }
        });

        engine.on('roomUserUpdate', () => {});

        // Sound level monitoring for speaking indicator (green button)
        try {
          await engine.enableSoundLevelMonitor(true, 200);
        } catch {}

        engine.on('capturedSoundLevelUpdate', (soundLevel: number) => {
          if (cancelled) return;
          const myUid = hashUidToNumber(uid || '');
          speakingUsersRef.current = { ...speakingUsersRef.current, [myUid]: soundLevel };
          if (soundLevel > 5) {
            setSpeakingUsers(prev => ({ ...prev, [myUid]: soundLevel }));
          } else {
            setSpeakingUsers(prev => {
              const next = { ...prev };
              delete next[myUid];
              return next;
            });
          }
        });

        engine.on('remoteSoundLevelUpdate', (soundLevels: Record<string, number>) => {
          if (cancelled) return;
          const updated = { ...speakingUsersRef.current };
          for (const [streamID, level] of Object.entries(soundLevels)) {
            const remoteUid = parseInt(streamID.split('_')[1] || '0', 10);
            if (remoteUid === hashUidToNumber(uid || '')) continue;
            updated[remoteUid] = level;
            if (level > 5) {
              setSpeakingUsers(prev => ({ ...prev, [remoteUid]: level }));
            } else {
              setSpeakingUsers(prev => {
                const next = { ...prev };
                delete next[remoteUid];
                return next;
              });
            }
          }
          speakingUsersRef.current = updated;
        });

        const zegoRoomId = hashRoomId(roomId);
        console.log('[ZEGO] Logging into room:', zegoRoomId, 'userID: zego_' + uid, 'isInSeat:', isInSeat, 'isMuted:', isMuted);
        const roomConfig = new ZegoRoomConfig(0, true, '');
        await engine.loginRoom(zegoRoomId, {
          userID: `zego_${uid}`,
          userName: uid || 'User',
        }, roomConfig);
        singletonRoomId = roomId;
        console.log('[ZEGO] loginRoom completed successfully');

        if (cancelled) return;

        const streamID = `stream_${hashUidToNumber(uid || '')}`;
        await engine.muteAllPlayStreamAudio(isSpeakerMuted);

        if (isInSeat) {
          console.log('[ZEGO] User is in seat — enabling audio, unmuting, publishing stream:', streamID);
          await engine.enableAudioCaptureDevice(true);
          await engine.muteMicrophone(isMuted);
          await engine.mutePublishStreamAudio(isMuted, ZegoPublishChannel.Main);
          await engine.startPublishingStream(streamID, ZegoPublishChannel.Main, undefined);
          console.log('[ZEGO] startPublishingStream called successfully');
        } else {
          console.log('[ZEGO] User NOT in seat — muting mic');
          await engine.muteMicrophone(true);
          await engine.mutePublishStreamAudio(true, ZegoPublishChannel.Main);
        }

      } catch (err) {
        console.log('[ZEGO] Connection error:', err);
        if (!cancelled) setConnectionState('DISCONNECTED');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, uid, isInSeat, isMuted, isSpeakerMuted]);

  useEffect(() => {
    if (!engineRef.current || connectionState !== 'CONNECTED') return;
    console.log('[ZEGO] State update useEffect firing: isInSeat=' + isInSeat + ' isMuted=' + isMuted + ' isSpeakerMuted=' + isSpeakerMuted);
    try {
      const ZegoModule = require('zego-express-engine-reactnative');
      const { ZegoPublishChannel } = ZegoModule;
      const engine = engineRef.current;
      const streamID = `stream_${hashUidToNumber(uid || '')}`;

      engine.muteAllPlayStreamAudio(isSpeakerMuted).catch(() => {});

      if (isInSeat) {
        engine.enableAudioCaptureDevice(true).catch(() => {});
        engine.muteMicrophone(isMuted).catch(() => {});
        engine.mutePublishStreamAudio(isMuted, ZegoPublishChannel.Main).catch(() => {});
        engine.startPublishingStream(streamID, ZegoPublishChannel.Main, undefined).catch(() => {});
      } else {
        engine.muteMicrophone(true).catch(() => {});
        engine.mutePublishStreamAudio(true, ZegoPublishChannel.Main).catch(() => {});
        engine.stopPublishingStream(streamID, ZegoPublishChannel.Main).catch(() => {});
      }
    } catch {}
  }, [isInSeat, isMuted, isSpeakerMuted, connectionState, uid]);

  useEffect(() => {
    return () => {
      // Engine persistence is handled by component-level cleanup in [id].tsx
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
    activeProvider: 'zego' as const,
  };
}
