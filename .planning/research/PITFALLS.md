# Domain Pitfalls: Multi-Tenant Shipment Tracking Platform

**Domain:** Multi-tenant shipment tracking / logistics
**Researched:** 2026-06-13
**Overall confidence:** HIGH

## Critical Pitfalls

Mistakes that cause data leaks, rewrites, or production incidents.

---

### Pitfall 1: Missing `WHERE tenant_id` — Data Leak Between Tenants

**What goes wrong:** A developer writes a Drizzle query without a `.where(eq(table.tenantId, tenantId))` filter. The query returns rows belonging to every tenant. Customer A sees Customer B's shipments, invoices, and quotations. This is a compliance incident and destroys trust.

**Why it happens:**
- Easy to forget the filter in ad-hoc queries, new features, or refactoring
- Drizzle ORM doesn't enforce tenant scoping at the type level — the schema defines `tenantId` as a column but the query builder doesn't require it
- Copy-paste between dev console and production code
- Connection pooling reuses connections — if one request sets `SET LOCAL app.tenant_id` and the next request doesn't re-set it, the previous tenant's context leaks (though `SET LOCAL` is transaction-scoped, so this only applies if not using transactions properly)

**Consequences:** Data breach, GDPR/IT Act violations, customer churn, legal liability.

**Prevention:**
1. **Enable PostgreSQL Row-Level Security (RLS):** `ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;` + `FORCE ROW LEVEL SECURITY;`. Create a policy that checks `current_setting('app.tenant_id')`. This is defense-in-depth — even if the query omits the filter, the DB rejects cross-tenant rows.
2. **Set tenant context in middleware:** Every API request must call `SET LOCAL app.tenant_id = $1` inside a transaction before any query. Use `AsyncLocalStorage` to carry tenant context.
3. **Drizzle helper wrapper:** Create a `tenantDb` proxy that automatically appends tenant filtering to all top-level queries. Example: `tenantDb.select().from(shipments)` auto-adds `.where(eq(shipments.tenantId, ctx.tenantId))`.
4. **Integration test every query:** Write tests that log in as Tenant A and assert they cannot see Tenant B's data. Run these in CI.

**Detection:**
- Monitoring: Log any query result where `tenantId` doesn't match the request's authenticated tenant (post-query audit)
- RLS violations log to PostgreSQL logs — monitor for `policy_violation` errors
- Periodic penetration tests: attempt to access other tenant's data via URL manipulation

**Phase to address:** Phase 1 (Auth & Multi-Tenancy) — RLS setup + tenant middleware + Drizzle wrapper must be in place before any data enters production.

**Sources:**
- PostgreSQL RLS docs (MEDIUM) — multiple blog posts confirm this is the industry standard defense
- "One missing `WHERE org_id = ?` clause exposes one tenant's data to another" — bastionary.com (MEDIUM)
- Drizzle + Nile tutorial (MEDIUM) — shows `SET LOCAL` pattern for tenant context

---

### Pitfall 2: Async Context Bleeding — Tenant ID in Wrong Request

**What goes wrong:** Node.js handles concurrent requests in the same process. If tenant ID is stored in a global variable or module-level singleton, request A (tenant India) sets it, request B (tenant Sri Lanka) overwrites it before A finishes, and A's query runs against Sri Lanka's data.

**Why it happens:**
- Using a plain module variable for `currentTenantId` instead of `AsyncLocalStorage`
- Not resetting `AsyncLocalStorage` between requests in error paths
- BullMQ workers running outside of request context — no `AsyncLocalStorage` available, so tenant context is lost entirely

**Consequences:** Intermittent, hard-to-reproduce data leaks. Worst of both worlds: appears random, makes debugging nearly impossible.

**Prevention:**
1. **Use AsyncLocalStorage exclusively** for tenant context. Initialize it in Hono middleware, ensure `.run()` wraps the entire request lifecycle.
2. **Never store tenantId on `globalThis`, module-scoped `let`, or `req` object without explicit scoping.**
3. **BullMQ jobs must embed tenantId in job data,** not rely on `AsyncLocalStorage` (workers run on different ticks).
4. **Socket.IO middleware:** Extract and attach tenant from handshake/auth on connection, not from shared state.
5. **Test with concurrent requests:** Use k6/artillery to fire 50 simultaneous requests from different tenants and assert no data crossover.

**Detection:**
- Add tenantId to every log line via structured logging. If a log shows multiple tenantIds in one request trace, alarm.
- RLS catches this at DB level (mitigation, but slow path).

**Phase to address:** Phase 1 (Auth & Multi-Tenancy) + Phase 5 (Infrastructure) — AsyncLocalStorage pattern in Hono middleware, BullMQ worker design.

**Sources:**
- Node.js AsyncLocalStorage docs (HIGH)
- Multiple SaaS architecture guides highlight this (MEDIUM)

---

### Pitfall 3: CASL Authorization Gaps in Next.js Server Components

**What goes wrong:** A Next.js App Router page or server action performs a database query without checking CASL abilities. A customer user navigates to `/admin/shipments` directly and sees data they shouldn't. Or a server component calls a query that should require `manage` permission but only has `read` permission.

**Why it happens:**
- Server Components run during SSR — they can't access `useAbility()` hook (client-side only)
- CASL ability is built on the client from a serialized ability JSON, but server components need their own check
- Easy to add permission checks in API routes but forget them in server components
- Middleware is route-based, not action-based — it can't protect against misuse of server actions

**Consequences:** Privilege escalation in admin pages, customers accessing staff features, unauthorized data export.

**Prevention:**
1. **Build CASL ability on the server too.** Create a `defineAbilityFor(user)` function that works both server-side and client-side. In server components, call it before any query.
2. **Create a `authorize` helper for server actions:** `authorize(user, 'manage', 'Shipment')` that throws or returns early if not permitted.
3. **Never trust client-side CASL checks alone** — always re-check on the server.
4. **Middleware for route-level guard** — protect `/admin/*` routes from customer role at edge.
5. **Drizzle + CASL integration:** Pre-filter queries using CASL conditions. Example: `db.select().from(shipments).where(...ableTo('read', 'Shipment').conditions)`.

**Detection:**
- Audit logs: Log all denied authorization attempts with user, action, and resource
- Sentry: Capture authorization failures as warnings, track frequency

**Phase to address:** Phase 2 (Admin App) — CASL must be integrated with both API layer and Next.js SSR. Don't defer server-side ability building.

**Sources:**
- CASL docs — `defineAbility` is the canonical approach (MEDIUM)
- HireNodeJS guide: "RLS and RBAC solve different questions: RLS governs row access, RBAC governs actions" (MEDIUM)
- Community patterns show server-side ability building in Next.js (LOW — training data)

---

### Pitfall 4: 17TRACK Rate Limit & Webhook Reliability

**What goes wrong:** 17TRACK API has a **3 requests/second rate limit**. A bulk shipment import (e.g., 200 shipments) triggers `register` calls at 3 req/s. After the 4th request in a second, the API returns HTTP 429. The app either ignores the error (silently losing tracking registration for some shipments) or retries instantly (making the rate limit worse).

Separately: 17TRACK webhooks can be missed if the endpoint is down during delivery. If the webhook handler crashes mid-processing, the tracking update is lost.

**Why it happens:**
- Developers test with 2-3 shipments, everything works. Production has hundreds per day.
- The 3 req/s limit is per endpoint — register, refresh, get, delete all share the same limit.
- 17TRACK uses at-least-once webhook delivery with retries, but if the endpoint returns errors for too long, they eventually stop retrying.
- The free tier gives 200 tracking numbers (one-time). Running out means paying or losing functionality.

**Consequences:** Lost tracking updates → stale status in customer portal → WISMO calls → customer dissatisfaction. Payment overruns if not monitoring usage.

**Prevention:**
1. **BullMQ queue with rate limiter:** Create a dedicated `tracking-sync` queue with `limiter: { max: 3, duration: 1000 }`. All 17TRACK API calls go through this queue. This naturally enforces the rate limit.
2. **Batch register calls:** The API supports up to 40 tracking numbers per request. Always batch.
3. **Webhook handler must be idempotent and fast:** Respond 200 immediately, enqueue a BullMQ job for processing. Never process tracking updates synchronously in the webhook handler.
4. **Fallback polling:** If webhook delivery fails, have a cron/BullMQ repeatable job that refreshes stale tracking numbers every N hours.
5. **Monitor API usage:** Expose 17TRACK account metrics (remaining tracking numbers, API call count) to super admin dashboard.
6. **Webhook secret verification:** 17TRACK sends HMAC signatures. Verify them before processing to prevent fake tracking updates.

**Detection:**
- BullMQ job failure metrics for `tracking-sync` queue
- 429 responses logged and alerted
- Webhook signature failures flagged as security events

**Phase to address:** Phase 3 (Tracking & Notifications) — Rate limiting setup and webhook handler must be designed together, not as separate tasks.

**Sources:**
- 17TRACK API docs v2 (HIGH): "Each API endpoint has a rate limit of 3 requests/second; exceeding this will return a 429 error" — npm MCP server docs
- 17TRACK API docs (HIGH): max 40 tracking numbers per batch call
- 17TRACK pricing change (HIGH): "Effective January 7, 2026" — free tier now one-time 200 numbers, no monthly free allocation

---

### Pitfall 5: BullMQ Notification Jobs — Silent Failure & No Dead Letter Handling

**What goes wrong:** A BullMQ job to send an email or WhatsApp notification fails (e.g., Resend API is down, MSG91 returns an error, template ID is wrong). The job retries with default exponential backoff, exhausts all attempts, and ends up in the "failed" set. Nobody monitors the failed set. The customer never gets notified of their shipment status change. They only discover the issue when they call support — hours or days later.

**Why it happens:**
- No monitoring on BullMQ failed job counts
- `removeOnFail` is set too aggressively (e.g., `removeOnFail: true`), losing the failure evidence
- No dead letter queue (DLQ) pattern — failed jobs sit in Redis indefinitely or are silently removed
- Notification is treated as fire-and-forget instead of tracked delivery

**Consequences:** Angry customers, WISMO spike, staff time wasted manually checking tracking status. For critical shipments (e.g., customs clearance updates), missed notifications can cause real business impact.

**Prevention:**
1. **Never auto-remove failed notifications:** Keep `removeOnFail: { count: false, age: 7 * 24 * 3600 }` — retain failed jobs for at least 7 days.
2. **Dead letter queue pattern:** After N retries, move the job to a separate DLQ queue (or a DB table). Have a DLQ consumer that alerts staff.
3. **Alert on failed notification jobs:** Sentry capture on final failure. PagerDuty/OpsGenie for critical notification queues.
4. **Notification delivery receipts:** MSG91 and Resend both provide delivery status callbacks. Track delivery status in DB (pending → sent → delivered/failed) and alert on stuck "pending" notifications.
5. **Dashboard for failed notifications:** Admin UI shows failed notifications with retry button.
6. **Attach tenant context to every job:** Job data must include `tenantId` so that DLQ processing knows which tenant to contact.

**Detection:**
- Prometheus/Grafana: BullMQ queue depth for failed jobs > 0 → alert
- Daily email to admins: "Failed notifications requiring attention: 12"
- Sentry: Track `notification.failed` as a performance metric

**Phase to address:** Phase 3 (Tracking & Notifications) — DLQ pattern and monitoring must be built alongside the notification queues, not retrofitted.

**Sources:**
- BullMQ docs — retry/failed job handling (HIGH)
- StackOverflow: "How to safely handle failed BullMQ jobs and Redis memory limits" (MEDIUM)
- General distributed systems guidance on DLQ patterns (MEDIUM)

---

### Pitfall 6: React PDF Memory Leak in Server-Side Generation

**What goes wrong:** React-pdf/renderer has a known memory leak in its `renderToStream` / `renderToFile` functions. Each PDF generation allocates memory in the yoga-layout engine and event emitters that is not fully garbage collected. Over time (or under concurrent generation), the Node.js process runs out of memory and dies.

This is documented in GitHub issue #2848 (Aug 2024): "Every time a PDF is rendered, the memory used by the app increases and never comes back down."

**Why it happens:**
- `@react-pdf/renderer` uses yoga-layout (a C++ layout engine via bindings) — memory allocation across the JS/C++ boundary is harder to GC
- Each render adds event listeners (`MaxListenersExceededWarning`) that aren't cleaned up
- In long-running server processes (BullMQ workers), repeated PDF generation causes cumulative memory growth

**Consequences:** BullMQ worker crashes mid-invoice generation → invoice never sent → customer complains. Periodic OOM kills requiring container restarts.

**Prevention:**
1. **Render PDFs in a child process** (e.g., `child_process.fork()` or `worker_threads`). The child process generates one PDF, returns the buffer, and exits. Memory is fully reclaimed when the child exits.
2. **BullMQ worker isolation:** Dedicate a separate BullMQ queue for PDF generation with a single worker. The worker generates one PDF at a time (concurrency: 1).
3. **Monitor memory per PDF job:** Log RSS memory before and after generation. Alert if growth exceeds threshold.
4. **Alternative approach (if memory issues persist):** Consider PDFKit for simpler documents instead of React-pdf. It has no DOM/layout engine and is more memory-efficient for simple invoices.
5. **Stream PDF response** — don't buffer entire PDF in memory for HTTP responses. Use `renderToStream` and pipe.

**Detection:**
- BullMQ worker memory metrics (container-level: `docker stats`)
- Process crash detection (Coolify health checks, Sentry crash reporting)
- Node.js heap snapshot when worker restarts

**Phase to address:** Phase 3 (Tracking & Notifications) — PDF generation design must include isolation strategy from day one.

**Sources:**
- GitHub issue #2848 (HIGH): "Heap memory Leak — each PDF generation increase memory and does not fall back enough" — diegomura/react-pdf
- Joyfill blog post on Node PDF generation (MEDIUM): "memory-hungry rendering engines, blocking calls that bottleneck your API"
- Medium article on worker isolation for React-pdf (MEDIUM)

---

### Pitfall 7: Notification Duplication — Msg91 + Resend Idempotency

**What goes wrong:** A shipment status changes. BullMQ enqueues a notification job. The job succeeds from BullMQ's perspective (the worker calls `fetch` to Resend/MSG91 and gets a response), but the response is lost or the provider's confirmation is delayed. BullMQ marks the job as failed and retries. The notification is sent twice. Or: 17TRACK webhook fires twice (at-least-once delivery) → two BullMQ jobs → two notifications.

**Why it happens:**
- BullMQ provides at-least-once delivery — jobs will be retried if the worker crashes after processing but before acknowledging
- 17TRACK webhooks are at-least-once — the same tracking update may arrive multiple times
- Neither Resend nor MSG91 guarantee deduplication unless the caller provides an idempotency key

**Consequences:** Customer receives 2-3 identical WhatsApp messages and emails about the same tracking update. Appears spammy. For SMS (which costs per message), this is a direct cost overrun.

**Prevention:**
1. **Idempotency key per notification event:** Use a unique key like `{shipmentId}:{status}:{timestamp}`. Store it in a DB table with a unique constraint. Before sending, check if the key exists. After sending, insert the key.
2. **Resend idempotency key:** Resend supports an `Idempotency-Key` header. Generate a deterministic key (`sha256(tenantId + shipmentId + statusCode + statusChangeTimestamp)`). Resend will reject duplicates.
3. **MSG91 idempotency:** MSG91 doesn't natively support idempotency keys for WhatsApp. Use application-level dedup: check `notification_log` table before sending.
4. **Dedupe webhook events:** 17TRACK tracking updates carry a `tracking_number + carrier_code` combination. Use this as a dedup key. Process each unique tracking- carrier pair only once per check interval.
5. **Queue job dedup:** Use BullMQ's built-in deduplication via custom job IDs. Job ID = the notification event's unique key. If the same job ID is added again, BullMQ silently ignores it.

**Detection:**
- Monitor `notification_log` duplicates — run a nightly query checking for duplicate key combinations
- Alert if same notification is delivered more than once per shipment status transition

**Phase to address:** Phase 3 (Tracking & Notifications) — Idempotency design must be in the notification flow from the start.

**Sources:**
- Resend API docs — Idempotency-Key header support (MEDIUM)
- General webhook delivery doctrine: "Exactly-once delivery is a myth for webhooks; at-least-once with idempotent consumers is the practical choice" (MEDIUM)
- 17TRACK API docs — "tracking number + carrier code combination forms the unique data identifier" (HIGH)

---

### Pitfall 8: Tenant Configuration Scoping — Forgetting Per-Tenant Customization Points

**What goes wrong:** The platform launches supporting India and Sri Lanka with hardcoded templates, sender IDs, and branding. When an Indian customer logs into the Sri Lankan portal, they see Sri Lankan rupee pricing, wrong locale, and incorrect sender name. Adding a new tenant later requires code changes instead of configuration.

**Why it happens:**
- Early development focuses on making it work for one tenant
- Branding, locale, sender IDs, and notification templates are inlined in components
- No abstraction for "per-tenant config" — each new customization point requires a code change

**Consequences:** Every new tenant is a deployment risk. Codebase becomes littered with `if (tenantId === 'india') ... else ...` conditionals. Adding the third tenant requires a refactor.

**Prevention:**
1. **Centralized tenant config registry:** Create a `TenantConfig` schema in the DB (or a JSON config file per tenant). Store: branding (logo, colors), locale, timezone, currency, Resend sender email, MSG91 sender number, notification template overrides, feature flags.
2. **Config service:** A Hono middleware that loads tenant config on request and makes it available via context. For React frontends, expose via API endpoint.
3. **Lazy loading / caching:** Cache tenant config in Redis with tenant-prefixed keys. Bust cache when config changes.
4. **Notification templates as config:** Use React Email templates stored per-tenant, not hardcoded.
5. **Add tenantId to all config queries** — don't let admin for one tenant see/change another tenant's config.

**Detection:**
- Code review: flag any new `if (tenantId)` or `switch (tenant)` conditional
- Tenant config API should log every access attempt from mismatched tenant context

**Phase to address:** Phase 1 (Auth & Multi-Tenancy) — create the `packages/tenant-config` pattern first. Phase 4 (Customer Portals) extends it.

---

## Moderate Pitfalls

Issues that cause bugs, performance problems, or operational pain but not catastrophic failure.

---

### Pitfall 9: Socket.IO Room IDs Not Scoped by Tenant

**What goes wrong:** Two tenants both have a shipment with ID "SHIP-001". Socket.IO uses shipment ID as the room name. When a tracking update for SHIP-001 (tenant India) fires, it broadcasts to the room `"shipment:SHIP-001"` — both India and Sri Lanka customers receive the update.

**Why it happens:** Room names are simple strings. Without tenant prefixing, collisions occur across tenants.

**Prevention:**
1. **Always prefix Socket.IO rooms with tenantId:** `socket.join(`tenant:${tenantId}:shipment:${shipmentId}`)`.
2. **Namespace approach:** Use Socket.IO namespaces per tenant (e.g., `/india`, `/srilanka`). This isolates groups of rooms entirely.
3. **Middleware enforcement:** Socket.IO middleware should reject connection attempts that don't have a valid, authenticated tenant context.
4. **Never trust client-side room names** — always derive the room from server-side session data.

**Detection:**
- Enable Socket.IO event logging in dev — monitor for unexpected cross-tenant room memberships
- Load test with concurrent tenants sharing same numeric IDs

**Phase to address:** Phase 5 (Infrastructure — Socket.IO + Redis adapter).

**Sources:**
- Socket.IO multiple-server room guide (HIGH): "room names should be prefixed to avoid collisions in multi-tenant setups"
- Socket.IO Redis adapter docs (HIGH)

---

### Pitfall 10: Redis Cache Keys Not Tenant-Prefixed

**What goes wrong:** Cache key is `"shipment:SHIP-001"`. Tenant A updates their shipment, the cache is cleared, and Tenant B's cached result (same key) is also cleared. Or worse: Tenant A's cached data is served to Tenant B.

**Why it happens:** Same key collision logic as Socket.IO rooms. Simple key names like `user:{id}` or `config:{slug}` collide.

**Prevention:**
1. **Always prefix Redis keys with tenantId:** `tenant:{tenantId}:shipment:{shipmentId}`.
2. **Create a helper function** `cacheKey(tenantId, ...parts)` that builds prefixed keys.
3. **Use Redis key scanning commands carefully** — `KEYS *` doesn't scale; use `SCAN` with prefix pattern.
4. **Different Redis DB number per tenant?** (not recommended — harder to manage, but possible). Prefer prefixing within a single DB.
5. **Cache invalidation must also be tenant-scoped** — clearing cache for `tenant:india:shipment:*` should not affect `tenant:srilanka:shipment:*`.

**Detection:**
- Redis key naming convention check in code review
- Runtime logging of cache key usage without tenant prefix

**Phase to address:** Phase 5 (Infrastructure — Redis caching).

**Sources:**
- Redis best practices for multi-tenant SaaS (MEDIUM): "Use tenant-prefixed keys to prevent collision and simplify cache management"

---

### Pitfall 11: BullMQ Jobs Not Cleaned Up — Redis Memory Exhaustion

**What goes wrong:** Over months, completed and failed BullMQ jobs accumulate in Redis. Redis reaches its `maxmemory` limit. The eviction policy starts removing keys — including job data that BullMQ needs. Queue processing becomes unpredictable, jobs disappear.

**Why it happens:** Default BullMQ config doesn't remove completed/failed jobs. Or the dev sets `removeOnComplete: { count: 1000 }` thinking it's enough, but 1000 completions/day × 30 days = 30,000 jobs retained.

**Prevention:**
1. **Set explicit retention policies:** `removeOnComplete: { age: 24 * 3600, count: 1000 }` and `removeOnFail: { age: 7 * 24 * 3600, count: 5000 }`.
2. **Separate cache Redis from BullMQ Redis** if possible. BullMQ needs predictable memory; cache uses LRU.
3. **Monitor Redis memory.** Alert at 70% usage.
4. **Configure Redis `maxmemory-policy allkeys-lru`** only if you understand the consequences for BullMQ. Better: set no eviction and monitor closely.
5. **Periodic cleanup job** that purges old BullMQ data from Redis for queues with high throughput.

**Detection:**
- BullMQ dashboard shows queue sizes growing unboundedly
- Redis `INFO memory` — used_memory increasing steadily
- Slight latency increase in queue operations as lists grow

**Phase to address:** Phase 5 (Infrastructure) — configure BullMQ job retention when creating queues, not as a fix later.

**Sources:**
- BullMQ docs — `removeOnComplete` and `removeOnFail` options (HIGH)
- StackOverflow: "What would happen to the failed data? ... the cache would be at risk of being filled" (MEDIUM)

---

### Pitfall 12: BullMQ Workers Losing Tenant Context

**What goes wrong:** A BullMQ worker picks up a notification job. It tries to access the tenant config or send a tenant-branded email, but `AsyncLocalStorage` returns `undefined` for `tenantId`. The job fails with a confusing error. Or worse: it falls back to a default config and sends the wrong branding.

**Why it happens:** BullMQ workers don't run inside the HTTP request context. `AsyncLocalStorage` only works for the synchronous chain that created it — workers have their own event loop ticks.

**Prevention:**
1. **Always embed tenantId in job data.** Every BullMQ job payload must include `{ tenantId: string, ... }`.
2. **Worker sets its own context:** The first line of a worker handler reads `job.data.tenantId` and creates a new `AsyncLocalStorage` scope (or a simpler context object).
3. **Worker-specific utilities:** Create database and cache helpers that accept `tenantId` explicitly, not from implicit context.
4. **Test worker isolation:** Write unit tests that verify two jobs for different tenants processed concurrently don't leak context.

**Detection:**
- In worker logging, tenantId appears as `null` or `undefined` — immediate alert
- Sentry error grouping for "tenant context missing" errors

**Phase to address:** Phase 5 (Infrastructure) — worker design patterns during BullMQ setup.

**Sources:**
- Hono + BullMQ integration patterns from GT Express experience (MEDIUM — internal institutional knowledge)
- General knowledge of Node.js AsyncLocalStorage limitations (HIGH)

---

### Pitfall 13: 17TRACK Webhook HMAC Verification Skipped

**What goes wrong:** The 17TRACK webhook endpoint accepts any POST request. An attacker sends a fake tracking update indicating "delivered" for a high-value shipment. The system marks it delivered and sends a "Your package has arrived" notification. The customer never receives their package but the system shows it as delivered.

**Why it happens:** 17TRACK signs webhooks with an HMAC-SHA256 signature in the request headers. If the webhook handler doesn't verify this signature, it accepts any HTTP request that looks like a tracking update.

**Prevention:**
1. **Always verify HMAC signature** on every webhook request before processing.
2. **Implement signature verification middleware** for the webhook endpoint path.
3. **Use a constant-time comparison** (NOT `===` — vulnerable to timing attacks on string comparison).
4. **Log failed verification attempts** as security events.
5. **Rate-limit webhook endpoint** as a secondary defense.

**Detection:**
- Security log: "Webhook signature verification failed" alert
- Unexpected delivery status changes for high-value shipments flagged for review

**Phase to address:** Phase 3 (Tracking & Notifications).

**Sources:**
- 17TRACK API docs — webhook signature implementation (MEDIUM — confirmed via API doc structure)
- General webhook security best practices (HIGH)

---

### Pitfall 14: Drizzle Raw SQL Injection via Query Builder Gaps

**What goes wrong:** A search query uses template literals for dynamic filtering: `` db.execute(sql`SELECT * FROM shipments WHERE tracking_number LIKE '%${searchTerm}%'`) ``. An attacker inputs `'; DROP TABLE shipments; --` as the search term.

**Why it happens:**
- Drizzle's tag` sql`` `` ``` template function can be used unsafely
- The ORM encourages using `sql`` `` `` ` for complex queries, and it's easy to interpolate variables without using parameterized syntax
- Developers migrate from raw SQL mindset and forget about injection

**Prevention:**
1. **Use Drizzle's safe parameterized queries:** Always use `sql` with `params()` or the `from(..).where(eq(...))` builder syntax.
2. **Avoid `sql`` `` `` ` with `${variable}` interpolation** — use `${sql.param(variable)}` or `${placeholder}` with `.execute(params)`.
3. **Input validation:** Sanitize search inputs at the API boundary (Arcjet already in stack for rate limiting — leverage it for input validation too).
4. **Lint rule:** Add ESLint/Biome rule to flag `${}` inside `sql`` `` `` ` tagged templates.

**Detection:**
- Database error logs showing SQL injection attempts
- Arcjet/WAF blocking malicious input patterns

**Phase to address:** Phase 1 (Auth & Multi-Tenancy) — establish query safety patterns early. Reinforce in code review during any phase.

**Sources:**
- Drizzle ORM docs — parameterized queries (HIGH)
- General SQL injection prevention (HIGH)

---

### Pitfall 15: Notification Provider Rate Limits & Daily Quotas

**What goes wrong:** A bulk status update (e.g., 200 shipments all move to "in transit" after a carrier pickup) triggers 200 WhatsApp notifications within seconds. MSG91 rejects messages over rate limit. Some customers get notified, others don't. No alert fires because it's a transient error.

**Why it happens:**
- MSG91 and Resend both have per-minute and per-day rate limits
- Bulk tracking updates from 17TRACK happen in bursts (carrier pickup, customs clearance, batch delivery)
- No rate limiting between BullMQ and notification providers

**Prevention:**
1. **Per-provider rate limiting in BullMQ:** Create a notification queue with a global limiter matching Resend/MSG91 rate limits. Configure both per-minute and per-hour limits.
2. **Notification batching:** Resend supports batch API (up to 100 emails per call). MSG91 supports batch WhatsApp messages.
3. **Quota monitoring dashboard:** Expose remaining daily quota from Resend/MSG91 in admin dashboard. Alert when below threshold.
4. **Queue prioritization:** Priority queue for "delivered" notifications (customers waiting for updates) vs low-priority summary/bulk updates.
5. **Delivery window awareness:** MSG91 has "business hours" restrictions for WhatsApp template messages in India. Respect these to avoid rejections.

**Detection:**
- BullMQ job failures tracked by reason code (rate limit vs. auth vs. template error)
- Alert when notification queue backlog exceeds threshold

**Phase to address:** Phase 3 (Tracking & Notifications).

**Sources:**
- MSG91 rate limiting (MEDIUM — inferred from provider documentation patterns)
- Resend rate limit docs (MEDIUM)

---

### Pitfall 16: Customer Portal Session Across Tenants

**What goes wrong:** A user authenticates on the India portal (`india.gajantraders.com`). Their session cookie is set for `*.gajantraders.com`. They navigate to `srilanka.gajantraders.com` and are automatically authenticated — as an Indian customer, seeing Sri Lankan pricing and data.

**Why it happens:**
- Cookie domain is set too broadly (`gajantraders.com` instead of `india.gajantraders.com`)
- Better Auth session cookie is not scoped to the tenant-specific subdomain
- Or: JWT token doesn't include `tenantId` claim, so any token works on any subdomain

**Prevention:**
1. **Scope cookies to subdomain:** Set cookie domain to `india.gajantraders.com` (not `.gajantraders.com`).
2. **Include tenantId in JWT/session:** Better Auth session must encode the tenant the user belongs to. The API validates that the requested tenant (from header/subdomain) matches the session's tenantId.
3. **Cross-tenant access check:** API middleware verifies `req.tenantId === session.tenantId` (or `session.role === 'superadmin'`).
4. **Separate session storage namespace per tenant:** Use Redis key prefix per tenant for session data.

**Detection:**
- Security log: "Cross-tenant session attempt blocked"
- Monitoring: Alerts when a user's session is used to access a different subdomain

**Phase to address:** Phase 1 (Auth & Multi-Tenancy) — session scope and tenant claim validation must be designed upfront.

---

## Minor Pitfalls

Smaller issues that waste time or cause minor bugs.

---

### Pitfall 17: Not Tracking 17TRACK Free Tier Usage

**What goes wrong:** The app silently stops registering new tracking numbers when the 17TRACK free tier limit is hit. New shipments show no tracking info. Existing shipments continue updating. Staff doesn't notice for days.

**Prevention:** Expose 17TRACK account metrics in super admin dashboard. Set up scheduled BullMQ job that notifies admins when remaining tracking numbers drop below threshold.

**Phase to address:** Phase 3 (Tracking & Notifications).

---

### Pitfall 18: Hardcoded Carrier Lists

**What goes wrong:** Shipment tracking fails for a legitimate carrier because the internal carrier lookup table is out of sync with 17TRACK's supported carriers.

**Prevention:** Sync carrier list from 17TRACK API periodically (BullMQ repeatable job). Don't maintain a manual carrier mapping table.

**Phase to address:** Phase 3 (Tracking & Notifications).

---

### Pitfall 19: Timezone Confusion in Shipment Status Timestamps

**What goes wrong:** 17TRACK returns all timestamps in UTC. The India portal displays "arrived at 2:00 AM" (India time) when it should show "arrived at 2:00 AM" but the timestamp is actually 2 AM UTC which is 7:30 AM IST. Customer thinks their package is delayed.

**Prevention:** Store all timestamps in UTC in the DB. Convert to tenant-specific timezone at render time (tenant config includes IANA timezone). Always log raw UTC values.

**Phase to address:** Phase 4 (Customer Portals).

---

### Pitfall 20: Notification Template Versioning

**What goes wrong:** A staff member updates a notification template. Unbeknownst to them, 50 jobs were already queued with the old template reference. Customers get a mix of old and new notification formats.

**Prevention:** Version notification templates. Store template version reference in job data. Render templates at execution time (not at enqueue time) so latest version is always used. For MSG91 WhatsApp templates, the template must be pre-approved by WhatsApp — version changes require re-approval.

**Phase to address:** Phase 3 (Tracking & Notifications).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| **Phase 1: Auth & Multi-Tenancy** | Tenant ID in session not matching request tenant | RLS, tenant middleware, session tenant claim |
| **Phase 1: Auth & Multi-Tenancy** | CASL client-only without server checks | Build `defineAbilityFor()` for server use |
| **Phase 2: Admin App** | Admin queries missing tenant scope | Drizzle wrapper enforces `tenantId` automatically |
| **Phase 3: Tracking & Notifications** | 17TRACK 429 rate limit during bulk imports | BullMQ rate limiter queue |
| **Phase 3: Tracking & Notifications** | React PDF memory growth | Worker thread / child process isolation |
| **Phase 3: Tracking & Notifications** | Duplicate notifications from retry/webhook | Idempotency keys + dedup DB table |
| **Phase 4: Customer Portals** | Cross-tenant session (India ↔ Sri Lanka) | Subdomain-scoped cookies, tenant claim validation |
| **Phase 5: Infrastructure** | Redis cache key collision | Always prefix with tenantId |
| **Phase 5: Infrastructure** | BullMQ job context missing tenantId | Embed tenantId in every job payload |
| **Phase 5: Infrastructure** | Socket.IO room cross-tenant broadcast | Prefix rooms with tenantId |
| **Phase 5: Infrastructure** | Redis memory from unbounded queue growth | Set explicit `removeOnComplete`/`removeOnFail` |

## Sources

- 17TRACK API v2 documentation (HIGH) — rate limits, webhook signatures, batch limits
- 17TRACK pricing change announcement (HIGH) — free tier restructuring January 2026
- BullMQ official docs — retries, backoff, job retention (HIGH)
- Socket.IO Redis adapter docs — room isolated patterns (HIGH)
- PostgreSQL RLS guides — multiple production-grade guides (MEDIUM)
- Launchpad.io multi-tenant SaaS guide (MEDIUM) — general best practices
- Bastionary.com RLS guide (MEDIUM) — tenant isolation in PostgreSQL
- react-pdf GitHub issue #2848 (HIGH) — confirmed memory leak
- Joyfill.io Node.js PDF generation guide (MEDIUM) — memory and performance gotchas
- CASL documentation + community guides (MEDIUM) — server-side ability patterns
- AverageDevs PostgreSQL RLS guide (MEDIUM) — practical production patterns
- SaaS Launch Lab multi-tenant guide (MEDIUM) — industry pain points
- MSG91 webhook feature request (LOW) — limited webhook support for failures
- General distributed systems idempotency patterns (HIGH)
