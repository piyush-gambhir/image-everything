'use client';

import { useEffect, useRef } from 'react';

// Overloads for better typing on window, document and elements
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: Window,
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  element: Document,
): void;
export function useEventListener<
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLElement,
>(eventName: K, handler: (event: HTMLElementEventMap[K]) => void, element: T): void;
export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element?: Window | Document | HTMLElement,
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const target = element ?? (typeof window !== 'undefined' ? window : undefined);
    if (!target || !('addEventListener' in target)) return;

    const eventListener: EventListener = (event) => {
      savedHandler.current(event as never);
    };

    target.addEventListener(eventName as string, eventListener);
    return () => {
      target.removeEventListener(eventName as string, eventListener);
    };
  }, [eventName, element]);
}
