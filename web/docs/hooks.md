# Hooks Library

A curated set of typed, reusable React hooks for Next.js apps. All hooks are client-safe and optimized for DX and correctness.

## Storage

- useLocalStorage(key, initialValue, options)
  - State persisted to `localStorage` with JSON serialization. Cross-tab sync via the `storage` event.
  - Options: `{ serializer, deserializer, sync }`.
  - Returns: `[value, setValue, remove]`.
- useSessionStorage(key, initialValue, options)
  - State persisted to `sessionStorage` with JSON serialization. Note: sessionStorage does not sync across tabs.
  - Options: `{ serializer, deserializer }`.
  - Returns: `[value, setValue, remove]`.

## Data

- useFetch(url, options)
  - Fetch with `AbortController`, `refetch()`, and pluggable `parser`.
  - Options: `{ init, parser, deps, immediate, onSuccess, onError }`.
  - Returns: `{ data, loading, error, refetch }`.
- useQueryParams(options)
  - Read and update query params. Supports merge vs replace and push vs replace navigation.
  - Options: `{ merge = true, method = 'replace'|'push', scroll = false }`.
  - Returns: `[currentParams, setParams]`.

## UI / DOM

- useClickOutside(ref, handler, options)
  - Calls handler when clicking outside `ref`. Options: `{ ignoredRefs, enabled, events }`.
- useHover(options)
  - Tracks hover state of an element. Options: `{ enterDelay, leaveDelay }`. Returns: `[ref, isHovered]`.
- useOnScreen(ref, options)
  - `IntersectionObserver` to detect if element is in viewport. Options: `{ root, rootMargin, threshold }`.
- useEventListener(eventName, handler, element?)
  - Typed listener for `window`, `document`, or `HTMLElement`. Handles cleanup.
- useEventCallback(fn)
  - Stable callback reference that always sees the latest state/props.
- useMediaQuery(query)
  - Reactive matchMedia for CSS media queries. Returns `boolean`.
- useWindowSize(throttleMs?)
  - Window size with optional throttling and rAF for smooth UI updates.
- useIsomorphicLayoutEffect
  - `useLayoutEffect` on the client, `useEffect` on the server to avoid SSR warnings.

## Timing

- useDebounce(value, delay)
  - Debounces a changing value.
- useThrottle(value, delay)
  - Throttles a changing value.
- useInterval(callback, delay)
  - Runs a callback every `delay` ms; pass `null` to stop.
- useTimeout(callback, delay)
  - Runs a callback once after `delay` ms; pass `null` to cancel.
- useInterval(callback, delay)
  - Runs a callback every `delay` ms; pass `null` to stop.

## Utilities

- usePrevious(value)
  - Returns the previous value from the prior render.
- useBoolean(initial)
  - Tiny state helper. Returns `{ value, on, off, toggle, set }`.

## Importing

Re-exported from `hooks/index.ts` for convenience:

```ts
import {
  useCopyToClipboard,
  useEventListener,
  useFetch,
  useLocalStorage,
  useOnScreen,
} from '@/hooks';
```

## Notes

- All hooks are client components; ensure they run in the browser (`"use client"` where needed).
- Storage hooks use JSON by default; provide custom serializer/deserializer for complex types.
- `useLocalStorage` sync uses the `storage` event (fires in other tabs). `useSessionStorage` does not sync across tabs by design.
