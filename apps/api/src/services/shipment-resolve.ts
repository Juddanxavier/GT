import { and, desc, eq, isNotNull, isNull, or, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { shipments } from '../db/schema';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isShipmentUuid(param: string): boolean {
  return UUID_RE.test(param);
}

// Build the tenant/branch scope conditions used across shipment :id handlers.
export function shipmentScope(scope: {
  tenantId?: string | null;
  branchId?: string | null;
}): (ReturnType<typeof eq> | ReturnType<typeof or> | ReturnType<typeof isNull>)[] {
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof or> | ReturnType<typeof isNull>)[] = [];
  if (scope.tenantId) conditions.push(eq(shipments.tenantId, scope.tenantId));
  if (scope.branchId) {
    conditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);
  }
  return conditions;
}

// Resolve a route param (shipment uuid or tracking number) to the shipment's uuid,
// respecting the caller's tenant/branch scope.
//
// A tracking number can be reused once its row is archived, so several rows may
// share it. Resolve to the active shipment first (newest wins), then fall back
// to the most recent archived row so history is still reachable.
export async function resolveShipmentId(
  param: string,
  scope: { tenantId?: string | null; branchId?: string | null },
): Promise<string | null> {
  if (isShipmentUuid(param)) {
    const [row] = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(
        and(
          or(eq(shipments.id, param), eq(shipments.trackingNo, param)),
          ...shipmentScope(scope),
        ) as SQL | undefined,
      )
      .limit(1);

    return row?.id ?? null;
  }

  const [active] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(
      and(
        eq(shipments.trackingNo, param),
        isNull(shipments.archivedAt),
        ...shipmentScope(scope),
      ) as SQL | undefined,
    )
    .orderBy(desc(shipments.createdAt))
    .limit(1);

  if (active) return active.id;

  const [archived] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(
      and(
        eq(shipments.trackingNo, param),
        isNotNull(shipments.archivedAt),
        ...shipmentScope(scope),
      ) as SQL | undefined,
    )
    .orderBy(desc(shipments.createdAt))
    .limit(1);

  return archived?.id ?? null;
}
