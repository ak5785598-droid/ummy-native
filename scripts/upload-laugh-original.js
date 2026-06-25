const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function upload() {
  const local = 'C:\\Users\\HP\\Downloads\\anim_1781269949442_1000136389.gif';
  const remote = 'store/emoji_laugh_original.gif';
  
  console.log('Uploading Laugh original...');
  await bucket.upload(local, {
    destination: remote,
    metadata: { contentType: 'image/gif', cacheControl: 'no-cache' },
  });
  
  const url = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(remote)}?alt=media`;
  console.log('URL:', url);
  
  await firestore.collection('customEmojis').doc('S14dzgrn79tpQWBZYJdo').update({ animationUrl: url });
  console.log('Laugh updated!');
}

upload().catch(console.error);
