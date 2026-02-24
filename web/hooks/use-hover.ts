'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

interface UseHoverOptions {
  enterDelay?: number;
  leaveDelay?: number;
}

export function useHover<T extends HTMLElement = HTMLElement>(
  options: UseHoverOptions = {},
): [RefObject<T | null>, boolean] {
  const { enterDelay = 0, leaveDelay = 0 } = options;
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<T>(null);
  const enterTimeout = useRef<number | null>(null);
  const leaveTimeout = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const handleMouseOver = () => {
      if (leaveTimeout.current) window.clearTimeout(leaveTimeout.current);
      if (enterDelay > 0) {
        enterTimeout.current = window.setTimeout(() => setIsHovered(true), enterDelay);
      } else {
        setIsHovered(true);
      }
    };
    const handleMouseOut = () => {
      if (enterTimeout.current) window.clearTimeout(enterTimeout.current);
      if (leaveDelay > 0) {
        leaveTimeout.current = window.setTimeout(() => setIsHovered(false), leaveDelay);
      } else {
        setIsHovered(false);
      }
    };

    node.addEventListener('mouseover', handleMouseOver);
    node.addEventListener('mouseout', handleMouseOut);

    return () => {
      node.removeEventListener('mouseover', handleMouseOver);
      node.removeEventListener('mouseout', handleMouseOut);
      if (enterTimeout.current) window.clearTimeout(enterTimeout.current);
      if (leaveTimeout.current) window.clearTimeout(leaveTimeout.current);
    };
  }, [enterDelay, leaveDelay]);

  return [ref, isHovered];
}
