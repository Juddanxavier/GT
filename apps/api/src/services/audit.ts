/** @format */

import type { Context } from 'hono';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import { logger } from '../logger';

export type AuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'PASSWORD_RESET'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'NOTIFICATION_FAILED'
  | 'SHIPMENT_DELETED'
  | 'SHIPMENT_UPDATED'
  | 'USER_UPDATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_SENT'
  | 'INVOICE_UPDATED'
  | 'INVOICE_DELETED'
  | 'BRANCH_CREATED'
  | 'BRANCH_UPDATED'
  | 'BRANCH_DELETED'
  | 'QUOTATION_CREATED'
  | 'QUOTATION_UPDATED'
  | 'QUOTATION_DELETED'
  | 'QUOTATION_CONVERTED'
  | 'INVITATION_CREATED'
  | 'INVITATION_CANCELLED'
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_READ'
  | 'ARCHIVE_RUN'
  | 'RATE_CARD_CREATED'
  | 'RATE_CARD_UPDATED'
  | 'RATE_CARD_DELETED';

export async function logAudit(
  event: AuditEvent,
  userId: string | null,
  metadata: Record<string, unknown> = {},
  c?: Context,
): Promise<void> {
  let tenantId: string | null | undefined;
  try {
    tenantId = (metadata.tenantId as string) ?? undefined;
    
    if (!tenantId && c && typeof c.get === 'function') {
      try {
        const ctxTenantId = c.get('tenantId') as string | undefined;
        if (ctxTenantId) tenantId = ctxTenantId;
      } catch {
        // Context doesn't support .get() - test mock or non-Hono context
      }
    }

    await db.insert(auditLogs).values({
      event,
      userId: userId ?? undefined,
      tenantId: tenantId ?? undefined,
      metadata,
      ipAddress: c ? (c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null) : null,
      userAgent: c ? (c.req.header('user-agent') ?? null) : null,
    });
    logger.info({ event, userId, tenantId }, 'audit');
  } catch (err) {
    logger.error({ err, event, userId, tenantId }, 'audit log error');
  }
}
