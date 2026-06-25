const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function fixUrl() {
  const docId = 't35UmyxnoeblPwPb7u6J';
  const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Femoji_thinking_crop.gif?alt=media';
  
  await firestore.collection('customEmojis').doc(docId).update({ animationUrl: downloadUrl });
  console.log('Updated to stable URL:', downloadUrl);
}

fixUrl().catch(console.error);
