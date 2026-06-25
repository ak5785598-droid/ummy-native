import { useEffect, useRef } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function useScreenWakeLock(active: boolean) {
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (active && !isActiveRef.current) {
      isActiveRef.current = true;
      try {
        activateKeepAwakeAsync().catch((err) => {
          console.warn('KeepAwake activate failed:', err.message || String(err));
        });
      } catch (e: any) {
        console.warn('KeepAwake activate failed:', e.message || String(e));
      }
    } else if (!active && isActiveRef.current) {
      isActiveRef.current = false;
      try {
        deactivateKeepAwake();
      } catch (e: any) {
        console.warn('KeepAwake deactivate failed:', e.message || String(e));
      }
    }
    return () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        try {
          deactivateKeepAwake();
        } catch (e: any) {
          console.warn('KeepAwake cleanup failed:', e.message || String(e));
        }
      }
    };
  }, [active]);
}
