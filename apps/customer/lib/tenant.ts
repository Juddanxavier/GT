import { tenantConfig } from './tenant-config';

export { tenantConfig };

export async function getTenantSlug() {
  return 'gajan-traders' as const;
}
