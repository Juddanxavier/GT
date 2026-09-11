export const DASHBOARD_PREFIXES = [
  '/dashboard',
  '/my-shipments',
  '/my-invoices',
  '/invoices',
  '/profile',
  '/notifications',
  '/onboarding',
];

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-shipments': 'My Shipments',
  '/my-invoices': 'Invoices',
  '/invoices': 'Invoices',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
  '/onboarding': 'Onboarding',
};

export function getPortalPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(`${path}/`)) return title;
  }
  if (pathname.startsWith('/my-shipments/')) return 'Shipment';
  if (pathname.startsWith('/invoices/')) return 'Invoice';
  return 'Portal';
}

export type PortalSearchItem = {
  id: string;
  label: string;
  href: string;
  keywords: string;
  group: 'shipments' | 'invoices' | 'help' | 'account';
};

export const PORTAL_SEARCH_ITEMS: PortalSearchItem[] = [
  { id: 'track', label: 'Track shipment', href: '/track', keywords: 'track tracking number status', group: 'shipments' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', keywords: 'dashboard home overview', group: 'account' },
  { id: 'shipments', label: 'My shipments', href: '/my-shipments', keywords: 'shipments packages parcels', group: 'shipments' },
  { id: 'invoices', label: 'Invoices', href: '/my-invoices', keywords: 'invoices billing payment', group: 'invoices' },
  { id: 'pickup', label: 'Schedule pickup', href: '/pickup', keywords: 'pickup collection schedule', group: 'shipments' },
  { id: 'check-price', label: 'Check price', href: '/check-price', keywords: 'price quote rate calculator', group: 'help' },
  { id: 'faq', label: 'FAQ', href: '/faq', keywords: 'faq help questions', group: 'help' },
  { id: 'contact', label: 'Contact', href: '/contact', keywords: 'contact support phone email', group: 'help' },
  { id: 'profile', label: 'Profile', href: '/profile', keywords: 'profile account settings', group: 'account' },
  { id: 'notifications', label: 'Notifications', href: '/notifications', keywords: 'notifications alerts', group: 'account' },
];
