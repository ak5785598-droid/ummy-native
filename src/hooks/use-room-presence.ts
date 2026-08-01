import { useEffect, useRef } from 'react';
import { useFirestore, useUser, useDatabase } from '../firebase/provider';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, writeBatch, increment, collection, getDocs, query, where, arrayUnion } from '@/firebase/firestore-compat';
import { ref, set, onDisconnect, onValue, remove, push, serverTimestamp as dbServerTimestamp, query as dbQuery, orderByChild, limitToFirst, get, update } from 'firebase/database';
import { AppState, AppStateStatus } from 'react-native';
import { setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '../lib/non-blocking-writes';
import { Room, User, isInventoryItemExpired } from '../lib/types';

const enteredRooms = new Set<string>();
const entranceSentForRooms = new Set<string>();

const filterBase64 = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('data:')) return null;
  return url;
};

interface UseRoomPresenceProps {
  activeRoom: Room | null;
  minimizedRoom: Room | null;
  userProfile: User | null;
}

export function useRoomPresence({ activeRoom, minimizedRoom, userProfile }: UseRoomPresenceProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const database = useDatabase();
  
  const lastRoomId = useRef<string | null>(null);
  const hasJoinedRef = useRef(false);
  const heartbeatInterval = useRef<any>(null);
  const cleanupInterval = useRef<any>(null);
  const purgeInterval = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const latestRoomRef = useRef<{ activeRoomId: string | null; minimizedRoomId: string | null }>({
    activeRoomId: null,
    minimizedRoomId: null,
  });
  const lastSyncMetadata = useRef<string>('');
  const hasCleanedUpRef = useRef(false);

  // Update latestRoomRef at RENDER TIME (not inside effect) so cleanup always sees the new room
  latestRoomRef.current = {
    activeRoomId: activeRoom?.id || null,
    minimizedRoomId: minimizedRoom?.id || null,
  };

  useEffect(() => {
    const sessionRoom = activeRoom || minimizedRoom;
    const roomId = sessionRoom?.id;

    if (!firestore || !user?.uid || !roomId || !database) return;

    // Diagnostic: confirm effect runs and RTDB write works
    const diagRef = ref(database, `roomPresence/_diag`);
    set(diagRef, { ts: Date.now(), uid: user.uid, roomId }).catch(() => {});


    const uid = user.uid;
    const isOwner = sessionRoom?.ownerId === uid;
    const participantRef = doc(firestore, 'chatRooms', roomId, 'participants', uid);
    const roomDocRef = doc(firestore, 'chatRooms', roomId);
    const userRef = doc(firestore, 'users', uid);
    const profileRef = doc(firestore, 'users', uid, 'profile', uid);

    const performJoin = async () => {
      try {
        // Check persistent bans subcollection
        const banSnap = await getDoc(doc(firestore, 'chatRooms', roomId, 'bans', uid));
        if (banSnap.exists()) {
          const banData = banSnap.data();
          const bannedUntil = banData?.bannedUntil;
          const bannedUntilMs = bannedUntil?.toDate ? bannedUntil.toDate().getTime() : (typeof bannedUntil === 'string' ? new Date(bannedUntil).getTime() : bannedUntil);
          if (bannedUntilMs && bannedUntilMs > Date.now()) {
            return; // Banned! Disallow joining
          }
        }

        const partSnap = await getDoc(participantRef);
        if (partSnap.exists()) {
          const exp = partSnap.data()?.kickedUntil;
          const expMs = exp?.toDate ? exp.toDate().getTime() : (typeof exp === 'string' ? new Date(exp).getTime() : exp);
          if (expMs && expMs > Date.now()) {
            return;
          }
        }
        const batch = writeBatch(firestore);

        const inventory = userProfile?.inventory;
        const frame = inventory?.activeFrame || null;
        const bubble = inventory?.activeBubble || null;
        
        const frameToSend = isInventoryItemExpired(inventory || {}, frame) ? null : frame;
        const frameMediaUrlToSend = isInventoryItemExpired(inventory || {}, frame) ? null : (inventory?.activeFrameMediaUrl || null);
        const bubbleToSend = isInventoryItemExpired(inventory || {}, bubble) ? null : bubble;

        const existingData = partSnap.exists() ? partSnap.data() : null;
        const existingIsMuted = existingData?.isMuted ?? false;

        // Use set+merge — DO NOT write seatIndex here! merge:true preserves existing seatIndex from Firestore.
        // Writing seatIndex here causes a race condition where performJoin's batch can overwrite
        // a handleTakeSeat write that happens milliseconds later, kicking the user off their seat.
        batch.set(participantRef, {
          uid,
          name: userProfile?.username || 'User',
          avatarUrl: userProfile?.avatarUrl || user.photoURL || '',
          activeFrame: frameToSend,
          activeFrameMediaUrl: frameMediaUrlToSend,
          activeWave: null,
          activeBubble: bubbleToSend,
          activeIdBadge: null,
          lastSeen: serverTimestamp(),
          isMuted: existingIsMuted,
          accountNumber: userProfile?.accountNumber || '',
          gender: userProfile?.gender || null,
          relationship: userProfile?.relationship || null,
          bestFriend: userProfile?.bestFriend || null,
        }, { merge: true });

        batch.set(roomDocRef, {
          participantCount: increment(1),
          'stats.uniqueVisitorUids': arrayUnion(uid),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        batch.set(userRef, {
          currentRoomId: roomId,
          isOnline: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        batch.set(profileRef, {
          currentRoomId: roomId,
          isOnline: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        await batch.commit();

        // Write entry log SEPARATELY — so if security rules block this subcollection,
        // the main participant join still succeeds
        try {
          const logRef = doc(collection(firestore, 'chatRooms', roomId, 'entryLogs'));
          await setDoc(logRef, {
            type: 'entry',
            userId: uid,
            username: userProfile?.username || 'User',
            avatarUrl: userProfile?.avatarUrl || user.photoURL || '',
            timestamp: serverTimestamp(),
          });
        } catch (logErr) {
          console.error('[performJoin] entryLog write failed:', logErr);
        }
      } catch (error) {
        console.error('[performJoin] batch commit failed:', error);
      }
    };

    if (lastRoomId.current !== roomId || !hasJoinedRef.current) {
      hasCleanedUpRef.current = false;
      if (!enteredRooms.has(roomId)) {
        enteredRooms.add(roomId);
        performJoin();

        const roomMsgsRef = ref(database, `roomMessages/${roomId}`);
        const limitQuery = dbQuery(roomMsgsRef, orderByChild('timestamp'), limitToFirst(200));
        get(limitQuery).then((snap: any) => {
          const data = snap.val();
          if (!data) return;
          const keys = Object.keys(data);
          if (keys.length > 150) {
            const toRemove = keys.slice(0, keys.length - 150);
            const updates: Record<string, null> = {};
            toRemove.forEach((k: string) => { updates[k] = null; });
            update(roomMsgsRef, updates).catch(() => {});
          }
        }).catch(() => {});
      } else {
        setDocumentNonBlocking(participantRef, {
          lastSeen: serverTimestamp(),
          name: userProfile?.username || 'User',
          avatarUrl: userProfile?.avatarUrl || user.photoURL || '',
          accountNumber: userProfile?.accountNumber || '',
        }, { merge: true });
      }
      lastRoomId.current = roomId;
      hasJoinedRef.current = true;
    }

    heartbeatInterval.current = setInterval(() => {
      setDocumentNonBlocking(participantRef, {
        lastSeen: serverTimestamp(),
        accountNumber: userProfile?.accountNumber || '',
      }, { merge: true });
      // Also update RTDB presence lastSeen for real-time home screen status
      if (presenceRef.current && !userProfile?.roomInvisible) {
        update(presenceRef.current, { lastSeen: dbServerTimestamp() }).catch(() => {});
      }
    }, 10000);

    // Stats reset: ONLY owner runs this (daily/weekly/monthly gift counters)
    if (isOwner) {
      cleanupInterval.current = setInterval(async () => {
        try {
          const roomSnap = await getDoc(roomDocRef);
          if (!roomSnap.exists) return;

          const roomData = roomSnap.data();
          const now = new Date();
          const updatedAt = roomData.updatedAt?.toDate?.() || now;
          
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const nowIST = new Date(utc + (3600000 * 5.5));
          const updatedUTC = updatedAt.getTime() + (updatedAt.getTimezoneOffset() * 60000);
          const updatedIST = new Date(updatedUTC + (3600000 * 5.5));

          const resetData: any = {};
          
          if (nowIST.toDateString() !== updatedIST.toDateString()) {
            resetData['stats.dailyGifts'] = 0;
            if (nowIST.getDay() === 1) {
              resetData['stats.weeklyGifts'] = 0;
            }
          }
          
          if (nowIST.getMonth() !== updatedIST.getMonth() || nowIST.getFullYear() !== updatedIST.getFullYear()) {
            resetData['stats.monthlyGifts'] = 0;
          }

          if (Object.keys(resetData).length > 0) {
            updateDocumentNonBlocking(roomDocRef, resetData);
          }
        } catch (error) {
        }
      }, 300000);
    }

    // Ghost purge: ONLY room owner runs this to prevent false kicks from clock skew / background throttling
    // 120s threshold gives generous buffer for app background/foreground transitions, calls, notifications etc.
    if (isOwner) {
      purgeInterval.current = setInterval(async () => {
        try {
          const participantsColRef = collection(firestore, 'chatRooms', roomId, 'participants');
          const participantsSnap = await getDocs(participantsColRef);
          const ghostThreshold = Date.now() - 90000;      // 90s for normal users
          const seatedGhostThreshold = Date.now() - 300000; // 5 min for seated users (generous)
          const purgeBatch = writeBatch(firestore);
          let activeCount = 0;
          let ghostsFound = 0;
          const roomDocSnap = await getDoc(roomDocRef);
          const roomOwnerId = roomDocSnap.data()?.ownerId;

          participantsSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            const lastSeen = data.lastSeen?.toDate?.()?.getTime?.() || 0;
            const isSeated = typeof data.seatIndex === 'number' && data.seatIndex >= 0;

            // Owner and current user: never purge
            if (data.uid === roomOwnerId || data.uid === uid) {
              activeCount++;
              return;
            }

            // Seated user: use longer threshold (5 min) — they might just be in background
            if (isSeated) {
              if (lastSeen < seatedGhostThreshold) {
                purgeBatch.delete(docSnap.ref);
                ghostsFound++;
              } else {
                activeCount++;
              }
              return;
            }

            // Normal user: 90s threshold
            if (lastSeen < ghostThreshold) {
              purgeBatch.delete(docSnap.ref);
              ghostsFound++;
            } else {
              activeCount++;
            }
          });

          // Always fix participantCount (corrects drift from missed increments/decrements)
          if (ghostsFound > 0 || activeCount !== (roomDocSnap.data()?.participantCount || 0)) {
            purgeBatch.update(roomDocRef, {
              participantCount: activeCount,
              updatedAt: serverTimestamp(),
            });
            await purgeBatch.commit();
          }
        } catch (error) {}
      }, 20000);

    } // end owner-only ghost purge

    const presencePath = `roomPresence/${roomId}/${uid}`;
    presenceRef.current = ref(database, presencePath);
    
    // Skip RTDB presence if roomInvisible is enabled
    if (!userProfile?.roomInvisible) {
      set(presenceRef.current, {
        uid,
        name: userProfile?.username || 'User',
        avatarUrl: filterBase64(userProfile?.avatarUrl) || user.photoURL || '',
        joinedAt: dbServerTimestamp(),
        lastSeen: dbServerTimestamp(),
        isOnline: true,
      });
      
      onDisconnect(presenceRef.current).remove();
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Keep presence alive in background — update lastSeen instead of deleting
        if (presenceRef.current && !userProfile?.roomInvisible) {
          update(presenceRef.current, { lastSeen: dbServerTimestamp(), isBackground: true }).catch(() => {});
        }
      } else if (nextAppState === 'active') {
        // Update Firestore lastSeen immediately on foreground
        setDocumentNonBlocking(participantRef, { lastSeen: serverTimestamp() }, { merge: true });
        // Re-establish RTDB presence on foreground
        if (presenceRef.current && !userProfile?.roomInvisible) {
          update(presenceRef.current, {
            lastSeen: dbServerTimestamp(),
            isOnline: true,
            isBackground: false,
          }).catch(() => {});
          onDisconnect(presenceRef.current).remove();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (cleanupInterval.current) clearInterval(cleanupInterval.current);
      if (purgeInterval.current) clearInterval(purgeInterval.current);
      subscription.remove();

      // Only keep presence if user is still in THIS specific room (e.g., minimized)
      // If user switched to a different room, old room must be cleaned up immediately
      const currentActive = latestRoomRef.current.activeRoomId;
      const currentMinimized = latestRoomRef.current.minimizedRoomId;
      const isStillInThisRoom = currentActive === roomId || currentMinimized === roomId;

      if (isStillInThisRoom) {
        // Room is just being minimized — keep RTDB presence alive
        if (presenceRef.current && !userProfile?.roomInvisible) {
          set(presenceRef.current, {
            uid,
            name: userProfile?.username || 'User',
            avatarUrl: filterBase64(userProfile?.avatarUrl) || user.photoURL || '',
            joinedAt: dbServerTimestamp(),
            lastSeen: dbServerTimestamp(),
            isOnline: true,
          }).catch(() => {});
        }
        return;
      }

      // Truly exited — first mark offline immediately (home screen will stop counting within 30s),
      // then remove the node entirely
      if (presenceRef.current) {
        update(presenceRef.current, { isOnline: false, lastSeen: dbServerTimestamp() }).catch(() => {});
        set(presenceRef.current, null).catch(() => {});
      }

      // Allow re-entry notification only when truly leaving
      enteredRooms.delete(roomId);
      entranceSentForRooms.delete(roomId);


      // Immediate cleanup — delete participant doc for ALL users (including owner) when switching rooms
      // Owner flag only means don't delete the ROOM, not that they can stay as a participant ghost
      (async () => {
        try {
          if (!hasCleanedUpRef.current) {
            hasCleanedUpRef.current = true;

            const existingDoc = await getDoc(participantRef);
            if (existingDoc.exists()) {
              await deleteDoc(participantRef);
              // Only decrement count for non-owners (owner's count managed by purge)
              if (!isOwner) {
                updateDocumentNonBlocking(roomDocRef, {
                  participantCount: increment(-1),
                });
              }
            }

            // Update user's currentRoomId to new room (or null) immediately
            const newRoomId = latestRoomRef.current.activeRoomId || latestRoomRef.current.minimizedRoomId;
            updateDocumentNonBlocking(userRef, {
              currentRoomId: newRoomId || null,
              isOnline: true,
            });
            updateDocumentNonBlocking(profileRef, {
              currentRoomId: newRoomId || null,
              isOnline: true,
            });
          }
        } catch (error) {}
        hasJoinedRef.current = false;
        lastRoomId.current = null;
      })();

    };
  }, [firestore, activeRoom?.id, minimizedRoom?.id, user?.uid, database]);

  // Delayed entrance: if userProfile wasn't loaded when room was joined, send entrance now
  useEffect(() => {
    const roomId = (activeRoom || minimizedRoom)?.id;
    if (!firestore || !roomId || !user?.uid || !database) return;
    if (!userProfile?.username || userProfile?.roomInvisible) return;
    // Module-level Set persists across unmount/remount (unlike useRef which resets)
    if (entranceSentForRooms.has(roomId)) return;

    entranceSentForRooms.add(roomId);
    const uid = user.uid;

    const inventoryEntryType = userProfile?.inventory?.activeEntryEffect || null;
    const entryType = userProfile?.svipPrivileges?.entranceType || inventoryEntryType;
    const entryVideoUrl = userProfile?.svipPrivileges?.entranceUrl || userProfile?.inventory?.activeEntryVideoUrl;

    const newMsgRef = push(ref(database, `roomMessages/${roomId}`));
    set(newMsgRef, {
      id: newMsgRef.key,
      type: 'entrance',
      senderId: uid,
      senderName: userProfile.username,
      senderAvatar: filterBase64(userProfile?.avatarUrl) || user.photoURL || null,
      mediaUrl: filterBase64(userProfile?.svipPrivileges?.entranceUrl || userProfile?.inventory?.activeEntryVideoUrl) || null,
      entryEffectType: entryType,
      entryVideoUrl: filterBase64(entryVideoUrl),
      content: 'entered the room',
      timestamp: Date.now(),
    }).catch(() => {});

    addDocumentNonBlocking(collection(firestore, 'chatRooms', roomId, 'messages'), {
      type: 'entrance',
      senderId: uid,
      senderName: userProfile.username,
      senderAvatar: filterBase64(userProfile?.avatarUrl) || user.photoURL || null,
      mediaUrl: filterBase64(userProfile?.svipPrivileges?.entranceUrl || userProfile?.inventory?.activeEntryVideoUrl) || null,
      entryEffectType: entryType,
      entryVideoUrl: filterBase64(entryVideoUrl),
      content: 'entered the room',
      timestamp: serverTimestamp(),
    }).catch(() => {});
  }, [userProfile?.username, userProfile?.inventory?.activeEntryEffect, userProfile?.inventory?.activeEntryVideoUrl, activeRoom?.id, minimizedRoom?.id]);

  useEffect(() => {
    if (!firestore || !activeRoom?.id || !user?.uid || !userProfile) return;

    const currentMeta = JSON.stringify({
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl,
      activeFrame: userProfile.inventory?.activeFrame,
      activeFrameMediaUrl: userProfile.inventory?.activeFrameMediaUrl,
      activeBubble: userProfile.inventory?.activeBubble,
      accountNumber: userProfile.accountNumber,
    });

    if (currentMeta === lastSyncMetadata.current) return;

    const timeout = setTimeout(() => {
      const participantRef = doc(firestore, 'chatRooms', activeRoom.id, 'participants', user.uid);
      setDocumentNonBlocking(participantRef, {
        name: userProfile.username || null,
        avatarUrl: userProfile.avatarUrl || null,
        activeFrame: userProfile.inventory?.activeFrame || null,
        activeFrameMediaUrl: userProfile.inventory?.activeFrameMediaUrl || null,
        activeBubble: userProfile.inventory?.activeBubble || null,
        accountNumber: userProfile.accountNumber || '',
        lastSeen: serverTimestamp(),
      }, { merge: true });
      lastSyncMetadata.current = currentMeta;
    }, 800);

    return () => clearTimeout(timeout);
  }, [userProfile, userProfile?.avatarUrl, userProfile?.username, firestore, activeRoom?.id, user?.uid]);
}
