'use client';

import { useCallback, useState } from 'react';

export function useBoolean(initial = false) {
  const [value, setValue] = useState<boolean>(initial);
  const on = useCallback(() => setValue(true), []);
  const off = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((v: boolean) => setValue(v), []);
  return { value, on, off, toggle, set } as const;
}
