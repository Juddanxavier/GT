import { headers } from 'next/headers';

export type TenantSlug = 'gajan-traders' | 'lanka-mahal';

export async function getTenantSlug(): Promise<TenantSlug> {
  const h = await headers();
  return (h.get('x-tenant-slug') as TenantSlug) ?? 'gajan-traders';
}

export const tenantConfig: Record<TenantSlug, {
  name: string;
  shortName: string;
  title: string;
  theme: string;
}> = {
  'gajan-traders': {
    name: 'Gajan Traders',
    shortName: 'GT',
    title: 'Track Your Shipment',
    theme: 'emerald',
  },
  'lanka-mahal': {
    name: 'Lanka Mahal',
    shortName: 'LM',
    title: 'Track Your Shipment',
    theme: 'violet',
  },
};
