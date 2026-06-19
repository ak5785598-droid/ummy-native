import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFirestore, useUser, useDatabase } from '../firebase/provider';
import { ref, set, onDisconnect, serverTimestamp as dbServerTimestamp } from 'firebase/database';
import { doc, serverTimestamp, updateDoc } from '@/firebase/firestore-compat';
import { updateDocumentNonBlocking } from '../lib/non-blocking-writes';

export function GlobalPresenceManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const database = useDatabase();
  const presenceRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user?.uid || !database) return;

    const uid = user.uid;
    const presencePath = `globalPresence/${uid}`;
    presenceRef.current = ref(database, presencePath);

    set(presenceRef.current, {
      uid,
      isOnline: true,
      lastSeen: dbServerTimestamp(),
    });

    onDisconnect(presenceRef.current).set({
      uid,
      isOnline: false,
      lastSeen: dbServerTimestamp(),
    });

    const handleAppState = (nextState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextState.match(/inactive|background/)) {
        if (presenceRef.current) {
          set(presenceRef.current, { uid, isOnline: false, lastSeen: dbServerTimestamp() });
        }
        if (firestore) {
          const userRef = doc(firestore, 'users', uid);
          const profileRef = doc(firestore, 'users', uid, 'profile', uid);
          updateDocumentNonBlocking(userRef, { isOnline: false, lastSeen: serverTimestamp() });
          updateDocumentNonBlocking(profileRef, { isOnline: false, lastSeen: serverTimestamp() });
        }
      } else if (nextState === 'active') {
        if (presenceRef.current) {
          set(presenceRef.current, { uid, isOnline: true, lastSeen: dbServerTimestamp() });
          onDisconnect(presenceRef.current).set({ uid, isOnline: false, lastSeen: dbServerTimestamp() });
        }
        if (firestore) {
          const userRef = doc(firestore, 'users', uid);
          const profileRef = doc(firestore, 'users', uid, 'profile', uid);
          updateDocumentNonBlocking(userRef, { isOnline: true, lastSeen: serverTimestamp() });
          updateDocumentNonBlocking(profileRef, { isOnline: true, lastSeen: serverTimestamp() });
        }
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
      if (presenceRef.current) {
        set(presenceRef.current, { uid, isOnline: false, lastSeen: dbServerTimestamp() });
      }
    };
  }, [user?.uid, database, firestore]);

  return null;
}
