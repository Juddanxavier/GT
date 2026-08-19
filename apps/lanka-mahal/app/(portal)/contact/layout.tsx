import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact Lanka Mahal for shipping enquiries, doorstep pickup and support. Call, email or visit our branches across Sri Lanka — Mon to Sat, 9 AM to 9 PM.',
};

export default function ContactLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
