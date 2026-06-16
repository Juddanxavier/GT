# Plan 04-01: Admin Core CRUD

**Phase**: 4 — Admin Core CRUD
**Goal**: Staff can manage branches, customers, quotations, and shipments via API
**Depends on**: Phase 2 (auth, tenant), Phase 3 (Redis, Sentry, rate limit)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-06

## Steps

### Step 1 — DB Schema
Tables: customers, quotations, quote_items, shipments (in `apps/api/src/db/schema.ts`)

### Step 2 — Migration + RLS
- Drizzle generate → manual SQL migration file
- RLS policies for new tables
- Apply via `apps/api/src/db/apply-migration.ts`

### Step 3 — Zod Schemas
Request validation in `apps/api/src/validators/`

### Step 4 — API Routes
- `/api/branches` CRUD
- `/api/customers` CRUD
- `/api/quotations` CRUD + status transitions + convert-to-shipment
- `/api/shipments` CRUD

### Step 5 — Register routes in index.ts
