'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

/**
 * Example: Dynamic Import Usage
 *
 * This demonstrates how to use next/dynamic to lazy-load components.
 * Benefits:
 * - Reduces initial bundle size
 * - Improves Time to Interactive (TTI)
 * - Better performance for features not immediately visible
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading
 */

// Dynamic import with loading state
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading component...</span>
      </div>
    </div>
  ),
  ssr: false, // Disable server-side rendering if component uses browser APIs
});

// You can also import with a custom error handler
const AnotherHeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: true, // Enable SSR (default is true)
});

export default function DynamicImportExample() {
  const [showComponent, setShowComponent] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Dynamic Import Example</h1>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Click the button below to lazy-load a heavy component. Check your Network tab to see it
          load only when needed.
        </p>
      </div>

      <button
        onClick={() => setShowComponent(!showComponent)}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {showComponent ? 'Hide' : 'Show'} Dynamic Component
      </button>

      {showComponent && (
        <div className="space-y-4">
          <HeavyComponent title="Lazy-Loaded Component" />
          <AnotherHeavyComponent title="Another Lazy-Loaded Component" />
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold">Code Example:</h3>
        <pre className="overflow-x-auto text-xs">
          <code>{`import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <div>Loading...</div>,
    ssr: false, // Disable SSR if needed
  }
);

export default function Page() {
  return <HeavyComponent />;
}`}</code>
        </pre>
      </div>
    </div>
  );
}
