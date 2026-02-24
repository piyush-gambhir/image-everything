'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const valueRef = useRef<{ previous: T | undefined; current: T }>({
    previous: undefined,
    current: value,
  });

  // Store to track changes
  const store = useMemo(() => {
    const listeners = new Set<() => void>();

    return {
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      getSnapshot: () => valueRef.current.previous,
      notify: () => listeners.forEach((l) => l()),
    };
  }, []);

  useEffect(() => {
    if (valueRef.current.current !== value) {
      valueRef.current.previous = valueRef.current.current;
      valueRef.current.current = value;
      store.notify();
    }
  }, [value, store]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => undefined);
}
