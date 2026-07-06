import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';

const mockInsert = vi.fn();
const mockValues = vi.fn();

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../db', () => ({
  db: {
    insert: () => ({
      values: mockValues,
    }),
  },
}));

vi.mock('../db/schema', () => ({
  auditLogs: {
    id: 'audit_log.id',
    event: 'audit_log.event',
    userId: 'audit_log.user_id',
    metadata: 'audit_log.metadata',
    ipAddress: 'audit_log.ip_address',
    userAgent: 'audit_log.user_agent',
    createdAt: 'audit_log.created_at',
  },
}));

import { logAudit } from './audit';

describe('logAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockReset().mockResolvedValue(undefined);
  });

  it('inserts an audit log entry with event and userId', async () => {
    await logAudit('LOGIN_SUCCESS', 'user-123', { email: 'test@test.com' });

    expect(mockValues).toHaveBeenCalledWith({
      event: 'LOGIN_SUCCESS',
      userId: 'user-123',
      metadata: { email: 'test@test.com' },
      ipAddress: null,
      userAgent: null,
    });
  });

  it('handles null userId by passing undefined', async () => {
    await logAudit('LOGIN_FAILED', null, { email: 'unknown@test.com' });

    expect(mockValues).toHaveBeenCalledWith({
      event: 'LOGIN_FAILED',
      userId: undefined,
      metadata: { email: 'unknown@test.com' },
      ipAddress: null,
      userAgent: null,
    });
  });

  it('extracts IP and user-agent from the context', async () => {
    const mockCtx = {
      req: {
        header: (name: string) => {
          if (name === 'x-forwarded-for') return '203.0.113.42';
          if (name === 'user-agent') return 'TestAgent/1.0';
          return null;
        },
      },
    } as unknown as Context;

    await logAudit('NOTIFICATION_SENT', 'user-456', { channel: 'email' }, mockCtx);

    expect(mockValues).toHaveBeenCalledWith({
      event: 'NOTIFICATION_SENT',
      userId: 'user-456',
      metadata: { channel: 'email' },
      ipAddress: '203.0.113.42',
      userAgent: 'TestAgent/1.0',
    });
  });

  it('prefers x-forwarded-for over x-real-ip', async () => {
    const mockCtx = {
      req: {
        header: (name: string) => {
          if (name === 'x-forwarded-for') return '203.0.113.42';
          if (name === 'x-real-ip') return '10.0.0.1';
          if (name === 'user-agent') return 'TestAgent';
          return null;
        },
      },
    } as unknown as Context;

    await logAudit('PASSWORD_RESET', null, {}, mockCtx);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '203.0.113.42' }),
    );
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', async () => {
    const mockCtx = {
      req: {
        header: (name: string) => {
          if (name === 'x-real-ip') return '10.0.0.1';
          if (name === 'user-agent') return 'TestAgent';
          return null;
        },
      },
    } as unknown as Context;

    await logAudit('LOGIN_SUCCESS', null, {}, mockCtx);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '10.0.0.1' }),
    );
  });

  it('handles DB insertion errors gracefully (no throw)', async () => {
    mockValues.mockRejectedValue(new Error('DB connection lost'));
    const { logger } = await import('../logger');

    await expect(
      logAudit('LOGIN_FAILED', null, { email: 'test@test.com' }),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'audit log error',
    );
  });

  it('uses default empty metadata when not provided', async () => {
    await logAudit('NOTIFICATION_FAILED', 'user-789');

    expect(mockValues).toHaveBeenCalledWith({
      event: 'NOTIFICATION_FAILED',
      userId: 'user-789',
      metadata: {},
      ipAddress: null,
      userAgent: null,
    });
  });

  it('accepts all valid AuditEvent types', async () => {
    const events = [
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'PASSWORD_RESET',
      'USER_CREATED', 'USER_DELETED', 'USER_ROLE_CHANGED', 'USER_BANNED',
      'USER_UNBANNED', 'NOTIFICATION_FAILED', 'SHIPMENT_DELETED', 'SHIPMENT_UPDATED',
      'USER_UPDATED', 'INVOICE_CREATED', 'INVOICE_SENT', 'INVOICE_UPDATED',
      'INVOICE_DELETED', 'BRANCH_CREATED', 'BRANCH_UPDATED', 'BRANCH_DELETED',
      'QUOTATION_CREATED', 'QUOTATION_UPDATED', 'QUOTATION_DELETED', 'QUOTATION_CONVERTED',
      'INVITATION_CREATED', 'INVITATION_CANCELLED', 'NOTIFICATION_SENT', 'NOTIFICATION_READ',
    ] as const;

    for (const event of events) {
      await logAudit(event, null);
      expect(mockValues).toHaveBeenLastCalledWith(
        expect.objectContaining({ event }),
      );
    }

    // Should have been called for each event
    expect(mockValues).toHaveBeenCalledTimes(events.length);
  });

  it('accepts and stores complex metadata', async () => {
    const metadata = {
      email: 'admin@test.com',
      role: 'staff',
      changes: { name: { from: 'Old', to: 'New' } },
      reason: 'Policy violation',
      count: 5,
      invoiceId: 'inv-001',
      trackingNo: 'TRACK123',
    };

    await logAudit('USER_UPDATED', 'user-999', metadata);

    expect(mockValues).toHaveBeenCalledWith({
      event: 'USER_UPDATED',
      userId: 'user-999',
      metadata,
      ipAddress: null,
      userAgent: null,
    });
  });
});
