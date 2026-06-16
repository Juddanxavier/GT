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

export type GuardAction = Action;
export type GuardSubject = Subject;

export function requireRole(...roles: string[]) {
  return async function roleGuard(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const permissionContext: PermissionContext = {
      userId: user.id,
      role: user.role as PermissionContext['role'],
      tenantId: c.get('tenantId') ?? user.tenantId,
      branchId: user.branchId,
      overrideTenantId: c.get('tenantId'),
    };

    if (!hasRole(permissionContext, ...roles)) {
      const accept = c.req.header('Accept') ?? '';
      if (accept.includes('json') || c.req.header('Content-Type')?.includes('json')) {
        return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
      }
      return c.redirect('/unauthorized');
    }

    await next();
  };
}

export function getUser(c: Context) {
  return c.get('user') as { id: string; role: string; tenantId?: string; branchId?: string } | null;
}

export function requireAbility(action: Action, subject: Subject) {
  return async function abilityGuard(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const permissionContext: PermissionContext = {
      userId: user.id,
      role: user.role as PermissionContext['role'],
      tenantId: c.get('tenantId') ?? user.tenantId,
      branchId: user.branchId,
      overrideTenantId: c.get('tenantId'),
    };

    if (!canAccess(permissionContext, action, subject)) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
    }

    await next();
  };
}

export function requireResourceAbility(
  action: Action,
  subject: Subject,
  resourceFn: (c: Context) => ResourceContext | Promise<ResourceContext>,
) {
  return async function resourceAbilityGuard(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const permissionContext: PermissionContext = {
      userId: user.id,
      role: user.role as PermissionContext['role'],
      tenantId: c.get('tenantId') ?? user.tenantId,
      branchId: user.branchId,
      overrideTenantId: c.get('tenantId'),
    };

    const resource = await resourceFn(c);

    if (!canAccess(permissionContext, action, subject, resource)) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
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
  };

  return queryScope(permissionContext);
}
