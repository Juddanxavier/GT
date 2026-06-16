/** @format */

import type { Context, Next } from 'hono';
import * as Sentry from '@sentry/hono/node';
import { db } from '../db';
import { tenantDomains } from '../db/schema';
import { eq } from 'drizzle-orm';
import { setRLSTenantContext } from '../db/rls';
import { cacheGet, cacheSet } from '../cache';

const CACHE_TTL_SEC = 300;

export type TenantVariables = {
  tenantId: string | null;
  tenantSource: 'user' | 'domain' | 'header' | null;
};

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

async function resolveTenantByDomain(host: string): Promise<string | null> {
  const domain = host.split(':')[0]?.toLowerCase() ?? '';

  if (!domain || domain === 'localhost') {
    return null;
  }

  const cached = await cacheGet<string | null>(null, `domain:${domain}`);
  if (cached !== null) {
    return cached || null;
  }

  try {
    const result = await db
      .select({ tenantId: tenantDomains.tenantId })
      .from(tenantDomains)
      .where(eq(tenantDomains.domain, domain))
      .limit(1);

    if (result.length > 0 && result[0]) {
      const tenantId = result[0].tenantId;
      await cacheSet(null, `domain:${domain}`, tenantId, CACHE_TTL_SEC);
      return tenantId;
    }

    await cacheSet(null, `domain:${domain}`, '', CACHE_TTL_SEC);
    return null;
  } catch (error) {
    console.error('Tenant domain lookup failed:', error);
    return null;
  }
}

export async function tenantMiddleware(c: Context, next: Next) {
  let tenantId: string | null = null;
  let tenantSource: 'user' | 'domain' | 'header' | null = null;

  const headerTenantId = c.req.header('X-Tenant-ID');
  const user = c.get('user') as { role?: string } | null;

  if (headerTenantId && user?.role === 'superadmin') {
    tenantId = headerTenantId;
    tenantSource = 'header';
  }

  if (!tenantId && user) {
    const userTenantId = (user as Record<string, unknown>).tenantId;
    if (userTenantId && typeof userTenantId === 'string') {
      tenantId = userTenantId;
      tenantSource = 'user';
    }
  }

  if (!tenantId) {
    const host = c.req.header('host');
    if (host) {
      tenantId = await resolveTenantByDomain(host);
      if (tenantId) {
        tenantSource = 'domain';
      }
    }
  }

  c.set('tenantId', tenantId);
  c.set('tenantSource', tenantSource);

  // Tag Sentry with tenant context
  if (tenantId) {
    Sentry.setTag('tenantId', tenantId);
  }
  Sentry.setTag('tenantSource', tenantSource ?? 'none');

  try {
    await setRLSTenantContext(tenantId);
  } catch (error) {
    console.error('Failed to set RLS context:', error);
  }

  await next();
}

export function clearTenantCache(): void {
  // In-memory cache removed — Redis-based cache auto-expires via TTL
  // For immediate invalidation, use cacheFlushTenant or cacheDel
}
