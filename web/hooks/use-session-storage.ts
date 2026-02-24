'use client';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export interface UseSessionStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseSessionStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { serializer = JSON.stringify, deserializer = JSON.parse as (v: string) => T } = options;

  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
    try {
      const item = window.sessionStorage.getItem(key);
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

  useEffect(() => {
    try {
      const serialized = serializer(storedValue);
      window.sessionStorage.setItem(key, serialized);
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue, serializer]);

  const remove = () => {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setStoredValue, remove];
}
