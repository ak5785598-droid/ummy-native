/**
 * BACKFILL SCRIPT: Copy dailyGifts → weeklyGifts & monthlyGifts for all chatRooms
 * Run once: node backfill-room-gifts.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "studio-7826224327-e0efc",
  appId: "1:373109833688:web:3d2b2206498d18610bfcad",
  apiKey: "AIzaSyBo-PRXO7y9tpcz7-g0BW0ToW22z7I-HvA",
  authDomain: "studio-7826224327-e0efc.firebaseapp.com",
  storageBucket: "studio-7826224327-e0efc.firebasestorage.app",
  messagingSenderId: "373109833688",
};

async function backfill() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('🔍 Fetching all chatRooms...');
  const snapshot = await getDocs(collection(db, 'chatRooms'));

  const rooms = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const dailyGifts = data?.stats?.dailyGifts || 0;
    const weeklyGifts = data?.stats?.weeklyGifts || 0;
    const monthlyGifts = data?.stats?.monthlyGifts || 0;

    // Only update rooms where dailyGifts > 0 and weekly/monthly is missing or less
    if (dailyGifts > 0 && (weeklyGifts === 0 || monthlyGifts === 0)) {
      rooms.push({ id: docSnap.id, dailyGifts, weeklyGifts, monthlyGifts });
    }
  });

  console.log(`📦 Found ${rooms.length} rooms to backfill out of ${snapshot.size} total rooms.`);

  if (rooms.length === 0) {
    console.log('✅ Nothing to backfill. All rooms already have weekly/monthly data.');
    process.exit(0);
  }

  // Firestore batch limit is 500 per batch
  const BATCH_SIZE = 400;
  let totalUpdated = 0;

  for (let i = 0; i < rooms.length; i += BATCH_SIZE) {
    const chunk = rooms.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(({ id, dailyGifts, weeklyGifts, monthlyGifts }) => {
      const roomRef = doc(db, 'chatRooms', id);
      const updates = {};

      // Only set if currently 0 (don't overwrite existing weekly/monthly data)
      if (weeklyGifts === 0) updates['stats.weeklyGifts'] = dailyGifts;
      if (monthlyGifts === 0) updates['stats.monthlyGifts'] = dailyGifts;

      if (Object.keys(updates).length > 0) {
        batch.update(roomRef, updates);
        console.log(`  ✏️  Room ${id}: dailyGifts=${dailyGifts} → weeklyGifts=${weeklyGifts === 0 ? dailyGifts : 'skip'}, monthlyGifts=${monthlyGifts === 0 ? dailyGifts : 'skip'}`);
      }
    });

    await batch.commit();
    totalUpdated += chunk.length;
    console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${totalUpdated}/${rooms.length} rooms)`);
  }

  console.log(`\n🎉 Backfill complete! ${totalUpdated} rooms updated.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('❌ Error during backfill:', err);
  process.exit(1);
});
