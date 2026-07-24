const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const serviceAccount = require('D:/Ummy_Dev_Live/functions/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'studio-7826224327-e0efc.firebasestorage.app'
});

const bucket = getStorage().bucket();
const apkPath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-arm64-v8a-release.apk');
const destination = 'releases/v1.3.0/app-arm64-v8a-release.apk';

async function upload() {
  console.log('Uploading APK to Firebase Storage...');
  console.log('From:', apkPath);
  console.log('To:', destination);
  
  await bucket.upload(apkPath, {
    destination,
    metadata: {
      contentType: 'application/vnd.android.package-archive',
      cacheControl: 'public, max-age=3600',
    }
  });
  
  console.log('Upload complete!');
  console.log('URL: https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/releases%2Fv1.3.0%2Fapp-arm64-v8a-release.apk?alt=media');
  process.exit(0);
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
