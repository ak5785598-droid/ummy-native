import { useState, useEffect, useRef } from 'react';
import { useFirestore } from '../firebase/provider';
import { doc, onSnapshot } from '@/firebase/firestore-compat';
import { User } from '../lib/types';

export function useUserProfile(uid: string | undefined | null) {
  const firestore = useFirestore();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const innerUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid || !firestore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    innerUnsubRef.current = null;
    const profileRef = doc(firestore, 'users', uid, 'profile', uid);
    
    const unsubscribe = onSnapshot(profileRef, 
      (snapshot: any) => {
        if (snapshot.exists) {
          setProfile({ id: snapshot.id, ...snapshot.data() } as User);
        } else {
          if (innerUnsubRef.current) innerUnsubRef.current();
          const userRef = doc(firestore, 'users', uid);
          innerUnsubRef.current = onSnapshot(userRef, (userSnap: any) => {
            if (userSnap.exists) {
              setProfile({ id: userSnap.id, ...userSnap.data() } as User);
            } else {
              setProfile(null);
            }
            setIsLoading(false);
          });
          return;
        }
        setIsLoading(false);
      },
      (error: any) => {
        console.warn('[useUserProfile] Error:', error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (innerUnsubRef.current) {
        innerUnsubRef.current();
        innerUnsubRef.current = null;
      }
    };
  }, [uid, firestore]);

  return { profile, isLoading };
}
