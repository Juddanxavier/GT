'use client';

import {
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  HelpCircle,
  MapPin,
  PackageSearch,
  Phone,
  Search,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TrackSearchForm } from '@/components/track/track-search-form';
import { useTenantConfig } from '@/lib/use-tenant-config';

const TRACK_STEPS: { label: string; desc: string; icon: LucideIcon }[] = [
  { label: 'Booked', desc: 'Shipment registered', icon: PackageSearch },
  { label: 'In transit', desc: 'Moving between hubs', icon: Truck },
  { label: 'Out for delivery', desc: 'With local carrier', icon: MapPin },
  { label: 'Delivered', desc: 'Signed for', icon: Bell },
];

const QUICK_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/check-price', label: 'Check Price', icon: Search },
  { href: '/pickup', label: 'Schedule Pickup', icon: Calendar },
  { href: '/branches', label: 'Our Branches', icon: Building2 },
  { href: '/contact', label: 'Contact Support', icon: HelpCircle },
];

type TrackSidebarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  searchPlaceholder?: string;
  searchTitle?: string;
};

export function TrackSidebar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Enter tracking number',
  searchTitle = 'Track shipment',
}: TrackSidebarProps): ReactNode {
  const config = useTenantConfig();

  return (
    <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
      <div className="premium-card p-5 md:p-6">
        <span className="section-eyebrow mb-4">
          <span className="section-eyebrow-line" />
          {searchTitle}
        </span>
        <TrackSearchForm
          variant="inline"
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder={searchPlaceholder}
        />
        <p className="mt-3 text-xs leading-relaxed text-foreground/50">
          Find your number on your receipt, email, or WhatsApp message.
        </p>
      </div>

      <div className="premium-card hidden p-5 md:p-6 lg:block">
        <span className="section-eyebrow mb-4">
          <span className="section-eyebrow-line" />
          Status guide
        </span>
        <ol className="space-y-1">
          {TRACK_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.label}>
                <div className="flex items-start gap-3 rounded-2xl px-2 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-xs leading-relaxed text-foreground/55">{step.desc}</p>
                  </div>
                </div>
                {i < TRACK_STEPS.length - 1 && (
                  <div className="ml-[1.15rem] h-2.5 w-px bg-border" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="premium-card border-brand-accent/15 bg-gradient-to-br from-brand-accent/[0.07] to-transparent p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-accent">
          <Bell size={18} />
        </div>
        <p className="text-sm font-bold text-foreground">Get status alerts</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/65">
          Create an account and claim your shipment for email and WhatsApp updates on every scan.
        </p>
        <a
          href="/claim"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
        >
          Claim a shipment <ArrowUpRight size={12} />
        </a>
      </div>

      <div className="premium-card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Quick links</h3>
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
        <p className="text-sm font-bold">Need help tracking?</p>
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
