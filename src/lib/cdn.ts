/**
 * Utility to proxy Firebase Storage image/gif URLs through a free,
 * open-source CDN caching proxy (weserv.nl) backed by Cloudflare.
 *
 * This reduces Firebase Storage network egress bandwidth usage to near 0,
 * keeping the app within Firebase's free tier.
 */
export function toCDN(url: any): any {
  if (!url || typeof url !== 'string') return url;
  
  // Only intercept Firebase Storage URLs
  if (url.includes('firebasestorage.googleapis.com')) {
    // Encoded original URL
    let cdnUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
    
    // Check if the file is an animated GIF (like boutique frames or avatars)
    // and append &n=-1 to preserve all animation frames
    if (url.toLowerCase().includes('.gif') || url.toLowerCase().includes('gif') || url.includes('%2fgif')) {
      cdnUrl += '&n=-1';
    }
    
    // For PNG files, preserve transparency by outputting as PNG
    if (url.toLowerCase().includes('.png') || url.includes('.png')) {
      cdnUrl += '&output=png';
    }
    
    return cdnUrl;
  }
  
  return url;
}
