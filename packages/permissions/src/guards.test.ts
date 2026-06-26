import { describe, it, expect } from 'vitest';
import { canAccess, queryScope } from './guards';
import type { PermissionContext } from './types';

function user(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return { userId: '1', role: 'superadmin', tenantId: null, branchId: null, ...overrides };
}

describe('canAccess', () => {
  it('superadmin can manage all without resource check', () => {
    const u = user({ role: 'superadmin' });
    expect(canAccess(u, 'manage', 'all')).toBe(true);
  });

  it('staff cannot update billAmount', () => {
    const u = user({ role: 'staff', tenantId: 't1', branchId: 'b1' });
    expect(canAccess(u, 'update', 'shipment:billAmount')).toBe(false);
  });

  describe('tenant scoping', () => {
    it('blocks staff from accessing other tenant resources', () => {
      const u = user({ role: 'staff', tenantId: 't1', branchId: 'b1' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't2', branchId: 'b1' })).toBe(false);
    });

    it('allows staff to access own tenant resources', () => {
      const u = user({ role: 'staff', tenantId: 't1', branchId: 'b1' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't1', branchId: 'b1' })).toBe(true);
    });

    it('superadmin can access any tenant without override', () => {
      const u = user({ role: 'superadmin' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't2', branchId: 'b1' })).toBe(true);
    });

    it('superadmin with override cannot access other tenants', () => {
      const u = user({ role: 'superadmin', overrideTenantId: 't1' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't2', branchId: 'b1' })).toBe(false);
    });
  });

  describe('branch scoping', () => {
    it('blocks staff from accessing other branch resources', () => {
      const u = user({ role: 'staff', tenantId: 't1', branchId: 'b1' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't1', branchId: 'b2' })).toBe(false);
    });

    it('allows staff to access own branch resources', () => {
      const u = user({ role: 'staff', tenantId: 't1', branchId: 'b1' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't1', branchId: 'b1' })).toBe(true);
    });

    it('allows tenant-admin with overrideBranchId to see that branch', () => {
      const u = user({ role: 'tenant-admin', tenantId: 't1', overrideBranchId: 'b2' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't1', branchId: 'b2' })).toBe(true);
    });

    it('blocks tenant-admin with overrideBranchId from other branch', () => {
      const u = user({ role: 'tenant-admin', tenantId: 't1', overrideBranchId: 'b2' });
      expect(canAccess(u, 'read', 'shipment', { tenantId: 't1', branchId: 'b1' })).toBe(false);
    });
  });

  describe('customer data scoping', () => {
    it('allows customer to access own data', () => {
      const u = user({ role: 'customer', userId: 'cust-1' });
      expect(canAccess(u, 'read', 'shipment', { ownerId: 'cust-1' })).toBe(true);
    });

    it('blocks customer from accessing other data', () => {
      const u = user({ role: 'customer', userId: 'cust-1' });
      expect(canAccess(u, 'read', 'shipment', { ownerId: 'cust-2' })).toBe(false);
    });
  });
});

describe('queryScope', () => {
  it('returns branch scoping for staff', () => {
    const scope = queryScope(user({ role: 'staff', tenantId: 't1', branchId: 'b1' }));
    expect(scope).toEqual({ tenantId: 't1', branchId: 'b1' });
  });

  it('returns tenant scoping for tenant-admin', () => {
    const scope = queryScope(user({ role: 'tenant-admin', tenantId: 't1' }));
    expect(scope).toEqual({ tenantId: 't1' });
  });

  it('returns additional branchId when tenant-admin overrides', () => {
    const scope = queryScope(user({ role: 'tenant-admin', tenantId: 't1', overrideBranchId: 'b2' }));
    expect(scope).toEqual({ tenantId: 't1', branchId: 'b2' });
  });

  it('returns empty for superadmin without override', () => {
    const scope = queryScope(user({ role: 'superadmin' }));
    expect(scope).toEqual({});
  });

  it('returns tenant for superadmin with override', () => {
    const scope = queryScope(user({ role: 'superadmin', overrideTenantId: 't1' }));
    expect(scope).toEqual({ tenantId: 't1' });
  });

  it('returns ownerId for customer', () => {
    const scope = queryScope(user({ role: 'customer', userId: 'cust-1' }));
    expect(scope).toEqual({ ownerId: 'cust-1' });
  });
});
