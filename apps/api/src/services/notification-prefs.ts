import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { notificationPreferences } from '../db/schema';

type PrefCategory = 'delivery' | 'exception' | 'general';
// Map a shipment event type to a preference category so prefs can gate the send.
export function eventTypeToPrefCategory(eventType: string): PrefCategory {
  if (eventType === 'Exception') return 'exception';
  if (eventType === 'OutForDelivery' || eventType === 'Delivered') return 'delivery';
  return 'general';
}

const categoryChannelMap: Record<PrefCategory, { email: keyof typeof notificationPreferences.$inferInsert; whatsapp: keyof typeof notificationPreferences.$inferInsert }> = {
  delivery: { email: 'deliveryEmail', whatsapp: 'deliveryWhatsapp' },
  exception: { email: 'exceptionEmail', whatsapp: 'exceptionWhatsapp' },
  general: { email: 'generalEmail', whatsapp: 'generalWhatsapp' },
};

export async function getPreferences(userId: string, tenantId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.tenantId, tenantId),
    ))
    .limit(1);

  return prefs ?? null;
}

export async function upsertPreferences(
  userId: string,
  tenantId: string,
  prefs: Partial<typeof notificationPreferences.$inferInsert>,
) {
  const existing = await getPreferences(userId, tenantId);

  if (existing) {
    const [updated] = await db
      .update(notificationPreferences)
      .set({ ...prefs, updatedAt: new Date() })
      .where(eq(notificationPreferences.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(notificationPreferences)
    .values({
      userId,
      tenantId,
      deliveryEmail: true,
      deliveryWhatsapp: true,
      exceptionEmail: true,
      exceptionWhatsapp: true,
      generalEmail: true,
      generalWhatsapp: true,
      ...prefs,
    })
    .returning();
  return created;
}

export async function shouldNotifyByWhatsapp(
  userId: string,
  tenantId: string,
  category: PrefCategory,
): Promise<boolean> {
  const prefs = await getPreferences(userId, tenantId);
  if (!prefs) return true; // default: all on
  const channelKey = categoryChannelMap[category]?.whatsapp;
  return channelKey ? Boolean(prefs[channelKey]) : true;
}

export async function shouldNotifyByEmail(
  userId: string,
  tenantId: string,
  category: PrefCategory,
): Promise<boolean> {
  const prefs = await getPreferences(userId, tenantId);
  if (!prefs) return true;
  const channelKey = categoryChannelMap[category]?.email;
  return channelKey ? Boolean(prefs[channelKey]) : true;
}
