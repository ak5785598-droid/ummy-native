import { useEffect, useRef } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function useScreenWakeLock(active: boolean) {
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (active && !isActiveRef.current) {
      isActiveRef.current = true;
      activateKeepAwakeAsync().catch(() => {});
    } else if (!active && isActiveRef.current) {
      isActiveRef.current = false;
      deactivateKeepAwake();
    }
    return () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        deactivateKeepAwake();
      }
    };
  }, [active]);
}
