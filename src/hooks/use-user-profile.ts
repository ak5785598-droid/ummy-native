import { useState, useEffect, useRef } from 'react';
import { useFirestore, useUser } from '../firebase/provider';
import { doc, onSnapshot, setDoc } from '@/firebase/firestore-compat';
import { User } from '../lib/types';

function isValidAccNum(id: any): boolean {
  if (!id) return false;
  const s = String(id).trim();
  return s.length > 0;
}

export function useUserProfile(uid: string | undefined | null) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef<{ base: any; sub: any }>({ base: null, sub: null });
  const unsubBaseRef = useRef<(() => void) | null>(null);
  const unsubSubRef = useRef<(() => void) | null>(null);

  const [isOfficial, setIsOfficial] = useState(false);

  useEffect(() => {
    if (!firestore || !user?.uid) return;
    const myUserRef = doc(firestore, 'users', user.uid);
    const unsub = onSnapshot(myUserRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        const tags = data?.tags || [];
        const officialRoles = ['Official', 'Super Admin', 'CS Leader', 'Customer Service', 'Auditor', 'Manager', 'CS'];
        const hasOfficialRole = tags.some((t: string) => officialRoles.includes(t));
        setIsOfficial(hasOfficialRole);
      }
    }, () => {});
    return () => unsub();
  }, [firestore, user?.uid]);

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

      // Prioritize baseAccNum (Admin source of truth) if it exists, otherwise fallback to subAccNum
      let bestAccNum: any = baseAccNum || subAccNum;

      const isOwner = uid === user?.uid;
      const canEdit = isOwner || isOfficial;

      if (canEdit) {
        if (baseAccNum && subAccNum && baseAccNum !== subAccNum) {
          bestAccNum = baseAccNum;
          setDoc(profileRef, { accountNumber: baseAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
        } else if (!isValidAccNum(subAccNum) && isValidAccNum(baseAccNum)) {
          bestAccNum = baseAccNum;
          setDoc(profileRef, { accountNumber: bestAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
          setDoc(userRef, { accountNumber: bestAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
        } else if (isValidAccNum(subAccNum) && !isValidAccNum(baseAccNum)) {
          bestAccNum = subAccNum;
          setDoc(userRef, { accountNumber: subAccNum, accountNumberLocked: true }, { merge: true }).catch(() => {});
        }
      }

      const baseWallet = (base as any)?.wallet || {};
      const subWallet = (sub as any)?.wallet || {};
      const mergedWallet = {
        coins: Math.max(0, baseWallet.coins ?? subWallet.coins ?? 0),
        diamonds: Math.max(0, baseWallet.diamonds ?? subWallet.diamonds ?? 0),
        totalSpent: Math.max(0, baseWallet.totalSpent ?? subWallet.totalSpent ?? 0),
      };

      const mergedLevel = {
        rich: Number(base?.level?.rich ?? sub?.level?.rich ?? 1),
        charm: Number(base?.level?.charm ?? sub?.level?.charm ?? 1),
      };

      const baseInventory = (base as any)?.inventory || {};
      const subInventory = (sub as any)?.inventory || {};
      const mergedOwnedItems = Array.from(new Set([
        ...(baseInventory.ownedItems || []),
        ...(subInventory.ownedItems || [])
      ]));
      const mergedInventory = {
        ...subInventory,
        ...baseInventory,
        ownedItems: mergedOwnedItems,
        expiries: {
          ...(subInventory.expiries || {}),
          ...(baseInventory.expiries || {})
        }
      };

      setProfile({
        ...(sub || {}),
        ...(base || {}),
        wallet: mergedWallet,
        level: mergedLevel,
        inventory: mergedInventory,
        xp: Number(base?.xp ?? sub?.xp ?? 0),
        vip: base?.vip ?? sub?.vip ?? 0,
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
