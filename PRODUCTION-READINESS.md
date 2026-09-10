# Production Readiness Audit

**Date:** 2026-09-10  
**Scope:** Full monorepo (`apps/api`, `apps/admin`, `apps/customer`, `apps/lanka-mahal`, shared packages)  
**Overall score:** **82/100** — Ship-ready for controlled rollout with documented ops dependencies

---

## Executive summary

The platform is functionally complete for multi-tenant shipment tracking, invoicing, and customer portals. Recent hardening (shipment ID resolution, tenant currency, GST removal, shipments ops UI) is covered by new unit tests. API test suite is strong (~440 tests). CI runs typecheck + tests on Node 18/20/22.

**Blockers before public production:** configure Redis (queues/webhooks), set `TRACK_WEBHOOK_SECRET`, rotate seed passwords, and run a staging smoke test with real 17TRACK webhooks.

---

## Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| Tests & CI | 85/100 | API: 439 passing; admin/customer unit tests present; no E2E in CI |
| Security & tenancy | 88/100 | CASL, tenant middleware, proxy auth, webhook verification |
| Reliability & ops | 75/100 | Redis required for queues; graceful Redis bypass on rate limit |
| Observability | 70/100 | Sentry instrumented; structured request IDs |
| Data integrity | 85/100 | Drizzle + tenantId scoping; audit logs |
| Frontend quality | 80/100 | Typed session (partial), React Query, redesigned shipments |
| Configuration | 78/100 | Env validation at API boot; some dev defaults remain |
| Documentation | 65/100 | This audit + admin checklist; no runbook |

---

## Test coverage (current)

### API (`apps/api`) — **439 tests passing**

| Area | Test file(s) |
|------|----------------|
| Shipment resolve (tracking no vs UUID) | `services/shipment-resolve.test.ts` |
| Currency symbols (INR ₹, LKR Rs) | `lib/currency.test.ts` |
| 17TRACK normalizer | `shipment-providers/normalizer.test.ts` |
| Invoice PDF (no GST) | `invoice/invoice-pdf.test.ts` |
| Webhook worker | `workers/webhook-worker.test.ts` |
| Tenant isolation | `routes/tenant-isolation.test.ts` |
| AuthZ middleware | `middleware/authorization.test.ts` |
| Integration routes | `routes/integration.test.ts` |

### Admin (`apps/admin`) — **40 tests**

| Area | Test file(s) |
|------|----------------|
| Currency formatting | `__tests__/currency.test.ts` |
| Dashboard utils | `__tests__/dashboard-utils.test.ts` |
| Status groups, API helpers | `__tests__/status-groups.test.ts`, `api.test.ts` |

### Customer (`apps/customer`)

| Area | Test file(s) |
|------|----------------|
| Check-price (no GST) | `__tests__/check-price-gst.test.ts` |
| Tenant config, status | `__tests__/tenant-config.test.ts`, `status.test.ts` |

### Gaps

- No Playwright/Cypress E2E in CI (`apps/api/src/e2e.test.ts` skipped)
- No PDF render integration test (font + layout verified manually)
- Lanka Mahal check-price GST regression | `apps/lanka-mahal/__tests__/check-price-gst.test.ts`

---

## CI pipeline

`.github/workflows/ci.yml`:

- `pnpm install --frozen-lockfile`
- `pnpm lint` (Biome — `apps/api/src` + `packages`; admin lint tracked separately)
- `pnpm check-types` (all packages)
- `pnpm test` (turbo, matrix Node 18/20/22)

**Recommendation:** Add a staging deploy job after tests pass.

---

## Required environment variables

### API (required at boot)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `BETTER_AUTH_SECRET` | Session signing |
| `BETTER_AUTH_URL` | Auth callback base URL |

### API (production strongly recommended)

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | BullMQ (tracking jobs, webhooks, notifications) |
| `TRACK_API_KEY` | 17TRACK API |
| `TRACK_WEBHOOK_SECRET` | Webhook HMAC verification |
| `CORS_ORIGIN` | Comma-separated admin + portal origins |
| `SEED_SECRET` | Protects `/api/seed/*` routes |
| `ZEPTOMAIL_API_KEY` / `ZEPTOMAIL_PASS` | Email notifications |

### Admin / portals

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | API base for client fetches |

---

## Security checklist

| Item | Status |
|------|--------|
| Multi-tenant `tenantId` on all shipment/customer queries | ✅ |
| CASL abilities per role | ✅ |
| Admin proxy redirects unauthenticated users | ✅ (`apps/admin/proxy.ts`) |
| Rate limiting (Redis-backed, fails open) | ✅ |
| Account lockout on failed sign-in | ✅ |
| Webhook signature verification | ✅ (requires `TRACK_WEBHOOK_SECRET`) |
| Security headers middleware | ✅ |
| Session typed via Zod (`sessionUserSchema`) | ✅ (partial adoption in pages) |
| Default seed passwords in code | ⚠️ Set `SEED_*_PASSWORD` in prod |

---

## Operational dependencies

```
Create shipment → BullMQ track job → 17TRACK API
17TRACK webhook → Redis queue → webhook worker → DB + notifications
Cron retrack (2h) → BullMQ
Socket.IO realtime → Redis adapter (when configured)
```

**Without Redis:** tracking jobs, webhooks, and notification queue do not run. API still serves reads/writes but tracking stays stale.

---

## Recent fixes verified by tests

1. **Shipment detail 500** — `resolveShipmentId` avoids UUID cast on tracking numbers; invoice routes use same resolver.
2. **Currency** — ₹ (INR) and Rs (LKR) in API + admin; PDF uses Noto Sans for rupee glyph.
3. **GST removed** — Invoice PDF and check-price portals show freight-only totals.
4. **Sticky layout** — CSS utilities for navbar offset (manual QA).

---

## Remaining gaps (prioritized)

### P0 — before production traffic

1. Set all production env vars; disable default seed passwords.
2. Confirm Redis + workers running alongside API process.
3. Register 17TRACK webhook URL and verify with a test shipment.
4. Staging smoke: login → create shipment → track → invoice PDF download.

### P1 — next sprint

1. Replace remaining `Record<string, unknown>` session casts with `getUser()`.
3. Typed mutation payloads in `apps/admin/lib/queries/*`.
4. E2E test for critical path (login + shipment list).
### P2 — quality

1. Dashboard Zod schemas (replace `z.any()`).
2. Error boundaries on admin routes.
3. Deployment runbook (Coolify/Docker).
4. Update `apps/admin/PRODUCTION-CHECKLIST.md` (dated July 2026).

---

## Sign-off criteria

- [ ] `pnpm check-types` green
- [ ] `pnpm test` green on CI (Linux)
- [ ] Redis + workers healthy in staging
- [ ] 17TRACK webhook delivered and processed
- [ ] Email/WhatsApp test notification received
- [ ] Both tenants (INR + LKR) invoice PDF verified
- [ ] Superadmin cross-tenant dashboard reviewed

---

*Supersedes partial findings in `apps/admin/PRODUCTION-CHECKLIST.md` for platform-wide scope. Admin-only UI audit details remain in that file.*
