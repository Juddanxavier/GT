'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 bg-background text-foreground">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-danger">!</span>
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted max-w-md text-center">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
