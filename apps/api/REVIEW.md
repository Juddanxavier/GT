# API Production Readiness Audit

**Reviewed:** 2026-07-13T18:30:00Z
**Depth:** deep
**Files Reviewed:** 42 source files across routes, middleware, services, db, validators, queues
**Status:** issues_found

## Summary

The API app is a well-structured multi-tenant platform with strong fundamentals: proper middleware architecture, tenant isolation, caching, input validation, audit logging, and graceful shutdown. However, several systemic patterns prevent it from being production-hardened:

1. **TypeScript strictness is brittle** — `as any` and `as unknown as Record<string, unknown>` are used pervasively (30+ sites), defeating the compiler where it matters most (auth API calls, user context extraction).
2. **Security controls degrade silently** — rate limiting, account lockout, and session caching all fall back to no-op when Redis is unavailable, logged only to console.warn.
3. **Error handling is inconsistent** — two competing patterns (`errorResponse()` vs `c.json({ error })`), fire-and-forget audit logging, and a dozen routes with duplicated validation-error formatting.
4. **Observability has blind spots** — mixed `console.log`/structured logger usage, no request-ID correlation in audit logs.
5. **Performance has known ceiling** — `LIKE '%search%'` patterns bypass indexes, dashboard stats issue 7+ queries per request, cache fragmentation on paginated endpoints.

**Overall weighted score: 72/100** — deployable with monitoring, but should address the critical and high-warning items before scaling.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| 1. TypeScript Strictness | 65 | 15% | 9.75 |
| 2. Error Handling | 72 | 25% | 18.00 |
| 3. Security | 78 | 30% | 23.40 |
| 4. Performance | 70 | 10% | 7.00 |
| 5. Logging | 68 | 10% | 6.80 |
| 6. Code Quality | 60 | 5% | 3.00 |
| 7. Dependencies | 75 | 5% | 3.75 |
| **Weighted Total** | | **100%** | **71.70** |

---

## 1. TypeScript Strictness — 65/100

### Good
- `noUncheckedIndexedAccess` and `strict: true` enabled in base tsconfig
- `AppVariables` type properly merges all middleware context types
- Route-level variables typed with `AppVariables` generic
- Zod schemas provide runtime type safety for all inputs

### Critical Issues

**CR-01: `as any` on Better Auth API calls (10+ sites)**

The pattern `(auth.api as any).createUser(...)`, `(auth.api as any).banUser(...)`, `(auth.api as any).updateUser(...)` is used in customers.ts, users.ts, invitations.ts, claim-shipment.ts, and index.ts. This completely bypasses TypeScript's type checking on the most security-sensitive code path in the system.

**Fix:** Create a typed wrapper for auth API operations:

```typescript
// src/auth-api.ts
import { auth } from './auth';

type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: 'superadmin' | 'tenant-admin' | 'staff' | 'customer';
  data?: Record<string, unknown>;
};

export async function createUser(input: CreateUserInput) {
  return (auth.api as any).createUser({ body: input }) as Promise<{ user: { id: string; name: string; email: string; role: string; createdAt: Date; updatedAt: Date; phone?: string; address?: unknown; branchId?: string; tenantId?: string; isActive?: boolean } }>;
}
```

### Warnings

**WR-01: `as unknown as Record<string, unknown>` pattern for user extraction**

Every route file casts `c.get('user')` via `as unknown as Record<string, unknown>`. This is used to access `tenantId`, `role`, `branchId` — fields that ARE defined on the `AuthVariables['user']` type but routes cast anyway to bypass the union type.

**Files:** `customers.ts:20,87,224`, `shipments.ts:143,277,291`, `dashboard.ts:40`, `reports.ts:264`, `users.ts:24`

**Fix:** Use a helper that returns the correctly typed user:

```typescript
// In authorization.ts or a shared types file
export function getUser(c: Context) {
  return c.get('user') as { id: string; role: string; tenantId?: string; branchId?: string; email?: string; name?: string } | null;
}
```

(This already exists in `authorization.ts` but many routes don't import it.)

**WR-02: `errorResponse` uses `as any` on status code**

```typescript
// error-response.ts:5
return c.json({ error: { code, message }, requestId }, status as any);
```

**Fix:** Remove the cast — Hono's `c.json` accepts `number` for status.

**WR-03: Reports use `Record<string, unknown>` for raw SQL results**

```typescript
// reports.ts:64
const [summary] = await db.execute<Record<string, unknown>>(...)
```

This loses all schema typing. If the raw SQL query changes, there's zero compile-time protection.

---

## 2. Error Handling — 72/100

### Good
- Global `app.onError()` handler with Sentry integration
- Process-level `unhandledRejection` and `uncaughtException` handlers
- Consistent error format: `{ error: { code, message }, requestId }` (when using `errorResponse`)
- Proper HTTP status codes throughout (400, 401, 403, 404, 409, 413, 415, 429, 500, 503)
- 404 catch-all for unmatched `/api/*` routes
- Graceful shutdown with 10s force-exit timeout

### Warnings

**WR-04: Fire-and-forget audit logging — potential data loss**

`logAudit()` calls without `await` appear in ~10 locations (shipments.ts:450,532,574,643, etc.; invoices.ts:114; users.ts:300,301,311). The `logAudit` function has its own try/catch that swallows DB errors, but the caller never knows if the audit entry was actually written.

**Fix:** Audit logging should be fire-and-forget in the request path but catch systematically:

```typescript
// Not great — try to at least log failures:
logAudit(...).catch((err) => {
  console.error('[audit] failed:', err);
});
```

Or better, push audit to a background queue.

**WR-05: Inconsistent error response patterns**

Two patterns coexist throughout the codebase:
- `errorResponse(c, 'CODE', 'message', 400)` — used in some routes
- `c.json({ error: 'message' }, 400)` — used in many others (shipments, customers, users, etc.)

The second pattern omits `code` and `requestId` from the error shape, confusing clients.

**Fix:** Use `errorResponse()` exclusively. Create a convenience wrapper or always import and use the utility.

**WR-06: Validation error formatting duplicated ~15 times**

Every route with Zod validation has this exact pattern:

```typescript
if (!parsed.success) {
  const flat = parsed.error.flatten();
  const fields = Object.entries(flat.fieldErrors)
    .map(([k, v]) => `${k}: ${v?.join(', ')}`)
    .join('; ');
  return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
}
```

**Fix:** Create a single helper function:

```typescript
export function validationError(c: Context, error: z.ZodError) {
  const flat = error.flatten();
  const fields = Object.entries(flat.fieldErrors)
    .map(([k, v]) => `${k}: ${v?.join(', ')}`)
    .join('; ');
  const message = fields || flat.formErrors.join(', ') || 'Validation failed';
  return errorResponse(c, 'VALIDATION_ERROR', message, 400);
}
```

**WR-07: Silent empty catch blocks**

```typescript
// auth.ts:35-37
} catch {
  // Cache miss or Redis down — fall through to PG query
}
// cache.ts:22
} catch {
  return null;
}
```

Empty catches swallow all errors including programming errors (e.g., `TypeError` from a refactored property). At minimum, log a debug message.

---

## 3. Security — 78/100

### Good
- CORS with explicit origin list and credentials
- Content-Type validation (rejects non-JSON for writes)
- Body size limit (5MB)
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP, HSTS (production)
- Redis-based rate limiting with per-route config
- Account lockout: 5 failed attempts → 30-minute lockout
- Session caching with 5s TTL for fast re-auth
- CSRF check on Bull Board routes
- Zod input validation with HTML stripping on all user input
- Tenant isolation on every DB query via scope conditions
- Branch scope enforcement for staff users
- RLS context via PostgreSQL `set_config()`
- Role-based access control via `requireRole()` middleware with role hierarchy
- Webhook signature verification
- Audit logging for all sensitive events
- Account lockout detection on sign-in
- Banned user checking at the auth layer
- Forgot-password: no user enumeration (always returns `{ success: true }`)
- Graceful shutdown closes all connections

### Critical Issues

**CR-02: Rate limiting, account lockout, and forgot-password throttling ALL degrade silently when Redis is unavailable**

Rate limiting (`rate-limit.ts:33-37`):
```typescript
if (!cacheClient) {
  console.warn('[ratelimit] Redis unavailable — rate limiting DISABLED.');
  await next(); // <-- proceeds without any rate limiting
  return;
}
```

Account lockout (`lockout.ts:59-61`):
```typescript
if (!cacheClient) {
  console.warn('[lockout] Redis unavailable — account lockout DISABLED.');
  // ... continues without any brute-force protection
}
```

Forgot-password rate limit (`index.ts:313`):
```typescript
console.warn('[forgot-password] Redis unavailable — rate limiting disabled!');
// ... continues without throttling
```

In a production Redis outage, the API runs with ZERO brute-force protection on all auth endpoints.

**Fix:** Implement a local in-memory fallback with LRU cache when Redis is down, or fail closed on security-critical endpoints:

```typescript
// rate-limit.ts
import { LRUCache } from 'lru-cache'; // or use a Map with TTL

const fallbackCache = new Map<string, { count: number; resetAt: number }>();
const FALLBACK_TTL = 60_000;

export function globalRateLimit(config?: Partial<RateLimitConfig>) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    if (c.req.path.startsWith('/api/auth/')) return next();

    if (!cacheClient) {
      // In-memory fallback — degraded but not absent
      const identifier = user?.id ?? ip;
      const now = Date.now();
      const entry = fallbackCache.get(identifier);
      if (entry && entry.resetAt > now) {
        if (entry.count >= merged.maxRequests) {
          return errorResponse(c, 'RATE_LIMITED', 'Too many requests', 429);
        }
        entry.count++;
      } else {
        fallbackCache.set(identifier, { count: 1, resetAt: now + merged.windowSeconds * 1000 });
      }
      await next();
      return;
    }
    // ... Redis path
  };
}
```

**CR-03: Reports use `sql.raw()` for column interpolation**

```typescript
// reports.ts:19-25
function dateFilter(col: string, start?: string, end?: string) {
  if (!ALLOWED_COLUMNS.has(col)) throw new Error(`Invalid column: ${col}`);
  if (start && end)
    return sql`${sql.raw(col)} >= ${start}::date AND ${sql.raw(col)} < (${end}::date + INTERVAL '1 day')`;
```

While `ALLOWED_COLUMNS` whitelist prevents direct injection, using `sql.raw()` with any user-controlled query parameter is fragile. If a new column alias is added without updating the whitelist, it fails safely (throws), but the pattern invites future mistakes.

**Fix:** Use Drizzle's typed column references instead of raw SQL, or use parameterized column identifiers via `sql.identifier()`:

```typescript
function dateFilter(col: ReturnType<typeof sql.identifier>, start?: string, end?: string) {
  if (start && end)
    return sql`${col} >= ${start}::date AND ${col} < (${end}::date + INTERVAL '1 day')`;
}
```

### Warnings

**WR-08: No brute-force protection on forgot-password at the DB level**

The forgot-password rate limit (`index.ts:298-313`) counts attempts in Redis. When Redis is down, there's unlimited forgot-password requests. Even when Redis is up, the limit is 3 per 5 minutes per email — sufficient, but there's no tenant-level or global throttling.

**WR-09: Session cache TTL is very short (5 seconds)**

```typescript
// auth.ts:17
const SESSION_CACHE_TTL = 5;
```

This means every 5 seconds, each active user causes a PG query. For burst traffic, this amplifies DB load. Consider 30-60s TTL and a webhook/event-based cache invalidation for session revocation.

**WR-10: CSP allows `'unsafe-inline'` for both script and style**

```typescript
// security-headers.ts:17
"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ..."
```

For the API, this doesn't render HTML so it's not exploitable. But if the API ever serves rendered content or error pages, tighten this.

---

## 4. Performance — 70/100

### Good
- Redis caching on all read endpoints (shipments list, detail, tracking, quotes, invoices, branches, dashboard stats)
- Cache invalidation on all mutations
- Parallel queries (`Promise.all`) in dashboard stats service
- Pagination with bounded limits on all list endpoints
- Compression middleware
- Cooldown rate limit on manual tracking (60s per shipment)
- Connection pooling with configurable pool size
- Cached branch validation (5-min TTL)
- Cached domain/slug tenant resolution (5-min TTL)

### Warnings

**WR-11: `LIKE '%search%'` patterns cannot use B-tree indexes**

All search endpoints use `LIKE` with wildcard prefix, which forces full table scans:

```typescript
// shipments.ts:51
like(shipments.trackingNo, `%${search}%`)
```

**Fix:** Add `pg_trgm` extension and GIN indexes for text search columns, or use Postgres full-text search (`tsvector`).

**WR-12: Dashboard stats issue 7-9 queries per request**

The `/api/dashboard/stats` endpoint (`dashboard.ts:76-90`) fires 7+ queries in parallel for tenant-level stats, plus a per-branch breakdown query. In a 50-branch tenant, this grows significantly.

**Fix:** Batch metrics into fewer queries using `COUNT(*) FILTER (WHERE ...)` patterns (already used in some places — expand to cover more aggregations).

**WR-13: Cache fragmentation on paginated endpoints**

Cache keys include page/limit/status/search params, creating many unique entries:
```typescript
const cacheKey = `shipments:list:${branchId}:${status}:${customerId}:${search}:${page}:${limit}`;
```

A 200-page result set means 200 cache entries. When any shipment changes, ALL are invalidated via pattern delete.

**Fix:** Consider caching the base query result (IDs + page count) separately from rendered rows, or use cursor-based pagination.

**WR-14: Shipment list does 3 queries (count + rows + status counts)**

```typescript
// shipments.ts:67-98 — count query + data query + status group-by query
```

The status counts query intentionally ignores the status filter (for KPI accuracy), but it duplicates all the other filter conditions.

---

## 5. Logging — 68/100

### Good
- Pino structured JSON logger
- Request IDs on all requests (X-Request-ID header + context)
- Request/response logging with method, path, status, timing, user, tenant, role
- Log redaction for sensitive fields (passwords, tokens, secrets)
- Dev vs production mode (pretty printing in dev)
- Configurable LOG_LEVEL
- Sentry integration for error capture

### Warnings

**WR-15: Mixed console vs structured logger usage**

`console.error`/`console.warn`/`console.log` is used extensively alongside the Pino logger:
- `redis.ts:27`: `console.error('[redis] cache client error:', err.message)`
- `rate-limit.ts:34,73`: `console.warn`/`console.error`
- `lockout.ts:60,70,101,115`: `console.warn`/`console.error`
- `index.ts:34,39,50,54,58,61,246,247,248,249,310,313,529,534,557,568,585,592`
- `auth.ts:306,308`, `services/shipment.ts:264,335`, etc.

**Fix:** Replace all `console.*` calls with structured `logger.*` calls, or at minimum create a shared bridge. The Pino logger can capture these if configured.

**WR-16: No request ID correlation in audit logs**

Audit log entries (`auditLogs` table) don't include `requestId`. When debugging a customer issue, an audit event can't be linked back to the HTTP request that triggered it.

**Fix:** Add `requestId` to audit metadata when context is available:

```typescript
// services/audit.ts
if (c && 'get' in c && typeof c.get === 'function') {
  metadata.requestId = c.get('requestId');
}
```

**WR-17: Sentry tracesSampleRate may be too high for production**

```typescript
// instrument.ts:8
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0.1,
```

At 20% sampling, a busy API generating 1000 requests/minute would send 200 traces/min + profiles. This can quickly consume quota.

**Fix:** Use dynamic sampling based on transaction name or reduce to 0.05-0.1 for production.

---

## 6. Code Quality — 60/100

### Good
- Clear file organization (routes/ middleware/ services/ db/ validators/)
- Consistent validation patterns via Zod
- Well-documented with JSDoc and inline comments
- Single-responsibility services (`services/shipment.ts`, `services/audit.ts`)
- Test files for middleware, routes, and integration
- Graceful shutdown cleanup sequence
- Dead letter queue for failed jobs

### Warnings

**WR-18: Massive code duplication — validation error handling (~15 copies)**

The Zod `flatten()` + `Object.entries()` + `.join('; ')` pattern is repeated in `shipments.ts`, `quotations.ts`, `customers.ts`, `branches.ts`, `users.ts`, etc. This is ~8 lines each, ~120 lines of identical code.

**WR-19: 800+ line route files**

`shipments.ts` (863 lines), `customers.ts` (744 lines), `users.ts` (652 lines) are too large. They combine route definitions, business logic, caching, audit logging, and real-time events.

**Fix:** Extract query building, audit logging, and cache invalidation into service functions. Route files should only wire middleware, parse input, call services, and return responses.

**WR-20: Mixed error response patterns (see WR-05)**

**WR-21: Fire-and-forget calls throughout**

Un-awaited calls in request handlers (not tracked, not caught):
- `logAudit(...)` — at least 10 sites
- `emitToTenant(...)` — at least 8 sites
- `cacheClient.set(...).catch(() => {})` — acceptable pattern
- `cacheDelPattern(...)` mutliple sites

**WR-22: Hardcoded default tenant slug**

```typescript
// customers.ts:164
const tenantSlug = c.req.header('x-tenant-slug') || c.req.header('x-tenant') || 'gajan-traders';
```

Falls back to 'gajan-traders' if no tenant header is provided. Customer registration creates users in Gajan Traders by default.

### Info

**IN-01: `as unknown as` is a code smell used 30+ times across the codebase.** Most casts target `Record<string, unknown>` to access properties that are already typed on the user object. This indicates the types need to be either more precise or a helper function should be used.

**IN-02: Duplicate filter-building logic** — the pattern of building `conditions: ReturnType<typeof eq>[]` with tenant/branch scope is repeated in every GET/PATCH route. A reusable `buildScopeConditions()` function could eliminate this.

---

## 7. Dependencies — 75/100

### Good
- Well-chosen, maintained libraries (Hono, Drizzle, Pino, BullMQ, Sentry, Socket.IO)
- Sensible versions aligned with current major releases
- Dev dependencies include testing (vitest), formatting (prettier), and type checking
- Minimal bundle via tsup for production builds
- Workspace dependencies (`@repo/types`, `@repo/auth-config`, `@repo/permissions`) for shared code

### Warnings

**WR-23: Dual TypeScript versions across workspace**

Root: `typescript@5.9.2`, apps/api devDeps: `typescript@^6.0.3`. The `^6.0.3` range means a newer version may be installed than what other packages expect. This can cause type-checking inconsistencies.

**WR-24: Zod 4.x is a recent major version**

Zod v4 has breaking changes from v3 (new `.parse()` semantics, different `.flatten()` structure). If connector packages (Drizzle, Better Auth) expect Zod v3, there may be subtle incompatibilities.

---

## Findings Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 3 | CR-01: `as any` on auth API calls, CR-02: Security controls degrade silently without Redis, CR-03: `sql.raw()` in reports |
| Warning | 13 | WR-01 to WR-20 as detailed above |
| Info | 2 | IN-01: `as unknown` code smell, IN-02: Duplicate filter building |

---

_Reviewed: 2026-07-13T18:30:00Z_
_Reviewer: gsd-code-reviewer (deep audit)_
_Depth: deep — full cross-file analysis of 42 source files across routes, middleware, services, db, validators, queues, and infrastructure_
