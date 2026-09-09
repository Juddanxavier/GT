import type { Branch } from '@/lib/types';

export async function fetchPublicBranches(tenantSlug: string): Promise<Branch[]> {
  const res = await fetch(
    `/api/branches/public?tenant=${encodeURIComponent(tenantSlug)}`,
  );
  if (!res.ok) return [];
  const body = (await res.json()) as { data?: Branch[] };
  return Array.isArray(body.data) ? body.data : [];
}
