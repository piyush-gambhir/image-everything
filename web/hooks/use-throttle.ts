'use client';

import { useEffect, useRef, useState } from 'react';

export function useThrottle<T>(value: T, delay: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastRan = useRef<number | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();

    const handler = () => {
      setThrottled(value);
      lastRan.current = Date.now();
    };

    if (lastRan.current === null) {
      handler();
      return;
    }

    const remaining = delay - (now - lastRan.current);
    if (remaining <= 0) {
      handler();
    } else {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(handler, remaining);
    }
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [value, delay]);

  return throttled;
}
