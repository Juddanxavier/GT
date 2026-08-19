import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Refund & Shipping Policy',
  description:
    'Refund and shipping policy for Gajan Traders — delivery timelines, refund eligibility and what to do if a shipment is lost.',
};

export default function RefundPolicyLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
