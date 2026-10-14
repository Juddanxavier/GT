/** @format */

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';
import { tenants } from '../db/schema';
import { getEmailProviderStatus } from '../email/provider';
import { renderEmail } from '../email/render';
import type { EventType } from '../email/templates';
import type { Branding, ShipmentData } from '../email/types';
import { getUser, requireRole } from '../middleware/authorization';
import { isWhatsAppConfigured } from '../notifications/whatsapp/config';
import { getWhatsAppTemplateParams } from '../notifications/whatsapp/templates';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

const EVENTS: EventType[] = [
  'InfoReceived',
  'InTransit',
  'OutForDelivery',
  'Delivered',
  'Exception',
];

const EVENT_TITLES: Record<EventType, string> = {
  InfoReceived: 'Shipment Registered',
  InTransit: 'In Transit',
  OutForDelivery: 'Out for Delivery',
  Delivered: 'Delivered',
  Exception: 'Exception',
};

const SAMPLE_SHIPMENT: ShipmentData = {
  trackingNo: 'GT20260000123',
  labelCode: 'GT2026-00000123',
  carrier: '17TRACK',
  origin: 'Mumbai',
  destination: 'Colombo',
  estimatedDelivery: '2026-09-01',
  customerName: 'Rahul Sharma',
  status: '',
};

app.get('/integrations', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const email = getEmailProviderStatus();
  return c.json({
    data: {
      email: { configured: Boolean(email.configured), provider: email.configured },
      whatsapp: { configured: isWhatsAppConfigured() },
      track17: { configured: Boolean(process.env.TRACK_API_KEY) },
    },
  });
});

app.get('/template-previews', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId') ?? getUser(c)?.tenantId;

  let branding: Branding | undefined;
  if (tenantId) {
    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (tenant) {
      const isLanka = tenant.name?.toLowerCase().includes('lanka');
      branding = {
        companyName: tenant.name ?? 'Gajan Traders',
        supportEmail: 'support@gajantraders.com',
        primaryColor: isLanka ? '#059669' : '#7c3aed',
      };
    }
  }

  const previews = await Promise.all(
    EVENTS.map(async (event) => {
      const shipment: ShipmentData = {
        ...SAMPLE_SHIPMENT,
        status: EVENT_TITLES[event],
      };

      let emailHtml = '';
      try {
        emailHtml = await renderEmail(event, shipment, branding);
      } catch (err) {
        c.get('logger').error({ err, event }, 'failed to render email preview');
      }

      const whatsapp = getWhatsAppTemplateParams(event, shipment);
      return {
        event,
        title: EVENT_TITLES[event],
        emailHtml,
        whatsapp,
      };
    }),
  );

  return c.json({ data: previews });
});

export default app;
