'use client';

import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-foreground/70 mb-6">An unexpected error occurred. Please try again.</p>
        <button
          type="button"
          onClick={reset}
          className="premium-btn gap-2 cursor-pointer"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    </div>
  );
}
