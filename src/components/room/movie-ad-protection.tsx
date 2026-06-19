import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';

interface MovieAdProtectionProps {
  isOpen: boolean;
  videoUrl?: string | null;
  iframeRef?: any;
  onAdBlocked?: () => void;
}

export function MovieAdProtection({ isOpen, videoUrl, iframeRef, onAdBlocked }: MovieAdProtectionProps) {
  const pollRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !videoUrl) return;
    pollRef.current = setInterval(() => {
      if (!iframeRef?.current) return;
      try {
        const currentUrl = iframeRef.current.source?.uri || '';
        if (currentUrl && currentUrl !== videoUrl && !currentUrl.includes(videoUrl)) {
          iframeRef.current.source = { uri: videoUrl };
          onAdBlocked?.();
        }
      } catch {}
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, videoUrl]);

  return null;
}
