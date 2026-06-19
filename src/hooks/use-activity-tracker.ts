import { useEffect, useRef, useCallback } from 'react';
import { useUser, useFirestore } from '../firebase/provider';
import { doc, increment, serverTimestamp } from '@/firebase/firestore-compat';
import { setDocumentNonBlocking } from '../lib/non-blocking-writes';

export function useActivityTracker(roomId: string | null, isInSeat: boolean) {
  const { user } = useUser();
  const firestore = useFirestore();
  const activityTimerRef = useRef<any>(null);

  const incrementActivity = useCallback(async () => {
    if (!firestore || !user?.uid || !roomId) return;
    const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    const update = { activityPoints: increment(1), updatedAt: serverTimestamp() };
    setDocumentNonBlocking(profileRef, update, { merge: true });
  }, [firestore, user?.uid, roomId]);

  useEffect(() => {
    if (!isInSeat) {
      if (activityTimerRef.current) { clearInterval(activityTimerRef.current); activityTimerRef.current = null; }
      return;
    }
    activityTimerRef.current = setInterval(() => incrementActivity(), 300000);
    return () => { if (activityTimerRef.current) clearInterval(activityTimerRef.current); };
  }, [isInSeat, incrementActivity]);

  return { incrementActivity };
}
