import * as Crypto from 'expo-crypto';

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
  return new Uint8Array(buffer);
}

async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const blockSize = 64;
  let keyPadded: Uint8Array;
  if (key.length > blockSize) {
    keyPadded = new Uint8Array(await sha256(key));
  } else {
    keyPadded = new Uint8Array(blockSize);
    keyPadded.set(key);
  }

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyPadded[i] ^ 0x36;
    opad[i] = keyPadded[i] ^ 0x5c;
  }

  const inner = new Uint8Array(blockSize + message.length);
  inner.set(ipad);
  inner.set(message, blockSize);
  const innerHash = await sha256(inner);

  const outer = new Uint8Array(blockSize + 32);
  outer.set(opad);
  outer.set(innerHash, blockSize);
  return sha256(outer);
}

function generateSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    salt[i] = Math.floor(Math.random() * 256);
  }
  return salt;
}

function packUInt32(val: number): Uint8Array {
  return new Uint8Array([
    val & 0xff,
    (val >> 8) & 0xff,
    (val >> 16) & 0xff,
    (val >> 24) & 0xff,
  ]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  expiredTs: number
): Promise<string> {
  const VERSION = 1;
  const SALT_LENGTH = 16;
  const SIGN_LENGTH = 32;

  const salt = generateSalt();
  const appIdBytes = new TextEncoder().encode(appId);
  const certBytes = new TextEncoder().encode(appCertificate);
  const channelNameBytes = new TextEncoder().encode(channelName);

  // Step 1: signing = salt + certificate (concatenated)
  const signing = new Uint8Array(SALT_LENGTH + certBytes.length);
  signing.set(salt, 0);
  signing.set(certBytes, SALT_LENGTH);

  // Step 2: key = HMAC-SHA256(signing, appID)
  const key = await hmacSha256(signing, appIdBytes);

  // Step 3: content = channelName + \0 + pack(uid) + \0 + pack(expired)
  const uidBytes = packUInt32(uid);
  const expiredBytes = packUInt32(expiredTs);
  const content = new Uint8Array(channelNameBytes.length + 1 + 4 + 1 + 4);
  let offset = 0;
  content.set(channelNameBytes, offset);
  offset += channelNameBytes.length;
  content[offset++] = 0;
  content.set(uidBytes, offset);
  offset += 4;
  content[offset++] = 0;
  content.set(expiredBytes, offset);

  // Step 4: signature = HMAC-SHA256(key, content)
  const signature = await hmacSha256(key, content);

  // Step 5: token = version + salt + signature
  const token = new Uint8Array(1 + SALT_LENGTH + SIGN_LENGTH);
  token[0] = VERSION;
  token.set(salt, 1);
  token.set(signature, 1 + SALT_LENGTH);

  return toBase64(token);
}

export async function getRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  ttlSeconds: number = 86400
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiredTs = now + ttlSeconds;
  return generateRtcToken(appId, appCertificate, channelName, uid, expiredTs);
}
