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

    // Priority: Agora → DigitalOcean LiveKit → ZegoCloud → WebRTC
    if (agoraHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'agora') console.log('[VOICE] >>> Switching to AGORA');
      setActiveProvider('agora');
      setProviderError(null);
      return;
    }

    if (livekitHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'livekit') console.log('[VOICE] >>> Switching to LIVEKIT (DigitalOcean Server)');
      setActiveProvider('livekit');
      setProviderError(null);
      return;
    }

    if (zegoHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'zego') console.log('[VOICE] >>> Switching to ZEGO');
      setActiveProvider('zego');
      setProviderError(null);
      return;
    }

    if (webrtcHook.connectionState === 'CONNECTED') {
      if (activeProvider !== 'webrtc') console.log('[VOICE] >>> Switching to WEBRTC');
      setActiveProvider('webrtc');
      setProviderError(null);
      return;
    }

    // Fast 500ms Fallback: Enable DigitalOcean LiveKit, ZegoCloud, and WebRTC immediately
    if (agoraHook.connectionState === 'DISCONNECTED' || !livekitEnabled) {
      switchTimerRef.current = setTimeout(() => {
        if (agoraHook.connectionState !== 'CONNECTED') {
          console.log('[VOICE] Fast Fallback: Enabling DigitalOcean LiveKit (ws://168.144.72.108:7880)...');
          setLivekitEnabled(true);
          setZegoEnabled(true);
          setWebRtcEnabled(true);
        }
      }, 500);
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
