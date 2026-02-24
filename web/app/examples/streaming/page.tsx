import { Suspense } from 'react';

/**
 * Example: Streaming with Suspense
 *
 * This page demonstrates React Suspense boundaries for streaming content.
 * Benefits:
 * - Show loading states for async components
 * - Stream content as it becomes ready (improves TTFB)
 * - Prevent blocking the entire page render
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */

// Simulated async data fetching components
async function SlowComponent({ delay, title }: { delay: number; title: string }) {
  await new Promise((resolve) => setTimeout(resolve, delay));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This component loaded after {delay}ms. It was streamed to the client without blocking other
        content.
      </p>
      <p className="mt-2 text-xs text-gray-500">Loaded at: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

// Loading component for Suspense fallback
function LoadingCard({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 h-6 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
      <div className="space-y-2">
        <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
      </div>
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
      <p className="mt-2 text-xs text-gray-500">Loading {title}...</p>
    </div>
  );
}

export default function StreamingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="mb-4 text-3xl font-bold">Streaming with Suspense</h1>
        <p className="text-gray-600 dark:text-gray-400">
          This page demonstrates progressive rendering. Each component loads independently without
          blocking others.
        </p>
      </div>

      {/* This content renders immediately */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
        <h2 className="mb-2 text-xl font-semibold text-green-900 dark:text-green-100">
          ✓ Instant Content
        </h2>
        <p className="text-sm text-green-800 dark:text-green-200">
          This content renders immediately without waiting for async components below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fast component (1s delay) */}
        <Suspense fallback={<LoadingCard title="Fast Component" />}>
          <SlowComponent delay={1000} title="Fast Component" />
        </Suspense>

        {/* Medium component (2s delay) */}
        <Suspense fallback={<LoadingCard title="Medium Component" />}>
          <SlowComponent delay={2000} title="Medium Component" />
        </Suspense>

        {/* Slow component (3s delay) */}
        <Suspense fallback={<LoadingCard title="Slow Component" />}>
          <SlowComponent delay={3000} title="Slow Component" />
        </Suspense>

        {/* Very slow component (4s delay) */}
        <Suspense fallback={<LoadingCard title="Very Slow Component" />}>
          <SlowComponent delay={4000} title="Very Slow Component" />
        </Suspense>
      </div>

      <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900">
        <h3 className="mb-3 text-lg font-semibold">How it works</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>Server starts rendering the page</li>
          <li>Static content is sent immediately (green box above)</li>
          <li>Each Suspense boundary shows a loading state</li>
          <li>As async components resolve, they stream to the client</li>
          <li>React hydrates each component as it arrives</li>
        </ol>

        <div className="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
          <p className="mb-2 text-xs font-semibold">Code Example:</p>
          <pre className="overflow-x-auto text-xs">
            <code>{`<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
