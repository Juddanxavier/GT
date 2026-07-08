import type { z } from 'zod';
import { validateResponse } from './validation';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function fmtINR(n: unknown) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(Number(n));
}

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
        const msg = parts.join(' ') || `Request failed (${res.status})`;
        if (msg.includes('Branch not found')) {
          branchOverride = null;
          try { localStorage.removeItem('branchFilter'); } catch {}
        }
        throw new ApiError(res.status, msg);
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

async function requestFull<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(tenantOverride ? { 'X-Tenant-ID': tenantOverride } : {}),
    ...(branchOverride ? { 'X-Branch-ID': branchOverride } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${BASE}${path}`, { credentials: 'include', headers, signal: controller.signal, ...options });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const parts: string[] = [];
      if (body && typeof body.error === 'string') parts.push(body.error);
      if (body && body.detail) parts.push(`(${body.detail})`);
      if (body && body.code) parts.push(`[${body.code}]`);
      const msg = parts.join(' ') || `Request failed (${res.status})`;
      if (msg.includes('Branch not found')) {
        branchOverride = null;
        try { localStorage.removeItem('branchFilter'); } catch {}
      }
      throw new ApiError(res.status, msg);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestInit & { schema?: z.ZodType<T> }) => {
    const { schema, ...fetchOpts } = options ?? {};
    return request<T>(path, fetchOpts).then((data) => schema ? validateResponse(schema, data, path) : data);
  },
  getFull: <T>(path: string, options?: RequestInit & { schema?: z.ZodType<T> }) => {
    const { schema, ...fetchOpts } = options ?? {};
    return requestFull<T>(path, fetchOpts).then((data) => schema ? validateResponse(schema, data, path) : data);
  },
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
