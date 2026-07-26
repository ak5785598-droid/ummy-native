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
}

export function useVoiceEngine({
  roomId,
  isInSeat,
  isMuted,
  uid,
  isSpeakerMuted = false,
}: UseVoiceEngineProps) {
  const [activeProvider, setActiveProvider] = useState<VoiceProvider | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  const agoraHook = useAgoraNative(roomId, isInSeat, isMuted, uid, isSpeakerMuted);
  const [webRtcEnabled, setWebRtcEnabled] = useState(false);
  const webrtcHook = useWebRTCVoice(
    webRtcEnabled ? roomId : undefined,
    webRtcEnabled ? isInSeat : false,
    webRtcEnabled ? isMuted : true,
    webRtcEnabled ? uid : undefined,
    isSpeakerMuted
  );

  const [zegoEnabled, setZegoEnabled] = useState(false);
  const zegoHook = useZegoCloudVoice(
    zegoEnabled ? roomId : undefined,
    zegoEnabled ? isInSeat : false,
    zegoEnabled ? isMuted : true,
    zegoEnabled ? uid : undefined,
    isSpeakerMuted
  );

  const [livekitEnabled, setLivekitEnabled] = useState(false);
  const livekitHook = useLiveKitVoice(
    livekitEnabled ? roomId : undefined,
    livekitEnabled ? isInSeat : false,
    livekitEnabled ? isMuted : true,
    livekitEnabled ? uid : undefined,
    isSpeakerMuted
  );

  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimer3Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRoomIdRef = useRef<string | undefined>(roomId);

  // CRITICAL: When roomId changes, destroy ALL providers immediately
  useEffect(() => {
    if (prevRoomIdRef.current !== roomId && prevRoomIdRef.current) {
      console.log('[VOICE] Room changed — destroying all providers');
      destroyAgoraEngine();
      destroyZegoEngine();
      destroyLiveKitRoom();
      setActiveProvider(null);
      setZegoEnabled(false);
      setLivekitEnabled(false);
      setWebRtcEnabled(false);
      setProviderError(null);
    }
    prevRoomIdRef.current = roomId;
  }, [roomId]);

  // Fallback logic: Agora → ZegoCloud → LiveKit → WebRTC
  useEffect(() => {
    if (!roomId || !uid) return;

    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    if (switchTimer2Ref.current) clearTimeout(switchTimer2Ref.current);
    if (switchTimer3Ref.current) clearTimeout(switchTimer3Ref.current);

    // Priority: Agora → ZegoCloud → DigitalOcean LiveKit → WebRTC
    if (agoraHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'agora') console.log('[VOICE] >>> Switching to AGORA');
      setActiveProvider('agora');
      setProviderError(null);
      return;
    }

    if (zegoHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'zego') console.log('[VOICE] >>> Switching to ZEGO (fallback #1)');
      setActiveProvider('zego');
      setProviderError(null);
      return;
    }

    if (livekitHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'livekit') console.log('[VOICE] >>> Switching to LIVEKIT DigitalOcean (fallback #2)');
      setActiveProvider('livekit');
      setProviderError(null);
      return;
    }

    if (webrtcHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'webrtc') console.log('[VOICE] >>> Switching to WEBRTC (fallback #3)');
      setActiveProvider('webrtc');
      setProviderError(null);
      return;
    }

    // Agora is primary — if not connected after 8s, enable WebRTC as last resort only
    // ZegoCloud & LiveKit disabled — they were unreliable (connecting sometimes, not always)
    if (agoraHook.connectionState === 'DISCONNECTED' || agoraHook.connectionState === 'CONNECTING') {
      switchTimerRef.current = setTimeout(() => {
        // Double-check Agora still not connected before enabling fallback
        if (agoraHook.connectionState !== 'CONNECTED') {
          console.log('[VOICE] Agora not connected after 8s — enabling WebRTC last resort...');
          setWebRtcEnabled(true);
          // ZegoCloud & LiveKit intentionally disabled (unreliable)
          // setZegoEnabled(true);
          // setLivekitEnabled(true);
        }
      }, 8000);
    }

    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (switchTimer2Ref.current) clearTimeout(switchTimer2Ref.current);
      if (switchTimer3Ref.current) clearTimeout(switchTimer3Ref.current);
    };
  }, [agoraHook.connectionState, zegoHook.connectionState, livekitHook.connectionState, roomId, uid]);

  useEffect(() => {
    if (agoraHook.connectionState === 'CONNECTED' && activeProvider !== 'agora') {
      console.log('[VOICE] >>> Agora recovered — switching back to AGORA');
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (switchTimer2Ref.current) clearTimeout(switchTimer2Ref.current);
      if (switchTimer3Ref.current) clearTimeout(switchTimer3Ref.current);
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
