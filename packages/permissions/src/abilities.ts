/** @format */

import { AbilityBuilder, Ability, type AbilityClass } from '@casl/ability';
import type { Action, Subject, PermissionContext, ResourceContext } from './types';

type AppAbility = Ability<[Action, Subject]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

/**
 * Define CASL abilities based on the user's role and context.
 *
 * Rules are evaluated in order. The last matching rule wins.
 * Use `cannot` AFTER `can` to create exceptions (e.g., staff can manage
 * shipments but cannot update billAmount).
 *
 * @param user - The user's permission context (role, tenantId, branchId)
 * @returns A CASL Ability instance with all applicable rules
 */
export function defineAbilityFor(user: PermissionContext) {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const isSuperadmin = user.role === 'superadmin';
  const isTenantAdmin = user.role === 'tenant-admin';
  const isStaff = user.role === 'staff';
  const isCustomer = user.role === 'customer';

  // Effective tenant ID (superadmin can override via X-Tenant-ID)
  const effectiveTenantId = user.overrideTenantId ?? user.tenantId;

  // ── SUPERADMIN: Cross-tenant access, full control ──
  if (isSuperadmin) {
    can('manage', 'all'); // Superadmin can do everything
  }

  // ── TENANT-ADMIN: Own org management ──
  if (isTenantAdmin) {
    // Full CRUD on branches, customers, users within own tenant
    can('manage', 'branch');
    can('manage', 'customer');
    can('manage', 'user');
    can('manage', 'shipment');
    can('manage', 'shipment:billAmount'); // Can edit bill amounts
    can('manage', 'quote');
    can('manage', 'invoice');
    cannot('manage', 'tenant'); // Cannot create/delete orgs, only superadmin can
  }

  // ── STAFF: Branch-level operations ──
  if (isStaff) {
    can('read', 'customer'); // Staff can view branch-linked customers only
    can('manage', 'user');
    can('create', 'shipment'); // Can create shipments
    can('read', 'shipment'); // Can view shipments
    can('update', 'shipment'); // Can update non-bill fields
    can('read', 'shipment:billAmount'); // Can SEE bill amounts
    cannot('update', 'shipment:billAmount'); // CANNOT edit bill amounts
    can('update', 'quote'); // Can respond to quotes with price
    can('read', 'quote');
    can('read', 'invoice');
  }

  // ── CUSTOMER: Own data only ──
  if (isCustomer) {
    can('create', 'quote'); // Can initiate a quote request
    can('read', 'quote'); // Can see their own quotes
    can('read', 'shipment'); // Can see their own shipments
    can('read', 'invoice'); // Can see their own invoices
    can('update', 'user'); // Can update own profile
    // Cannot: create/update shipments, manage branches, see other customers
  }

  return build();
}

/**
 * Check if a user can perform an action on a subject.
 * Convenience wrapper around ability.can().
 */
export function can(user: PermissionContext, action: Action, subject: Subject): boolean {
  const ability = defineAbilityFor(user);
  return ability.can(action, subject);
}
