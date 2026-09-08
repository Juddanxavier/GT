const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

const DASHBOARD_PREFIXES = [
  '/dashboard',
  '/my-shipments',
  '/my-invoices',
  '/invoices',
  '/profile',
  '/notifications',
  '/onboarding',
];

export function isMarketingPath(pathname: string): boolean {
  if (AUTH_PATHS.includes(pathname)) return false;
  if (DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return true;
}
