import type { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  config: {
    name: string;
    shortName: string;
    theme: string;
  };
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ config, title, subtitle, children }: AuthLayoutProps): ReactNode {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex bg-white rounded-lg p-1 items-center justify-center mb-2">
            <Image src="/images/logo.png" alt={config.name} width={56} height={56} className="rounded object-contain" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#F59E0B]">{config.shortName}</div>
        </div>

        <div className="border border-border bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
            {subtitle && <p className="text-foreground/70">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
