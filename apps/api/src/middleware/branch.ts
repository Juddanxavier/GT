/** @format */

import type { Context, Next } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { branches } from '../db/schema';
import { cacheGet, cacheSet, cacheDel } from '../cache';
import { errorResponse } from '../error-response';

const CACHE_TTL_SEC = 300;

export type BranchVariables = {
  branchId: string | null;
};

/**
 * Validates the X-Branch-ID header for tenant-admin users.
 * Ensures the branch belongs to the user's tenant.
 * Sets c.set('branchId') on success, returns 400 on failure.
 *
 * Must run AFTER tenantMiddleware (needs c.get('tenantId')).
 */
export async function branchMiddleware(c: Context, next: Next) {
  const headerBranchId = c.req.header('X-Branch-ID');
  const user = c.get('user') as { role?: string } | null;

  c.set('branchId', null);

  if (!headerBranchId) {
    await next();
    return;
  }

  // Silently ignore bogus header values from buggy clients
  if (headerBranchId === 'undefined' || headerBranchId === 'null' || headerBranchId === '') {
    await next();
    return;
  }

  if (user?.role !== 'tenant-admin' && user?.role !== 'superadmin') {
    return errorResponse(c, 'BRANCH_FILTER_DENIED', 'Branch filter is only available for tenant-admin users', 400);
  }

  const tenantId = c.get('tenantId');
  if (!tenantId) {
    return errorResponse(c, 'TENANT_REQUIRED', 'Tenant context required for branch filtering', 400);
  }

  // Check cache
  const cacheKey = `branch:${headerBranchId}:tenant:${tenantId}`;
  const cached = await cacheGet<string | null>(null, cacheKey);
  if (cached === 'valid') {
    c.set('branchId', headerBranchId);
    await next();
    return;
  }

  // Validate branch belongs to this tenant
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, headerBranchId), eq(branches.tenantId, tenantId)))
    .limit(1);

  if (!branch) {
    return errorResponse(c, 'BRANCH_NOT_FOUND', 'Branch not found or does not belong to your organization', 400);
  }

  await cacheSet(null, cacheKey, 'valid', CACHE_TTL_SEC);
  c.set('branchId', headerBranchId);

  await next();
}

/**
 * Invalidate cached branch validation for a given branch.
 * Call this when a branch is updated or deleted so stale
 * X-Branch-ID headers are re-validated on the next request.
 */
export async function invalidateBranchCache(branchId: string, tenantId: string): Promise<void> {
  await cacheDel(null, `branch:${branchId}:tenant:${tenantId}`);
}
