/**
 * Hooks Barrel Export
 *
 * IMPORTANT: For better tree-shaking and smaller bundle sizes,
 * import hooks directly from their source files:
 *
 * ✅ Good: import { useFetch } from '@/hooks/use-fetch';
 * ⚠️ OK: import { useFetch } from '@/hooks';
 *
 * This file uses named exports (not export *) to enable tree-shaking.
 * However, direct imports are still recommended for optimal bundle size.
 *
 * See docs/bundle-optimization.md for more details.
 */

export { useClickOutside } from './use-click-outside';
export { useCopyToClipboard } from './use-copy-to-clipboard';
export { useDebounce } from './use-debounce';
export { useBoolean } from './use-boolean';
export { useThrottle } from './use-throttle';
export { useEventListener } from './use-event-listener';
export { useEventCallback } from './use-event-callback';
export { useFetch } from './use-fetch';
export { useInterval } from './use-interval';
export { useHover } from './use-hover';
export { useLocalStorage } from './use-local-storage';
export { useSessionStorage } from './use-session-storage';
export { useMediaQuery } from './use-media-query';
export { useOnScreen } from './use-on-screen';
export { useTimeout } from './use-timeout';
export { usePrevious } from './use-previous';
export { useQueryParams } from './use-query-params';
export { useWindowSize } from './use-window-size';
export { useToast } from './use-toast';
export { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
