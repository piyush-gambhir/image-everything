'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="w-full max-w-md space-y-4 text-center">
            <h2 className="text-2xl font-bold">Application Error</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A critical error occurred. Please try refreshing the page.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 dark:text-gray-500">Error ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="mt-4 rounded-lg bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
