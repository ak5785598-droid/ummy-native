import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';
import { useDatabase } from '../firebase/provider';
import { WebRTCSignaling, RTC_CONFIG, SignalingOffer, SignalingAnswer, SignalingCandidate } from '../lib/webrtc-signaling';

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStreamTrack,
  mediaDevices,
} from 'react-native-webrtc';

function hashUidToNumber(uid: string): number {
  if (!uid) return 0;
  let hash = 5381;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 33) ^ uid.charCodeAt(i);
  }
  return (hash >>> 0);
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
  } catch (err) {
    console.warn('[WebRTC] Permission error:', err);
    return false;
  }
}

export function useWebRTCVoice(
  roomId: string | undefined,
  isInSeat: boolean,
  isMuted: boolean,
  uid: string | undefined,
  isSpeakerMuted: boolean = false,
  keepAlive: boolean = false
) {
  const database = useDatabase();
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [speakingUsers, setSpeakingUsers] = useState<Record<number, number>>({});

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<any>(null);
  const signalingRef = useRef<WebRTCSignaling | null>(null);
  const isMountedRef = useRef(true);
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;

  const speakingUsersRef = useRef<Record<number, number>>({});
  const lastSpeakingUpdateRef = useRef(0);

  useEffect(() => {
    if (!roomId || !uid) return;
    isMountedRef.current = true;

    const init = async () => {
      try {
        setConnectionState('CONNECTING');

        const hasMic = await requestMicPermission();
        if (!hasMic) {
          console.warn('[WebRTC] Mic permission denied');
          setConnectionState('DISCONNECTED');
          return;
        }

        const stream = await mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (!isMountedRef.current) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }

        localStreamRef.current = stream;

        if (!database) {
          console.error('[WebRTC] No Firebase database');
          setConnectionState('DISCONNECTED');
          return;
        }

        const signaling = new WebRTCSignaling(database, roomId, uid);
        signalingRef.current = signaling;

        await signaling.announcePresence();

        signaling.listenForUsers((users) => {
          if (!isMountedRef.current) return;
          const remoteUids = Object.keys(users).filter((u) => u !== uid);
          setRemoteUsers(remoteUids.map((u) => hashUidToNumber(u)));

          remoteUids.forEach((remoteUid) => {
            if (!peerConnectionsRef.current.has(remoteUid) && remoteUid > uid) {
              createOfferForPeer(remoteUid, signaling, stream);
            }
          });
        });

        signaling.listenForOffers(async (offer: SignalingOffer, from: string) => {
          if (!isMountedRef.current) return;
          await handleOffer(from, offer, signaling, stream);
        });

        signaling.listenForAnswers(async (answer: SignalingAnswer, from: string) => {
          if (!isMountedRef.current) return;
          const pc = peerConnectionsRef.current.get(from);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(answer.sdp));
            } catch (e) {
              console.warn('[WebRTC] Set remote desc error:', e);
            }
          }
        });

        signaling.listenForCandidates(async (cand: SignalingCandidate, from: string) => {
          if (!isMountedRef.current) return;
          const pc = peerConnectionsRef.current.get(from);
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand.candidate));
            } catch (e) {
              console.warn('[WebRTC] Add ICE candidate error:', e);
            }
          }
        });

        setConnectionState('CONNECTED');

        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: true,
        }).catch(() => {});
      } catch (e) {
        console.error('[WebRTC] Init failed:', e);
        setConnectionState('DISCONNECTED');
      }
    };

    init();

    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', (nextState: string) => {
      if (nextState === 'active') {
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: true,
        }).catch(() => {});
      }
    });

    return () => {
      isMountedRef.current = false;
      sub.remove();
      cleanup();
    };
  }, [roomId, uid]);

  const createOfferForPeer = async (
    remoteUid: string,
    signaling: WebRTCSignaling,
    stream: any
  ) => {
    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current.set(remoteUid, pc);

      stream.getTracks().forEach((track: any) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          signaling.sendCandidate(remoteUid, event.candidate.toJSON());
        }
      };

      pc.ontrack = (event: any) => {
        if (!isMountedRef.current) return;
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          remoteStream.getAudioTracks().forEach((track: any) => {
            track._setVolume(isSpeakerMuted ? 0 : 1);
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signaling.sendOffer(remoteUid, pc.localDescription?.toJSON() || offer);
    } catch (e) {
      console.warn('[WebRTC] Create offer error:', e);
    }
  };

  const handleOffer = async (
    from: string,
    offer: SignalingOffer,
    signaling: WebRTCSignaling,
    stream: any
  ) => {
    try {
      let pc = peerConnectionsRef.current.get(from);
      if (!pc) {
        pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionsRef.current.set(from, pc);

        stream.getTracks().forEach((track: any) => {
          pc!.addTrack(track, stream);
        });

        pc.onicecandidate = (event: any) => {
          if (event.candidate) {
            signaling.sendCandidate(from, event.candidate.toJSON());
          }
        };

        pc.ontrack = (event: any) => {
          if (!isMountedRef.current) return;
          if (event.streams && event.streams[0]) {
            const remoteStream = event.streams[0];
            remoteStream.getAudioTracks().forEach((track: any) => {
              track._setVolume(isSpeakerMuted ? 0 : 1);
            });
          }
        };
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signaling.sendAnswer(from, pc.localDescription?.toJSON() || answer);
    } catch (e) {
      console.warn('[WebRTC] Handle offer error:', e);
    }
  };

  const cleanup = async () => {
    peerConnectionsRef.current.forEach((pc) => {
      try { pc.close(); } catch {}
    });
    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t: any) => t.stop());
      localStreamRef.current = null;
    }

    if (signalingRef.current) {
      await signalingRef.current.clearSignalingData();
      await signalingRef.current.removeUserFromRoom();
      signalingRef.current = null;
    }

    setRemoteUsers([]);
    setConnectionState('DISCONNECTED');
  };

  useEffect(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    peerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      senders.forEach((sender: any) => {
        if (sender.track && sender.track.kind === 'audio') {
          const parameters = sender.getParameters();
          if (parameters.encodings) {
            parameters.encodings[0].active = isInSeat && !isMuted;
            sender.setParameters(parameters);
          }
        }
      });
    });
  }, [isInSeat, isMuted]);

  const getSpeakingIntensity = useCallback((targetUid: number): number => {
    return speakingUsers[targetUid] || 0;
  }, [speakingUsers]);

  return {
    remoteUsers,
    connectionState,
    isScreenSharing: false,
    startScreenShare: async () => {},
    stopScreenShare: async () => {},
    speakingUsers,
    getSpeakingIntensity,
  };
}
