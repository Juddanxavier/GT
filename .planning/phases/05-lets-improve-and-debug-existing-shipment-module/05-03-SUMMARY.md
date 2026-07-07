---
phase: 05-lets-improve-and-debug-existing-shipment-module
plan: 03
type: execute
subsystem: api
tags: [webhook, bullmq, queue, worker, lru-cache, cooldown, rate-limit]
requires: []
provides: [queue-based-webhook, lru-fallback-cooldown]
affects: [webhook handler, notification pipeline, Redis resilience]
tech-stack:
  added: []
  patterns:
    - "BullMQ queue with 3 retry attempts + exponential backoff + DLG"
    - "In-memory LRU fallback cooldown when Redis unavailable"
key-files:
  created:
    - apps/api/src/workers/webhook-worker.ts
  modified:
    - apps/api/src/queues/index.ts
    - apps/api/src/routes/webhooks.ts
    - apps/api/src/workers/index.ts
    - apps/api/src/notifications/service.ts
    - apps/api/src/routes/shipments.ts
decisions:
  - "D-13: In-memory LRU fallback cooldown (10000 entries) when Redis unavailable"
  - "D-14: Webhook handler enqueues raw payload to BullMQ queue. Worker processes async."
  - "D-15: POST /api/shipments/:id/track 60s rate limit confirmed adequate"
metrics:
  duration: ~3m
  completed: "2026-07-07"
---

# Phase 05 Plan 03: Webhook Queue + LRU Fallback

**One-liner:** Converted 17TRACK webhook handler from inline processing to BullMQ queue-based architecture with 3-retry/DLQ and added in-memory LRU fallback cooldown for Redis resilience.

## Summary

### Task 1: Enqueue webhook payloads to BullMQ queue with worker (D-14)

**Status:** Complete
**Commit:** `3bd60b4`

**Changes:**

1. **`apps/api/src/queues/index.ts`** — Added `webhookQueue` (BullMQ queue, name `webhook-events`) with:
   - 3 retry attempts with exponential backoff (2s base delay)
   - 7-day retention on complete, 30-day on fail for DLQ inspection
   - Registered in the `queues` array for Bull Board dashboard

2. **`apps/api/src/routes/webhooks.ts`** — Simplified handler:
   - Kept: HMAC signature verification (verifies provider name + signature)
   - Replaced: Inline `processWebhook()` → `insertEvents()` → `notifyTrackingEvents()` with a single `webhookQueue.add('webhook-event', {...})`
   - Returns 200 immediately after enqueue — processing is async via worker
   - Returns 503 if Redis/BullMQ unavailable (graceful degradation)

3. **`apps/api/src/workers/webhook-worker.ts`** — Created new worker:
   - Consumes from `webhook-events` queue
   - Calls `provider.processWebhook(body)` to parse normalized events
   - Looks up shipment by tracking number via DB query
   - Handles `shipment_not_found` gracefully (logs, skips — 17TRACK may send webhook before local creation)
   - Calls `insertEvents()` (ON CONFLICT DO NOTHING dedup)
   - If new events inserted: updates shipment status, calls `notifyTrackingEvents()`, emits `dashboard:update` via Socket.IO
   - Concurrency: 5, maxStalledCount: 3
   - Auto-stops via `stopWebhookWorker()` export

4. **`apps/api/src/workers/index.ts`** — Added `import './webhook-worker'` so the worker starts during `await import('./workers/index.js')` in the API entry point

### Task 2: In-memory LRU fallback cooldown + confirm 60s rate limit (D-13, D-15)

**Status:** Complete
**Commit:** `d92fe46` (alongside types refactor)

**Changes:**

1. **`apps/api/src/notifications/service.ts`** — Added:
   - `SimpleLRU<K, V>` class with Map-based LRU implementation (access-order reordering, eviction on full)
   - `cooldownCache` singleton (10,000 entry capacity) shared across process lifetime
   - Modified `handleTrackingEvent()` cooldown check to:
     - Try Redis first (`SET NX EX 1800`)
     - On Redis error or null `cacheClient`: fall back to in-memory LRU
     - `setTimeout` cleanup removes entries after `COOLDOWN_SECONDS` (30 min)
   - `ponytail:` comment: LRU has no precise TTL — add `Map<key, expiry>` if needed

2. **`apps/api/src/routes/shipments.ts`** — Added D-15 comment confirming 60s rate limit on `POST /:id/track` is adequate

## Verification

| Check | Result |
|-------|--------|
| `webhooks.ts` uses `webhookQueue.add()` | ✅ `w.includes('webhookQueue.add')` |
| `queues/index.ts` exports `webhook-events` queue | ✅ `q.includes('webhook-events')` |
| `workers/webhook-worker.ts` exists | ✅ File exists |
| `service.ts` has SimpleLRU / cooldownCache | ✅ `s.includes('cooldownCache')` |
| D-15 comment on shipments.ts | ✅ `D-15 — confirmed adequate` |
| `pnpm check-types` (api) | Pre-existing errors only (e2e test, unrelated type issues) |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Rule 2 — Accidental commit scope

Task 2 changes (SimpleLRU, D-15 comment) were committed alongside the `@repo/types` refactor in `d92fe46` rather than as a separate `feat(05-03)` commit. This occurred because both the types-refactor and Task 2 touched `service.ts` and `shipments.ts`. No functionality was lost.

## Known Stubs

None — all changes are complete wiring with no placeholder values flowing to UI.

## Threat Surface Scan

No new threat flags — all changes operate within existing trust boundaries:
- Webhook handler still validates HMAC before enqueue (T-05-09 mitigation preserved)
- Worker operates within existing internal trust boundary (same as other BullMQ workers)
- LRU fallback is best-effort (T-05-11 accepted risk — restart resets cooldown, one duplicate per key)

## Self-Check: PASSED

- [x] `apps/api/src/workers/webhook-worker.ts` exists and exports `webhookWorker`
- [x] `apps/api/src/queues/index.ts` contains `webhookQueue` with 3 retry attempts
- [x] `apps/api/src/routes/webhooks.ts` enqueues via `webhookQueue.add()` instead of inline processing
- [x] `apps/api/src/notifications/service.ts` has `SimpleLRU` class and `cooldownCache` singleton
- [x] D-15 comment present on `POST /:id/track` rate limit line
