import { tenantConfig } from './tenant-config';

export { tenantConfig };

export async function getTenantSlug() {
  return 'lanka-mahal' as const;
}
