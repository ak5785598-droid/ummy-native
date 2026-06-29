import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const TAG_TO_MEDAL: Record<string, string> = {
  'Official': 'official-1',
  'Admin': 'admin',
  'Super Admin': 'admin',
  'Seller': 'coin-seller',
  'Seller center': 'coin-seller',
  'Coin Seller': 'coin-seller',
  'CS': 'cs',
  'Customer Service': 'cs',
  'CS Leader': 'cs',
};

export async function autoAssignMedals(firestore: any, uid: string): Promise<string[]> {
  if (!firestore || !uid) return [];

  try {
    const profileRef = doc(firestore, 'users', uid, 'profile', uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return [];

    const data = snap.data();
    const tags: string[] = data.tags || [];
    const currentMedals: string[] = data.medals || [];
    const newMedals: string[] = [];

    for (const tag of tags) {
      const medalId = TAG_TO_MEDAL[tag];
      if (medalId && !currentMedals.includes(medalId)) {
        newMedals.push(medalId);
      }
    }

    if (newMedals.length > 0) {
      await updateDoc(profileRef, {
        medals: arrayUnion(...newMedals),
      });
    }

    return newMedals;
  } catch (e) {
    return [];
  }
}
