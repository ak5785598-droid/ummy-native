import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useFirestore } from '../firebase/provider';
import { doc, collection, serverTimestamp, increment, writeBatch, onSnapshot } from '@/firebase/firestore-compat';
import { setDocumentNonBlocking } from '../lib/non-blocking-writes';
import { RoomParticipant } from '../lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROOM_TASKS = [
  { id: 'mic_10', title: 'Speak 10 min on mic', target: 10, reward: 500, category: 'mic' },
  { id: 'mic_30', title: 'Speak 30 min on mic', target: 30, reward: 1500, category: 'mic' },
  { id: 'mic_60', title: 'Speak 60 min on mic', target: 60, reward: 3000, category: 'mic' },
  { id: 'entry_3', title: 'Room 3 entries', target: 3, reward: 200, category: 'traffic' },
  { id: 'entry_10', title: 'Room 10 entries', target: 10, reward: 800, category: 'traffic' },
  { id: 'invite_1', title: 'Invite 1 to mic', target: 1, reward: 300, category: 'invite' },
  { id: 'invite_10', title: 'Invite 10 to mic', target: 10, reward: 2000, category: 'invite' },
  { id: 'sim_mic_1', title: '3 users on mic 1 min', target: 1, reward: 400, category: 'mic' },
  { id: 'sim_mic_10', title: '3 users on mic 10 min', target: 10, reward: 2000, category: 'mic' },
  { id: 'sim_mic_new_5', title: '3 new users on mic 5 min', target: 5, reward: 1500, category: 'mic' },
];

export function useRoomTasks(roomId: string, participants: RoomParticipant[], roomOwnerId: string, isModerator: boolean) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});
  const [achievedTasks, setAchievedTasks] = useState<string[]>([]);
  const [claimedTasks, setClaimedTasks] = useState<string[]>([]);
  const [resetTrigger, setResetTrigger] = useState(0);

  const taskProgressRef = useRef<Record<string, number>>({});
  const claimedTasksRef = useRef<string[]>([]);
  const micTimerRef = useRef<any>(null);
  const simMicTimerRef = useRef<any>(null);
  const prevIsMeOnMic = useRef<boolean>(false);
  const prevHasThreeOnMic = useRef<boolean>(false);
  const uniqueEntries = useRef<Set<string>>(new Set());
  const prevSeatOccupants = useRef<string[]>([]);

  useEffect(() => {
    taskProgressRef.current = taskProgress;
    claimedTasksRef.current = claimedTasks;
  }, [taskProgress, claimedTasks]);

  useEffect(() => {
    const checkReset = async () => {
      const now = new Date();
      const istNow = new Date(now.getTime() + 5.5 * 3600000);
      const hour = istNow.getHours();
      const min = istNow.getMinutes();
      const today = now.toISOString().split('T')[0];
      const lastReset = 'lastResetDate';
      const stored = await AsyncStorage.getItem(lastReset);
      if ((hour > 5 || (hour === 5 && min >= 30)) && stored !== today) {
        await AsyncStorage.setItem(lastReset, today);
        setResetTrigger(p => p + 1);
        setTaskProgress({});
        setAchievedTasks([]);
        setClaimedTasks([]);
        uniqueEntries.current.clear();
        prevSeatOccupants.current = [];
      }
    };
    checkReset();
    const interval = setInterval(checkReset, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!firestore || !user?.uid) return;
    const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const today = istNow.toISOString().split('T')[0];
    const questsRef = collection(firestore, 'users', user.uid, 'roomQuests');
    const unsub = onSnapshot(questsRef, (snap: any) => {
      const data: Record<string, number> = {};
      const achieved: string[] = [];
      const claimed: string[] = [];
      snap.docs.forEach((doc: any) => {
        const d = doc.data({ serverTimestamps: 'estimate' });
        const updatedAt = d.updatedAt?.toDate();
        if (updatedAt) {
          const istUpdate = new Date(updatedAt.getTime() + (5.5 * 60 * 60 * 1000));
          const updatedAtKey = istUpdate.toISOString().split('T')[0];
          
          if (updatedAtKey === today) {
            data[doc.id] = d.current || 0;
            if (d.isCompleted) achieved.push(doc.id);
            if (d.isClaimed) claimed.push(doc.id);
          }
        }
      });
      const fullProgress: Record<string, number> = {};
      ROOM_TASKS.forEach(t => { fullProgress[t.id] = data[t.id] || 0; });
      setTaskProgress(fullProgress);
      setAchievedTasks(achieved);
      setClaimedTasks(claimed);
    });
    return () => unsub();
  }, [firestore, user?.uid, resetTrigger]);

  const updateTask = useCallback(async (taskId: string, incrementBy: number = 1) => {
    if (!firestore || !user?.uid) return;
    const task = ROOM_TASKS.find(t => t.id === taskId);
    if (!task || claimedTasksRef.current.includes(taskId)) return;
    const currentVal = (taskProgressRef.current[taskId] || 0) + incrementBy;
    const isNowComplete = currentVal >= task.target;
    const taskRef = doc(firestore, 'users', user.uid, 'roomQuests', taskId);
    await setDocumentNonBlocking(taskRef, { current: currentVal, target: task.target, isCompleted: isNowComplete, isClaimed: claimedTasksRef.current.includes(taskId), updatedAt: serverTimestamp() }, { merge: true });
  }, [firestore, user?.uid]);

  const claimTask = useCallback(async (taskId: string) => {
    if (!firestore || !user?.uid) return;
    const task = ROOM_TASKS.find(t => t.id === taskId);
    if (!task || claimedTasksRef.current.includes(taskId)) return;
    const isAchieved = achievedTasks.includes(taskId) || (taskProgressRef.current[taskId] || 0) >= task.target;
    if (!isAchieved) return;
    try {
      const batch = writeBatch(firestore);
      const taskRef = doc(firestore, 'users', user.uid, 'roomQuests', taskId);
      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      batch.update(taskRef, { isClaimed: true, updatedAt: serverTimestamp() });
      batch.set(userRef, { wallet: { coins: increment(task.reward) }, updatedAt: serverTimestamp() }, { merge: true });
      batch.set(profileRef, { wallet: { coins: increment(task.reward) }, updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
    } catch (e) {}
  }, [firestore, user?.uid, achievedTasks]);

  useEffect(() => {
    if (!user?.uid || !participants) return;
    const isMeOnMic = participants.some(p => p.uid === user.uid && p.seatIndex > 0);
    if (isMeOnMic && !prevIsMeOnMic.current) {
      if (micTimerRef.current) clearInterval(micTimerRef.current);
      micTimerRef.current = setInterval(() => { updateTask('mic_10', 1); updateTask('mic_30', 1); updateTask('mic_60', 1); }, 300000);
    } else if (!isMeOnMic && prevIsMeOnMic.current) {
      if (micTimerRef.current) { clearInterval(micTimerRef.current); micTimerRef.current = null; }
    }
    prevIsMeOnMic.current = isMeOnMic;
    return () => { if (micTimerRef.current) clearInterval(micTimerRef.current); };
  }, [participants, user?.uid, updateTask]);

  useEffect(() => {
    const usersOnMic = participants?.filter(p => p.seatIndex > 0) || [];
    const hasThreeOnMic = usersOnMic.length >= 3;
    if (hasThreeOnMic && !prevHasThreeOnMic.current) {
      if (simMicTimerRef.current) clearInterval(simMicTimerRef.current);
      simMicTimerRef.current = setInterval(() => {
        updateTask('sim_mic_1', 1); updateTask('sim_mic_10', 1);
        const newUsers = (participants || []).filter(p => p.seatIndex > 0 && p.joinedAt?.toDate?.() && (Date.now() - p.joinedAt.toDate().getTime()) < 86400000).length;
        if (newUsers >= 3) updateTask('sim_mic_new_5', 1);
      }, 300000);
    } else if (!hasThreeOnMic && prevHasThreeOnMic.current) {
      if (simMicTimerRef.current) { clearInterval(simMicTimerRef.current); simMicTimerRef.current = null; }
    }
    prevHasThreeOnMic.current = hasThreeOnMic;
    return () => { if (simMicTimerRef.current) clearInterval(simMicTimerRef.current); };
  }, [participants, updateTask]);

  useEffect(() => {
    if (!participants || !user?.uid) return;
    participants.forEach(p => {
      if (!uniqueEntries.current.has(p.uid)) {
        uniqueEntries.current.add(p.uid);
        const count = uniqueEntries.current.size;
        if (count === 3) updateTask('entry_3');
        if (count === 10) updateTask('entry_10');
      }
    });
    const currentOnMic = participants.filter(p => p.seatIndex > 0).map(p => p.uid);
    const isAdmin = roomOwnerId === user?.uid || isModerator;
    if (isAdmin) {
      const newOnMic = currentOnMic.filter(uid => !prevSeatOccupants.current.includes(uid));
      newOnMic.forEach(() => { updateTask('invite_1'); updateTask('invite_10'); });
    }
    prevSeatOccupants.current = currentOnMic;
  }, [participants, user?.uid, roomOwnerId, isModerator, updateTask]);

  return { taskProgress, achievedTasks, claimedTasks, claimTask, triggerTask: updateTask, totalTasks: ROOM_TASKS.length, completedTasks: achievedTasks.length };
}
