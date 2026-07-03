import type { ReactNode } from 'react';
import { Card } from '@heroui/react';

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
  const isEmerald = config.theme === 'emerald';

  const orbR = isEmerald ? '52,211,153' : '167,139,250';
  const orbB = isEmerald ? '16,185,129' : '139,92,246';
  const badgeGradient = isEmerald ? 'from-emerald-500 to-emerald-600' : 'from-violet-500 to-violet-600';
  const badgeShadow = isEmerald ? 'shadow-emerald-500/20' : 'shadow-violet-500/20';
  const decoColor = isEmerald ? 'text-emerald-200/30' : 'text-violet-200/30';

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 px-4 overflow-hidden">
      {/* Subtle accent gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at top, rgba(${orbR},0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(${orbB},0.03), transparent 60%)`,
        }}
      />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-[120px] animate-[pulse-glow_6s_ease-in-out_infinite]" style={{ background: `rgba(${orbR},0.1)` }} />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-[100px] animate-[pulse-glow_8s_ease-in-out_infinite_2s]" style={{ background: `rgba(${orbB},0.1)` }} />
      <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full blur-[80px] animate-[pulse-glow_7s_ease-in-out_infinite_1s]" style={{ background: `rgba(${orbR},0.1)` }} />

      {/* Decorative shape */}
      <svg className={`absolute top-1/3 right-1/4 w-64 h-64 ${decoColor} rotate-45 animate-[float-slow_var(--anim-slow)_ease-in-out_infinite]`} viewBox="0 0 200 200" fill="none">
        <path d="M100 0L141.42 58.58L200 100L141.42 141.42L100 200L58.58 141.42L0 100L58.58 58.58Z" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      <div className="relative w-full max-w-md animate-[fade-up_0.5s_ease-out]">
        {/* Brand badge */}
        <div className="text-center mb-7">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${badgeGradient} shadow-xl ${badgeShadow} ring-[3px] ring-white/80`}>
            <span className="text-white text-xl font-bold tracking-tight">{config.shortName}</span>
          </div>
        </div>

        {/* Card */}
        <Card className="border border-gray-200/80 bg-white shadow-xl shadow-black/5 rounded-2xl">
          <Card.Content className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>

            {children}
          </Card.Content>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 animate-[fade-up_0.5s_ease-out_0.2s_both]">
          &copy; {new Date().getFullYear()} {config.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
