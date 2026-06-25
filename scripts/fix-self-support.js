const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function fixSelfSupport() {
  const snapshot = await firestore.collection('supporters').get();
  let deleted = 0;
  let kept = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.receiverId && data.supporterId && data.receiverId === data.supporterId) {
      await doc.ref.delete();
      deleted++;
      console.log(`DELETED self-support: ${doc.id} (${data.supporterName})`);
    } else {
      kept++;
    }
  }

  console.log(`\nDone! Deleted: ${deleted} self-support records, Kept: ${kept} others`);
}

fixSelfSupport().catch(console.error);
