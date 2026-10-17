---
quick_id: 261017-luz
slug: fix-notification-pipeline-bugs
description: fix notification pipeline bugs
status: planned
date: 2026-10-17
---

# Quick Task 261017-luz: Fix notification pipeline bugs

## Origin

End-to-end exercise of the notification pipeline (2026-10-17) proved the happy path
works — `handleTrackingEvent` → notification queue → in-app row + email → SMTP — and
surfaced five defects. Each was reproduced live against the running API, Redis and a
real shipment (`GT174910001`, tenant `084d477c-47cc-4b9c-925d-1821c2c023b1`).

## Execution note

The GSD quick/debug workflows dispatch `gsd-planner` / `gsd-executor` /
`gsd-debug-session-manager` subagents, which are not available in this harness
(only `explore` and `general` exist). The workflow's artifacts and gates are
honoured by executing inline: this plan, a `SUMMARY.md`, and a `STATE.md` row.

## Constraints

- Minimal fixes only. No refactors, no new dependencies, no new features.
- Code changes stay **uncommitted** — the working tree carries a large unrelated
  admin retheme and the standing instruction is not to auto-commit code.
  Only planning artifacts are committed.
- Standalone verification scripts are throwaway and must be deleted afterwards.

---

## Task 1 — Cache client must survive a Redis outage

**Files:** `apps/api/src/redis.ts`

**Problem:** `createCacheClient()` sets `retryStrategy: () => null`. A boot-time
Redis outage therefore kills the client permanently. Reproduced: one notification
job was handled by the boot-time API process, whose dead cache client made
`checkAndSetIdempotency` throw → caught → dedup skipped → the same `eventId`
produced **two emails**. The same fault silently disables the per-status cooldown,
rate limiting and caching.

**Action:** replace `retryStrategy: () => null` with a bounded backoff
(`Math.min(times * 200, 2000)`) so the client heals in the background. Keep
`maxRetriesPerRequest: 20` so individual commands still fail fast rather than hang.

**Verify:** with `REDIS_URL` pointed at a dead port, `connectRedis()` must still
return (API must boot); once Redis is reachable, `cacheClient.status` must reach
`ready`.

**Done:** cache operations work after a late Redis start.

---

## Task 2 — `isRedisConnected()` must report reality

**Files:** `apps/api/src/queues/index.ts`, `apps/api/src/workers/index.ts`,
`apps/api/src/workers/webhook-worker.ts`, `apps/api/src/workers/dlq-monitor.ts`

**Problem:** `isRedisConnected()` returns a module flag set when `REDIS_URL` is
merely *present* (`createOrSkip`), not when Redis is reachable. `/api/ready` and
`/api/diagnostics/email` therefore report healthy with Redis down. Confirmed live:
27 Redis clients from the boot-time process while `/api/health` happily returned
`{"status":"ok"}`.

**Action:**
- `isRedisConnected()` → true only when the shared `bullConnection` is `ready`.
- Add `isRedisConfigured()` (REDIS_URL present) and gate **worker registration** on
  it, so workers still attach when Redis returns later (the behaviour that let the
  boot-time API recover — do not lose it).

**Verify:** `/api/ready` returns 503 `degraded` with Redis down and 200 with Redis
up; workers still register when Redis is absent at boot.

**Done:** readiness reflects true liveness; workers remain late-attaching.

---

## Task 3 — Create the missing `notification_preferences` table

**Files:** `apps/api/src/db/migrations/` (generated), `apps/api/src/db/schema.ts`
(source of truth, already declares the table)

**Problem:** `notificationPreferences` is declared in the schema but **no migration
ever created it** — the journal ends at `0033_add_rate_cards` and no `.sql` file
mentions the table. Reproduced live: `relation "notification_preferences" does not
exist` → `notification pref check failed, sending anyway`, so customer preferences
are ignored on every send.

**Action:** generate the migration with `drizzle-kit generate` (not hand-written) so
the SQL, journal entry and snapshot stay consistent. Confirm the diff contains only
this table. Apply it, and reconcile RLS with the other tenant tables if the policy
file enumerates tables explicitly.

**Verify:** `SELECT * FROM notification_preferences` succeeds; the worker no longer
logs the pref-check error; `/api/notification-preferences` GET/PUT no longer 500s.

**Done:** table exists, migration is in the journal, preferences are honoured.

---

## Task 4 — In-app notifications must be idempotent

**Files:** `apps/api/src/workers/index.ts`, `apps/api/src/notifications/idempotency.ts`

**Problem:** the in-app insert sits outside any dedup guard. Reproduced: enqueuing
the same `eventId` twice produced two in-app rows (`3 → 4 → 5`) while email deduped.
A BullMQ retry therefore duplicates the customer's bell entry.

**Action:** extend the `checkAndSetIdempotency` channel union with `in_app` and guard
the insert/emit with it, mirroring the email branch.

**Verify:** enqueuing the same `eventId` twice yields exactly one in-app row.

**Done:** retries are idempotent across all three channels.

---

## Task 5 — Silent provider gaps must be visible

**Files:** `apps/api/src/workers/index.ts`, `apps/api/src/index.ts`

**Problem:** with `MSG91_*` unset, the entire WhatsApp branch is skipped with **no
log line anywhere** — nothing tells an operator that WhatsApp is not being sent.

**Action:**
- Log one clear warning per process when a notification is skipped because WhatsApp
  is unconfigured.
- `/api/diagnostics/email` reports `whatsapp.configured`.

**Verify:** the warning appears once on a notification with a customer phone and
unconfigured MSG91; diagnostics reports `whatsapp.configured: false`.

**Done:** an operator can see WhatsApp is off from logs and diagnostics.

---

## Out of scope (recorded, not fixed)

- `ZEPTOMAIL_API_KEY || ZEPTOMAIL_PASS` fallback (`email/provider.ts:15`) — setting
  only `ZEPTOMAIL_PASS` can select the HTTP API branch with an SMTP password as the
  key. Deferred: changing the send path is riskier than this task's remit.
- Delivery log (`notification_delivery`) — a separate design (admin #16/#18).
- `routes/notifications.ts` list builds `total` by selecting every id row.

## Gates

- `pnpm --filter api test` (vitest) must stay green.
- Type check the touched files.
- Loose verification scripts deleted before completion.
