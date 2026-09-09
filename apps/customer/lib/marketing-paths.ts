export const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}

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
  if (isAuthPath(pathname)) return false;
  if (DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return true;
}
