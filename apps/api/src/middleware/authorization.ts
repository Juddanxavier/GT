/** @format */

import type { Context, Next } from 'hono';
import {
  canAccess,
  hasRole,
  queryScope,
  type Action,
  type Subject,
  type PermissionContext,
  type ResourceContext,
} from '@repo/permissions';
import { errorResponse } from '../error-response';

export type GuardAction = Action;
export type GuardSubject = Subject;

export function requireRole(...roles: string[]) {
  return async function roleGuard(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
      return errorResponse(c, 'AUTH_REQUIRED', 'Authentication required', 401);
    }

    const permissionContext: PermissionContext = {
      userId: user.id,
      role: user.role as PermissionContext['role'],
      tenantId: c.get('tenantId') ?? user.tenantId,
      branchId: user.branchId,
      overrideTenantId: c.get('tenantId'),
      overrideBranchId: c.get('branchId'),
    };

    if (!hasRole(permissionContext, ...roles)) {
      const accept = c.req.header('Accept') ?? '';
      if (accept.includes('json') || c.req.header('Content-Type')?.includes('json')) {
        return errorResponse(c, 'FORBIDDEN', 'Forbidden: insufficient permissions', 403);
      }
      return c.redirect('/unauthorized');
    }

    await next();
  };
}

export function getUser(c: Context) {
  return c.get('user') as { id: string; role: string; tenantId?: string; branchId?: string } | null;
}

/**
 * Require that a staff user's branch scope is respected.
 * Blocks requests where query/param branchId doesn't match the user's branch.
 * Non-staff roles pass through.
 */
export function requireBranchScope() {
  return async function branchScopeGuard(c: Context, next: Next) {
    const user = c.get('user');
    if (!user) return errorResponse(c, 'AUTH_REQUIRED', 'Authentication required', 401);

    if (user.role !== 'staff') return await next();

    const userBranchId: string | undefined = user.branchId;
    if (!userBranchId) return errorResponse(c, 'NO_BRANCH', 'No branch assigned to your account', 403);

    const queryBranchId = c.req.query('branchId');
    if (queryBranchId && queryBranchId !== userBranchId) {
      return errorResponse(c, 'BRANCH_MISMATCH', 'Forbidden: you can only access your own branch', 403);
    }

    const paramBranchId = c.req.param('branchId');
    if (paramBranchId && paramBranchId !== userBranchId) {
      return errorResponse(c, 'BRANCH_MISMATCH', 'Forbidden: you can only access your own branch', 403);
    }

    await next();
  };
}

export function getQueryScope(c: Context) {
  const user = c.get('user');

  if (!user) {
    return {};
  }

  const permissionContext: PermissionContext = {
    userId: user.id,
    role: user.role as PermissionContext['role'],
    tenantId: c.get('tenantId') ?? user.tenantId,
    branchId: user.branchId,
    overrideTenantId: c.get('tenantId'),
    overrideBranchId: c.get('branchId'),
  };

  return queryScope(permissionContext);
}
