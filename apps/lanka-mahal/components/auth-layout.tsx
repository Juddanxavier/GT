import Image from 'next/image';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  config: {
    name: string;
    shortName: string;
  };
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ config, title, subtitle, children }: AuthLayoutProps): ReactNode {
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-navy lg:block">
        <Image src="/images/heroparcel.png" alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-brand-navy/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div>
            <p className="text-lg font-semibold text-white">{config.name}</p>
            <p className="mt-1 text-sm text-white/55">International courier from India</p>
          </div>
          <div>
            <p className="text-2xl font-semibold leading-snug text-white">
              Ship to 220+ countries with real-time tracking.
            </p>
            <p className="mt-3 max-w-sm text-sm text-white/60">
              Doorstep pickup, customs clearance, and dedicated support — trusted since 2016.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-brand-cream px-5 py-24 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <p className="text-xl font-semibold text-brand-accent">{config.shortName}</p>
          </div>
          <div className="premium-card p-8 md:p-10">
            <div className="mb-6 space-y-1.5 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
