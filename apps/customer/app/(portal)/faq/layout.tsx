import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers to common Gajan Traders shipping questions — how to send a parcel, delivery times, costs, customs, shipping to Europe and more.',
};

export default function FaqLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
