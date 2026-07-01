import { useEffect, useRef } from 'react';

export function useScreenWakeLock(active: boolean) {
  const isActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const activate = async () => {
      try {
        const { activateKeepAwakeAsync } = await import('expo-keep-awake');
        if (!cancelled) await activateKeepAwakeAsync();
      } catch {}
    };

    const deactivate = async () => {
      try {
        const { deactivateKeepAwake } = await import('expo-keep-awake');
        deactivateKeepAwake();
      } catch {}
    };

    if (active && !isActiveRef.current) {
      isActiveRef.current = true;
      activate();
    } else if (!active && isActiveRef.current) {
      isActiveRef.current = false;
      deactivate();
    }

    return () => {
      cancelled = true;
      if (isActiveRef.current) {
        isActiveRef.current = false;
        deactivate();
      }
    };
  }, [active]);
}
