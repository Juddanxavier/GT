'use client';

import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { PublicLanding } from '@/components/public-landing';

export default function HomePage(): ReactNode {
  return <ErrorBoundary><PublicLanding /></ErrorBoundary>;
}
