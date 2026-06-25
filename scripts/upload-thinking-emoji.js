const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function uploadThinkingEmoji() {
  const localPath = 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_thinking_fixed.gif';
  const remotePath = 'store/emoji_thinking_crop.gif';

  console.log('Uploading GIF to Firebase Storage...');
  await bucket.upload(localPath, {
    destination: remotePath,
    metadata: { contentType: 'image/gif', cacheControl: 'public, max-age=31536000' },
  });
  console.log('Uploaded to:', remotePath);

  const [url] = await bucket.file(remotePath).getSignedUrl({ action: 'read', expires: '2099-01-01' });
  console.log('URL:', url);

  const docId = 't35UmyxnoeblPwPb7u6J';
  await firestore.collection('customEmojis').doc(docId).update({ animationUrl: url });
  console.log('Firestore updated:', docId);
  console.log('Done!');
}

uploadThinkingEmoji().catch(console.error);
