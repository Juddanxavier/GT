export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'tenant-admin' | 'staff' | 'customer';
  tenantId?: string;
  branchId?: string;
  tenantName?: string;
  branchName?: string;
  tenantCountry?: string;
  tenantSlug?: string;
}

export function getUser(session: { user?: unknown } | null): SessionUser | null {
  return (session?.user as SessionUser) ?? null;
}
