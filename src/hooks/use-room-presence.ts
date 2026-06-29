import { useEffect, useRef } from 'react';
import { useFirestore, useUser, useDatabase } from '../firebase/provider';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, writeBatch, increment, collection, getDocs, query, where } from '@/firebase/firestore-compat';
import { ref, set, onDisconnect, onValue, remove, push, serverTimestamp as dbServerTimestamp } from 'firebase/database';
import { AppState, AppStateStatus } from 'react-native';
import { setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '../lib/non-blocking-writes';
import { Room, User } from '../lib/types';

const enteredRooms = new Set<string>();

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
  const presenceRef = useRef<any>(null);
  const latestRoomRef = useRef<{ activeRoomId: string | null; minimizedRoomId: string | null }>({
    activeRoomId: null,
    minimizedRoomId: null,
  });
  const lastSyncMetadata = useRef<string>('');

  useEffect(() => {
    const sessionRoom = activeRoom || minimizedRoom;
    const roomId = sessionRoom?.id;
    
    latestRoomRef.current = {
      activeRoomId: activeRoom?.id || null,
      minimizedRoomId: minimizedRoom?.id || null,
    };

    if (!firestore || !user?.uid || !roomId || !database) return;

    const uid = user.uid;
    const isOwner = sessionRoom?.ownerId === uid;
    const participantRef = doc(firestore, 'chatRooms', roomId, 'participants', uid);
    const roomDocRef = doc(firestore, 'chatRooms', roomId);
    const userRef = doc(firestore, 'users', uid);
    const profileRef = doc(firestore, 'users', uid, 'profile', uid);

    const performJoin = async () => {
      try {
        const batch = writeBatch(firestore);

        // Use set+merge directly — no need for getDoc check
        batch.set(participantRef, {
          uid,
          name: userProfile?.username || user.displayName || 'Anonymous',
          avatarUrl: userProfile?.avatarUrl || user.photoURL || '',
          activeFrame: userProfile?.inventory?.activeFrame || null,
          activeFrameMediaUrl: userProfile?.inventory?.activeFrameMediaUrl || null,
          activeWave: null,
          activeBubble: userProfile?.inventory?.activeBubble || null,
          activeIdBadge: null,
          lastSeen: serverTimestamp(),
          isMuted: false,
          accountNumber: userProfile?.accountNumber || '',
          gender: userProfile?.gender || null,
        }, { merge: true });

        batch.set(roomDocRef, {
          participantCount: increment(1),
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
      } catch (error) {
      }
    };

    if (lastRoomId.current !== roomId || !hasJoinedRef.current) {
      if (!enteredRooms.has(roomId)) {
        enteredRooms.add(roomId);
        performJoin();

        // Skip entrance message if roomInvisible is enabled
        if (!userProfile?.roomInvisible) {
          const entryType = userProfile?.inventory?.activeEntryEffect || null;
          const entryVideoUrl = userProfile?.inventory?.activeEntryVideoUrl || null;
          
          const newMsgRef = push(ref(database, `roomMessages/${roomId}`));
          set(newMsgRef, {
            id: newMsgRef.key,
            type: 'entrance', 
            senderId: uid, 
            senderName: userProfile?.username || user.displayName || 'Anonymous',
            senderAvatar: userProfile?.avatarUrl || user.photoURL || null,
            mediaUrl: userProfile?.inventory?.activeEntryMediaUrl || null,
            entryEffectType: entryType,
            entryVideoUrl: entryVideoUrl,
            content: 'entered the room', 
            timestamp: Date.now(),
          }).catch(() => {});
        }
      } else {
        setDocumentNonBlocking(participantRef, {
          lastSeen: serverTimestamp(),
          name: userProfile?.username || user.displayName || 'Anonymous',
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
    }, 60000);

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

          // Ghost purge: delete stale participants (lastSeen > 10 minutes ago)
          const participantsColRef = collection(firestore, 'chatRooms', roomId, 'participants');
          const participantsSnap = await getDocs(participantsColRef);
          const ghostThreshold = Date.now() - 600000; // 10 minutes
          const purgeBatch = writeBatch(firestore);
          let activeCount = 0;
          const roomDocSnap = await getDoc(roomDocRef);
          const roomOwnerId = roomDocSnap.data()?.ownerId;

          participantsSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            const lastSeen = data.lastSeen?.toDate?.()?.getTime?.() || 0;
            if (data.uid === roomOwnerId) {
              activeCount++;
              return;
            }
            if (lastSeen < ghostThreshold) {
              purgeBatch.delete(docSnap.ref);
            } else {
              activeCount++;
            }
          });

          purgeBatch.update(roomDocRef, {
            participantCount: activeCount,
            updatedAt: serverTimestamp(),
          });
          await purgeBatch.commit();
          
        } catch (error) {
        }
      }, 300000);
    }

    const presencePath = `roomPresence/${roomId}/${uid}`;
    presenceRef.current = ref(database, presencePath);
    
    // Skip RTDB presence if roomInvisible is enabled
    if (!userProfile?.roomInvisible) {
      set(presenceRef.current, {
        uid,
        name: userProfile?.username || user.displayName || 'Anonymous',
        avatarUrl: userProfile?.avatarUrl || user.photoURL || '',
        joinedAt: dbServerTimestamp(),
        lastSeen: dbServerTimestamp(),
        isOnline: true,
      });
      
      onDisconnect(presenceRef.current).remove();
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        if (presenceRef.current) {
          set(presenceRef.current, null);
        }
      } else if (nextAppState === 'active') {
        if (presenceRef.current && !userProfile?.roomInvisible) {
          set(presenceRef.current, {
            uid,
            name: userProfile?.username || user.displayName || 'Anonymous',
            avatarUrl: userProfile?.avatarUrl || user.photoURL || '',
            joinedAt: dbServerTimestamp(),
            lastSeen: dbServerTimestamp(),
            isOnline: true,
          });
          onDisconnect(presenceRef.current).remove();
        }
        setDocumentNonBlocking(participantRef, { lastSeen: serverTimestamp() }, { merge: true });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (cleanupInterval.current) clearInterval(cleanupInterval.current);
      subscription.remove();

      if (presenceRef.current) {
        set(presenceRef.current, null);
      }

      // Immediate cleanup - no delay to prevent ghost participants
      const currentActive = latestRoomRef.current.activeRoomId;
      const currentMinimized = latestRoomRef.current.minimizedRoomId;
      
      if (!currentActive && !currentMinimized) {
        (async () => {
          try {
            const existingDoc = await getDoc(participantRef);
            if (existingDoc.exists()) {
              await deleteDoc(participantRef);
              updateDocumentNonBlocking(roomDocRef, {
                participantCount: increment(-1),
              });
            }
            updateDocumentNonBlocking(userRef, {
              currentRoomId: null,
            });
            updateDocumentNonBlocking(profileRef, {
              currentRoomId: null,
            });
          } catch (error) {
          }
          hasJoinedRef.current = false;
          lastRoomId.current = null;
          enteredRooms.delete(roomId);
        })();
      }
    };
  }, [firestore, activeRoom?.id, minimizedRoom?.id, user?.uid, database]);

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
