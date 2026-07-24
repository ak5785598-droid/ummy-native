const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('D:/Ummy_Dev_Live/functions/serviceAccountKey.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const projectId = serviceAccount.project_id;

async function addSHA() {
  const res = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/androidApps`,
    { headers: { Authorization: `Bearer ${(await app.options.credential.getAccessToken()).access_token}` } }
  );
  const data = await res.json();
  
  if (!data.androidApps) { console.log('No apps found'); process.exit(1); }
  
  for (const androidApp of data.androidApps) {
    if (androidApp.packageName !== 'app.vercel.ummy_chat.twa') continue;
    console.log(`Found app: ${androidApp.name} (${androidApp.packageName})`);
    
    const shaRes = await fetch(
      `https://firebase.googleapis.com/v1beta1/${androidApp.name}/sha`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await app.options.credential.getAccessToken()).access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cert: {
            sha1: 'e312b4e3bd1328a5c9a4b6721eae7e3ca35392c4',
            sha256: '5cd4e856170bfa9d4c6f804a4eec8b80ced6b53707d196f6a67d172d61861284',
          },
        }),
      }
    );
    const shaData = await shaRes.json();
    console.log('Result:', JSON.stringify(shaData, null, 2));
  }
  process.exit(0);
}

addSHA().catch(err => { console.error('Error:', err.message); process.exit(1); });
