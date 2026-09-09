import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Globe, Package, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  config: {
    name: string;
    shortName: string;
    tagline: string;
    originBlurb: string;
    stats: { countries: string };
    hero?: { trust?: string };
  };
  title: string;
  subtitle: string;
  children: ReactNode;
}

const highlightIcons: LucideIcon[] = [Globe, Package, Shield];

export function AuthLayout({
  config,
  title,
  subtitle,
  children,
}: AuthLayoutProps): ReactNode {
  const highlights = [
    { icon: highlightIcons[0], label: `${config.stats.countries} destinations` },
    { icon: highlightIcons[1], label: 'Doorstep pickup' },
    { icon: highlightIcons[2], label: 'Secure handling' },
  ];

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-brand-cream">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-cream via-white to-brand-cream" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-brand-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-64 w-64 rounded-full bg-brand-accent/5 blur-3xl" />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-accent text-sm font-bold text-white shadow-[0_4px_14px_-4px_rgba(232,98,26,0.5)]">
              {config.shortName}
            </span>
            <span className="hidden font-semibold text-brand-navy sm:inline">{config.name}</span>
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3.5 py-2 text-sm font-medium text-foreground/70 shadow-sm transition-colors hover:border-brand-accent/30 hover:text-brand-accent"
          >
            <ArrowLeft size={14} />
            Back to website
          </a>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-4 sm:px-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-12 xl:gap-24">
          <div className="mb-8 max-w-md text-center lg:mb-0 lg:max-w-lg lg:text-left">
            <p className="section-eyebrow mb-4 text-brand-accent">
              <span className="section-eyebrow-line bg-brand-accent" />
              {config.originBlurb}
            </p>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-brand-navy sm:text-3xl xl:text-4xl">
              {config.tagline}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-foreground/60 sm:text-base">
              Doorstep pickup, customs clearance, and live tracking to{' '}
              {config.stats.countries} countries.
            </p>
            <div className="mt-6 hidden flex-wrap gap-2 lg:flex">
              {highlights.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3.5 py-2 text-xs font-medium text-foreground/75 shadow-sm"
                >
                  <item.icon size={14} className="text-brand-accent" />
                  {item.label}
                </span>
              ))}
            </div>
            {config.hero?.trust && (
              <p className="mt-6 hidden text-sm italic text-foreground/45 lg:block">{config.hero.trust}</p>
            )}
          </div>

          <div className="w-full max-w-[420px] shrink-0 animate-[fade-up_0.45s_ease-out]">
            <div className="premium-card border border-border/50 p-8 shadow-[0_20px_60px_-24px_rgba(12,25,41,0.12)] md:p-10">
              <div className="mb-7 space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm leading-relaxed text-foreground/55">{subtitle}</p>
                )}
              </div>
              {children}
            </div>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-2 px-5 pb-8 lg:hidden">
          {highlights.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-1.5 text-[11px] font-medium text-foreground/70 shadow-sm"
            >
              <item.icon size={12} className="text-brand-accent" />
              {item.label}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );
}
