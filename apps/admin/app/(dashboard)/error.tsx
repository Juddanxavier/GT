'use client';

import { Button } from '@heroui/react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
        <span className="text-2xl">!</span>
      </div>
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted max-w-md text-center">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button variant="primary" onPress={reset}>
        Try again
      </Button>
    </div>
  );
}
