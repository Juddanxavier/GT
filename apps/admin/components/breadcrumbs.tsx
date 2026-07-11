'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, LayoutDashboard } from 'lucide-react';

const labels: Record<string, string> = {
  '': 'Home',
  customers: 'Users',
  shipments: 'Shipments',
  quotations: 'Quotations',
  invoices: 'Invoices',
  branches: 'Branches',
  invitations: 'Invitations',
  reports: 'Reports',
  audit: 'Audit Log',
  profile: 'Profile',
  search: 'Search',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted">
      <Link href="/" className="hover:text-foreground transition-colors">
        <LayoutDashboard size={14} />
      </Link>
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = labels[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight size={12} />
            {isLast ? (
              <span className="text-foreground font-medium capitalize">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors capitalize">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
