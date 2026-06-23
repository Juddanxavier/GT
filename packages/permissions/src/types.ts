/** @format */

/**
 * All possible user roles in the system.
 * - superadmin: Cross-tenant access, manages orgs/branches, can edit bill amounts
 * - tenant-admin: Own org access, manages branches, can edit bill amounts
 * - staff: Branch-level access, can create shipments but bill amounts read-only
 * - customer: Own data only, can create quotes on portal
 */
export type Role = 'superadmin' | 'tenant-admin' | 'staff' | 'customer';

/**
 * All resources (subjects) that permissions can be defined for.
 */
export type Subject =
  | 'all'
  | 'tenant'
  | 'branch'
  | 'user'
  | 'shipment'
  | 'shipment:billAmount'
  | 'quote'
  | 'customer'
  | 'invoice';

/**
 * Union of all possible actions.
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

/**
 * Extended user context for permission evaluation.
 * Used when determining if a user can act on a resource.
 */
export type PermissionContext = {
  userId: string;
  role: Role;
  tenantId?: string | null;
  branchId?: string | null;
  // Superadmin can pass X-Tenant-ID to act as a different tenant
  overrideTenantId?: string | null;
  // Tenant-admin can pass X-Branch-ID to scope to a specific branch
  overrideBranchId?: string | null;
};

/**
 * Resource ownership information.
 * Used for data-scoping checks (e.g., "does this shipment belong to user's tenant?")
 */
export type ResourceContext = {
  tenantId?: string | null;
  branchId?: string | null;
  ownerId?: string | null; // customer userId for customer-owned resources
};
