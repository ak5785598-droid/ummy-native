import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '../firebase/provider';
import { doc, getDoc, serverTimestamp, writeBatch, runTransaction } from '@/firebase/firestore-compat';

const CREATOR_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';

export function ProfileInitializer() {
  const { user } = useUser();
  const firestore = useFirestore();
  const hasInitialized = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !firestore || hasInitialized.current === user.uid) return;

    const initProfile = async () => {
      const uid = user.uid;
      try {
        const userRef = doc(firestore, 'users', uid);
        const profileRef = doc(firestore, 'users', uid, 'profile', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists) {
          hasInitialized.current = uid;
          return;
        }

        const userData = userSnap.data() as any;

        if (userData.banStatus?.isBanned) {
          hasInitialized.current = uid;
          return;
        }

        const batch = writeBatch(firestore);
        let needsReset = false;
        const resetData: any = { updatedAt: serverTimestamp() };

        const now = new Date();
        const lastSeen = userData.lastSeen?.toDate?.() || new Date(0);
        const lastDate = lastSeen.toDateString();
        const today = now.toDateString();

        if (today !== lastDate) {
          needsReset = true;
          resetData.wallet = { ...userData.wallet, dailySpent: 0 };
        }

        if (now.getDay() === 1 && today !== lastDate) {
          needsReset = true;
          if (!resetData.wallet) resetData.wallet = { ...userData.wallet };
          resetData.wallet.weeklySpent = 0;
        }

        const lastMonth = lastSeen.getMonth();
        const lastYear = lastSeen.getFullYear();
        if (now.getMonth() !== lastMonth || now.getFullYear() !== lastYear) {
          needsReset = true;
          if (!resetData.wallet) resetData.wallet = { ...userData.wallet };
          resetData.wallet.monthlySpent = 0;
        }

        if (needsReset) {
          batch.set(userRef, resetData, { merge: true });
          batch.set(profileRef, resetData, { merge: true });
        }

        batch.set(userRef, { isOnline: true, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        batch.set(profileRef, { isOnline: true, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        await batch.commit();

        const currentAccNum = String(userData.accountNumber || '');
        const isStrictlySixDigits = /^\d{6}$/.test(currentAccNum);
        const needsUserSync =
          (uid === CREATOR_ID && currentAccNum !== '0000') ||
          (uid !== CREATOR_ID && (!currentAccNum || !isStrictlySixDigits));

        if (needsUserSync) {
          await runTransaction(firestore, async (tx: any) => {
            let newId = '';
            if (uid === CREATOR_ID) {
              newId = '0000';
              const creatorRef = doc(firestore, 'assigned_ids', newId);
              const docSnap = await tx.get(creatorRef);
              if (!docSnap.exists) {
                tx.set(creatorRef, { uid, assignedAt: serverTimestamp() });
              }
            } else {
              for (let i = 0; i < 10; i++) {
                const tempId = String(Math.floor(100000 + Math.random() * 900000));
                const idRef = doc(firestore, 'assigned_ids', tempId);
                const idDoc = await tx.get(idRef);
                if (!idDoc.exists) {
                  tx.set(idRef, { uid, assignedAt: serverTimestamp() });
                  newId = tempId;
                  break;
                }
              }
              if (!newId) {
                newId = String(Math.floor(100000 + Math.random() * 900000));
                const fallbackRef = doc(firestore, 'assigned_ids', newId);
                tx.set(fallbackRef, { uid, assignedAt: serverTimestamp() });
              }
            }

            tx.set(userRef, { accountNumber: newId, updatedAt: serverTimestamp() }, { merge: true });
            tx.set(profileRef, { accountNumber: newId, updatedAt: serverTimestamp() }, { merge: true });
          });
          console.log(`[ProfileInitializer] Account number synced: ${uid}`);
        }

        hasInitialized.current = uid;
      } catch (e) {
        console.warn('[ProfileInitializer] Error:', e);
        hasInitialized.current = uid;
      }
    };

    initProfile();
  }, [user, firestore]);

  return null;
}
