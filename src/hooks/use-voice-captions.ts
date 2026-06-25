import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useFirestore, useUser } from '../firebase/provider';
import { doc, collection, setDoc, serverTimestamp, onSnapshot, query, orderBy, limit } from '@/firebase/firestore-compat';

let Voice: any = null;
let voiceModule: any = null;
try {
  voiceModule = require('@react-native-voice/voice');
  Voice = voiceModule.default || voiceModule;
} catch {}

interface CaptionData {
  uid: string;
  name: string;
  text: string;
  emotion?: string;
  timestamp: any;
}

export function useVoiceCaptions(roomId: string, isInSeat: boolean, isMuted: boolean) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const [sttEngine, setSttEngine] = useState<'native' | 'web' | 'unavailable'>(Platform.OS === 'web' ? 'web' : Voice ? 'native' : 'unavailable');
  const recognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef('');
  const lastBroadcastRef = useRef(0);

  useEffect(() => {
    if (!firestore || !roomId || !isCaptionsEnabled) return;
    const q = query(collection(firestore, 'chatRooms', roomId, 'captions'), orderBy('timestamp', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap: any) => {
      const list: CaptionData[] = [];
      snap.forEach((d: any) => { list.push(d.data() as CaptionData); });
      setCaptions(list.reverse());
    });
    return () => unsub();
  }, [firestore, roomId, isCaptionsEnabled]);

  const broadcastCaption = useCallback(async (text: string, emotion?: string) => {
    if (!firestore || !roomId || !user?.uid || !text.trim()) return;
    const now = Date.now();
    if (now - lastBroadcastRef.current < 2000) return;
    lastBroadcastRef.current = now;
    const ref = doc(firestore, 'chatRooms', roomId, 'captions', user.uid);
    await setDoc(ref, { uid: user.uid, name: user.displayName || 'User', text, emotion: emotion || null, timestamp: serverTimestamp() });
  }, [firestore, roomId, user?.uid]);

  const detectEmotion = (text: string): string | undefined => {
    const lower = text.toLowerCase();
    if (lower.includes('😂') || lower.includes('lol') || lower.includes('haha')) return 'happy';
    if (lower.includes('😢') || lower.includes('sad') || lower.includes('cry')) return 'sad';
    if (lower.includes('😡') || lower.includes('angry') || lower.includes('mad')) return 'angry';
    if (lower.includes('😮') || lower.includes('wow') || lower.includes('omg')) return 'surprised';
    return undefined;
  };

  // Native STT via react-native-voice (loops to keep listening)
  const setupNativeSTT = useCallback(() => {
    if (!Voice) return false;
    try {
      Voice.onSpeechResults = (e: any) => {
        const transcript = e.value?.[0];
        if (transcript && transcript !== lastTranscriptRef.current) {
          lastTranscriptRef.current = transcript;
          const emotion = detectEmotion(transcript);
          broadcastCaption(transcript, emotion);
        }
        // Restart to keep listening continuously
        try { Voice.start('hi-IN'); } catch {}
      };
      Voice.onSpeechError = () => {
        // On error, retry after 1s
        setTimeout(() => { try { Voice.start('hi-IN'); } catch {} }, 1000);
      };
      Voice.start('hi-IN');
      return true;
    } catch { return false; }
  }, [broadcastCaption]);

  const stopNativeSTT = useCallback(() => {
    if (!Voice) return;
    try {
      Voice.destroy().catch(() => {});
    } catch {}
  }, []);

  // Web Speech API STT (Expo Go / web)
  const setupWebSTT = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal && transcript !== lastTranscriptRef.current) {
            lastTranscriptRef.current = transcript;
            const emotion = detectEmotion(transcript);
            broadcastCaption(transcript, emotion);
          }
        }
      };

      recognition.onerror = () => {};
      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch { return false; }
  }, [broadcastCaption]);

  const stopWebSTT = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // Auto-detect and start STT engine
  useEffect(() => {
    if (!isCaptionsEnabled || !isInSeat || isMuted) {
      stopNativeSTT();
      stopWebSTT();
      return;
    }

    if (Voice) {
      setSttEngine('native');
      setupNativeSTT();
    } else {
      // Try WebSTT — works in Expo Go and browsers (remove Platform.OS === 'web' check)
      const started = setupWebSTT();
      setSttEngine(started ? 'web' : 'unavailable');
    }

    return () => {
      stopNativeSTT();
      stopWebSTT();
    };
  }, [isCaptionsEnabled, isInSeat, isMuted, setupNativeSTT, setupWebSTT]);

  return { captions, isCaptionsEnabled, setIsCaptionsEnabled, sttEngine };
}
