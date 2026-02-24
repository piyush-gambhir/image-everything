'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export type QueryParamsValue = string | number | boolean | null | undefined;
export type QueryParamsInput = Record<string, QueryParamsValue>;

export interface UseQueryParamsOptions {
  merge?: boolean;
  method?: 'replace' | 'push';
  scroll?: boolean;
}

export const useQueryParams = (
  options: UseQueryParamsOptions = {},
): [Record<string, string>, (next: QueryParamsInput) => void] => {
  const { merge = true, method = 'replace', scroll = false } = options;
  const searchParams = useSearchParams();
  const router = useRouter();

  const current: Record<string, string> = Object.fromEntries(searchParams.entries());

  const setQueryParams = (next: QueryParamsInput) => {
    const nextParams = new URLSearchParams(merge ? current : {});
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    }
    const url = `?${nextParams.toString()}`;
    if (method === 'replace') router.replace(url, { scroll });
    else router.push(url, { scroll });
  };

  return [current, setQueryParams];
};
