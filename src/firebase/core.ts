import { firebaseConfig } from './config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, persistentLocalCache, persistentSingleTabManager } from '@/firebase/firestore-compat';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import rnfbStorage from '@react-native-firebase/storage';

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: FirebaseAuthTypes.Module | null = null;
let storageInstance: FirebaseStorage | null = null;
let databaseInstance: Database | null = null;

export function initializeFirebase() {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!authInstance) {
    // Using @react-native-firebase/auth for true native authentication
    authInstance = auth();
    // Disable Play Integrity for debug builds (Phone Auth)
    if (__DEV__) {
      try {
        authInstance.settings.appVerificationDisabledForTesting = true;
        console.log('[Firebase Core] Phone Auth verification disabled for debug');
      } catch (e) {
        console.warn('[Firebase Core] Could not disable verification:', e);
      }
    }
  }

  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(appInstance, {
        experimentalAutoDetectLongPolling: true,
        experimentalForceLongPolling: false
      });
      console.log('[Firebase Core] Firestore initialized with memory cache for React Native');
    } catch (e: any) {
      console.warn('[Firebase Core] Initialization issue, using default:', e);
      firestoreInstance = getFirestore(appInstance);
    }
  }

  if (!storageInstance) {
    storageInstance = getStorage(appInstance);
  }

  if (!databaseInstance) {
    databaseInstance = getDatabase(appInstance);
  }

  return {
    firebaseApp: appInstance,
    auth: authInstance,
    firestore: firestoreInstance,
    storage: storageInstance,
    database: databaseInstance
  };
}

export function getSdks() {
  return initializeFirebase();
}
