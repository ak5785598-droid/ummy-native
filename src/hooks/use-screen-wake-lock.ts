import { useEffect, useRef } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function useScreenWakeLock(active: boolean) {
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (active && !isActiveRef.current) {
      isActiveRef.current = true;
      try {
        activateKeepAwakeAsync().catch(() => {});
      } catch (e: any) {
      }
    } else if (!active && isActiveRef.current) {
      isActiveRef.current = false;
      try {
        deactivateKeepAwake();
      } catch (e: any) {
      }
    }
    return () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        try {
          deactivateKeepAwake();
        } catch (e: any) {
        }
      }
    };
  }, [active]);
}
