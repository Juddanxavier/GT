import type { ReactNode } from 'react';

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
  const accentClass = config.theme === 'emerald' ? 'text-emerald-600' : 'text-violet-600';

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-[fade-up_0.4s_ease-out]">
        <div className="text-center mb-8">
          <div className={`text-2xl font-bold tracking-tight ${accentClass}`}>
            {config.shortName}
          </div>
        </div>

        <div className="border border-border bg-surface rounded-xl shadow-sm p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>

        <p className="text-center text-xs text-muted mt-8">
          &copy; {new Date().getFullYear()} {config.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
