const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let tenantOverride: string | null = null;
let branchOverride: string | null = null;

export function setTenantFilter(id: string | null) {
  tenantOverride = id;
}

export function getTenantFilter() {
  return tenantOverride;
}

export function clearTenantFilter() {
  tenantOverride = null;
}

export function setBranchFilter(id: string | null) {
  branchOverride = id;
}

export function getBranchFilter() {
  return branchOverride;
}

export function clearBranchFilter() {
  branchOverride = null;
}

const REQUEST_TIMEOUT = 15_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(path: string, options?: RequestInit, retries = 1): Promise<{ data: T; res: Response }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(tenantOverride ? { 'X-Tenant-ID': tenantOverride } : {}),
    ...(branchOverride ? { 'X-Branch-ID': branchOverride } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        headers,
        signal: controller.signal,
        ...options,
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const parts: string[] = [];
        if (body && typeof body.error === 'string') parts.push(body.error);
        if (body && body.detail) parts.push(`(${body.detail})`);
        if (body && body.code) parts.push(`[${body.code}]`);
        throw new ApiError(res.status, parts.join(' ') || `Request failed (${res.status})`);
      }

      return { data: body.data as T, res };
    } catch (err) {
      if (attempt < retries && (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError'))) {
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await fetchJson<T>(path, options);
  return data;
}

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

async function requestPaginated<T>(path: string, options?: RequestInit): Promise<PaginatedResponse<T>> {
  const { res } = await fetchJson<PaginatedResponse<T>>(path, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const parts: string[] = [];
    if (body && typeof body.error === 'string') parts.push(body.error);
    throw new ApiError(res.status, parts.join(' ') || `Request failed (${res.status})`);
  }
  return body as PaginatedResponse<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getPaginated: <T>(path: string) => requestPaginated<T>(path),
  getForTenant: <T>(path: string, tenantId: string) =>
    request<T>(path, { headers: { 'X-Tenant-ID': tenantId } as Record<string, string> }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
