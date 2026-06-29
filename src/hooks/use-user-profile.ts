import { useState, useEffect, useRef } from 'react';
import { useFirestore } from '../firebase/provider';
import { doc, onSnapshot, setDoc } from '@/firebase/firestore-compat';
import { User } from '../lib/types';

function isValidAccNum(id: any): boolean {
  if (!id) return false;
  const s = String(id).trim();
  return /^\d{6}$/.test(s) || s === '0000';
}

export function useUserProfile(uid: string | undefined | null) {
  const firestore = useFirestore();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef<{ base: any; sub: any }>({ base: null, sub: null });
  const unsubBaseRef = useRef<(() => void) | null>(null);
  const unsubSubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid || !firestore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    dataRef.current = { base: null, sub: null };

    const profileRef = doc(firestore, 'users', uid, 'profile', uid);
    const userRef = doc(firestore, 'users', uid);

    const mergeAndSet = () => {
      const { base, sub } = dataRef.current;
      if (!base && !sub) return;

      const baseAccNum = base?.accountNumber;
      const subAccNum = sub?.accountNumber;

      // Pick the best valid 6-digit ID from either document
      let bestAccNum: any = subAccNum;
      if (!isValidAccNum(subAccNum) && isValidAccNum(baseAccNum)) {
        bestAccNum = baseAccNum;
        // Silently fix mismatch in background — write correct ID to both docs
        if (sub !== null) {
          setDoc(profileRef, { accountNumber: bestAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
          setDoc(userRef, { accountNumber: bestAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
        }
      } else if (isValidAccNum(subAccNum) && !isValidAccNum(baseAccNum)) {
        // Profile subcollection valid but base missing — sync up
        setDoc(userRef, { accountNumber: subAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
      }

      setProfile({
        ...(base || {}),
        ...(sub || {}),
        accountNumber: bestAccNum,
        id: uid,
      } as User);
      setIsLoading(false);
    };

    // Listen to profile subcollection
    unsubSubRef.current = onSnapshot(
      profileRef,
      (snapshot: any) => {
        const exists = typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
        dataRef.current.sub = exists ? snapshot.data() : null;
        mergeAndSet();
      },
      (error: any) => {
        dataRef.current.sub = null;
        mergeAndSet();
      }
    );

    // Listen to base user document simultaneously
    unsubBaseRef.current = onSnapshot(
      userRef,
      (snapshot: any) => {
        const exists = typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
        dataRef.current.base = exists ? snapshot.data() : null;
        mergeAndSet();
      },
      (error: any) => {
        dataRef.current.base = null;
        mergeAndSet();
      }
    );

    return () => {
      if (unsubSubRef.current) { unsubSubRef.current(); unsubSubRef.current = null; }
      if (unsubBaseRef.current) { unsubBaseRef.current(); unsubBaseRef.current = null; }
      dataRef.current = { base: null, sub: null };
    };
  }, [uid, firestore]);

  return { profile, isLoading };
}
