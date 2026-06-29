import { doc, setDoc, updateDoc, addDoc, deleteDoc, collection, DocumentReference, CollectionReference, WriteBatch } from '@/firebase/firestore-compat';

export async function setDocumentNonBlocking(
  docRef: DocumentReference,
  data: any,
  options?: { merge?: boolean }
): Promise<void> {
  try {
    await setDoc(docRef, data, options);
  } catch (error: any) {
  }
}

export async function updateDocumentNonBlocking(
  docRef: DocumentReference,
  data: any
): Promise<void> {
  try {
    await updateDoc(docRef, data);
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.code === 'firestore/not-found') {
    } else {
      throw error;
    }
  }
}

export async function addDocumentNonBlocking(
  collectionRef: CollectionReference,
  data: any
): Promise<string | null> {
  try {
    const docRef = await addDoc(collectionRef, data);
    return docRef.id;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
    } else {
      throw error;
    }
    return null;
  }
}

export async function deleteDocumentNonBlocking(
  docRef: DocumentReference
): Promise<void> {
  try {
    await deleteDoc(docRef);
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
    } else {
      throw error;
    }
  }
}
