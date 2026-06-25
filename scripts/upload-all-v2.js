const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('C:\\Users\\HP\\Downloads\\studio-7826224327-e0efc-firebase-adminsdk-fbsvc-4874ece0a1.json');

initializeApp({ credential: cert(serviceAccount), storageBucket: 'studio-7826224327-e0efc.firebasestorage.app' });
const firestore = getFirestore();
const bucket = getStorage().bucket();

const emojis = [
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_thanks_v3.gif', remote: 'store/emoji_thanks_v3.gif', docId: 'EfbhhMcsydH2SUh963Fy', name: 'Thanks' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_giftme_v3.gif', remote: 'store/emoji_giftme_v3.gif', docId: '83UDNt8SKo7fk8EArKh0', name: 'Gift Me' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_kissr_v2.gif', remote: 'store/emoji_kissr_v2.gif', docId: 't1rU93HNSqQqQaCsd5zo', name: 'Kiss R' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_sad_v2.gif', remote: 'store/emoji_sad_v2.gif', docId: 'UughlTYb4u0wXPS5dQCU', name: 'Sad' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_party_v2.gif', remote: 'store/emoji_party_v2.gif', docId: 'hZEZWXY4WQWH0sLqYfKf', name: 'Party' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_dance_v2.gif', remote: 'store/emoji_dance_v2.gif', docId: 'VoCDHLOo4DKaHtWQ17Wl', name: 'Dance' },
  { local: 'D:\\Ummy_Dev_Live\\ummy-native\\emoji_music_v2.gif', remote: 'store/emoji_music_v2.gif', docId: 'h638U2zXKaTxJeq9naqK', name: 'Music' },
];

async function uploadAll() {
  for (const e of emojis) {
    try {
      await bucket.upload(e.local, { destination: e.remote, metadata: { contentType: 'image/gif', cacheControl: 'no-cache' } });
      const url = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${encodeURIComponent(e.remote)}?alt=media`;
      await firestore.collection('customEmojis').doc(e.docId).update({ animationUrl: url });
      console.log(`Done: ${e.name}`);
    } catch (err) {
      console.error(`FAILED: ${e.name} - ${err.message}`);
    }
  }
  console.log('All uploaded!');
}

uploadAll().catch(console.error);
