export const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}

import { isDashboardPath } from '@/lib/portal-paths';

export function isMarketingPath(pathname: string): boolean {
  if (isAuthPath(pathname)) return false;
  if (isDashboardPath(pathname)) return false;
  return true;
}
