import * as FileSystem from 'expo-file-system';

/**
 * Resolves a remote network URL to a cached local file path.
 * If the file is not yet cached, it downloads it in the background.
 */
export async function getCachedFile(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith('http')) {
    return url || null;
  }

  try {
    // Generate a unique filename by extracting the path and hashing/sanitizing
    const cleanUrl = url.split('?')[0];
    const extension = cleanUrl.split('.').pop() || 'tmp';
    
    // Create a safe unique filename based on the URL hash
    let hash = 0;
    for (let i = 0; i < cleanUrl.length; i++) {
      hash = (hash << 5) - hash + cleanUrl.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const filename = `cached_asset_${Math.abs(hash)}.${extension}`;
    const cacheDir = FileSystem.cacheDirectory + 'ummy_assets/';
    const localUri = cacheDir + filename;

    // Check directory existence
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }

    // Check file existence
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      return localUri;
    }

    // Download to local storage
    const downloadResult = await FileSystem.downloadAsync(url, localUri);
    return downloadResult.uri;
  } catch (error) {
    console.warn('[CacheManager] Error caching asset:', url, error);
    return url; // fallback to the remote url
  }
}
