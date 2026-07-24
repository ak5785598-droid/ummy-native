/**
 * BACKFILL SCRIPT (Admin SDK): Copy dailyGifts → weeklyGifts & monthlyGifts
 * Run: node backfill-room-gifts-admin.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:/Users/HP/Downloads/studio-7826224327-e0efc-firebase-adminsdk-fbsvc-e47b01b686.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();


async function backfill() {
  console.log('🔍 Fetching all chatRooms...');
  const snapshot = await db.collection('chatRooms').get();

  const toUpdate = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const dailyGifts = data?.stats?.dailyGifts || 0;
    const weeklyGifts = data?.stats?.weeklyGifts || 0;
    const monthlyGifts = data?.stats?.monthlyGifts || 0;

    if (dailyGifts > 0 && (weeklyGifts === 0 || monthlyGifts === 0)) {
      toUpdate.push({ id: docSnap.id, dailyGifts, weeklyGifts, monthlyGifts });
    }
  });

  console.log(`📦 ${toUpdate.length} rooms to backfill out of ${snapshot.size} total.`);

  if (toUpdate.length === 0) {
    console.log('✅ Nothing to backfill!');
    process.exit(0);
  }

  const BATCH_SIZE = 400;
  let totalUpdated = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    chunk.forEach(({ id, dailyGifts, weeklyGifts, monthlyGifts }) => {
      const ref = db.collection('chatRooms').doc(id);
      const updates = {};
      if (weeklyGifts === 0) updates['stats.weeklyGifts'] = dailyGifts;
      if (monthlyGifts === 0) updates['stats.monthlyGifts'] = dailyGifts;

      if (Object.keys(updates).length > 0) {
        batch.update(ref, updates);
        console.log(`  ✏️  Room ${id}: dailyGifts=${dailyGifts} → ${JSON.stringify(updates)}`);
      }
    });

    await batch.commit();
    totalUpdated += chunk.length;
    console.log(`✅ Batch committed (${totalUpdated}/${toUpdate.length})`);
  }

  console.log(`\n🎉 Done! ${totalUpdated} rooms updated.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
