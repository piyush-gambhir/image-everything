'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useEventCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef<T>(fn);

  useEffect(() => {
    ref.current = fn;
  });

  const stableCallback = useCallback(
    (...args: Parameters<T>): ReturnType<T> => ref.current(...args) as ReturnType<T>,
    [],
  );

  return stableCallback as T;
}
