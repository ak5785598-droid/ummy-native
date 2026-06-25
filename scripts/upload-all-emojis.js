const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

const emojis = [
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_thanks.gif', remote: 'store/emoji_thanks.gif', docId: 'EfbhhMcsydH2SUh963Fy', name: 'Thanks' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_giftme.gif', remote: 'store/emoji_giftme.gif', docId: '83UDNt8SKo7fk8EArKh0', name: 'Gift Me' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_kissr.gif', remote: 'store/emoji_kissr.gif', docId: 't1rU93HNSqQqQaCsd5zo', name: 'Kiss R' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_sad.gif', remote: 'store/emoji_sad.gif', docId: 'UughlTYb4u0wXPS5dQCU', name: 'Sad' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_party.gif', remote: 'store/emoji_party.gif', docId: 'hZEZWXY4WQWH0sLqYfKf', name: 'Party' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_laugh.gif', remote: 'store/emoji_laugh.gif', docId: 'S14dzgrn79tpQWBZYJdo', name: 'Laugh' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_dance.gif', remote: 'store/emoji_dance.gif', docId: 'VoCDHLOo4DKaHtWQ17Wl', name: 'Dance' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_music.gif', remote: 'store/emoji_music.gif', docId: 'h638U2zXKaTxJeq9naqK', name: 'Music' },
];

async function uploadAll() {
  for (const e of emojis) {
    try {
      console.log(`Uploading ${e.name}...`);
      await bucket.upload(e.local, {
        destination: e.remote,
        metadata: { contentType: 'image/gif', cacheControl: 'no-cache' },
      });
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(e.remote)}?alt=media`;
      await firestore.collection('customEmojis').doc(e.docId).update({ animationUrl: downloadUrl });
      console.log(`  Done: ${e.name} (${e.docId})`);
    } catch (err) {
      console.error(`  FAILED: ${e.name} - ${err.message}`);
    }
  }
  console.log('\nAll 8 emojis uploaded!');
}

uploadAll().catch(console.error);
