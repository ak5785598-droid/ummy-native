const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function bustCache() {
  const docId = 't35UmyxnoeblPwPb7u6J';
  const newUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Femoji_thinking_crop_v2.gif?alt=media&t=' + Date.now();
  
  await firestore.collection('customEmojis').doc(docId).update({ animationUrl: newUrl });
  console.log('Updated:', newUrl);
}

bustCache().catch(console.error);
