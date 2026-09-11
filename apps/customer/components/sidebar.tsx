'use client';

import {
  ArrowUpRight,
  Ban,
  Calendar,
  Clock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Package,
  Phone,
  Search,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const publicLinks = [
  { icon: Search, label: 'Track', href: '/track', color: '#e8621a' },
  { icon: Calendar, label: 'Schedule Pickup', href: '/pickup', color: '#F97316' },
  { icon: FileText, label: 'Get a Quote', href: '/contact', color: '#8B5CF6' },
  { icon: HelpCircle, label: 'FAQ', href: '/faq', color: '#3B82F6' },
  { icon: MapPin, label: 'Contact Us', href: '/contact', color: '#10B981' },
];

const dashboardLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', color: '#e8621a' },
  { icon: Search, label: 'Track', href: '/track', color: '#e8621a' },
  { icon: Package, label: 'My Shipments', href: '/my-shipments', color: '#3B82F6' },
  { icon: FileText, label: 'Invoices', href: '/my-invoices', color: '#10B981' },
  { icon: Calendar, label: 'Schedule Pickup', href: '/pickup', color: '#e8621a' },
];

const prohibitedItems = [
  'Currency & Cash',
  'Hazardous Materials',
  'Valuables (Gold, Jewellery)',
  'Weapons & Narcotics',
  'Liquids & Perishables',
  'Live Animals & Plants',
];

export function LeftSidebar({
  variant = 'dashboard',
  drawer = false,
  opsDrawer = false,
}: {
  variant?: 'dashboard' | 'public';
  drawer?: boolean;
  opsDrawer?: boolean;
}): ReactNode {
  const links = variant === 'public' ? publicLinks : dashboardLinks;
  const pathname = usePathname();
  const config = useTenantConfig();
  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);
  const shellCls = opsDrawer
    ? 'rounded-xl border border-white/10 bg-white/5 p-4'
    : 'premium-card p-5';
  const titleCls = opsDrawer
    ? 'mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/45'
    : 'mb-4 text-xs font-bold uppercase tracking-wider text-foreground';
  const linkActiveCls = opsDrawer
    ? 'bg-brand-accent/20 font-semibold text-white'
    : 'bg-brand-accent/10 font-semibold text-brand-accent-hover';
  const linkIdleCls = opsDrawer
    ? 'text-white/70 hover:bg-white/10 hover:text-white'
    : 'text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground';
  return (
    <aside className={`${drawer ? '' : 'hidden lg:block'} space-y-6`}>
      <div className={shellCls}>
        <h3 className={titleCls}>
          Quick Links
        </h3>
        <div className="space-y-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive(l.href) ? linkActiveCls : linkIdleCls
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full transition-all ${isActive(l.href) ? 'scale-110' : ''}`}
                style={{ backgroundColor: l.color }}
              />
              {l.label}
            </a>
          ))}
        </div>
      </div>
      {!opsDrawer && (
        <div className="rounded-2xl bg-brand-accent/5 p-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-accent/10 text-brand-accent">
            <HelpCircle size={20} />
          </div>
          <h3 className="mb-1 text-sm font-bold text-foreground">Need help?</h3>
          <p className="mb-3 text-xs leading-relaxed text-foreground/60">Mon–Sat, 9 AM – 9 PM</p>
          <a
            href={config.contact.phoneHref}
            className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-accent shadow-sm transition-colors hover:text-brand-accent-hover"
          >
            {config.contact.phone}
          </a>
        </div>
      )}
    </aside>
  );
}

export function RightSidebar({ alwaysShow = false }: { alwaysShow?: boolean }): ReactNode {
  const config = useTenantConfig();
  return (
    <aside
      className={`sticky top-24 space-y-6 ${alwaysShow ? 'block' : 'hidden lg:block'}`}
    >
      <div className="premium-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={14} className="text-brand-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Our Offices
          </h3>
        </div>
        <div className="space-y-3">
          {config.offices.map((office) => (
            <div key={office.name} className="space-y-2 rounded-xl bg-foreground/[0.02] p-3">
              <p className="text-sm font-semibold text-foreground">{office.name}</p>
              <div className="flex items-start gap-2 text-xs text-foreground/60">
                <MapPin size={12} className="mt-0.5 shrink-0 text-brand-accent" />
                <span>{office.address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <Clock size={12} className="shrink-0 text-brand-accent" />
                <span>{office.hours}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <Phone size={12} className="shrink-0 text-brand-accent" />
                <span>{office.phones}</span>
              </div>
            </div>
          ))}
        </div>
        <a
          href="/branches"
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.03] px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-foreground/[0.06]"
        >
          View All Branches <ArrowUpRight size={13} />
        </a>
      </div>
      <div className="premium-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Ban size={14} className="text-brand-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Prohibited Items
          </h3>
        </div>
        <ul className="space-y-1.5">
          {prohibitedItems.map((item) => (
            <li key={item} className="flex items-center gap-2 px-1">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              <span className="text-sm text-foreground/60">{item}</span>
            </li>
          ))}
        </ul>
        <a
          href="/prohibited"
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-accent/5 px-4 py-2 text-sm font-semibold text-brand-accent transition-colors hover:bg-brand-accent/10"
        >
          View Full List <ArrowUpRight size={13} />
        </a>
      </div>
    </aside>
  );
}
