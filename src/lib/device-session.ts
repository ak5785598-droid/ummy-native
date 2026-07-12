import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, serverTimestamp } from '@/firebase/firestore-compat';

const DEVICE_ID_KEY = '@ummy_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function registerDeviceSession(firestore: any, uid: string): Promise<void> {
  const deviceId = await getOrCreateDeviceId();
  const userRef = doc(firestore, 'users', uid);
  await setDoc(userRef, {
    activeDeviceId: deviceId,
    lastLoginAt: serverTimestamp(),
  }, { merge: true });
}

export async function isCurrentDeviceActive(firestore: any, uid: string): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const userRef = doc(firestore, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return true;
    const data = snap.data() as any;
    if (!data.activeDeviceId) return true;
    return data.activeDeviceId === deviceId;
  } catch {
    return true;
  }
}
