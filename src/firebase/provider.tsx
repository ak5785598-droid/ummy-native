'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, DependencyList } from 'react';
import { onSnapshot } from '@/firebase/firestore-compat';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from '@/firebase/firestore-compat';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Database } from 'firebase/database';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: FirebaseAuthTypes.Module;
  storage: FirebaseStorage;
  database: Database;
}

interface UserAuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: FirebaseAuthTypes.Module | null;
  storage: FirebaseStorage | null;
  database: Database | null;
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  isHydrated: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser extends FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: FirebaseAuthTypes.Module;
  storage: FirebaseStorage;
  database: Database;
}

// Define a stable, 'empty' default state for the context to prevent 'undefined' crashes during SSR.
export const FirebaseContext = createContext<FirebaseContextState>({
  areServicesAvailable: false,
  firebaseApp: null,
  firestore: null,
  auth: null,
  storage: null,
  database: null,
  user: null,
  isLoading: true,
  isHydrated: false,
  userError: null
});

/**
 * HIGH-SECURITY FIREBASE PROVIDER.
 * Re-locked for React 18 Hydration Safety (#310).
 */
export function FirebaseProvider({ children, firebaseApp, firestore, auth, storage, database }: FirebaseProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isLoading: true,
    userError: null
  });

  // 1. HYDRATION LOCK (With Atomic Buffer to prevent redirect-pulse crashes)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 10); // REDUCED FROM 100ms to 10ms to fix blinking
    return () => clearTimeout(timer);
  }, []);

  // 2. AUTH STATE LISTENER (Deferred until after buffer to prevent 310)
  useEffect(() => {
    if (!mounted || !auth) return;

    try {
      const unsubscribe = (auth as any).onAuthStateChanged(
        (firebaseUser: any) => setUserAuthState({ user: firebaseUser, isLoading: false, userError: null }),
        (err: any) => setUserAuthState({ user: null, isLoading: false, userError: err })
      );
      return () => unsubscribe();
    } catch (e) {
    }
  }, [mounted, auth]);

  const contextValue = useMemo(() => ({
    areServicesAvailable: !!(firebaseApp || typeof window === 'undefined'),
    firebaseApp: firebaseApp || null,
    firestore: firestore || null,
    auth: auth || null,
    storage: storage || null,
    database: database || null,
    user: mounted ? userAuthState.user : null,
    isLoading: mounted ? userAuthState.isLoading : true,
    isHydrated: mounted,
    userError: mounted ? userAuthState.userError : null
  }), [firebaseApp, firestore, auth, storage, database, userAuthState, mounted]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

// ACCESS HOOKS
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  return context as FirebaseServicesAndUser;
};

// 3. SERVICE ACCESS HOOKS
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useStorage = () => useFirebase().storage;
export const useDatabase = () => useFirebase().database;
export const useUser = () => {
  const { user, isHydrated, isLoading: isAuthLoading, userError } = useFirebase();
  return { 
    user, 
    isLoading: isAuthLoading || !isHydrated, 
    isUserLoading: isAuthLoading || !isHydrated, 
    userError 
  };
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

// 4. SHARED LISTENER REGISTRY
// Prevents duplicate Firestore connections for the same document/query path.
const sharedDocListeners = new Map<string, {
  unsubscribe: () => void;
  subscribers: Set<{ setData: (data: any) => void; setIsLoading: (loading: boolean) => void; setError: (err: any) => void }>;
  currentData: any;
  isLoading: boolean;
  error: any;
}>();

export function useDoc<T = any>(docRef: any, options?: { suppressGlobalError?: boolean }) {
  const { isHydrated } = useFirebase();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docRef || !isHydrated) {
      setIsLoading(!isHydrated);
      return;
    }

    const path = docRef.path;
    let listener = sharedDocListeners.get(path);

    const subscriber = { setData, setIsLoading, setError };

    if (!listener) {
      // Create new shared listener
      let unsubscribe: () => void;
      
      const newListener = {
        unsubscribe: () => {}, // placeholder
        subscribers: new Set([subscriber]),
        currentData: null as any,
        isLoading: true,
        error: null as any
      };
      
      sharedDocListeners.set(path, newListener);

      unsubscribe = onSnapshot(docRef, 
        (snapshot: any) => {
          const docData = (typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists) ? ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as T : null;
          const l = sharedDocListeners.get(path);
          if (l) {
            l.currentData = docData;
            l.isLoading = false;
            l.error = null;
            l.subscribers.forEach(sub => {
              sub.setData(docData);
              sub.setIsLoading(false);
              sub.setError(null);
            });
          }
        },
        (err: any) => {
          const l = sharedDocListeners.get(path);
          if (l) {
            l.error = err;
            l.isLoading = false;
            l.subscribers.forEach(sub => {
              sub.setError(err);
              sub.setIsLoading(false);
            });
          }
        }
      );

      newListener.unsubscribe = unsubscribe;
    } else {
      // Attach to existing listener
      listener.subscribers.add(subscriber);
      // Sync current state immediately
      setData(listener.currentData);
      setIsLoading(listener.isLoading);
      setError(listener.error);
    }

    return () => {
      const l = sharedDocListeners.get(path);
      if (l) {
        l.subscribers.delete(subscriber);
        if (l.subscribers.size === 0) {
          l.unsubscribe();
          sharedDocListeners.delete(path);
        }
      }
    };
  }, [docRef?.path, isHydrated]);

  return { data, isLoading: !isHydrated || isLoading, error };
}

function serializeQuery(query: any): string {
  if (!query) return '';
  try {
    // @react-native-firebase query: extract constraints from native object
    // These queries have .path but also expose ._modifiers or similar
    // We MUST NOT return just 'coll:path' — different filters → different key
    
    let path = '';
    let filters = '';
    let orders = '';
    let lim = '';

    // Try RN Firebase native query structure
    if (query._modifiers) {
      path = query._collectionPath?.relativeName || query.path || '';
      const mods = query._modifiers;
      if (mods.filters)  filters = JSON.stringify(mods.filters);
      if (mods.orders)   orders  = JSON.stringify(mods.orders);
      if (mods.limit != null) lim = String(mods.limit);
    } else if (query.path && typeof query.path === 'string') {
      // Fallback: use path + stringify the whole query to get uniqueness
      path = query.path;
      // Include field constraints via toString for uniqueness
      try { filters = JSON.stringify(query); } catch { filters = String(query); }
    } else {
      // Web SDK query structure
      const internal = query._query || query;
      path = internal.path?.toString() || '';
      const rawFilters = internal.filters || internal._filters || [];
      filters = rawFilters.map((f: any) => {
        const prop = f.field?.toString() || f.property?.toString() || f._field?.toString() || '';
        const op   = f.op?.toString()    || f.operator?.toString()  || f._op?.toString()    || '';
        const val  = f.value?.toString?.() || String(f.value ?? f._val ?? '');
        return `${prop}:${op}:${val}`;
      }).join(',') || '';
      const rawOrders = internal.explicitOrderBy || internal.orders || internal._orders || [];
      orders = rawOrders.map((o: any) => {
        const field = o.field?.toString() || o._field?.toString() || '';
        const dir   = o.dir?.toString()   || o.direction?.toString() || o._direction?.toString() || '';
        return `${field}:${dir}`;
      }).join(',') || '';
      lim = String(internal.limit ?? internal._limit ?? '');
    }

    return `path:${path}|f:${filters}|o:${orders}|l:${lim}`;
  } catch (e) {
    // Last resort: use object identity via counter
    return String(query);
  }
}

export function useCollection<T = any>(query: any, options?: { silent?: boolean }) {
  const { isHydrated } = useFirebase();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use serialized string as stable key for effect dependency
  const queryKey = useMemo(() => {
    return serializeQuery(query);
  }, [query]);

  useEffect(() => {
    if (!query || !isHydrated) {
      setIsLoading(!isHydrated);
      return;
    }

    setIsLoading(true);

    // Simple 2-arg onSnapshot — works with both web SDK and @react-native-firebase
    const unsubscribe = onSnapshot(
      query,
      (snapshot: any) => {
        const docs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as T[];
        setData(docs);
        setIsLoading(false);
        setError(null);
      },
      (err: any) => {
        if (!options?.silent) setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, isHydrated]);

  return { data, isLoading: !isHydrated || isLoading, error };
}



