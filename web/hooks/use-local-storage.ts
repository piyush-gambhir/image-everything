'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

export interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  sync?: boolean; // sync state across tabs via storage events
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse as (v: string) => T,
    sync = true,
  } = options;

  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item == null) {
        return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
      }
      return deserializer(item);
    } catch (error) {
      console.error(error);
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Track if we should skip the first sync (component just mounted)
  const isMountedRef = useRef(false);

  useEffect(() => {
    // Skip writing to localStorage on first render (already read from it)
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    try {
      const serialized = serializer(storedValue);
      window.localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('useLocalStorage write error:', error);
    }
  }, [key, storedValue, serializer]);

  useEffect(() => {
    if (!sync) return;

    const handler = (e: StorageEvent) => {
      // Only react to changes for our specific key
      if (e.key !== key) return;

      // Handle removal
      if (e.newValue === null) {
        setStoredValue(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        return;
      }

      // Handle updates from other tabs
      try {
        const next = deserializer(e.newValue);
        setStoredValue(next);
      } catch (err) {
        console.error('useLocalStorage sync error:', err);
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, deserializer, sync, initialValue]);

  const remove = () => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setStoredValue, remove];
}
