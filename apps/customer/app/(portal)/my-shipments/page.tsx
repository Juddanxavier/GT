export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { MyShipmentsClient } from './my-shipments-client';

export default function MyShipmentsPage(): ReactNode {
  return <ErrorBoundary><MyShipmentsClient /></ErrorBoundary>;
}
