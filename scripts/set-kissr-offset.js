const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function update() {
  await firestore.collection('customEmojis').doc('t1rU93HNSqQqQaCsd5zo').update({ offsetX: 9 });
  console.log('Kiss R offsetX set to 9!');
}

update().catch(console.error);
