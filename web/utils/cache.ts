import { cache } from 'react';

/**
 * React.cache() - Request-level memoization for Server Components
 *
 * React.cache() deduplicates requests within a single server render.
 * It's useful for:
 * - Preventing duplicate database queries in the same request
 * - Sharing data across Server Components without prop drilling
 * - Optimizing expensive computations
 *
 * IMPORTANT:
 * - Only works in Server Components (not Client Components)
 * - Cache is per-request (cleared after each request)
 * - For cross-request caching, use LRU cache or database cache
 *
 * @see https://react.dev/reference/react/cache
 * @see Vercel React Best Practices: server-cache-react
 */

/**
 * Example 1: Deduplicated database query
 *
 * If multiple components call getUser(1), React will only execute
 * the function once per request and return the cached result.
 */
export const getUser = cache(async (userId: string) => {
  console.log(`[Server] Fetching user ${userId}`);

  // Simulate database query
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
  };
});

/**
 * Example 2: Deduplicated API call
 *
 * Multiple components can safely call this function without
 * worrying about making duplicate API requests.
 */
export const fetchPosts = cache(async () => {
  console.log('[Server] Fetching posts from API');

  const response = await fetch('https://jsonplaceholder.typicode.com/posts');
  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }

  return response.json();
});

/**
 * Example 3: Deduplicated expensive computation
 *
 * Cache the result of expensive operations that might be called
 * multiple times during a single render.
 */
export const computeExpensiveData = cache(async (input: number) => {
  console.log(`[Server] Computing expensive data for input: ${input}`);

  // Simulate expensive computation
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    result: input * 2,
    timestamp: Date.now(),
  };
});

/**
 * Example 4: Cross-request caching with LRU
 *
 * For data that should be cached across multiple requests,
 * use an LRU cache instead of React.cache().
 *
 * Install: pnpm add lru-cache
 */

// Uncomment to use LRU cache:
// import { LRUCache } from 'lru-cache';
//
// const lru = new LRUCache<string, unknown>({
//   max: 100,
//   ttl: 1000 * 60 * 5, // 5 minutes
// });
//
// export async function getCachedData(key: string) {
//   const cached = lru.get(key);
//   if (cached) return cached;
//
//   const data = await fetchData(key);
//   lru.set(key, data);
//   return data;
// }

/**
 * Usage Example in Server Components:
 *
 * ```tsx
 * // app/user/[id]/page.tsx
 * import { getUser } from '@/utils/cache';
 *
 * export default async function UserPage({ params }: { params: { id: string } }) {
 *   // This will only fetch once even if called in multiple components
 *   const user = await getUser(params.id);
 *
 *   return <div>{user.name}</div>;
 * }
 * ```
 *
 * ```tsx
 * // app/user/[id]/profile.tsx
 * import { getUser } from '@/utils/cache';
 *
 * export default async function UserProfile({ userId }: { userId: string }) {
 *   // This will return the cached result from the previous call
 *   const user = await getUser(userId);
 *
 *   return <div>{user.email}</div>;
 * }
 * ```
 */
