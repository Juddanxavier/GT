import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Refund & Parcel Policy',
  description:
    'Refund and parcel policy for Gajan Traders — delivery timelines, refund eligibility and what to do if a parcel is lost.',
};

export default function RefundPolicyLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
