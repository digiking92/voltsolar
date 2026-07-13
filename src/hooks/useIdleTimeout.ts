import { useEffect, useRef } from 'react';

const IDLE_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'visibilitychange',
] as const;

/**
 * Calls onIdle after `timeoutMs` of no user activity.
 * Only active while `enabled` is true.
 */
export function useIdleTimeout(
  timeoutMs: number,
  onIdle: () => void,
  enabled: boolean
) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    for (const event of IDLE_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }
    reset();

    return () => {
      clearTimeout(timer);
      for (const event of IDLE_EVENTS) {
        window.removeEventListener(event, reset);
      }
    };
  }, [timeoutMs, enabled]);
}
