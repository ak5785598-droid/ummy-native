import { useRef, useState, useEffect, useCallback } from 'react';
import { useAgoraNative, destroyAgoraEngine } from './use-agora-native';
import { useWebRTCVoice } from './use-webrtc-voice';

type VoiceProvider = 'agora' | 'webrtc';

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

  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId || !uid) return;

    if (agoraHook.connectionState === 'CONNECTED') {
      setActiveProvider('agora');
      setProviderError(null);
      return;
    }

    if (agoraHook.connectionState === 'DISCONNECTED') {
      switchTimerRef.current = setTimeout(() => {
        if (webrtcHook.connectionState !== 'CONNECTED') {
          setProviderError('Agora failed → WebRTC fallback active');
        }
        setActiveProvider('webrtc');
      }, 5000);
    }

    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, [agoraHook.connectionState, roomId, uid]);

  useEffect(() => {
    if (activeProvider === 'webrtc' && webrtcHook.connectionState === 'CONNECTED') {
      setProviderError(null);
    }
  }, [webrtcHook.connectionState, activeProvider]);

  const getActiveHook = () => {
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
