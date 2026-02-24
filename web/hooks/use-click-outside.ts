'use client';

import { RefObject, useEffect } from 'react';

interface UseClickOutsideOptions {
  ignoredRefs?: Array<RefObject<HTMLElement>>;
  enabled?: boolean;
  events?: Array<'mousedown' | 'mouseup' | 'click' | 'touchstart'>;
}

export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options: UseClickOutsideOptions = {},
) {
  const { ignoredRefs = [], enabled = true, events = ['mousedown', 'touchstart'] } = options;
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el) return;
      const target = event.target as Node;
      if (el.contains(target)) return;
      if (ignoredRefs.some((r) => r.current && r.current.contains(target))) return;
      handler(event);
    };
    events.forEach((ev) => document.addEventListener(ev, listener));
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, listener));
    };
  }, [ref, handler, enabled, ignoredRefs, events]);
}
