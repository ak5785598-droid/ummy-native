const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function listEmojis() {
  const snapshot = await firestore.collection('customEmojis').get();
  console.log(`Total customEmojis: ${snapshot.docs.length}\n`);
  snapshot.docs.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  name: ${d.name}`);
    console.log(`  imageUrl: ${d.imageUrl || 'NONE'}`);
    console.log(`  animationUrl: ${d.animationUrl || 'NONE'}`);
    console.log(`  url: ${d.url || 'NONE'}`);
    console.log('');
  });
}

listEmojis().catch(console.error);
