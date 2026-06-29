import { firebaseConfig } from './config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, persistentLocalCache, persistentSingleTabManager } from '@/firebase/firestore-compat';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import rnfbStorage from '@react-native-firebase/storage';
import appCheck from '@react-native-firebase/app-check';

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: FirebaseAuthTypes.Module | null = null;
let storageInstance: FirebaseStorage | null = null;
let databaseInstance: Database | null = null;

export function initializeFirebase() {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  // Initialize App Check FIRST (before Auth)
  // Debug token from AndroidManifest meta-data is used automatically
  try {
    const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: '69803CB5-0640-4DD0-A9DA-9BC789E78E1F',
      },
      apple: { provider: 'deviceCheck' },
      isTokenAutoRefreshEnabled: true,
    });
    appCheck().initializeAppCheck({ provider: rnfbProvider, isTokenAutoRefreshEnabled: true });
  } catch (e) {
  }

  if (!authInstance) {
    // Using @react-native-firebase/auth for true native authentication
    // reCAPTCHA webview handles verification for non-Play-Store builds
    authInstance = auth();
  }


  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(appInstance, {
        experimentalAutoDetectLongPolling: true,
        experimentalForceLongPolling: false
      });
    } catch (e: any) {
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
