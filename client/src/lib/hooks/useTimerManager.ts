import { useRef, useEffect, useCallback } from 'react';

/**
 * Tracks every setTimeout registered through it and cancels all pending
 * timers when the component unmounts. Prevents stale callbacks from firing
 * against disposed Babylon.js objects during template switches or navigation.
 */
export function useTimerManager() {
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(id => clearTimeout(id));
      timers.clear();
    };
  }, []);

  const safeSetTimeout = useCallback((fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, delay);
    timersRef.current.add(id);
    return id;
  }, []);

  const safeClearTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timersRef.current.delete(id);
  }, []);

  return { safeSetTimeout, safeClearTimeout };
}
