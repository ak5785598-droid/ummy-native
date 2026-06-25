const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function update() {
  await firestore.collection('customEmojis').doc('h638U2zXKaTxJeq9naqK').update({ zoom: 2.4 });
  console.log('Music zoom set to 2.4!');
}

update().catch(console.error);
