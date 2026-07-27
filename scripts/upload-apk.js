const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
// Latest service account key (downloaded June 28)
const serviceAccount = require('C:/Users/HP/Downloads/studio-7826224327-e0efc-firebase-adminsdk-fbsvc-e47b01b686.json');

const VERSION = 'v1.1.0';
const DEST_PATH = `releases/${VERSION}/app-release.apk`;
const ENCODED = encodeURIComponent(DEST_PATH).replace(/%2F/g, '%2F');
const DOWNLOAD_URL = `https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/${ENCODED}?alt=media`;

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'studio-7826224327-e0efc.firebasestorage.app'
});

const bucket = getStorage().bucket();
const apkPath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

async function upload() {
  console.log('📦 Uploading APK to Firebase Storage...');
  console.log('From:', apkPath);
  console.log('To:', DEST_PATH);
  
  await bucket.upload(apkPath, {
    destination: DEST_PATH,
    metadata: {
      contentType: 'application/vnd.android.package-archive',
      cacheControl: 'public, max-age=3600',
    }
  });
  
  console.log('✅ Upload complete!');
  console.log('🔗 Download URL:', DOWNLOAD_URL);
  process.exit(0);
}

upload().catch(err => {
  console.error('❌ Upload failed:', err.message);
  process.exit(1);
});
