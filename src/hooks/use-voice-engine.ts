import { useRef, useState, useEffect, useCallback } from 'react';
import { useAgoraNative, destroyAgoraEngine } from './use-agora-native';
import { useWebRTCVoice } from './use-webrtc-voice';
import { useZegoCloudVoice, destroyZegoEngine } from './use-zegocloud-voice';
import { useLiveKitVoice, destroyLiveKitRoom } from './use-livekit-voice';

type VoiceProvider = 'agora' | 'zego' | 'livekit' | 'webrtc';

interface UseVoiceEngineProps {
  roomId: string | undefined;
  isInSeat: boolean;
  isMuted: boolean;
  uid: string | undefined;
  isSpeakerMuted?: boolean;
  keepAlive?: boolean;
}

export function useVoiceEngine({
  roomId,
  isInSeat,
  isMuted,
  uid,
  isSpeakerMuted = false,
  keepAlive = false,
}: UseVoiceEngineProps) {
  const [activeProvider, setActiveProvider] = useState<VoiceProvider | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  const agoraHook = useAgoraNative(roomId, isInSeat, isMuted, uid, isSpeakerMuted, keepAlive);
  const webrtcHook = useWebRTCVoice(roomId, isInSeat, isMuted, uid, isSpeakerMuted, keepAlive);

  // ZegoCloud DISABLED — native module crashes React instance in release builds (prefix of null)
  const zegoHook = useZegoCloudVoice(undefined, false, true, undefined, true, false);

  // LiveKit enabled — DOMException polyfilled in use-livekit-voice.ts
  const [livekitEnabled, setLivekitEnabled] = useState(false);
  const livekitHook = useLiveKitVoice(
    livekitEnabled ? roomId : undefined,
    livekitEnabled ? isInSeat : false,
    livekitEnabled ? isMuted : true,
    livekitEnabled ? uid : undefined,
    livekitEnabled ? isSpeakerMuted : true,
    livekitEnabled ? keepAlive : false
  );

  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fallback logic: Agora → LiveKit → WebRTC (ZegoCloud disabled — native crash)
  useEffect(() => {
    if (!roomId || !uid) return;

    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    if (switchTimer2Ref.current) clearTimeout(switchTimer2Ref.current);

    console.log(`[VOICE] Agora: ${agoraHook.connectionState} | LiveKit: ${livekitHook.connectionState} | Active: ${activeProvider || 'none'}`);

    if (agoraHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'agora') console.log('[VOICE] >>> Switching to AGORA');
      setActiveProvider('agora');
      setProviderError(null);
      return;
    }

    if (agoraHook.connectionState === 'DISCONNECTED') {
      if (!livekitEnabled) console.log('[VOICE] Agora failed — enabling LiveKit...');
      setLivekitEnabled(true);

      switchTimerRef.current = setTimeout(() => {
        if (livekitHook.connectionState === 'CONNECTED') {
          if (activeProvider !== 'livekit') console.log('[VOICE] >>> Switching to LIVEKIT');
          setActiveProvider('livekit');
          setProviderError(null);
          return;
        }

        if (livekitHook.connectionState === 'DISCONNECTED') {
          switchTimer2Ref.current = setTimeout(() => {
            if (activeProvider !== 'webrtc') console.log('[VOICE] >>> Switching to WEBRTC (final fallback)');
            setActiveProvider('webrtc');
            setProviderError('Agora & LiveKit failed → WebRTC fallback active');
          }, 5000);
        }
      }, 5000);
      return;
    }

    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (switchTimer2Ref.current) clearTimeout(switchTimer2Ref.current);
    };
  }, [agoraHook.connectionState, livekitHook.connectionState, roomId, uid]);

  useEffect(() => {
    if (agoraHook.connectionState === 'CONNECTED' && activeProvider !== 'agora') {
      console.log('[VOICE] >>> Agora recovered — switching back to AGORA');
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (switchTimer2Ref.current) clearTimeout(switchTimer2Ref.current);
      setActiveProvider('agora');
      setProviderError(null);
    }
  }, [agoraHook.connectionState, activeProvider]);

  useEffect(() => {
    if (activeProvider === 'webrtc' && webrtcHook.connectionState === 'CONNECTED') {
      setProviderError(null);
    }
  }, [webrtcHook.connectionState, activeProvider]);

  const getActiveHook = () => {
    if (activeProvider === 'zego') return zegoHook;
    if (activeProvider === 'livekit') return livekitHook;
    if (activeProvider === 'webrtc') return webrtcHook;
    return agoraHook;
  };

  const activeHook = getActiveHook();

  const getSpeakingIntensity = useCallback((targetUid: number): number => {
    return activeHook.getSpeakingIntensity(targetUid);
  }, [activeHook]);

  return {
    remoteUsers: activeHook.remoteUsers,
    connectionState: activeHook.connectionState,
    engine: activeProvider === 'agora' ? agoraHook.engine : undefined,
    isScreenSharing: activeHook.isScreenSharing,
    startScreenShare: activeHook.startScreenShare,
    stopScreenShare: activeHook.stopScreenShare,
    speakingUsers: activeHook.speakingUsers,
    getSpeakingIntensity,
    activeProvider: activeProvider || 'agora',
    providerError,
  };
}
