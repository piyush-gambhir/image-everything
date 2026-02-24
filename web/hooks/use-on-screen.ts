'use client';

import { RefObject, useEffect, useState } from 'react';

export interface OnScreenOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export function useOnScreen(ref: RefObject<Element>, options: OnScreenOptions = {}): boolean {
  const { root = null, rootMargin = '0px', threshold = 0 } = options;
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting), {
      root,
      rootMargin,
      threshold,
    });

    observer.observe(target);
    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [ref, root, rootMargin, threshold]);

  return isIntersecting;
}
