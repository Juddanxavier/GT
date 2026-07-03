'use client';

import { tenantConfig, type TenantSlug } from './tenant-config';

export function useTenantConfig() {
  if (typeof document === 'undefined') {
    return tenantConfig['gajan-traders'];
  }
  const slug = (document.documentElement.getAttribute('data-tenant-slug') as TenantSlug) || 'gajan-traders';
  return tenantConfig[slug] ?? tenantConfig['gajan-traders'];
}
