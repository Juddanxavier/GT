---
status: resolved
trigger: "lets test new shipment and shipment module and this is 878809797103 tracking code to test"
created: 2026-10-20T07:28:09Z
updated: 2026-10-20T07:38:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: Redis stopped, POST /api/shipments repeated, then Redis restored
expecting: fast 201 and an immediately queryable row
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: POST /api/shipments returns 201 within a second; the shipment row is committed even if background jobs cannot be queued.
actual: Request hangs for 60s, returns 500 "Internal server error: Gateway Timeout", and the shipment is missing from GET /api/shipments. The row (and invoice) appear later, after Redis becomes reachable, so a retry returns 409 "tracking number already exists".
errors: {"error":{"code":"INTERNAL_ERROR","message":"Internal server error: Gateway Timeout"}} at HTTP 500, time_total 60.01s.
reproduction: REDIS_URL set, Redis not listening on 6379, POST /api/shipments with a new tracking number.
started: Always (Redis was down from 06:52; the 06:53 shipment appeared at 07:00 when Redis was started).

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: 17TRACK API is slow or unreachable, so the synchronous tracking fallback hangs.
  evidence: register returned in 0.20s and getquota in 0.86s; after Redis came up the queued job completed 1.5s after creation.
  timestamp: 2026-10-20T07:01:00Z
- hypothesis: The shipment insert fails and rolls back.
  evidence: The row exists after the delayed commit (id ec399acb, createdAt 06:53:41) with labelCode and invoice; only the timing is wrong.
  timestamp: 2026-10-20T07:02:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T06:58:00Z
  checked: POST /api/shipments with Redis down
  found: 500 after exactly 60.01s, matching the Hono timeout(60000) middleware.
  implication: Something inside the handler never resolves.
- timestamp: 2026-10-20T07:00:30Z
  checked: shipment/notification/invoice rows after starting Redis
  found: The previously "failed" shipment was committed at 07:00:30 with labelCode, an invoice, and tracking events.
  implication: The handler was still alive past the 504; the insert was held inside the request transaction.
- timestamp: 2026-10-20T07:01:30Z
  checked: apps/api/src/queues/index.ts, apps/api/src/redis.ts, node_modules bullmq redis-connection.js
  found: Queues are created whenever REDIS_URL is set; producer options use maxRetriesPerRequest: null and BullMQ waits for the 'ready' event in waitUntilReady().
  implication: queue.add() has no upper bound when Redis is unreachable.
- timestamp: 2026-10-20T07:02:30Z
  checked: apps/api/src/services/shipment.ts createShipment()
  found: `await shipmentQueue.add('track', ...)` and the invoice add run inside the request handler, which is wrapped in the RLS transaction from runWithTenantContext().
  implication: A stuck add delays the commit; the timeout response and the eventual commit disagree.
- timestamp: 2026-10-20T07:36:00Z
  checked: POST /api/shipments with Redis shut down after the fix
  found: 201 in 0.85s, row queryable immediately, no invoice queued.
  implication: The producer fail-fast options reject add() before the timeout even fires.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: With REDIS_URL set but Redis down, BullMQ's producer connection waited indefinitely for a 'ready' event, so shipmentQueue.add() never settled; the request hit the 60s timeout while the insert stayed open in the request transaction and committed minutes later.
fix: Give producers a fail-fast connection (enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout 5s) and route every create-time add through enqueueJob(), which bounds the wait (3s default, ENQUEUE_TIMEOUT_MS), logs failures, and lets creation succeed; the 2-hourly retrack sweep covers shipments that were never queued. Startup repeatable registrations now wait for the shared connection's 'ready' event (so they survive a Redis outage at boot), and notification enqueue failures are caught instead of escaping as unhandled rejections.
verification: Redis down -> POST /api/shipments 201 in 0.85s and the row is immediately queryable; Redis up -> 201 in 0.55s with tracking/invoice jobs; archive + retrack repeatables present in Redis after restart; unit tests cover success, timeout, rejection, and no-queue paths.
files_changed:
  - apps/api/src/queues/enqueue.ts (new)
  - apps/api/src/queues/enqueue.test.ts (new)
  - apps/api/src/queues/index.ts
  - apps/api/src/redis.ts
  - apps/api/src/services/shipment.ts
  - apps/api/src/notifications/service.ts
  - apps/api/src/workers/index.ts
