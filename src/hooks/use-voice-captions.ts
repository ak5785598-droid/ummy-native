/**
 * Voice Captions hook — live subtitles in room.
 *
 * REWRITTEN to use the shared useSTTEngine instead of directly
 * calling @react-native-voice/voice (which clashed with AI Listen).
 *
 * How it works:
 *  1. Subscribes to the shared STT engine when captions are enabled + user is in seat + mic is on.
 *  2. Receives transcripts → broadcasts to Firestore `chatRooms/{roomId}/captions`.
 *  3. All room members see captions via onSnapshot listener.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useFirestore, useUser } from '../firebase/provider';
import { doc, collection, setDoc, serverTimestamp, onSnapshot, query, orderBy, limit } from '@/firebase/firestore-compat';
import { useSTTEngine } from './use-stt-engine';

interface CaptionData {
  uid: string;
  name: string;
  text: string;
  emotion?: string;
  timestamp: any;
}

function detectEmotion(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('😂') || lower.includes('lol') || lower.includes('haha')) return 'happy';
  if (lower.includes('😢') || lower.includes('sad') || lower.includes('cry')) return 'sad';
  if (lower.includes('😡') || lower.includes('angry') || lower.includes('mad')) return 'angry';
  if (lower.includes('😮') || lower.includes('wow') || lower.includes('omg')) return 'surprised';
  return undefined;
}

export function useVoiceCaptions(roomId: string, isInSeat: boolean, isMuted: boolean) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const lastBroadcastRef = useRef(0);

  // ── Firestore listener for captions from all users ──────────────────────
  useEffect(() => {
    if (!firestore || !roomId || !isCaptionsEnabled) return;
    const q = query(
      collection(firestore, 'chatRooms', roomId, 'captions'),
      orderBy('timestamp', 'desc'),
      limit(10),
    );
    const unsub = onSnapshot(q, (snap: any) => {
      const list: CaptionData[] = [];
      snap.forEach((d: any) => { list.push(d.data() as CaptionData); });
      setCaptions(list.reverse());
    }, () => {});
    return () => unsub();
  }, [firestore, roomId, isCaptionsEnabled]);

  // ── Broadcast my transcript to Firestore ────────────────────────────────
  const broadcastCaption = useCallback(async (text: string) => {
    if (!firestore || !roomId || !user?.uid || !text.trim()) return;
    const now = Date.now();
    // Throttle: max once per 2s
    if (now - lastBroadcastRef.current < 2000) return;
    lastBroadcastRef.current = now;
    const emotion = detectEmotion(text);
    const ref = doc(firestore, 'chatRooms', roomId, 'captions', user.uid);
    try {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName || 'User',
        text,
        emotion: emotion || null,
        timestamp: serverTimestamp(),
      });
    } catch {}
  }, [firestore, roomId, user?.uid, user?.displayName]);

  // ── Subscribe to shared STT engine ──────────────────────────────────────
  // Only active when: captions ON + in seat + mic NOT muted
  const shouldListen = isCaptionsEnabled && isInSeat && !isMuted;

  const { sttAvailable } = useSTTEngine(shouldListen, broadcastCaption);

  const sttEngine = sttAvailable ? 'native' : 'unavailable';

  return { captions, isCaptionsEnabled, setIsCaptionsEnabled, sttEngine };
}
