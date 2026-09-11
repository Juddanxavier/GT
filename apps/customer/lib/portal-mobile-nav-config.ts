import type { LucideIcon } from 'lucide-react';
import {
  Ban,
  Calendar,
  DollarSign,
  FileText,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Home,
  MapPin,
  Package,
  Plane,
  Receipt,
  Ruler,
  Search,
  Ship,
} from 'lucide-react';

export type MobileNavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type MobileNavSection = {
  id: string;
  title: string;
  links: MobileNavLink[];
};

export const PUBLIC_PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
  '/air-freight': 'Air Freight',
  '/ocean-freight': 'Ocean Freight',
  '/branches': 'Branches',
  '/contact': 'Contact',
  '/track': 'Track',
  '/faq': 'FAQ',
  '/prohibited': 'Prohibited Items',
  '/pickup': 'Schedule Pickup',
  '/volumetric-calculator': 'Volumetric Calculator',
  '/currency-converter': 'Currency Converter',
  '/check-price': 'Check Price',
  '/rate-cards': 'Rate Cards',
  '/claim': 'Claim Shipment',
  '/privacy-policy': 'Privacy',
  '/terms-conditions': 'Terms',
  '/refund-policy': 'Refunds',
};

export function getPublicPageTitle(pathname: string, fallback: string): string {
  if (PUBLIC_PAGE_TITLES[pathname]) return PUBLIC_PAGE_TITLES[pathname];
  if (pathname.startsWith('/track/')) return 'Tracking';
  for (const [path, title] of Object.entries(PUBLIC_PAGE_TITLES)) {
    if (path !== '/' && pathname.startsWith(`${path}/`)) return title;
  }
  return fallback;
}

export function isMobileNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const MOBILE_NAV_SECTIONS: MobileNavSection[] = [
  {
    id: 'main',
    title: 'Navigate',
    links: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'About', href: '/about', icon: FileText },
      { label: 'Track', href: '/track', icon: Search },
      { label: 'Branches', href: '/branches', icon: MapPin },
      { label: 'Contact', href: '/contact', icon: FileText },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    links: [
      { label: 'Air Freight', href: '/air-freight', icon: Plane },
      { label: 'Ocean Freight', href: '/ocean-freight', icon: Ship },
      { label: 'Check Price', href: '/check-price', icon: DollarSign },
      { label: 'Rate Cards', href: '/rate-cards', icon: FileText },
    ],
  },
  {
    id: 'tools',
    title: 'Tools & Support',
    links: [
      { label: 'FAQ', href: '/faq', icon: HelpCircle },
      { label: 'Schedule Pickup', href: '/pickup', icon: Calendar },
      { label: 'Volumetric Calculator', href: '/volumetric-calculator', icon: Ruler },
      { label: 'Currency Converter', href: '/currency-converter', icon: Globe },
      { label: 'Prohibited Items', href: '/prohibited', icon: Ban },
    ],
  },
];

export const MOBILE_ACCOUNT_LINKS: MobileNavLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Shipments', href: '/my-shipments', icon: Package },
  { label: 'Invoices', href: '/my-invoices', icon: Receipt },
];
