import { useEffect, useRef, useCallback } from 'react';
import { useUser, useFirestore } from '../firebase/provider';
import { doc, increment, serverTimestamp } from '@/firebase/firestore-compat';
import { setDocumentNonBlocking } from '../lib/non-blocking-writes';

export function useActivityTracker(roomId: string | null, isInSeat: boolean) {
  const { user } = useUser();
  const firestore = useFirestore();
  const activityTimerRef = useRef<any>(null);
  const lastHeartbeat = useRef<number>(Date.now());

  const incrementActivity = useCallback(async () => {
    if (!firestore || !user?.uid || !roomId) return;
    const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    const roomRef = doc(firestore, 'chatRooms', roomId);
    setDocumentNonBlocking(profileRef, { activityPoints: increment(5), updatedAt: serverTimestamp() }, { merge: true });
    setDocumentNonBlocking(roomRef, { levelPoints: increment(5), updatedAt: serverTimestamp() }, { merge: true });
  }, [firestore, user?.uid, roomId]);

  useEffect(() => {
    if (!firestore || !user?.uid || !roomId) return;

    // Heartbeat every 5 minutes (300000ms) — works in room, not just on seat
    const HEARTBEAT_INTERVAL = 300000;

    activityTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastHeartbeat.current;
      if (elapsed >= HEARTBEAT_INTERVAL) {
        incrementActivity();
        lastHeartbeat.current = now;
      }
    }, 30000);

    return () => {
      if (activityTimerRef.current) { clearInterval(activityTimerRef.current); activityTimerRef.current = null; }
    };
  }, [firestore, user?.uid, roomId, incrementActivity]);

  return { incrementActivity };
}
