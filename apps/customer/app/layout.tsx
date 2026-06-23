import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { getTenantSlug } from '@/lib/tenant';
import { GajanLayout } from '@/components/gajan/layout';
import { LankaLayout } from '@/components/lanka/layout';

export const metadata: Metadata = {
  title: {
    template: '%s — Gajan Traders / Lanka Mahal',
    default: 'Track Your Shipment',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const slug = await getTenantSlug();

  if (slug === 'lanka-mahal') {
    return <LankaLayout>{children}</LankaLayout>;
  }

  return <GajanLayout>{children}</GajanLayout>;
}
