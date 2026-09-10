import { and, eq, isNull, or, type SQL } from 'drizzle-orm';
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
export async function resolveShipmentId(
  param: string,
  scope: { tenantId?: string | null; branchId?: string | null },
): Promise<string | null> {
  const identityCondition = isShipmentUuid(param)
    ? or(eq(shipments.id, param), eq(shipments.trackingNo, param))
    : eq(shipments.trackingNo, param);

  const [row] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(identityCondition, ...shipmentScope(scope)) as SQL | undefined)
    .limit(1);

  return row?.id ?? null;
}
