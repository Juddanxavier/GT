/** @format */

import { defineAbilityFor } from './abilities';
import type { Action, Subject, PermissionContext, ResourceContext } from './types';

/**
 * Check if a user has permission AND the resource belongs to their scope.
 * This is the primary guard function used by API route handlers.
 *
 * Example:
 *   const shipment = await getShipment(id);
 *   if (!canAccess(user, 'update', 'shipment', shipment)) {
 *     return c.json({ error: 'Forbidden' }, 403);
 *   }
 */
export function canAccess(
  user: PermissionContext,
  action: Action,
  subject: Subject,
  resource?: ResourceContext,
): boolean {
  const ability = defineAbilityFor(user);

  // First check: does the user have this ability at all?
  if (!ability.can(action, subject)) {
    return false;
  }

  // Second check: data scoping
  // If no resource context provided, skip data scoping (only check ability)
  if (!resource) {
    return true;
  }

  // Determine the effective tenant ID (superadmin can override)
  const effectiveTenantId = user.overrideTenantId ?? user.tenantId;

  // If user has a tenant scope and resource has a tenantId, they must match
  // (unless user is superadmin without overrideTenantId — superadmin sees all)
  if (effectiveTenantId && resource.tenantId && effectiveTenantId !== resource.tenantId) {
    // Superadmin without override can see all tenants
    if (user.role !== 'superadmin' || user.overrideTenantId) {
      return false;
    }
  }

  // Staff are scoped to their branch (can also see org-wide data)
  if (user.role === 'staff' && user.branchId && resource.branchId) {
    // Staff can see their own branch's data
    if (resource.branchId !== user.branchId) {
      // But also allow if it's within their org (no branch filter = org-wide)
      // If branchId filter specifically doesn't match, deny
      return false;
    }
  }

  // Customer data scoping: only their own data
  if (user.role === 'customer' && resource.ownerId) {
    if (resource.ownerId !== user.userId) {
      return false;
    }
  }

  return true;
}

/**
 * Build a tenant-scoped WHERE condition for Drizzle queries.
 * Returns the tenantId and optional branchId that should be used
 * as query filters.
 */
export function queryScope(user: PermissionContext): {
  tenantId?: string;
  branchId?: string;
  ownerId?: string;
} {
  const effectiveTenantId = user.overrideTenantId ?? user.tenantId;

  switch (user.role) {
    case 'superadmin':
      // Superadmin with override sees that tenant
      if (user.overrideTenantId) {
        return { tenantId: user.overrideTenantId };
      }
      // Superadmin without override sees all
      return {};
    case 'tenant-admin':
    case 'staff':
      return {
        tenantId: effectiveTenantId ?? undefined,
        branchId: user.branchId ?? undefined,
      };
    case 'customer':
      return { ownerId: user.userId };
    default:
      return {};
  }
}

/**
 * Role-based access helper for route-level protection.
 * Used in middleware to check if user has the required role.
 */
export function hasRole(user: PermissionContext, ...roles: string[]): boolean {
  return roles.includes(user.role);
}
