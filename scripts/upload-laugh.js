const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function upload() {
  const local = 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_laugh_v2.gif';
  const remote = 'store/emoji_laugh_v2.gif';
  
  await bucket.upload(local, { destination: remote, metadata: { contentType: 'image/gif', cacheControl: 'no-cache' } });
  const url = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(remote)}?alt=media`;
  await firestore.collection('customEmojis').doc('S14dzgrn79tpQWBZYJdo').update({ animationUrl: url });
  console.log('Laugh uploaded!');
}

upload().catch(console.error);
