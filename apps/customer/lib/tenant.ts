import { headers } from 'next/headers';
import { tenantConfig, type TenantSlug } from './tenant-config';

export type { TenantSlug };
export { tenantConfig };

export async function getTenantSlug(): Promise<TenantSlug> {
  const h = await headers();
  return (h.get('x-tenant-slug') as TenantSlug) ?? 'gajan-traders';
}
