const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

async function upload() {
  const local = 'C:\\Users\\HP\\Downloads\\anim_1781247871000_1000136317.gif';
  const remote = 'store/emoji_thanks_original.gif';
  
  console.log('Uploading Thanks original...');
  await bucket.upload(local, {
    destination: remote,
    metadata: { contentType: 'image/gif', cacheControl: 'no-cache' },
  });
  
  const url = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(remote)}?alt=media`;
  
  await firestore.collection('customEmojis').doc('EfbhhMcsydH2SUh963Fy').update({ animationUrl: url, zoom: 2.4 });
  console.log('Thanks uploaded + zoom 2.4!');
}

upload().catch(console.error);
