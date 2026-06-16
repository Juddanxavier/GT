# Plan 05-01: Tracking Engine (17TRACK Integration)

**Phase**: 5 — Tracking Engine
**Goal**: Shipments are automatically registered with 17TRACK on creation, tracking webhooks update statuses in real-time, and a 6-hour polling job catches missed events
**Depends on**: Phase 3 (BullMQ, Redis, Socket.IO), Phase 4 (shipment CRUD, DB schema)
**Requirements**: TRACK-01, TRACK-02, TRACK-05

## Design Decisions

- **Auto-register** on shipment creation — BullMQ job enqueued from POST /api/shipments
- **Carrier detection** — 17TRACK auto-detects carrier from tracking number (2100+ carriers). No carrier code needed in most cases.
- **Webhook first, poll backup** — 17TRACK pushes to POST /webhooks/17track; polling every 6h catches misses
- **Rate limiting** — 17TRACK API limit is 3 req/s. Separate queues for register (concurrency=1, rate-limited) vs webhook updates (concurrency=5, no external rate limit)
- **AvailableForPickup** — Folded into `in_transit` canonical status
- **Event history** — Upsert ALL events from `events[]` array on each webhook, not just latest. Dedup via unique constraint on `(trackingNo, time_utc, sub_status)`
- **Graceful degradation** — Registration failure does not block shipment creation. `trackingRegistered=false`, admin can retry with carrier code
- **Timeline** — On shipment detail page, below the read-only Card
- **Signature verification** — SHA256(rawBody + "/" + apiKey) compared to `sign` header

## Steps

### Step 1 — Environment Variables
Add to `.env`:
- `TRACK_API_KEY` — 17TRACK API token
- `TRACK_WEBHOOK_SECRET` — HMAC signing secret

### Step 2 — 17TRACK API Client
Create `apps/api/src/tracking/seventeen-track.ts`:
- `registerTracking(numbers: {number: string, carrier?: number}[])` — POST /track/v2.4/register
- `getTrackInfo(numbers: {number: string, carrier?: number}[])` — POST /track/v2.4/gettrackinfo
- `verifyWebhookSignature(signature: string, body: string, apiKey: string)` — SHA256 hex compare
- All calls go through rate-limited module

### Step 3 — Status Normalizer
Create `apps/api/src/tracking/normalizer.ts`:
- Map 17TRACK 9 main statuses to canonical: NotFound→pending, InfoReceived→info_received, InTransit→in_transit, Expired→expired, AvailableForPickup→in_transit, OutForDelivery→out_for_delivery, DeliveryFailure→failed_attempt, Delivered→delivered, Exception→exception
- Sub-statuses preserved in raw data but canonical mapping uses main status
- Unknown statuses default to `exception`

### Step 4 — Migration 0005
- Add subStatus (`varchar`), description (`text`) columns to `tracking_event` table definition
- Add unique constraint `(shipmentId, eventTime, subStatus)` for upsert dedup
- Generate Drizzle migration, apply to NeonDB

### Step 5 — Auto-Register on Shipment Create
- Modify `POST /api/shipments` route: after successful DB insert, enqueue to `tracking-register` queue
- Job payload: `{ shipmentId, trackingNo, tenantId }`
- Worker: call 17TRACK register, on success set `trackingRegistered=true`, `trackingCarrierCode=carrier`, emit Socket.IO `tracking:registered` event
- On error -18019903 (carrier not detected): log, leave `trackingRegistered=false`
- On error -18019901 (already registered): set `trackingRegistered=true`, proceed

### Step 6 — Webhook Endpoint
Create `POST /webhooks/17track` in `apps/api/src/routes/webhooks.ts`:
- Verify HMAC signature before any parsing
- Parse JSON body (`{ event, data: { accepted: [...], rejected: [...] } }`)
- Respond 200 OK immediately
- For each accepted item, enqueue to `tracking-update` queue
- Job payload: `{ trackingNo, carrier, tag, track_info }` — the full data blob
- Mount in index.ts **before** auth/tenant middleware (webhook is externally authenticated via signature)

### Step 7 — Tracking Worker (Update)
Create/fill `tracking-update` worker in `apps/api/src/workers/tracking-update.ts`:
- Receives full `track_info` from webhook or poller
- Resolve shipment via `trackingNo` (indexed)
- Idempotency: check Redis key `tracking:event:{trackingNo}:{event.time_utc}:{event.sub_status}` (24h TTL)
- Upsert all events from `providers[].events[]` into `tracking_events`
- Update `shipments.status` = canonical mapped status, `lastTrackedAt` = now
- Emit Socket.IO `tracking:update` to `tenant:{tenantId}` room with `{ shipmentId, status, location, eventTime }`

### Step 8 — Registration Worker
Create `apps/api/src/workers/tracking-register.ts`:
- Separate queue from update worker to avoid rate-limit head-of-line blocking
- Concurrency: 1 (respects 3 req/s 17TRACK limit)
- Calls register API, handles carrier detection errors
- Can optionally call getTrackInfo immediately after register to seed initial tracking_events

### Step 9 — Polling Fallback
Create `apps/api/src/tracking/poller.ts`:
- BullMQ repeatable job every 6 hours
- Query shipments where `trackingRegistered = true` AND (`lastTrackedAt IS NULL` OR `lastTrackedAt < now() - 6h` OR `status IN ('in_transit', 'info_received')`)
- Batch in groups of 40, call getTrackInfo
- Upsert results into same `tracking-update` worker queue (reuse the same processor)
- Rate-limited: 1 batch/second between groups

### Step 10 — Shipment Tracking Detail API
Add `GET /api/shipments/:id/tracking` route:
- Returns `trackingEvents` for shipment, ordered by `eventTime DESC`
- Also returns latest aggregated status
- Tenant-scoped

### Step 11 — Admin UI: Tracking Timeline
Update `apps/admin/app/(dashboard)/shipments/[id]/page.tsx`:
- Below the read-only Card, add tracking timeline section
- Vertical timeline: dot/marker per event, status badge, location, timestamp, description
- Group by carrier/provider if multiple carriers involved
- Show "Not registered with 17TRACK" state if `trackingRegistered = false` with a "Register" button (opens modal to pick carrier code from list)
- Show "Last synced: X ago" timestamp

### Step 12 — Admin UI: Real API Connection
- Connect shipments list page to real API (currently dummy data — 8 hardcoded shipments)
- Connect create modal to real API
- Add "Registered" badge/column
- Add `lastTrackedAt` display

## Files Created
- `apps/api/src/tracking/seventeen-track.ts` — 17TRACK API client
- `apps/api/src/tracking/normalizer.ts` — Status normalizer
- `apps/api/src/tracking/poller.ts` — 6-hour polling job
- `apps/api/src/routes/webhooks.ts` — Webhook endpoint
- `apps/api/src/workers/tracking-register.ts` — Registration worker
- `apps/api/src/workers/tracking-update.ts` — Update worker

## Files Modified
- `apps/api/src/index.ts` — register webhook route (before auth/tenant middleware)
- `apps/api/src/db/schema.ts` — add subStatus, description, unique constraint to tracking_event
- `apps/api/src/routes/shipments.ts` — enqueue register job on create, add /tracking sub-route
- `apps/api/src/queues/index.ts` — add tracking-register, tracking-update queues
- `apps/api/src/workers/index.ts` — import and start new workers
- `apps/api/src/realtime.ts` — add `emitToShipmentTenant` helper (emit to shipment's tenant room)
- `.env`, `.env.example` — add TRACK_API_KEY, TRACK_WEBHOOK_SECRET
- `apps/admin/app/(dashboard)/shipments/page.tsx` — connect real API
- `apps/admin/app/(dashboard)/shipments/[id]/page.tsx` — add tracking timeline

## End-to-End Flow

```
1. CREATE SHIPMENT
   Staff submits form → POST /api/shipments
     → DB insert (shipment exists, trackingRegistered=false)
     → Enqueue tracking-register job
     → Worker: POST /track/v2.4/register
       → Success: UPDATE shipment trackingRegistered=true, carrierCode
       → Fail (carrier unknown): leave trackingRegistered=false, admin retries later

2. WEBHOOK UPDATE
   17TRACK → POST /webhooks/17track
     → HMAC verify
     → 200 OK immediately
     → Enqueue tracking-update job
     → Worker: upsert all events[] → tracking_events, update shipment.status
     → Socket.IO emit → admin UI live update

3. POLLING BACKUP (every 6h)
   Repeatable job queries due shipments
     → POST /track/v2.4/getTrackInfo (batch of 40)
     → Enqueue tracking-update job per result
     → Same worker processes: upsert + status update
```
