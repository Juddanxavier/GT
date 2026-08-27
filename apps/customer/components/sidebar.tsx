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
  { icon: Search, label: 'Track', href: '/track', color: '#F94735' },
  { icon: Calendar, label: 'Schedule Pickup', href: '/pickup', color: '#F97316' },
  { icon: FileText, label: 'Get a Quote', href: '/contact', color: '#8B5CF6' },
  { icon: HelpCircle, label: 'FAQ', href: '/faq', color: '#3B82F6' },
  { icon: MapPin, label: 'Contact Us', href: '/contact', color: '#10B981' },
];

const dashboardLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', color: '#F94735' },
  { icon: Search, label: 'Track', href: '/track', color: '#F94735' },
  { icon: Package, label: 'My Shipments', href: '/my-shipments', color: '#3B82F6' },
  { icon: FileText, label: 'Invoices', href: '/my-invoices', color: '#10B981' },
  { icon: Calendar, label: 'Schedule Pickup', href: '/pickup', color: '#F94735' },
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
}: {
  variant?: 'dashboard' | 'public';
  drawer?: boolean;
}): ReactNode {
  const links = variant === 'public' ? publicLinks : dashboardLinks;
  const pathname = usePathname();
  const config = useTenantConfig();
  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <aside className={`${drawer ? '' : 'hidden lg:block'} space-y-6`}>
      <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-5">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
          Quick Links
        </h3>
        <div className="space-y-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all group cursor-pointer ${
                isActive(l.href)
                  ? 'bg-[#F94735]/10 text-[#D83220] font-semibold'
                  : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-all ${isActive(l.href) ? 'scale-110' : ''}`}
                style={{ backgroundColor: l.color }}
              />
              {l.label}
            </a>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-[#F94735]/5 p-5 text-center">
        <div className="w-11 h-11 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mx-auto mb-3">
          <HelpCircle size={20} />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">Need help?</h3>
        <p className="text-xs text-foreground/60 leading-relaxed mb-3">Mon–Sat, 9 AM – 9 PM</p>
        <a
          href={config.contact.phoneHref}
          className="text-sm font-semibold text-[#F94735] hover:text-[#D83220] transition-colors bg-white px-4 py-2 rounded-xl shadow-sm inline-block"
        >
          {config.contact.phone}
        </a>
      </div>
    </aside>
  );
}

export function RightSidebar(): ReactNode {
  const config = useTenantConfig();
  return (
    <aside className="hidden lg:block space-y-6 sticky top-24">
      <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} className="text-[#F94735]" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Our Offices
          </h3>
        </div>
        <div className="space-y-3">
          {config.offices.map((office) => (
            <div key={office.name} className="p-3 rounded-xl bg-foreground/[0.02] space-y-2">
              <p className="text-sm font-semibold text-foreground">{office.name}</p>
              <div className="flex items-start gap-2 text-xs text-foreground/60">
                <MapPin size={12} className="shrink-0 mt-0.5 text-[#F94735]" />
                <span>{office.address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <Clock size={12} className="shrink-0 text-[#F94735]" />
                <span>{office.hours}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <Phone size={12} className="shrink-0 text-[#F94735]" />
                <span>{office.phones}</span>
              </div>
            </div>
          ))}
        </div>
        <a
          href="/branches"
          className="mt-3 flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-xl bg-foreground/[0.03] text-foreground/70 text-sm font-semibold hover:bg-foreground/[0.06] transition-colors cursor-pointer"
        >
          View All Branches <ArrowUpRight size={13} />
        </a>
      </div>
      <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Ban size={14} className="text-[#F94735]" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Prohibited Items
          </h3>
        </div>
        <ul className="space-y-1.5">
          {prohibitedItems.map((item) => (
            <li key={item} className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span className="text-sm text-foreground/60">{item}</span>
            </li>
          ))}
        </ul>
        <a
          href="/prohibited"
          className="mt-3 flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-xl bg-[#F94735]/5 text-[#F94735] text-sm font-semibold hover:bg-[#F94735]/10 transition-colors cursor-pointer"
        >
          View Full List <ArrowUpRight size={13} />
        </a>
      </div>
    </aside>
  );
}
