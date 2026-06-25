import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type Firestore = FirebaseFirestoreTypes.Module;
export type DocumentReference = FirebaseFirestoreTypes.DocumentReference;
export type CollectionReference = FirebaseFirestoreTypes.CollectionReference;
export type WriteBatch = FirebaseFirestoreTypes.WriteBatch;
export type Timestamp = FirebaseFirestoreTypes.Timestamp;

export const initializeFirestore = (app: any, settings: any) => firestore();
export const getFirestore = (app?: any) => firestore();

export const persistentLocalCache = (settings: any) => null;
export const persistentSingleTabManager = (settings: any) => null;

/**
 * collection(db, 'chatRooms')
 * collection(docRef, 'participants')
 */
export const collection = (dbOrDoc: any, ...paths: string[]) => {
  const fullPath = paths.join('/');
  // If it's a document reference (has non-empty .path), prepend it
  if (dbOrDoc && typeof dbOrDoc.path === 'string' && dbOrDoc.path.length > 0) {
    return firestore().collection(`${dbOrDoc.path}/${fullPath}`);
  }
  // It's the Firestore DB module itself
  return firestore().collection(fullPath);
};

/**
 * doc(db, 'chatRooms', roomId, 'participants', uid)
 * doc(collectionRef, docId)
 */
export const doc = (dbOrCol: any, ...paths: string[]) => {
  // No paths = generate new doc id on a collection ref
  if (paths.length === 0) {
    if (dbOrCol && typeof dbOrCol.doc === 'function') return dbOrCol.doc();
    return firestore().doc('');
  }

  const fullPath = paths.join('/');

  // Collection/doc reference has a non-empty .path — prepend it
  // The RN Firebase DB module itself has NO .path property
  if (dbOrCol && typeof dbOrCol.path === 'string' && dbOrCol.path.length > 0) {
    return firestore().doc(`${dbOrCol.path}/${fullPath}`);
  }

  // dbOrCol is the Firestore DB module — build path directly
  return firestore().doc(fullPath);
};

export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();
export const increment = (n: number) => firestore.FieldValue.increment(n);
export const arrayUnion = (...els: any[]) => firestore.FieldValue.arrayUnion(...els);
export const arrayRemove = (...els: any[]) => firestore.FieldValue.arrayRemove(...els);

export const getDoc = (ref: any) => ref.get();
export const getDocs = (ref: any) => ref.get();

export const setDoc = (ref: any, data: any, options?: { merge?: boolean }) => {
  if (options?.merge) return ref.set(data, { merge: true });
  return ref.set(data);
};

export const updateDoc = (ref: any, data: any) => ref.update(data);
export const deleteDoc = (ref: any) => ref.delete();
export const addDoc = (ref: any, data: any) => ref.add(data);

export const writeBatch = (db: any) => firestore().batch();
export const runTransaction = (db: any, updateFunction: any) => firestore().runTransaction(updateFunction);

export const query = (ref: any, ...constraints: any[]) => {
  let q = ref;
  for (const c of constraints) {
    if (c.type === 'where') q = q.where(c.field, c.op, c.val);
    if (c.type === 'orderBy') q = q.orderBy(c.field, c.dir);
    if (c.type === 'limit') q = q.limit(c.limit);
  }
  return q;
};

export const where = (field: string, op: any, val: any) => ({ type: 'where', field, op, val });
export const orderBy = (field: string, dir: string = 'asc') => ({ type: 'orderBy', field, dir });
export const limit = (n: number) => ({ type: 'limit', limit: n });
export const onSnapshot = (ref: any, onNext: any, onError?: any) => ref.onSnapshot(onNext, onError);

export const Timestamp = {
  fromDate: (date: Date) => firestore.Timestamp.fromDate(date),
  now: () => firestore.Timestamp.now(),
  fromMillis: (ms: number) => firestore.Timestamp.fromMillis(ms)
};

export const deleteField = () => firestore.FieldValue.delete();
