import { describe, it, expect } from 'vitest';
import { defineAbilityFor } from './abilities';
import type { PermissionContext } from './types';

function user(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return { userId: '1', role: 'superadmin', tenantId: null, branchId: null, ...overrides };
}

describe('defineAbilityFor', () => {
  describe('superadmin', () => {
    const u = user({ role: 'superadmin' });
    const ability = defineAbilityFor(u);

    it('can manage all', () => {
      expect(ability.can('manage', 'all')).toBe(true);
    });
  });

  describe('tenant-admin', () => {
    const u = user({ role: 'tenant-admin', tenantId: 't1' });
    const ability = defineAbilityFor(u);

    it('can manage branches', () => expect(ability.can('manage', 'branch')).toBe(true));
    it('can manage customers', () => expect(ability.can('manage', 'customer')).toBe(true));
    it('can manage users', () => expect(ability.can('manage', 'user')).toBe(true));
    it('can manage shipments', () => expect(ability.can('manage', 'shipment')).toBe(true));
    it('can manage bill amounts', () => expect(ability.can('manage', 'shipment:billAmount')).toBe(true));
    it('can manage quotes', () => expect(ability.can('manage', 'quote')).toBe(true));
    it('can manage invoices', () => expect(ability.can('manage', 'invoice')).toBe(true));
    it('cannot manage tenant', () => expect(ability.can('manage', 'tenant')).toBe(false));
  });

  describe('staff', () => {
    const u = user({ role: 'staff', tenantId: 't1', branchId: 'b1' });
    const ability = defineAbilityFor(u);

    it('can read customers', () => expect(ability.can('read', 'customer')).toBe(true));
    it('can manage users', () => expect(ability.can('manage', 'user')).toBe(true));
    it('can create shipments', () => expect(ability.can('create', 'shipment')).toBe(true));
    it('can read shipments', () => expect(ability.can('read', 'shipment')).toBe(true));
    it('can update shipments', () => expect(ability.can('update', 'shipment')).toBe(true));
    it('can read bill amounts', () => expect(ability.can('read', 'shipment:billAmount')).toBe(true));
    it('cannot update bill amounts', () => expect(ability.can('update', 'shipment:billAmount')).toBe(false));
    it('can read quotes', () => expect(ability.can('read', 'quote')).toBe(true));
    it('can update quotes', () => expect(ability.can('update', 'quote')).toBe(true));
    it('can read invoices', () => expect(ability.can('read', 'invoice')).toBe(true));
  });

  describe('customer', () => {
    const u = user({ role: 'customer', userId: 'cust-1' });
    const ability = defineAbilityFor(u);

    it('can create quotes', () => expect(ability.can('create', 'quote')).toBe(true));
    it('can read quotes', () => expect(ability.can('read', 'quote')).toBe(true));
    it('can read shipments', () => expect(ability.can('read', 'shipment')).toBe(true));
    it('can read invoices', () => expect(ability.can('read', 'invoice')).toBe(true));
    it('can update user', () => expect(ability.can('update', 'user')).toBe(true));
    it('cannot manage shipments', () => expect(ability.can('manage', 'shipment')).toBe(false));
    it('cannot manage customers', () => expect(ability.can('manage', 'customer')).toBe(false));
  });
});
