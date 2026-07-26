// ============================================================
// Agora Token — fetched from Cloudflare Worker (server-side)
// App Certificate is stored as a Cloudflare Worker secret.
// This file NO LONGER contains any sensitive credentials.
// ============================================================

const TOKEN_SERVER = 'https://ummy-ota.ak5785598.workers.dev';

/**
 * Fetch an Agora AccessToken2 (007 format) from the server.
 * Server generates proper HMAC-SHA256 signed token using App Certificate.
 */
export async function getRtcToken(
  appId: string,
  _appCertificate: string,  // ignored — certificate lives on the server
  channelName: string,
  uid: number,
  ttlSeconds: number = 86400
): Promise<string> {
  try {
    const url = `${TOKEN_SERVER}/api/agora-token?channel=${encodeURIComponent(channelName)}&uid=${uid}&role=publisher&ttl=${ttlSeconds}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AgoraToken] Server error:', err);
      throw new Error(`Token server returned ${response.status}`);
    }

    const data = await response.json() as { token: string; expires: number };
    console.log('[AgoraToken] Got token from server, expires:', new Date(data.expires * 1000).toISOString());
    return data.token;
  } catch (err) {
    console.error('[AgoraToken] Failed to fetch token:', err);
    throw err;
  }
}

// Keep export for backwards compatibility (not used anymore)
export async function generateRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  expiredTs: number
): Promise<string> {
  return getRtcToken(appId, appCertificate, channelName, uid, expiredTs - Math.floor(Date.now() / 1000));
}
