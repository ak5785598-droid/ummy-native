/**
 * Voice Captions hook — speech-to-chat in room.
 *
 * BEHAVIOR:
 *  When Voice Captions is ON + user is in seat + mic is NOT muted:
 *  → Everything the user speaks is converted to text via STT
 *  → That text is sent as a NORMAL CHAT MESSAGE (like typing)
 *  → Other users see it in chat as a regular message
 *
 * Uses the shared useSTTEngine so it does NOT conflict with AI Listen.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSTTEngine } from './use-stt-engine';

export function useVoiceCaptions(
  roomId: string,
  isInSeat: boolean,
  isMuted: boolean,
  sendMessage?: ((text: string) => void) | null,
) {
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const lastSentRef = useRef('');
  const lastSentTimeRef = useRef(0);

  // Only active when: captions ON + in seat + mic NOT muted
  const shouldListen = isCaptionsEnabled && isInSeat && !isMuted;

  // Callback: send transcript as normal chat message
  const onTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    if (!sendMessage) return;

    // Debounce: don't send same text within 2s
    const now = Date.now();
    if (text === lastSentRef.current && now - lastSentTimeRef.current < 2000) return;
    lastSentRef.current = text;
    lastSentTimeRef.current = now;

    // Send as regular chat message
    sendMessage(text);
  }, [sendMessage]);

  const { sttAvailable } = useSTTEngine(shouldListen, onTranscript);

  const sttEngine = sttAvailable ? 'native' : 'unavailable';

  return { isCaptionsEnabled, setIsCaptionsEnabled, sttEngine };
}
