'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseFetchOptions<T> {
  init?: RequestInit;
  parser?: (response: Response) => Promise<T>;
  deps?: unknown[];
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: unknown) => void;
}

/**
 * Custom hook for data fetching with automatic cancellation and error handling.
 *
 * NOTE: For production apps, consider using SWR or React Query for better
 * request deduplication, caching, and performance optimization.
 *
 * @see https://swr.vercel.app/ - Recommended for most use cases
 */
export function useFetch<T = unknown>(url: string, options: UseFetchOptions<T> = {}) {
  const { init, parser, deps = [], immediate = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Serialize init to avoid re-renders on object changes
  const initStr = init ? JSON.stringify(init) : '';

  const doFetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const initObj = initStr ? (JSON.parse(initStr) as RequestInit) : {};
      const response = await fetch(url, { ...initObj, signal: controller.signal });

      // Check for non-2xx responses (fetch doesn't throw on 404, 500, etc.)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const parseFn = parser ?? ((res: Response) => res.json() as Promise<T>);
      const result = await parseFn(response);
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const isAbortError =
        err instanceof DOMException
          ? err.name === 'AbortError'
          : typeof err === 'object' &&
            err !== null &&
            'name' in err &&
            (err as { name: string }).name === 'AbortError';
      if (isAbortError) return;
      setError(err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, initStr, parser, onSuccess, onError]);

  useEffect(() => {
    if (immediate) void doFetch();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, immediate, initStr, ...deps]);

  return { data, loading, error, refetch: doFetch } as const;
}
