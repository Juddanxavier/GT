import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { tenantConfig } from '@/lib/tenant-config';

export const metadata: Metadata = {
  title: 'Schedule a Doorstep Pickup',
  description: `Book a doorstep pickup with Gajan Traders. ${tenantConfig.pickup.shortNotice} Choose a convenient time slot near our offices.`,
};

export default function PickupLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
