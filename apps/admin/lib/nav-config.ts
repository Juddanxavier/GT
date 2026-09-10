import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Building2,
  DollarSign,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';

export type NavSectionId = 'overview' | 'manage' | 'insights' | 'system';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  id: NavSectionId;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

export function getNavSections(role?: string): NavSection[] {
  const manage: NavItem[] = [{ href: '/customers', label: 'Users', icon: Users }];
  if (role !== 'staff') {
    manage.push({ href: '/invitations', label: 'Invitations', icon: UserPlus });
    manage.push({ href: '/branches', label: 'Branches', icon: Building2 });
  }
  manage.push({ href: '/shipments', label: 'Shipments', icon: Package });
  manage.push({ href: '/invoices', label: 'Invoices', icon: Receipt });
  if (role !== 'staff') {
    manage.push({ href: '/rate-cards', label: 'Rate Cards', icon: DollarSign });
  }

  const insights: NavItem[] = [];
  if (role !== 'staff') {
    insights.push({ href: '/reports', label: 'Reports', icon: BarChart3 });
  }
  insights.push({ href: '/audit', label: 'Audit Log', icon: Activity });

  const system: NavItem[] = [];
  if (role !== 'staff') {
    system.push({ href: '/settings', label: 'Settings', icon: Settings });
  }

  const sections: NavSection[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
    },
    { id: 'manage', label: 'Manage', icon: Package, items: manage },
    { id: 'insights', label: 'Insights', icon: BarChart3, items: insights },
  ];

  if (system.length > 0) {
    sections.push({ id: 'system', label: 'System', icon: Settings, items: system });
  }

  return sections.filter((s) => s.items.length > 0);
}

export function isNavActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveSectionId(pathname: string, sections: NavSection[]): NavSectionId {
  for (const section of sections) {
    if (section.items.some((item) => isNavActive(pathname, item.href))) {
      return section.id;
    }
  }
  return 'overview';
}
