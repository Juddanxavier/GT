# Plan 03-01: Infrastructure Backbone

**Phase**: 3 — Infrastructure Backbone
**Goal**: Redis, BullMQ, Socket.IO, Sentry, rate limiting operational and tenant-aware
**Depends on**: Phase 2 (auth, tenant resolver, DB schema)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-05

## Success Criteria

1. BullMQ workers connect to Upstash Redis and process jobs with tenant context propagation
2. Redis cache stores/retrieves values with tenant-prefixed keys (`t:{tenantId}:`)
3. Socket.IO server accepts connections and broadcasts to tenant-scoped rooms
4. Sentry captures errors with `tenantId` tag on every event
5. Better Auth rate limiting enabled for auth endpoints

## Steps

### Step 1 — Redis Connection

**Files**:
- `apps/api/src/redis.ts` — IORedis client (two connections: BullMQ + cache)
- `.env` — Add `UPSTASH_REDIS_URL`

Install: `pnpm --filter api add ioredis`
Install dev: `pnpm --filter api add -D @types/ioredis`

### Step 2 — BullMQ Queues + Workers + Dashboard

**Files**:
- `apps/api/src/queues/index.ts` — Queue definitions (tracking, notification, email, pdf)
- `apps/api/src/workers/index.ts` — Worker scaffolding (processors are stubs for now)
- `apps/api/src/index.ts` — Mount Workbench dashboard

Install: `pnpm --filter api add bullmq @getworkbench/hono`

### Step 3 — Redis Cache Layer

**Files**:
- `apps/api/src/cache.ts` — Tenant-prefixed cache utility (get/set/del with `t:{tenantId}:` prefix)
- `apps/api/src/middleware/tenant.ts` — Replace `domainCache` Map with Redis-based cache

### Step 4 — Socket.IO + Redis Adapter

**Files**:
- `apps/api/src/realtime.ts` — Socket.IO server setup, Redis adapter, tenant room helpers
- `apps/api/src/index.ts` — Attach Socket.IO to HTTP server

Install: `pnpm --filter api add socket.io @socket.io/redis-adapter`
Install dev: `pnpm --filter api add -D @types/socket.io`

### Step 5 — Sentry

**Files**:
- `apps/api/src/instrument.ts` — Sentry init (imported first)
- `apps/api/src/index.ts` — Add `sentry()` middleware
- `apps/api/src/middleware/tenant.ts` — Add `Sentry.setTag('tenantId', ...)` after resolution

Install: `pnpm --filter api add @sentry/hono`

### Step 6 — Better Auth Rate Limiting

**Files**:
- `apps/api/src/auth.ts` — Enable `rateLimit` with custom rules (sign-in, sign-up, 2FA)

## Verification

```bash
pnpm dev
# Check:
# - BullMQ worker connects (console log)
# - GET http://localhost:3001/jobs (Workbench dashboard, auth-protected)
# - Socket.IO handshake (check via browser console)
# - Sentry test: trigger 404, check sentry.io
# - Rate limit: hit /api/auth/sign-in/email 4x fast → 429
```
