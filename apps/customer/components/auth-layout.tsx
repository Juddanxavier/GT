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
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-24">
      <div className="w-full max-w-md animate-[fade-up_0.4s_ease-out]">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold tracking-tight text-[#F94735]">{config.shortName}</span>
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
