export type TenantSlug = 'gajan-traders' | 'lanka-mahal';

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
