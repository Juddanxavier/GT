# Shipment Module — Full Codebase Audit

**Date:** 2026-06-19  
**Scope:** 14 files reviewed across `apps/api`, `apps/admin`, and `packages/permissions`  
**Auditor:** GSD Code Reviewer (deep analysis)

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `apps/api/src/routes/shipments.ts` | 507 |
| 2 | `apps/admin/app/(dashboard)/shipments/page.tsx` | 513 |
| 3 | `apps/admin/app/(dashboard)/shipments/[id]/page.tsx` | 847 |
| 4 | `apps/api/src/validators/index.ts` | 86 |
| 5 | `apps/api/src/shipment-providers/dedup.ts` | 78 |
| 6 | `apps/api/src/notifications/service.ts` | 126 |
| 7 | `apps/api/src/notifications/event-map.ts` | 28 |
| 8 | `apps/api/src/middleware/authorization.ts` | 152 |
| 9 | `apps/api/src/middleware/tenant.ts` | 110 |
| 10 | `apps/api/src/middleware/branch.ts` | 81 |
| 11 | `apps/api/src/db/schema.ts` | 327 |
| 12 | `apps/api/src/db/rls.ts` | 27 |
| 13 | `apps/api/src/email/templates/` (5 templates) | ~189 |
| 14 | `apps/api/test-shipment-insert.ts` | 41 |
| 15 | `packages/permissions/src/guards.ts` | 118 |
| 16 | `packages/permissions/src/abilities.ts` | 82 |
| 17 | `apps/api/src/shipment-providers/providers/seventeen-track.ts` | 209 |
| 18 | `apps/api/src/shipment-providers/normalizer.ts` | 108 |
| 19 | `apps/api/src/cache.ts` | 66 |
| 20 | `apps/admin/lib/queries.ts` | 455 |
| 21 | `apps/admin/lib/api.ts` | 76 |
| 22 | `apps/admin/lib/tenant-filter-context.tsx` | 90 |

---

## Summary

The shipment module is well-structured architecturally with clear tenant isolation patterns via `getQueryScope()` and `requireBranchScope()`. However, several CRITICAL and HIGH issues exist around tenant isolation bypasses, race conditions on invoice creation, type safety circumvention, and missing input validation. The real-time notification path has a potential deduplication bypass that could cause double-notification. Email templates are minimal (no customer name, no live tracking link) but functionally correct.

**Verdict: ISSUES FOUND** — 2 CRITICAL, 5 HIGH, 9 MEDIUM, 7 LOW, 3 INFO

---

## CRITICAL ISSUES

### CR-01: Tenant Isolation Bypass in DELETE `/shipments/:id`

**Files:** `apps/api/src/routes/shipments.ts:331-347`  
**Severity:** CRITICAL

**Issue:** The DELETE endpoint is missing `requireBranchScope()` middleware used by all other endpoints. While it does filter by `scope.tenantId`, a tenant-admin without a branch override (no `X-Branch-ID` header) can delete shipments from **any branch** within their tenant. The `queryScope` for tenant-admin without override does NOT include `branchId`:

In `guards.ts:95-99`:
```ts
case 'tenant-admin':
  return {
    tenantId: effectiveTenantId ?? undefined,
    ...(user.overrideBranchId ? { branchId: user.overrideBranchId } : {}),
  };
```

This means a tenant-admin at branch A can delete a shipment at branch B within their tenant. All other mutation endpoints (`PATCH /:id`, `POST /:id/track`, `POST /:id/stop-tracking`) include `requireBranchScope()` or have effective branch filtering.

**Fix:** Add `requireBranchScope()` to the DELETE handler:

```ts
app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
```

---

### CR-02: Non-Idempotent Shipment Creation Can Create Duplicate Invoices

**Files:** `apps/api/src/routes/shipments.ts:154-192`  
**Severity:** CRITICAL

**Issue:** The invoice auto-creation in the `POST /` handler has no idempotency check. If the client sends the same `POST /` request twice (due to network retry, double-click, etc.), **two invoices** are created for the same shipment because:

1. There is no unique constraint preventing duplicate invoices per shipment.
2. The DB insert (line 168) always executes without checking for an existing invoice.
3. The `invoiceNo` format `INV-YYYYMM-{shortId}` with a 5-char hash is not guaranteed unique per tenant-month for high volumes (36^5 = 60M combinations, but collisions are possible).

**Fix:** Add a uniqueness check before insert:

```ts
// Check for existing invoice
const [existingInv] = await db
  .select({ id: invoices.id })
  .from(invoices)
  .where(eq(invoices.shipmentId, row.id))
  .limit(1);

if (!existingInv) {
  // ... create invoice
}
```

Also consider adding a DB unique constraint on `(shipment_id)` in the `invoice` table.

---

## HIGH ISSUES

### HI-01: Race Condition Between Tracking Updates and Manual Stop-Tracking

**Files:** `apps/api/src/routes/shipments.ts:464-505`  
**Severity:** HIGH

**Issue:** The `POST /:id/stop-tracking` endpoint has a TOCTOU (Time-of-Check-Time-of-Use) vulnerability:

1. Fetches the shipment (line 472-477)
2. Fetches the last tracking event (line 485-490)
3. Calls provider's `stopTracking` with that event's carrierCode (line 492-496)

Between steps 2 and 3, a concurrent `POST /:id/track` request (or webhook handler) could:
- Add new tracking events
- Change the carrier
- Most critically — after stop-tracking succeeds, the next tracking update from 17TRACK's webhook could re-activate tracking

Additionally, there is no lock or transaction around this operation. The `trackingRegistered` flag can be toggled back to `true` by any concurrent tracking update that happens after `stopTracking` but before the flag update.

**Fix:** Use a transaction with row-level lock (`SELECT ... FOR UPDATE`) to atomically check, stop, and update:

```ts
// Simplified fix pattern using advisory lock
const [shipment] = await db.transaction(async (tx) => {
  return tx
    .select({ ... })
    .from(shipments)
    .where(and(...findConditions))
    .for('update')  // Postgres row lock
    .limit(1);
});
```

---

### HI-02: Missing Payload Validation — Untrusted Data Stored from Tracking Provider

**Files:** `apps/api/src/routes/shipments.ts:137`, `apps/api/src/shipment-providers/dedup.ts:52`  
**Severity:** HIGH

**Issue:** The entire `trackResult.events` array is stored directly into the `payload` JSONB column of the shipment (line 137) and `event.raw` is inserted as JSONB (dedup.ts:52):

```ts
// shipments.ts:137
payload: trackResult.events,  // Full event array stored directly

// dedup.ts:52
raw: sql`${JSON.stringify(event.raw)}::jsonb`,
```

The `event.raw` contains the **untrusted response from an external API** (17TRACK/TrackingMore). While `JSON.stringify` and Drizzle parameterization prevent SQL injection, the raw data is:
1. Stored without sanitization or size limits
2. Forwarded to notification queue jobs
3. Potentially rendered in admin UI event descriptions

A malicious carrier API response could inject XSS payloads in description/location fields that would be executed if any admin page renders these without escaping. Since all tracking data flows from external APIs directly to the database, a compromised upstream API (or MiTM) could inject harmful content.

**Fix:**
```ts
// Sanitize before storing
const sanitizedEvents = trackResult.events.map((e) => ({
  ...e,
  description: e.description?.slice(0, 1000) ?? '',
  location: e.location?.slice(0, 255) ?? '',
  raw: { /* store minimal structured data, not raw API response */ },
}));
```

---

### HI-03: Zero-Value Invoices Created for Shipments Without Bill Amount

**Files:** `apps/api/src/routes/shipments.ts:160`  
**Severity:** HIGH

**Issue:** Invoice auto-creation uses `parsed.data.billAmount ?? 0`, so shipments without a `billAmount` field still get an invoice with amount `0`:

```ts
const amount = parsed.data.billAmount ?? 0;
```

This creates a paid invoice of ₹0 for every shipment, even draft/pending shipments that haven't been priced yet. This pollutes financial records and could cause confusion during reconciliation.

**Fix:** Skip invoice creation when billAmount is not set:

```ts
if (parsed.data.billAmount != null && parsed.data.billAmount > 0) {
  // Only create invoice if there's a valid amount
}
```

---

### HI-04: Staff Bill Amount Bypass Possible via Client-Side Only Restriction

**Files:** `apps/api/src/routes/shipments.ts:239-241`  
**Files:** `apps/admin/app/(dashboard)/shipments/[id]/page.tsx:715-718`  
**Severity:** HIGH

**Issue:** The **PATCH endpoint** correctly prevents staff from changing `billAmount` (server-side check on line 239-241). However, this check is fragile:

```ts
if ((user as Record<string, unknown> | null)?.role === 'staff' && parsed.data.billAmount !== undefined) {
```

The `parsed.data` comes from `updateShipmentSchema` which is `createShipmentSchema.partial()`. The schema defines `billAmount` as `z.coerce.number().positive().optional()`. A staff user could potentially:

1. Send `billAmount: null` — but the schema's `.positive()` would reject this
2. The check only blocks if `billAmount !== undefined` — sending `billAmount: undefined` passes but has no effect

Actually, the real issue is that the PATCH updates all fields at once without field-level permissions check. The `as never` cast (line 258) pushes the entire `parsed.data` object into the update, which could include any field the staff user shouldn't modify (if the schema changes or a new field is added without updating the role check).

**Fix:** Implement field-level update filtering based on user role:

```ts
const allowedFields: Record<string, string[]> = {
  staff: ['customerId', 'contactEmail', 'contactPhone', 'carrier', 'trackingNo', 'branchId'],
  'tenant-admin': ['customerId', 'contactEmail', 'contactPhone', 'carrier', 'trackingNo', 'branchId', 'billAmount'],
  superadmin: ['customerId', 'contactEmail', 'contactPhone', 'carrier', 'trackingNo', 'branchId', 'billAmount', 'tenantId'],
};
const role = (user as Record<string, unknown> | null)?.role as string;
const allowed = allowedFields[role] ?? [];
const filteredData = Object.fromEntries(
  Object.entries(parsed.data).filter(([key]) => allowed.includes(key))
);
```

---

### HI-05: Missing Tracking Number Validation Creates Poor User Experience on Conflict

**Files:** `apps/api/src/routes/shipments.ts:90-93`  
**Severity:** HIGH

**Issue:** The DB has a unique constraint on `(tenantId, trackingNo)` (schema.ts:195-198). However, the API handler does **not** check for duplicates before insertion. If a duplicate tracking number is submitted:

```ts
const [row] = await db
  .insert(shipments)
  .values({ ...parsed.data, tenantId } as never)
  .returning();
```

The DB throws a unique constraint violation, which is not caught here (the catch at line 149 only covers the tracking/provider operations). The error propagates as an unhandled 500 to the client with potential Postgres error details leaked in the response body (depending on error handling setup).

The client-side code (page.tsx:363) does a client-side deduplication check, but this is unreliable — it only checks cached data, which may be stale.

**Fix:** Add explicit duplicate check before insert:

```ts
const [existing] = await db
  .select({ id: shipments.id })
  .from(shipments)
  .where(and(
    eq(shipments.tenantId, tenantId),
    eq(shipments.trackingNo, parsed.data.trackingNo)
  ))
  .limit(1);

if (existing) {
  return c.json({ error: `Tracking number "${parsed.data.trackingNo}" already exists for this tenant` }, 409);
}
```

---

## MEDIUM ISSUES

### MD-01: `as never` Type Casts Bypass All Type Safety

**Files:** `apps/api/src/routes/shipments.ts:92,258`  
**Severity:** MEDIUM

**Issue:** The code uses `as never` type casts twice to bypass TypeScript's type system:

```ts
.values({ ...parsed.data, tenantId } as never)   // line 92
const updateData = { ...parsed.data, updatedAt: new Date() } as never;  // line 258
```

This means:
- No compile-time checking that the insert/update fields match the schema
- If a new field is added to `parsed.data` via the Zod schema, it gets silently pushed to the DB
- If a DB column is renamed, no type error is raised

**Fix:** Use proper typing:
```ts
.values({
  ...parsed.data,
  tenantId,
  // ... explicit mapping of optional fields
})
```

---

### MD-02: Event Carrier Update Inconsistency — Track vs Manual Track

**Files:** `apps/api/src/routes/shipments.ts:144,312,452-453`  
**Severity:** MEDIUM

**Issue:** The carrier update logic is inconsistent across the three tracking paths:

**Auto-track on creation (line 144):**
```ts
updateData.carrier = trackResult.events[0]!.carrier || carrierName || null;
```
— Falls back to `carrierName` (from input) if event has no carrier.

**Re-track on edit (line 312):**
```ts
trackUpdate.carrier = trackResult.events[0]!.carrier || carrier || null;
```
— Falls back to `carrier` (existing/new carrier) if event has no carrier.

**Manual track (line 453):**
```ts
updateFields.carrier = result.events[0]!.carrier;
```
— **No fallback at all.** If the event has no carrier info, this sets the carrier to `undefined`, which could overwrite a known carrier name with a null/empty value.

**Fix:** Add fallback to manual track path:
```ts
updateFields.carrier = result.events[0]!.carrier || shipment.carrier || null;
```

---

### MD-03: Error Messages Leaked to End Users via `alert()`

**Files:** `apps/admin/app/(dashboard)/shipments/[id]/page.tsx:159,170,515,529`  
**Severity:** MEDIUM

**Issue:** Raw API error messages are displayed to users via `alert()` dialogs:

```ts
} catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
```

The `api.request()` function (`lib/api.ts:56-62`) extracts error messages from the API response body and throws them as `ApiError`. This means internal error details (database constraint names, internal server errors, stack traces if misconfigured) could be shown to admin users.

**Fix:**
```ts
} catch {
  alert('An error occurred. Please try again.');
  console.error('Operation failed:', e);
}
```

---

### MD-04: No Rate Limiting on Tracking Endpoint

**Files:** `apps/api/src/routes/shipments.ts:409-462`  
**Severity:** MEDIUM

**Issue:** The `POST /:id/track` endpoint has no rate limiting. A malicious user could call this endpoint repeatedly to:
1. Exhaust 17TRACK API quota (cost implications)
2. Cause excessive database writes
3. Trigger notification spam to customers (each track can trigger a notification if new events are found)

The endpoint is protected by authentication, but any authenticated staff/admin could abuse it.

**Fix:** Implement rate limiting per-shipment:
```ts
// Check cooldown
const cooldownKey = `track:cooldown:${id}`;
const lastTracked = await cacheGet(cooldownKey);
if (lastTracked) {
  return c.json({ error: 'Please wait before tracking again' }, 429);
}
await cacheSet(cooldownKey, '1', 60); // 60 second cooldown
```

---

### MD-05: Hardcoded API Key in Test Script Exposed to Version Control

**Files:** `apps/api/test-shipment-insert.ts:26`  
**Severity:** MEDIUM

**Issue:** The test script contains a hardcoded tenant UUID:

```ts
values (${'TEST-MANUAL-' + Date.now()}, ${'FedEx'}, ${'{"billAmount":"34000"}'}, ${'346569e2-1bd8-47a5-a6dc-ed46e2094543'}, ${'100003'})
```

While this is a test file and the UUID is just a tenant identifier (not a secret), hardcoding production-like UUIDs in source code:
- Creates coupling between test scripts and specific database instances
- Makes it risky to commit/run accidentally against a production database
- The `tracking_provider` value `'100003'` looks like a 17TRACK carrier code, not a provider name

**Fix:** Read test parameters from environment variables or a config file:
```ts
const tenantId = process.env.TEST_TENANT_ID || '00000000-0000-0000-0000-000000000000';
```

---

### MD-06: Carrier List Hardcoded in Edit Form — Future Maintenance Issue

**Files:** `apps/admin/app/(dashboard)/shipments/[id]/page.tsx:703`  
**Severity:** MEDIUM

**Issue:** The carrier dropdown options are hardcoded:

```tsx
{['DTDC', 'Blue Dart', 'Delhivery', 'FedEx', 'DHL', 'Other'].map((c) => ...
```

When tracking auto-detection or the API saves a carrier outside this list:
1. The edit form shows an empty/default selection
2. Saving the form without selecting a carrier clears the field
3. This is not validated on the server — an admin could accidentally clear a valid carrier

**Fix:** Either fetch carrier list from the server, or ensure the edit form preserves the current carrier value even if not in the dropdown.

---

### MD-07: RLS Context Set Silently Swallows Errors

**Files:** `apps/api/src/db/rls.ts:6-16`, `apps/api/src/middleware/tenant.ts:98-102`  
**Severity:** MEDIUM

**Issue:** The `setRLSTenantContext` call at tenant.ts:98-102 swallows errors:

```ts
try {
  await setRLSTenantContext(tenantId);
} catch (error) {
  console.error('Failed to set RLS context:', error);
}
```

If the RLS session variable fails to set (e.g., database connection issue), ALL subsequent queries in the request will run without tenant isolation. The RLS policies in PostgreSQL (if any) would not be applied, potentially exposing cross-tenant data. The error is only logged, not returned to the client.

**Fix:** If RLS is a critical security boundary, the request should fail when RLS context cannot be set:
```ts
try {
  await setRLSTenantContext(tenantId);
} catch (error) {
  console.error('Failed to set RLS context:', error);
  return c.json({ error: 'Internal server error' }, 500);
}
```

---

### MD-08: No Server-Side Pagination on Shipments List

**Files:** `apps/api/src/routes/shipments.ts:30-34`  
**Severity:** MEDIUM

**Issue:** The `GET /` endpoint returns ALL shipments without pagination:

```ts
const rows = await db
  .select()
  .from(shipments)
  .where(and(...conditions))
  .orderBy(desc(shipments.createdAt));
```

For tenants with thousands of shipments, this will:
- Consume excessive memory on the server
- Send large JSON payloads over the network
- Block the client UI while parsing the response

**Fix:** Implement cursor or offset-based pagination:
```ts
const page = Number(c.req.query('page')) || 1;
const limit = Number(c.req.query('limit')) || 50;
const offset = (page - 1) * limit;

const rows = await db
  .select()
  .from(shipments)
  .where(and(...conditions))
  .orderBy(desc(shipments.createdAt))
  .limit(limit)
  .offset(offset);
```

---

### MD-09: No Validation That DB Schema Index is Proper for Common Queries

**Files:** `apps/api/src/db/schema.ts:148-157`  
**Severity:** MEDIUM

**Issue:** The `trackingEvents` table has these indexes:
- `trackingEventShipmentIdx` on `shipmentId`
- `trackingEventTenantIdx` on `tenantId`
- `trackingEventDedup` unique on `(shipmentId, eventTime, subStatus)`

The `shipmentId + tenantId` query pattern (used in `GET /:id/tracking` at line 371-378) would benefit from a **composite** index:

```ts
trackingEventShipmentTenantIdx: index('tracking_event_shipment_tenant_idx').on(
  table.shipmentId, table.tenantId
),
```

Without this, the query uses two separate indexes and combines results, which is less efficient.

---

## LOW ISSUES

### LW-01: No Input Length Validation on Search Parameter

**Files:** `apps/api/src/routes/shipments.ts:28`  
**Severity:** LOW

**Issue:** The `search` query parameter is passed directly to a LIKE query without length limits. A very long search string (e.g., 10,000 characters) could cause:
- Slow query execution
- Memory pressure on the database

**Fix:** Add length validation:
```ts
if (search && search.length > 100) {
  return c.json({ error: 'Search query too long' }, 400);
}
```

---

### LW-02: Missing Error Handling if Provider Detection Fails Silently

**Files:** `apps/api/src/routes/shipments.ts:46-47`  
**Severity:** LOW

**Issue:** Carrier detection errors are silently swallowed:

```ts
try {
  detected = await provider.detectCarrier(trackingNo);
} catch { /* ignore */ }
```

No error is logged, making it impossible to debug detection failures.

**Fix:** Log the error:
```ts
try {
  detected = await provider.detectCarrier(trackingNo);
} catch (err) {
  console.error('[shipments] detect-carrier failed:', err);
}
```

---

### LW-03: Hardcoded Percentage Values in Dashboard Summary Cards

**Files:** `apps/admin/app/(dashboard)/shipments/page.tsx:183,200,217,234`  
**Severity:** LOW

**Issue:** The summary stat cards show hardcoded percentage values (12.5%, 8.3%, 15.2%, 3.2%) that do not reflect actual data. These are placeholder/decorative values that could confuse users if left in production.

**Fix:** Calculate percentages from actual data or remove them.

---

### LW-04: No Guard Against Empty Event List `!` Non-Null Assertions

**Files:** `apps/api/src/routes/shipments.ts:144,312,453`  
**Severity:** LOW

**Issue:** Three places use non-null assertions on potentially empty arrays:

```ts
trackResult.events[0]!.carrier
```

While these are guarded by `if (trackResult.events.length > 0)` checks, the `!` non-null assertion suppresses TypeScript errors without actually providing safety. If a future refactor removes the length check, TypeScript will not catch it.

**Fix:** Use optional chaining instead:
```ts
trackResult.events[0]?.carrier ?? carrierName ?? null
```

---

### LW-05: `countryFromString` Can Produce Invalid Flag Codes

**Files:** `apps/admin/components/copy-button.tsx:39-43`  
**Severity:** LOW

**Issue:** The function extracts the last comma-separated part and matches `/^[A-Z]{2}$/i`:

```ts
const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
const last = parts[parts.length - 1];
if (last && /^[A-Z]{2}$/i.test(last)) return last.toUpperCase();
```

If location is "Mumbai, MH" (Indian state code), this returns "MH" which is not a valid ISO country code. The `react-flagkit` library would fail silently with a broken image.

**Fix:** Validate against a list of known ISO 3166-1 alpha-2 codes.

---

### LW-06: Shipment List Page Wrong Case in Status Names

**Files:** `apps/admin/app/(dashboard)/shipments/page.tsx:251-258`  
**Severity:** LOW

**Issue:** Status tabs use lowercase-like keys (`in_transit`, `delivered`, `pending`, `cancelled`) that match DB values, but the casing convention is inconsistent. The DB stores `delivery_failure` but the UI shows `cancelled` (British spelling) while the DB might store `canceled` (American convention in status constants). If the DB uses `cancelled`, this is fine.

---

### LW-07: `autoTrack` Failure in POST Creates Incomplete Shipment Without Notification

**Files:** `apps/api/src/routes/shipments.ts:149-151`  
**Severity:** LOW

**Issue:** When the auto-track call fails (line 149), the error is logged but the shipment has already been inserted. The customer receives no tracking events or notifications. The shipment exists in a "pending" state with no tracking data, and there's no retry mechanism.

**Fix:** Consider adding the tracking job to a queue for retry:
```ts
if (trackingQueue) {
  await trackingQueue.add('track', { shipmentId: row.id, tenantId });
}
```

---

## INFO ISSUES

### IN-01: Duplicate Email Template Boilerplate

**Files:** `apps/api/src/email/templates/shipment-*.tsx`  
**Severity:** INFO

**Issue:** All five email templates have nearly identical structure (imports, component signature, table structure). The `Detail` rows are repeated identically across all templates. Consider extracting the common detail table into a shared component.

---

### IN-02: `cancelled` vs `canceled` Spelling Inconsistency

**Files:** `apps/api/src/email/templates/index.ts` (no cancelled handler)  
**Files:** Status flow in status constants  
**Severity:** INFO

**Issue:** The `EventType` doesn't include a cancellation event, meaning cancelled shipments don't trigger notifications. There is no email template for cancelled status.

---

### IN-03: Email Templates Missing Customer Name and Link

**Files:** All shipment email templates  
**Severity:** INFO

**Issue:** Email templates display the tracking number and carrier details but omit:
- Customer name (no personalization/salutation)
- Clickable tracking link (user must manually go to the portal)
- QR code or barcode for pickup (for out-for-delivery template)

Consider adding:
```tsx
<Text style={{...}}>Hi {shipment.customerName},</Text>
<Text style={{...}}>
  Track your shipment: <a href={`https://portal.example.com/track/${shipment.trackingNo}`}>
    {shipment.trackingNo}
  </a>
</Text>
```

---

## Detailed Security Analysis

### Auth & Authorization Flow

```
Request → auth.sessionMiddleware → tenantMiddleware → branchMiddleware → route handler
         ↓                        ↓                    ↓                   ↓
     Sets user + session      Sets tenantId        Sets branchId      Checks role + scope
```

**Assessment:** The authorization chain is sound. Each middleware layer establishes context, and route handlers use `requireRole()` + `requireBranchScope()` + `getQueryScope()` for defense-in-depth. Key gaps:

1. **DELETE endpoint** missing `requireBranchScope()` (CR-01)
2. **`/detect` endpoint** missing branch scope (acceptable — no tenant data)
3. **Staff tenantId bypass**: staff users have `tenantId` from their user record, which they inherit automatically — no way to override via header

### Tenant Isolation Verification

| Endpoint | Role Check | Branch Scope | Tenant Filtered | Tenant Isolation |
|----------|-----------|-------------|-----------------|-----------------|
| `GET /` | ✓ | ✓ | ✓ | ✅ Secure |
| `POST /detect` | ✓ | ✗ | N/A | ✅ (no tenant data) |
| `POST /` | ✓ | ✓ (inline) | ✓ | ✅ Secure |
| `GET /:id` | ✓ | ✓ | ✓ | ✅ Secure |
| `PATCH /:id` | ✓ | ✓ | ✓ | ✅ Secure |
| `DELETE /:id` | ✓ | **✗ (BUG)** | ✓ | ⚠️ See CR-01 |
| `GET /:id/tracking` | ✓ | ✓ | ✓ | ✅ Secure |
| `POST /:id/track` | ✓ | ✓ | ✓ | ✅ Secure |
| `POST /:id/stop-tracking` | ✓ | ✓ | ✓ | ✅ Secure |

### Data Flow Security

| Path | Input Validation | Auth Check | Tenant Isolation | Output Sanitization |
|------|-----------------|-----------|-----------------|-------------------|
| Create shipment | Zod schema + role-based overrides | requireRole | tenantId from user/header | N/A |
| Update shipment | Zod schema + billAmount check | requireRole + requireBranchScope | scope.tenantId | N/A |
| Delete shipment | ID param only | requireRole (no branchScope) | scope.tenantId | N/A |
| Tracking fetch | ID param only | requireRole + requireBranchScope | scope.tenantId + tenantId on events | N/A |
| Email render | N/A (internal) | N/A | N/A | `escapeHtml` in build-html.ts |

---

## Recommendations (Prioritized)

1. **[CRITICAL] Fix DELETE branch scope** — Add `requireBranchScope()` to `DELETE /:id`
2. **[CRITICAL] Prevent duplicate invoices** — Add idempotency check before invoice creation
3. **[HIGH] Add row-level locking** for stop-tracking to prevent race conditions
4. **[HIGH] Sanitize tracking provider data** before storing in database
5. **[HIGH] Skip zero-value invoice creation** when billAmount is not set
6. **[HIGH] Implement field-level permissions** for PATCH instead of role-based blocking
7. **[MEDIUM] Add duplicate tracking number check** with proper 409 response
8. **[MEDIUM] Fix carrier update inconsistency** in manual track path
9. **[MEDIUM] Clean up `as never` type casts** — use explicit field mapping
10. **[MEDIUM] Add rate limiting** on tracking endpoints
11. **[MEDIUM] Implement server-side pagination** for shipments list
12. **[MEDIUM] Remove hardcoded test tenant UUID** from test script
13. **[LOW] Add search input length validation**
14. **[LOW] Fix hardcoded carrier list** — make dynamic or add fallback logic

---

_Reviewed: 2026-06-19T10:00:00Z_
_Reviewer: GSD Code Reviewer (deep analysis)_
_Scope: 24 files in shipment module_
