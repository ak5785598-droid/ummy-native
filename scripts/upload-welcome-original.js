const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function upload() {
  const local = 'C:\\Users\\HP\\Downloads\\anim_1781169053836_1000135828-ezgif.com-effects.gif';
  const remote = 'store/emoji_welcome_original.gif';
  
  console.log('Uploading original Welcome...');
  await bucket.upload(local, {
    destination: remote,
    metadata: { contentType: 'image/gif', cacheControl: 'no-cache' },
  });
  
  const url = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(remote)}?alt=media`;
  console.log('URL:', url);
  
  await firestore.collection('customEmojis').doc('1oLTGKcm6zWRPwxTch6w').update({ animationUrl: url });
  console.log('Firestore updated!');
}

upload().catch(console.error);
