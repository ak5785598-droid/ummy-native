const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function revert() {
  const url = 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Femoji_welcome_v3.gif?alt=media';
  await firestore.collection('customEmojis').doc('1oLTGKcm6zWRPwxTch6w').update({ animationUrl: url });
  console.log('Welcome reverted to v3!');
}

revert().catch(console.error);
