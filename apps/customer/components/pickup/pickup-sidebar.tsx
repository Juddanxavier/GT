'use client';

import {
  ArrowUpRight,
  Ban,
  Building2,
  Check,
  Clock,
  HelpCircle,
  MapPin,
  Package,
  Phone,
  Search,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const PICKUP_STEPS: { id: number; label: string; desc: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Address', desc: 'Pickup location details', icon: MapPin },
  { id: 2, label: 'Package', desc: 'Type, weight & notes', icon: Package },
  { id: 3, label: 'Schedule', desc: 'Office, date & time', icon: Clock },
];

export { PICKUP_STEPS };

const QUICK_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/track', label: 'Track Shipment', icon: Search },
  { href: '/check-price', label: 'Check Price', icon: Truck },
  { href: '/branches', label: 'Our Branches', icon: Building2 },
  { href: '/prohibited', label: 'Prohibited Items', icon: Ban },
];

interface PickupSidebarProps {
  step: number;
  maxReachableStep: number;
  onStepSelect: (step: number) => void;
}

export function PickupSidebar({ step, maxReachableStep, onStepSelect }: PickupSidebarProps): ReactNode {
  const config = useTenantConfig();

  return (
    <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
      <div className="premium-card hidden p-5 md:p-6 lg:block">
        <span className="section-eyebrow mb-5">
          <span className="section-eyebrow-line" />
          Your progress
        </span>
        <ol className="space-y-1">
          {PICKUP_STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const reachable = s.id <= maxReachableStep;
            const Icon = s.icon;

            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!reachable && !done}
                  onClick={() => reachable && onStepSelect(s.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                    active
                      ? 'bg-brand-accent/10 ring-1 ring-brand-accent/25'
                      : reachable
                        ? 'hover:bg-foreground/[0.03]'
                        : 'cursor-default opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                      done
                        ? 'bg-brand-accent text-white'
                        : active
                          ? 'bg-brand-accent text-white'
                          : 'bg-foreground/[0.06] text-foreground/45'
                    }`}
                  >
                    {done ? <Check size={16} strokeWidth={2.5} /> : <Icon size={16} />}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={`text-sm font-semibold ${active ? 'text-brand-accent' : 'text-foreground'}`}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/55">{s.desc}</p>
                  </div>
                </button>
                {i < PICKUP_STEPS.length - 1 && (
                  <div className="ml-[1.35rem] h-3 w-px bg-border" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="premium-card border-brand-accent/15 bg-gradient-to-br from-brand-accent/[0.07] to-transparent p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-accent">
          <Truck size={18} />
        </div>
        <p className="text-sm font-bold text-foreground">{config.pickup.shortNotice}</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/65">{config.pickup.formNotice}</p>
        <a
          href="/branches"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
        >
          Find nearest office <ArrowUpRight size={12} />
        </a>
      </div>

      <div className="premium-card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
          Quick links
        </h3>
        <nav className="space-y-0.5">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground/65 transition-colors hover:bg-foreground/[0.03] hover:text-foreground"
            >
              <link.icon size={15} className="shrink-0 text-brand-accent" />
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="premium-card bg-brand-navy p-5 text-white">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-accent">
          <HelpCircle size={18} />
        </div>
        <p className="text-sm font-bold">Need help booking?</p>
        <p className="mt-1 text-xs text-white/60">Mon–Sat, 9 AM – 9 PM</p>
        <a
          href={config.contact.phoneHref}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-accent-hover"
        >
          <Phone size={13} />
          {config.contact.phone}
        </a>
      </div>
    </aside>
  );
}

/** Compact horizontal stepper for mobile */
export function PickupStepBar({ step }: { step: number }): ReactNode {
  return (
    <div className="mb-6 flex gap-2 lg:hidden">
      {PICKUP_STEPS.map((s) => {
        const done = step > s.id;
        const active = step === s.id;
        return (
          <div
            key={s.id}
            className={`flex flex-1 flex-col items-center rounded-2xl px-2 py-3 text-center transition-colors ${
              active ? 'bg-brand-accent/10 ring-1 ring-brand-accent/25' : 'bg-foreground/[0.03]'
            }`}
          >
            <span
              className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                done || active ? 'bg-brand-accent text-white' : 'bg-foreground/10 text-foreground/40'
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : s.id}
            </span>
            <span className={`text-[11px] font-semibold ${active ? 'text-brand-accent' : 'text-foreground/55'}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
