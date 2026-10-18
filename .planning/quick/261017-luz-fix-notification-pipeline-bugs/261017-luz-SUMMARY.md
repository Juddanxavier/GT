---
quick_id: 261017-luz
slug: fix-notification-pipeline-bugs
status: complete
date: 2026-10-17
---

# Quick Task 261017-luz — Summary

All five defects found during the notification end-to-end exercise are fixed and
each was verified by reproducing the failure first, then re-running it.

Code is applied but **uncommitted** (standing instruction; the tree carries an
unrelated admin retheme). Only the planning artifacts are committed.

## Verification at a glance

| Gate | Result |
|---|---|
| `vitest run` (apps/api) | **453 passed, 7 skipped, 0 failed** (25 files) |
| `tsc --noEmit` | 54 errors — identical to the pre-task baseline, **none** in touched files |

Before the fixes, 6 test files could not even start. Those were caused by this
task's own rename (see Task 2) — test mocks still stubbed `isRedisConnected`, so
worker modules threw at import. With the mocks updated, all 25 files run.

---

## Task 1 — Cache client survives a Redis outage

`apps/api/src/redis.ts`: this took **two** changes, because the first one caused
an outage (see below).

1. Replaced `retryStrategy: () => null` with a bounded backoff
   (`Math.min(times * 200, 2000)`) so the client reconnects after a boot-time
   Redis outage.
2. Added `enableOfflineQueue: false`.

Step 2 is not optional. With the offline queue left at its default `true`, the
reconnect strategy makes every command **wait** for the reconnection instead of
failing. `globalRateLimit` (`middleware/rate-limit.ts:69`) calls
`await cacheClient.incr()` on every request, so with Redis unreachable every
request parked there and hung — the admin dashboard died with
`Failed to load dashboard`. The original `retryStrategy: () => null` had been
load-bearing precisely because it made those calls reject instantly and fall
through the middleware's `catch`, which fails open.

The two settings together give the behaviour actually wanted: commands fail fast
while Redis is down (measured 0 ms), and the client still heals when Redis
returns (measured 3 s, 28 clients reattached).

### Regression and correction (2026-10-17)

The first version of this task shipped only step 1 and claimed
`maxRetriesPerRequest: 20` kept commands fail-fast. That was wrong — it bounds
retries, it does not prevent queueing. The fault surfaced when the Docker daemon
died and Redis became unreachable: `/api/dashboard/stats` timed out at 12 s+.
Fixed with step 2; re-verified with Redis down (0 ms reject, no hang) and Redis
restored (heal to `ready` in 3 s).

**Before:** a boot-time Redis outage left the cache client dead forever, so
`checkAndSetIdempotency` threw, the error was swallowed, and the same event
produced duplicate emails.

**Proof (isolated Redis on :6380, initially down):**

```
connectRedis() returned after 30ms          <- boot does not hang
status after boot  : reconnecting           <- truthful
cache client reached ready after 8092ms     <- healed once Redis appeared
dedup call 1 (expect false): false
dedup call 2 (expect true) : true
```

## Task 2 — `isRedisConnected()` reports reality

`queues/index.ts`: `isRedisConnected()` now returns true only when the shared
BullMQ connection is `ready`. Added `isRedisConfigured()` (REDIS_URL present) and
moved **worker registration** onto it, so workers still attach when Redis arrives
later — the recovery behaviour that let the boot-time API catch up. Updated
`workers/index.ts`, `workers/webhook-worker.ts`, `workers/dlq-monitor.ts`.

**Proof:** `isRedisConfigured: true / isRedisConnected: true` with Redis up; the
heal test above showed status `reconnecting` while Redis was down.

**Test mocks updated** (this was required, not incidental): `webhook-worker.test.ts`,
`worker-logging.test.ts`, `retrack.test.ts`, `logging-guard.test.ts`,
`routes/integration.test.ts`.

## Task 3 — `notification_preferences` now exists

Added `apps/api/src/db/migrations/0034_add_notification_preferences.sql` and its
journal entry (hand-written, matching the repo's convention — `db:generate` is
unusable here because only a stale `0000_snapshot.json` exists and the tool cannot
tell whether `audit_log` is new or renamed). No RLS change needed: the RLS
migration covers only `tenant`, `branch`, `tenant_domain`, `user`.

**Proof (real preference round-trip on a real customer):**

```
migrations applied
table present: true
column count: 11 (expect 11)
upsert -> generalEmail: false (expect false)
read back -> generalEmail: false (expect false)
gate general  -> false (expect false)
gate delivery -> true (expect true)
```

Previously this logged `relation "notification_preferences" does not exist` and
`notification pref check failed, sending anyway` on every send.

## Task 4 — In-app notifications are idempotent

Extended the `checkAndSetIdempotency` channel union with `in_app` and guarded the
insert/emit in `workers/index.ts`, mirroring the email branch.

**Proof (same `eventId` enqueued twice, isolated on Redis db 5):**

```
in-app rows: 0 -> 1 -> 1   (duplicate added 0)
email jobs : 0 -> 1 -> 1   (duplicate added 0)
INFO skipping duplicate in-app notification
INFO skipping duplicate email
```

## Task 5 — Silent provider gaps are visible

`workers/index.ts` logs one warning per process when WhatsApp is skipped because
MSG91 is unconfigured. `/api/diagnostics/email` now reports `whatsapp.configured`.

**Proof:** `WARN whatsapp not configured (MSG91_AUTH_KEY / MSG91_WHATSAPP_SENDER
unset) — WhatsApp notifications are being skipped`, emitted exactly once.

---

## Recorded, deliberately not fixed

- `ZEPTOMAIL_API_KEY || ZEPTOMAIL_PASS` (`email/provider.ts:15`) — setting only
  `ZEPTOMAIL_PASS` selects the HTTP API branch and sends an SMTP password as the
  API key. Changing the send path is riskier than this task's remit.
- Delivery log (`notification_delivery`) — separate design, admin #16/#18.
- `routes/notifications.ts` builds `total` by selecting every id row.

## Environment notes

- Redis (`gt-redis-1`) left running, as requested. Mailpit removed.
- Applying on the next API restart: the migration is already applied to the shared
  DB by this task, so a plain restart is a no-op.
- Side effect of Redis being up: the archive cron (3 AM IST) and 2-hour retrack
  cron are armed. Only **1** shipment currently qualifies for archive; the run at
  the API's boot already archived 6.

## Files

Code (uncommitted):
`apps/api/src/redis.ts`, `apps/api/src/queues/index.ts`,
`apps/api/src/workers/index.ts`, `apps/api/src/workers/webhook-worker.ts`,
`apps/api/src/workers/dlq-monitor.ts`, `apps/api/src/notifications/idempotency.ts`,
`apps/api/src/index.ts`, `apps/api/src/db/migrations/meta/_journal.json`,
`apps/api/src/db/migrations/0034_add_notification_preferences.sql` (new),
`apps/api/src/workers/webhook-worker.test.ts`,
`apps/api/src/workers/worker-logging.test.ts`,
`apps/api/src/workers/retrack.test.ts`, `apps/api/src/logging-guard.test.ts`,
`apps/api/src/routes/integration.test.ts`
