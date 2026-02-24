'use client';

/**
 * Example: Heavy Component
 *
 * This component simulates a heavy component that should be lazy-loaded
 * using dynamic imports to reduce initial bundle size.
 *
 * Use dynamic imports for:
 * - Large components that aren't immediately visible
 * - Components with heavy dependencies
 * - Modals, dialogs, and popovers
 * - Rich text editors, charts, or data visualizations
 * - Features behind feature flags
 */

export default function HeavyComponent({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This component was loaded dynamically using next/dynamic to reduce the initial bundle size.
        It only loads when needed, improving your app's performance.
      </p>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
      </div>
    </div>
  );
}
