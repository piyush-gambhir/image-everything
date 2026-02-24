'use client';

import { useEffect, useRef, useState } from 'react';

type WindowSize = { width: number; height: number };

export function useWindowSize(throttleMs = 0): WindowSize {
  const getSize = (): WindowSize => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [windowSize, setWindowSize] = useState<WindowSize>(getSize);
  const lastCalled = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const now = Date.now();
      if (throttleMs > 0 && now - lastCalled.current < throttleMs) return;
      lastCalled.current = now;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setWindowSize(getSize()));
    };
    window.addEventListener('resize', handleResize);
    // Call once to ensure up-to-date size
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [throttleMs]);

  return windowSize;
}
