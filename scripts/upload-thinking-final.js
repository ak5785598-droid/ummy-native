const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function uploadFinal() {
  const localPath = 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_thinking_final.gif';
  const remotePath = 'store/emoji_thinking_final.gif';

  console.log('Uploading...');
  await bucket.upload(localPath, {
    destination: remotePath,
    metadata: { contentType: 'image/gif', cacheControl: 'no-cache' },
  });

  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(remotePath)}?alt=media`;
  console.log('URL:', downloadUrl);

  const docId = 't35UmyxnoeblPwPb7u6J';
  await firestore.collection('customEmojis').doc(docId).update({ animationUrl: downloadUrl });
  console.log('Firestore updated!');
}

uploadFinal().catch(console.error);
