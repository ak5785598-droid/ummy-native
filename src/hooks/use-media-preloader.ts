import { useEffect, useRef } from 'react';
import { Image } from 'react-native';

export function useMediaPreloader(giftAnimations: string[] = [], frameUrls: string[] = []) {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const allUrls = [...giftAnimations, ...frameUrls].filter(Boolean);
    allUrls.forEach(url => {
      if (!preloadedRef.current.has(url)) {
        preloadedRef.current.add(url);
        Image.prefetch(url).catch(() => {});
      }
    });
  }, [giftAnimations.join(','), frameUrls.join(',')]);
}
