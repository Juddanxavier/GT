/** @format */

import type { Context, Next } from 'hono';
import * as Sentry from '@sentry/hono/node';
import { db, runWithTenantContext } from '../db';
import { tenantDomains, tenants } from '../db/schema';
import { eq } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../cache';
import { errorResponse } from '../error-response';
import type { Logger } from '../logger';

const CACHE_TTL_SEC = 300;

export type TenantVariables = {
  tenantId: string | null;
  tenantSource: 'user' | 'domain' | 'header' | 'slug' | null;
};

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

async function resolveTenantByDomain(host: string, log: Logger): Promise<string | null> {
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
    log.error({ err: error }, 'tenant domain lookup failed');
    return null;
  }
}

async function resolveTenantBySlug(slug: string, log: Logger): Promise<string | null> {
  const cached = await cacheGet<string | null>(null, `slug:${slug}`);
  if (cached !== null) {
    return cached || null;
  }

  try {
    const result = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (result.length > 0 && result[0]) {
      await cacheSet(null, `slug:${slug}`, result[0].id, CACHE_TTL_SEC);
      return result[0].id;
    }

    await cacheSet(null, `slug:${slug}`, '', CACHE_TTL_SEC);
    return null;
  } catch (error) {
    log.error({ err: error }, 'tenant slug lookup failed');
    return null;
  }
}

export async function tenantMiddleware(c: Context, next: Next) {
  let tenantId: string | null = null;
  let tenantSource: 'user' | 'domain' | 'header' | 'slug' | null = null;

  const headerTenantId = c.req.header('X-Tenant-ID');
  const headerTenantSlug = c.req.header('X-Tenant-Slug');
  const user = c.get('user') as { role?: string; tenantId?: string; branchId?: string } | null;
  const log = c.get('logger');

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

  if (!tenantId && headerTenantSlug) {
    tenantId = await resolveTenantBySlug(headerTenantSlug, log);
    if (tenantId) {
      tenantSource = 'slug';
    }
  }

  if (!tenantId) {
    const host = c.req.header('host');
    if (host) {
      tenantId = await resolveTenantByDomain(host, log);
      if (tenantId) {
        tenantSource = 'domain';
      }
    }
  }

  c.set('tenantId', tenantId);
  c.set('tenantSource', tenantSource);

  // Rebind the request logger with tenantId (spec 0001): every line after this
  // point carries the tenant; lines before it carry reqId only.
  if (tenantId) {
    c.set('logger', c.get('logger').child({ tenantId }));
    Sentry.setTag('tenantId', tenantId);
  }
  Sentry.setTag('tenantSource', (tenantSource as string) ?? 'none');
  Sentry.setTag('branchOverride', c.req.header('X-Branch-ID') ?? 'none');

  try {
    await runWithTenantContext(tenantId, () => next());
  } catch (error) {
    c.get('logger').error({ err: error }, 'failed to set RLS context');
    return errorResponse(c, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
}

