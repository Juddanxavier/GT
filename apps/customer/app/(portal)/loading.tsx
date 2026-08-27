import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';

export default function PortalLoading(): ReactNode {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  );
}
