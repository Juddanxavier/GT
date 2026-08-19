import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Schedule a Doorstep Pickup',
  description:
    'Book a free doorstep pickup with Gajan Traders. Choose a convenient time slot and we will collect your parcel from anywhere in India.',
};

export default function PickupLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
