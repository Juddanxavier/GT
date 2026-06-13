# Architecture: Multi-Tenant Shipment Tracking Platform

**Domain:** Multi-tenant SaaS logistics/shipment tracking
**Researched:** 2026-06-13
**Mode:** Ecosystem research (architecture dimension)
**Confidence:** HIGH (synthesized from current patterns + chosen tech stack)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Next.js Apps)                                 │
│                                                                                       │
│  ┌─────────────────────┐  ┌───────────────────────┐  ┌─────────────────────────┐     │
│  │  admin.brand.com    │  │  india.brand.com      │  │  srilanka.brand.com     │     │
│  │  (Admin Dashboard)  │  │  (India Customer      │  │  (Sri Lanka Customer    │     │
│  │  Staff/Superadmin   │  │   Portal)             │  │   Portal)               │     │
│  │  roles only         │  │  Customer accounts     │  │  Customer accounts      │     │
│  └──────────┬──────────┘  └──────────┬────────────┘  └────────────┬────────────┘     │
│             │                        │                            │                  │
│         fetch()                  fetch()                      fetch()               │
│         HTTPS                   HTTPS                         HTTPS                  │
└─────────────┼────────────────────────┼────────────────────────────┼──────────────────┘
              │                        │                            │
              ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER (Hono)                                     │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                      Tenant Resolver Middleware                                 │    │
│  │  - Subdomain -> X-Tenant-ID (portals: india.brand.com -> tenant="india")       │    │
│  │  - Header-based (admin: X-Tenant-ID header)                                   │    │
│  │  - JWT claim fallback (tenantId from session)                                 │    │
│  │  - Tenant context -> AsyncLocalStorage for downstream propagation              │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                      Auth Middleware (Better Auth)                              │    │
│  │  - Session validation + refresh                                                 │    │
│  │  - Google OAuth / email-password                                                 │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                      CASL Authorization Guard                                    │    │
│  │  - Permissions resolved per-request (tenant-scoped roles)                        │    │
│  │  - superadmin | tenant-admin | staff | customer                                   │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER (Hono Routers)                             │
│                                                                                       │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│  │  /api/auth   │ │ /api/    │ │ /api/    │ │ /api/    │ │ /api/shipments     │    │
│  │  (Better     │ │ tenants  │ │ customers│ │ quotes   │ │ /:id/track         │    │
│  │   Auth       │ │          │ │          │ │          │ │ (tracking status)   │    │
│  │   routes)    │ │          │ │          │ │          │ │                    │    │
│  └──────────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────────────┘    │
│                                                                                       │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐   │
│  │ /api/      │ │ /api/      │ │ /api/        │ │ /api/      │ │ /webhooks/    │   │
│  │ invoices   │ │ branches   │ │ notifications │ │ dashboard  │ │ 17track       │   │
│  │            │ │            │ │ (config)      │ │ (metrics)  │ │ (external)    │   │
│  └────────────┘ └────────────┘ └──────────────┘ └────────────┘ └───────────────┘   │
└──────────────────────────┬──────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│   DATA LAYER            │  │   INFRASTRUCTURE LAYER        │
│                         │  │                               │
│  ┌───────────────────┐  │  │  ┌────────────────────────┐   │
│  │  PostgreSQL        │  │  │  │  Redis                 │   │
│  │  Single database   │  │  │  │  - Cache (tenant-      │   │
│  │  tenantId on all   │  │  │  │    prefixed keys)      │   │
│  │  tenant-scoped     │  │  │  │  - BullMQ queue backend│   │
│  │  tables            │  │  │  │  - Socket.IO adapter   │   │
│  │                    │  │  │  └────────────────────────┘   │
│  │  Shared tables:    │  │  │                               │
│  │  - tenants         │  │  │  ┌────────────────────────┐   │
│  │  - users           │  │  │  │  BullMQ                │   │
│  │  - roles/permissions│  │  │  │  - Notification queue │   │
│  │                    │  │  │  │  - PDF generation queue│   │
│  │  Tenant-scoped:    │  │  │  │  - Tracking sync queue │   │
│  │  - shipments       │  │  │  │  - Webhook processing  │   │
│  │  - customers       │  │  │  └────────────────────────┘   │
│  │  - quotes          │  │  │                               │
│  │  - invoices        │  │  │  ┌────────────────────────┐   │
│  │  - notifications   │  │  │  │  Socket.IO             │   │
│  │  - branches        │  │  │  │  - Real-time tracking  │   │
│  │                    │  │  │  │  - Live status updates │   │
│  │  Drizzle ORM       │  │  │  │  - Room-per-shipment   │   │
│  │  - schema          │  │  │  └────────────────────────┘   │
│  │  - migrations      │  │  │                               │
│  │  - validators      │  │  │  ┌────────────────────────┐   │
│  └───────────────────┘  │  │  │  Sentry + OpenTelemetry │   │
│                         │  │  │  - tenantId-tagged spans│   │
│                         │  │  └────────────────────────┘   │
└─────────────────────────┘  └──────────────────────────────┘

EXTERNAL INTEGRATIONS:
  17TRACK API <---> Webhook listener --> BullMQ --> Tracking engine
  Resend (email) <---> Notification dispatcher
  MSG91 (WhatsApp) <---> Notification dispatcher
```

---

## 2. Component Boundaries and Responsibilities

### 2.1 Tenant Context Boundary

**This is the single most critical boundary in the system.** Every component downstream of the tenant resolver must operate within a known tenant context.

```
Request arrives
      |
      v
+---------------------------------------------+
| Tenant Resolver Middleware                   |
|                                              |
| Strategy (priority order):                   |
| 1. X-Tenant-ID header (admin app)           |
| 2. Subdomain extraction                     |
|    (india.brand.com -> "india")              |
| 3. JWT claim (session.user.tenantId)        |
|                                              |
| Output: tenantId + tenant config stored in   |
| AsyncLocalStorage / Hono c.set()            |
+---------------------------------------------+
      |
      v
+---------------------------------------------+
| Auth Middleware (Better Auth)                |
| Validates session against tenant context:    |
| - Is user.membership[tenantId] valid?       |
| - Does session match request tenant?        |
+---------------------------------------------+
      |
      v
+---------------------------------------------+
| CASL Authorization                          |
| - Build abilities using tenantId context    |
| - Resolve user's role within this tenant    |
| - Ability check on requested resource       |
+---------------------------------------------+
      |
      v
+---------------------------------------------+
| Route Handler                               |
| - Receives tenantId from context            |
| - Drizzle queries always filter:            |
|   where(eq(table.tenantId, tenantId))       |
+---------------------------------------------+
```

**Architectural rule:** No route handler, service, or query should ever _resolve_ the tenant on its own. Tenant is always injected by middleware. This prevents the "missing WHERE clause" data leak scenario (see PITFALLS.md).

### 2.2 Component Map

| Component | Responsibility | Communicates With | Tenant-Aware? |
|-----------|---------------|-------------------|:---:|
| **Tenant Resolver** | Identify tenant from request (subdomain/header/JWT) | AsyncLocalStorage, Hono context | N/A (it defines it) |
| **Auth Middleware** | Validate session, refresh tokens, enforce login | Better Auth + Drizzle DB | Yes - validates user belongs to resolved tenant |
| **CASL Guard** | Build user abilities, check permissions | @casl/ability (defined per request) | Yes - roles are tenant-scoped |
| **Shipment CRUD** | Create, update, list shipments (tenant-scoped) | PostgreSQL via Drizzle, 17TRACK for tracking | Yes |
| **Tracking Engine** | Poll 17TRACK API, receive webhooks, normalize statuses | 17TRACK API, Redis cache, BullMQ queue | Yes |
| **Notification Dispatcher** | Send email (Resend) / WhatsApp (MSG91) on status change | BullMQ worker, Resend API, MSG91 API | Yes - tenant-branded templates, sender numbers |
| **Real-Time Hub** | Push tracking status updates to connected clients | Socket.IO + Redis adapter | Yes - room-per-shipment + tenant verification |
| **PDF Generator** | Generate invoices, shipment reports via React PDF | BullMQ worker | Yes - uses tenant branding config |
| **Dashboard** | Compute key metrics (tenant-scoped: shipments, revenue, delivery rates) | PostgreSQL via Drizzle | Yes |
| **Branch Manager** | CRUD branches per organization/tenant | PostgreSQL via Drizzle | Yes |
| **Customer Manager** | CRUD customers (tenant-scoped) | PostgreSQL via Drizzle | Yes |
| **Quotation Manager** | CRUD quotes, respond to requests | PostgreSQL via Drizzle | Yes |
| **Invoice Manager** | Generate/manage invoices | PostgreSQL via Drizzle, PDF Generator | Yes |
| **Tenant Config** | Per-tenant settings (branding, locale, sender IDs, domains) | PostgreSQL (tenants table), Redis cache | Naturally |
| **Webhook Listener** | Receive 17TRACK push notifications, validate signatures | 17TRACK API (inbound), BullMQ | Yes - routes updates via tracking number -> tenant lookup |
| **Super Admin Views** | Cross-tenant queries (read-only), tenant management | PostgreSQL - bypasses tenant filter for superadmin | Yes - explicitly cross-tenant scope |

---

## 3. Data Flow Patterns

### 3.1 Standard Request Flow (User Action to Database)

```
User clicks "View my shipments"

Browser --GET /api/shipments--> Hono
                                  |
                          +-------+--------+
                          | Tenant Resolver |  <- Extracts tenantId from subdomain/header
                          | c.set("tenantId", "india")
                          +-------+--------+
                                  |
                          +-------+--------+
                          | Auth Middleware  |  <- Validates session, loads user
                          | Better Auth      |
                          +-------+--------+
                                  |
                          +-------+--------+
                          | CASL Ability     |  <- Builds permissions for user@tenant
                          | "can read Shipment"
                          +-------+--------+
                                  |
                          +-------+--------+
                          | Route Handler    |
                          | GET /api/shipments|
                          +-------+--------+
                                  |
                          +-------+--------+
                          | Drizzle Query    |
                          | .where(          |
                          |   eq(            |
                          |    shipments.    |
                          |     tenantId,    |
                          |    tenantId      |
                          |   )              |
                          | )                |
                          +-------+--------+
                                  |
                          +-------+--------+
                          |  PostgreSQL      |
                          +-----------------+
```

### 3.2 Tracking Update Flow (17TRACK Webhook to Notification)

```
17TRACK API --POST /webhooks/17track--> Hono
                                           |
                                +----------+----------+
                                | Webhook Listener      |
                                | - Verify signature    |
                                | - Validate payload    |
                                +----------+----------+
                                           |
                                +----------+----------+
                                | BullMQ: Enqueue Job  |
                                | Queue: "tracking-    |
                                | updates"             |
                                | Job: {               |
                                |   trackingNumber,    |
                                |   carrierCode,       |
                                |   newStatus,         |
                                |   timestamp,         |
                                |   rawPayload         |
                                | }                    |
                                +----------+----------+
                                           |
                                +----------+----------+
                                | BullMQ Worker:       |
                                | Tracking Processor   |
                                |                      |
                                | 1. Resolve shipment  |
                                |    -> tenantId        |
                                | 2. Update status in  |
                                |    PostgreSQL         |
                                | 3. Check if status   |
                                |    changed           |
                                | 4. If yes:           |
                                |    a. Enqueue        |
                                |       notification   |
                                |    b. Emit Socket.IO |
                                |       event          |
                                +----------+----------+
                                           |
                    +----------------------+----------------------+
                    v                      v                      v
           +----------------+   +------------------+   +------------------+
           | BullMQ:        |   | Socket.IO emit   |   | PostgreSQL:      |
           | Notification   |   | room:             |   | Update shipment  |
           | Queue          |   | "shipment:{id}"   |   | status field     |
           |                |   | event:            |   |                  |
           | {              |   | "tracking:update" |   | UPDATE shipments |
           |   type,        |   | payload: {        |   | SET status = ..  |
           |   channel,     |   |   status,         |   | WHERE id = ..    |
           |   tenantId,    |   |   timestamp,      |   |                  |
           |   template,    |   |   location        |   |                  |
           |   recipient    |   | }                 |   |                  |
           | }              |   |                   |   |                  |
           +--------+-------+   +------------------+   +------------------+
                    |
        +-----------+-----------+
        v                       v
+--------------+       +--------------+
| Resend API   |       | MSG91 API    |
| (Email)      |       | (WhatsApp)   |
|              |       |              |
| React Email  |       | Tenant-      |
| template +   |       | scoped       |
| tenant-      |       | sender ID    |
| branded      |       |              |
| from: addr   |       |              |
+--------------+       +--------------+
        |                       |
        v                       v
  Customer Email          Customer WhatsApp
```

### 3.3 Real-Time Update Flow (Socket.IO)

```
Client connects to Socket.IO (via Next.js app)

1. Connection established:
   Client --> Socket.IO server
         |  -- Initial auth: { token, tenantId }
         |
         v
   Socket.IO middleware validates:
   - JWT token
   - tenantId matches token's tenant
   - User has access to shipment

2. Room subscription:
   Client --> { event: "subscribe:shipment", data: { shipmentId } }
         |
         v
   Server validates:
   - shipmentId exists
   - tenantId matches shipment's tenantId
   - CASL: can user read this shipment?
   -> If yes, client joins room "shipment:{shipmentId}"

3. Status push (from Tracking Processor worker):
   Server --> room "shipment:{shipmentId}"
         |    event: "tracking:update"
         |    payload: { status, timestamp, location, ... }
         |
         v
   All connected clients in that room receive update
   -> UI updates without page refresh
```

### 3.4 Cross-App Flow (Super Admin View)

```
Super Admin in admin app wants to see all shipments across tenants

1. Super Admin logs into admin.brand.com
2. Tenant Resolver extracts tenantId from header
   -> If superadmin role, MAY override with X-Tenant-ID header
   or omit to see all tenants
3. CASL: superadmin role has "manage all tenants" ability
4. Route handler detects superadmin + no tenantId filter
5. Query runs WITHOUT tenantId WHERE clause
   -> Returns shipments across all tenants (tagged with tenantId)
   -> UI groups by tenant

IMPORTANT: No route ever runs without explicit tenant context.
For superadmin cross-tenant views, the context is "all tenants" -
an intentional bypass gated by CASL, not an absent filter.
```

---

## 4. Database Schema Architecture

### 4.1 Shared Tables (cross-tenant reference data)

```sql
-- Tenant registry
tenants (
  id            TEXT PRIMARY KEY,    -- "india", "srilanka"
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,         -- used in subdomain resolution
  domain        TEXT,                -- custom domain
  logo_url      TEXT,
  locale        TEXT DEFAULT 'en',
  timezone      TEXT DEFAULT 'UTC',
  sender_email  TEXT,                -- from: address for Resend
  sender_phone  TEXT,                -- sender number for MSG91
  config        JSONB,              -- feature flags, branding overrides
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- System-wide user identities (one user can belong to multiple tenants)
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-scoped role assignments
-- A user can have different roles in different tenants
tenant_memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id     TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('superadmin', 'tenant-admin', 'staff', 'customer')),
  branch_id     UUID,               -- NULL for tenant-wide roles
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, role)
);

-- CASL permissions (roles to permissions mapping)
role_permissions (
  role          TEXT NOT NULL,
  action        TEXT NOT NULL,       -- create, read, update, delete, manage
  subject       TEXT NOT NULL,       -- Shipment, Customer, Quote, Invoice, Branch, Dashboard
  conditions    JSONB,              -- Additional CASL conditions (e.g., own records only)
  PRIMARY KEY (role, action, subject)
);
```

### 4.2 Tenant-Scoped Tables

```sql
-- All tenant-scoped tables share this pattern:
-- PRIMARY KEY includes tenantId
-- EVERY query in application code does:
--   where(eq(table.tenantId, currentTenantId))

shipments (
  id                UUID DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL REFERENCES tenants(id),
  tracking_number   TEXT NOT NULL,
  carrier_code      TEXT,
  carrier_name      TEXT,
  origin            TEXT,
  destination       TEXT,
  status            TEXT DEFAULT 'pending',  -- normalized status
  estimated_delivery TIMESTAMPTZ,
  actual_delivery   TIMESTAMPTZ,
  customer_id       UUID,
  metadata          JSONB,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

CREATE INDEX idx_shipments_tenant_status ON shipments(tenant_id, status);
CREATE INDEX idx_shipments_tracking ON shipments(tenant_id, tracking_number);

tracking_events (
  id            UUID DEFAULT gen_random_uuid(),
  shipment_id   UUID NOT NULL,
  tenant_id     TEXT NOT NULL,       -- denormalized for partition safety
  status        TEXT NOT NULL,
  location      TEXT,
  timestamp     TIMESTAMPTZ NOT NULL,
  raw_data      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (shipment_id, tenant_id) REFERENCES shipments(id, tenant_id)
);

customers (
  id            UUID DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

quotes (
  id            UUID DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  customer_id   UUID,
  origin        TEXT NOT NULL,
  destination   TEXT NOT NULL,
  weight        DECIMAL,
  dimensions    JSONB,
  service_type  TEXT,
  amount        DECIMAL,
  currency      TEXT DEFAULT 'USD',
  status        TEXT DEFAULT 'pending',
  valid_until   TIMESTAMPTZ,
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

invoices (
  id            UUID DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  shipment_id   UUID,
  customer_id   UUID,
  amount        DECIMAL NOT NULL,
  currency      TEXT DEFAULT 'USD',
  status        TEXT DEFAULT 'draft',
  pdf_url       TEXT,
  due_date      TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

branches (
  id            UUID DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  manager_id    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);
```

### 4.3 Normalized Shipment Status Taxonomy

One canonical status set used across the entire system - stored in DB, used in CASL conditions, displayed in UI, sent in notifications:

| Status | Meaning | Notification Trigger? |
|--------|---------|:---:|
| `pending` | Created, not yet submitted to carrier | No |
| `info_received` | Carrier notified, waiting for pickup | Yes |
| `in_transit` | Package moving through network | Yes |
| `out_for_delivery` | On last-mile vehicle | Yes |
| `delivered` | Successfully delivered | Yes |
| `failed_attempt` | Delivery attempted, no one home | Yes |
| `exception` | Customs hold, damaged, address issue | Yes |
| `returned` | Being sent back to sender | Yes |
| `expired` | Tracking stopped updating past ETA | Yes |
| `cancelled` | Shipment cancelled | No |

**Why a single taxonomy matters:** Without it, every downstream consumer (notification templates, dashboard widgets, Socket.IO events) would need carrier-specific mappings. The tracking engine normalizes carrier statuses to this set once, at ingestion time.

---

## 5. Multi-Tenant Isolation Strategy

### 5.1 Chosen Model: Shared Database, Shared Schema ("Pool" model)

This is the correct choice for this project's scale (2 tenants, growing to maybe 5-10). The architectural burden is entirely on **query discipline**:

| Concern | Mitigation |
|---------|-----------|
| Missing WHERE clause | Tenant middleware + repository helpers. Drizzle queries go through a `withTenant(db, tenantId)` wrapper that auto-injects `.where(eq(table.tenantId, tenantId))` |
| Noisy neighbor | Low risk at 2-10 tenants. If one tenant grows large, add DB read replicas. |
| Per-tenant backup | Table-level with tenantId filter. Or pg_dump with WHERE clause. |
| Cross-tenant leak | CASL + middleware + repository wrapper = 3 layers of defense |

### 5.2 Three-Layer Tenant Isolation

```
Layer 1: Middleware Enforcement (prevents wrong context)
  - TenantResolver middleware extracts + validates tenantId
  - Auth middleware verifies user has membership in that tenant
  - If either fails -> 401/403, no data reaches handler

Layer 2: Query Enforcement (prevents missing WHERE)
  - All tenant-scoped queries go through a repository wrapper
  - Example: withTenant(db, tenantId) auto-injects tenantId filter
  - This makes missing tenantId a TYPE ERROR at the data access layer

Layer 3: CASL Authorization (prevents unauthorized access)
  - Even if tenantId is correctly injected, CASL enforces
    that the user's role permits the operation
  - Superadmin bypasses tenantId filter but this is EXPLICIT
    (gated by CASL ability "manage all tenants")
```

### 5.3 Tenant Resolution Strategies by App

| App | Strategy | Example |
|-----|----------|---------|
| **Admin** (`admin.brand.com`) | X-Tenant-ID header (set by proxy or app logic) | `X-Tenant-ID: india` |
| **India Portal** (`india.brand.com`) | Subdomain extraction | `india.brand.com` -> tenantId = "india" |
| **Sri Lanka Portal** (`srilanka.brand.com`) | Subdomain extraction | `srilanka.brand.com` -> tenantId = "srilanka" |
| **Super Admin** (in admin app) | Header optional - omit for cross-tenant | No header -> admin grants self "all tenants" scope |
| **Webhooks** (from 17TRACK) | Lookup by tracking number -> resolve tenant | Tracking number belongs to tenant "india" |

---

## 6. CASL Permission Architecture

### 6.1 Role Hierarchy

```text
superadmin (cross-tenant)
  |
  +-- Can manage: all tenants, all shipments, all customers
  +-- Can: provision tenants, assign tenant-admins
  +-- Scope: ALL (no tenantId filter)

tenant-admin (per tenant)
  |
  +-- Can manage: all shipments, customers, staff, branches under their tenant
  +-- Can: assign staff roles, view all data
  +-- Scope: tenantId = own

staff (per tenant, optionally per branch)
  |
  +-- Can: read/write shipments, customers, quotes
  +-- May be further restricted to a branch
  +-- Scope: tenantId = own (+ optionally branchId)

customer (per tenant, self-service only)
  |
  +-- Can: read OWN shipments, read OWN quotes
  +-- Can: request quotes (create)
  +-- Scope: tenantId = own AND customerId = self
```

### 6.2 CASL Ability Builder Pattern

```typescript
// packages/auth/src/abilities.ts
import { defineAbility } from '@casl/ability';

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Subjects = 'Shipment' | 'Customer' | 'Quote' | 'Invoice' | 'Branch' | 'Dashboard' | 'all';

export function defineAbilitiesFor(user: { role: string; customerId?: string; branchId?: string }, tenantId: string) {
  return defineAbility((can, cannot) => {
    if (user.role === 'customer') {
      can('read', 'Shipment', { tenantId, customerId: user.customerId });
      can('update', 'Shipment', ['customerId'], { tenantId, customerId: user.customerId });
      cannot('create', 'Shipment');
      cannot('delete', 'Shipment');
      can('read', 'Quote', { tenantId, customerId: user.customerId });
      can('create', 'Quote', { tenantId });
    }

    if (user.role === 'staff') {
      can('manage', 'Shipment', { tenantId });
      can('manage', 'Customer', { tenantId });
      if (user.branchId) {
        can('read', 'Shipment', { tenantId, branchId: user.branchId });
      }
    }

    if (user.role === 'tenant-admin') {
      can('manage', 'all', { tenantId });
      can('manage', 'Branch', { tenantId });
      can('manage', 'Staff', { tenantId });
    }

    if (user.role === 'superadmin') {
      can('manage', 'all'); // No tenantId restriction
    }
  });
}
```

### 6.3 Guard Application in Route Handlers

```typescript
// In route handler
import { subject } from '@casl/ability';

app.get('/api/shipments/:id', async (c) => {
  const { tenantId, user } = c.get('context');
  const ability = defineAbilitiesFor(user, tenantId);

  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, c.req.param('id'))
  });

  if (!shipment) return c.json({ error: 'Not found' }, 404);

  // CASL check - even if tenantId leaked, this catches it
  if (!ability.can('read', subject('Shipment', shipment))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json(shipment);
});
```

---

## 7. Infrastructure Components

### 7.1 Redis Usage

| Purpose | Key Pattern | TTL | Notes |
|---------|-------------|:---:|-------|
| Session store (Better Auth) | `session:{token}` | Session lifetime | Handled by Better Auth |
| Cache: tenant config | `tenant:{id}:config` | 1 hour | Branding, locale, sender IDs |
| Cache: carrier list | `carriers:list` | 24 hours | 17TRACK carrier list |
| Job queue (BullMQ) | `bull:{queueName}:*` | N/A | Notification, PDF, tracking sync |
| Socket.IO adapter | `socket.io:*` | N/A | Pub/sub for real-time across processes |
| Rate limiting | `ratelimit:{tenantId}:{ip}` | Sliding window | Per-tenant rate limits |

**Tenant-prefixed keys** prevent key collision across tenants and make Redis-level ACLs possible for future isolation.

### 7.2 BullMQ Queue Architecture

```text
+-----------------------------------------------------------+
|                    BullMQ Queues                            |
|                                                             |
|  +------------------+  +------------------+  +------------+ |
|  | tracking-sync    |  | notifications    |  | pdf-gen    | |
|  +------------------+  +------------------+  +------------+ |
|  | Job: Process     |  | Job: Send        |  | Job:       | |
|  | 17TRACK webhook/ |  | email OR         |  | Generate   | |
|  | poll update      |  | WhatsApp         |  | invoice    | |
|  +------------------+  +------------------+  | PDF        | |
|  | Concurrency: 5   |  | Concurrency: 3   |  +------------+ |
|  | Retry: 3         |  | Retry: 3         |  | Concurrency:2|
|  +------------------+  +------------------+  | Retry: 2   | |
|                                                +------------+ |
+-----------------------------------------------------------+
```

Why separate queues:
- **Isolation**: A PDF-generation backlog should not delay tracking updates
- **Concurrency control**: Each queue has appropriate concurrency settings
- **Monitoring**: Separate failure metrics per concern in Sentry/Dashboard

### 7.3 Socket.IO Architecture

```text
Client                          Socket.IO Server          BullMQ Worker
  |                                    |                      |
  |-- connect({ auth: {token} }) ----->                      |
  |<-- connected ----------------------|                      |
  |-- subscribe:shipment:{id} -------->                      |
  |<-- subscribed ---------------------|                      |
  |                                    |                      |
  |                                    |   (tracking update   |
  |                                    |<-- process job ------|
  |                                    |                      |
  |<-- tracking:update ----------------|                      |
  |    { status, timestamp, loc }     |                      |
```

Key decisions:
- **Redis adapter** enables horizontal scaling - multiple API instances share room state via Redis pub/sub
- **Authentication on connection** prevents unauthenticated socket connections
- **Shipment room pattern** isolates events per-shipment (room name: `shipment:{id}`)
- **Tenant verification on subscription** prevents cross-tenant room joins
- **No fallback polling** needed - Socket.IO handles disconnection gracefully, client auto-reconnects

---

## 8. Webhook Ingestion Architecture

### 8.1 17TRACK Integration Pattern

17TRACK API uses a "register then receive push" model:

```text
1. REGISTER tracking number
   POST https://api.17track.net/track/v1/register
   Headers: { "17token": "..." }
   Body: [{ "number": "RR123456789CN", "carrier": "china-post" }]

2. 17TRACK pushes updates to our webhook endpoint
   POST https://api.brand.com/webhooks/17track
   -> Our server validates signature
   -> Enqueues to BullMQ "tracking-sync" queue

3. (Optional) Poll for catch-up on missed webhooks
   POST https://api.17track.net/track/v2/track
   Body: [{ "number": "RR123456789CN" }]
```

### 8.2 Idempotency

Webhooks can arrive duplicated. Each tracking update must be idempotent:

```typescript
// In webhook worker:
const eventKey = `processed:event:${trackingNumber}:${eventTimestamp}`;
const alreadyProcessed = await redis.get(eventKey);
if (alreadyProcessed) return;

// Process the update...
await redis.set(eventKey, '1', 'EX', 86400); // 24h TTL
```

### 8.3 Status Normalization

17TRACK returns carrier-specific status strings. The tracking engine normalizes:

```typescript
// packages/tracking/src/normalizer.ts
const STATUS_MAP: Record<string, ShipmentStatus> = {
  'InfoReceived': 'info_received',
  'InTransit': 'in_transit',
  'OutForDelivery': 'out_for_delivery',
  'DeliveryAttempt': 'failed_attempt',
  'Delivered': 'delivered',
  'Exception': 'exception',
  'Expired': 'expired',
  'Returned': 'returned',
  'Pickup': 'info_received',
  // ...carrier-specific mappings
};

function normalizeStatus(carrierStatus: string, carrierCode?: string): ShipmentStatus {
  // First try direct mapping
  if (STATUS_MAP[carrierStatus]) return STATUS_MAP[carrierStatus];

  // Fallback: fuzzy match or default to 'exception'
  return 'exception';
}
```

---

## 9. Deployment Architecture

```text
+---------------------------+
|     Coolify Host          |
|     (Docker host)         |
|                            |
|  +--------------------+   |
|  |  api               |   |  Hono server (port 3001)
|  |  :3001             |   |  Includes BullMQ workers + Socket.IO
|  +--------------------+   |
|                            |
|  +--------------------+   |
|  |  admin             |   |  Next.js admin (port 3000)
|  |  :3000             |   |  env: API_URL=http://api:3001
|  +--------------------+   |
|                            |
|  +--------------------+   |
|  |  india             |   |  Next.js India portal (port 3002)
|  |  :3002             |   |  env: API_URL=http://api:3001
|  +--------------------+   |
|                            |
|  +--------------------+   |
|  |  srilanka          |   |  Next.js Sri Lanka portal (port 3003)
|  |  :3003             |   |  env: API_URL=http://api:3001
|  +--------------------+   |
|                            |
|  +--------------------+   |
|  |  PostgreSQL        |   |  Single DB or managed
|  +--------------------+   |
|                            |
|  +--------------------+   |
|  |  Redis             |   |  Separate container or managed
|  +--------------------+   |
+---------------------------+
```

**Container communication:**
- Next.js apps -> Hono API: HTTP/HTTPS via internal Coolify network
- Hono API -> PostgreSQL: TCP (internal network or managed DB URL)
- Hono API -> Redis: TCP (internal network)
- All containers: `output: standalone` for Next.js, Hono serves directly

---

## 10. Shared Packages Architecture

```text
packages/
+-- tenant-config/          # NEW - per-tenant config read and cache
|   +-- src/
|   |   +-- tenant.ts       # Tenant config types + resolver
|   |   +-- branding.ts     # Logo, colors, domain per tenant
|   |   +-- locale.ts       # i18n setup per tenant
|   |   +-- index.ts
|   +-- package.json
|
+-- database/               # NEW - shared Drizzle schema + helpers
|   +-- src/
|   |   +-- schema/
|   |   |   +-- tenants.ts
|   |   |   +-- users.ts
|   |   |   +-- shipments.ts
|   |   |   +-- customers.ts
|   |   |   +-- quotes.ts
|   |   |   +-- invoices.ts
|   |   |   +-- branches.ts
|   |   |   +-- tracking-events.ts
|   |   +-- with-tenant.ts  # Repository wrapper helper
|   |   +-- index.ts
|   +-- package.json
|
+-- tracking/               # NEW - tracking engine shared logic
|   +-- src/
|   |   +-- normalizer.ts   # Carrier status -> canonical status
|   |   +-- seventeen-track.ts  # 17TRACK API client
|   |   +-- index.ts
|   +-- package.json
|
+-- notifications/          # NEW - notification templates + dispatcher
|   +-- src/
|   |   +-- email/
|   |   |   +-- templates/  # React Email templates
|   |   +-- whatsapp/       # MSG91 message templates
|   |   +-- dispatcher.ts   # Channel selection + send
|   |   +-- index.ts
|   +-- package.json
|
+-- auth/                   # NEW - shared auth + CASL setup
|   +-- src/
|   |   +-- abilities.ts    # CASL ability definitions
|   |   +-- roles.ts        # Role constants + hierarchy
|   |   +-- index.ts
|   +-- package.json
|
+-- ui/                     # EXISTING - shared React components
|   +-- src/...             # Button, Card, Code (to be extended)
|
+-- eslint-config/          # EXISTING
+-- typescript-config/      # EXISTING
```

**Package dependency order (build pipeline):**

```
database (no deps)
  +-- tenant-config (depends on database types)
  +-- auth (depends on database for role_permissions)
  +-- tracking (depends on database schema types)
  +-- notifications (depends on tenant-config for branding)
      +-- ui (no internal deps)
          +-- api app (depends on all packages)
          +-- admin app (depends on ui, auth)
          +-- india app (depends on ui, auth)
          +-- srilanka app (depends on ui, auth)
```

---

## 11. Build Order Implications

### Phase Ordering Rationale

| Build Order | Component | Why This Order |
|:---:|-----------|----------------|
| 1 | **Database schema + migrations** | Everything depends on the data model. Must exist first. |
| 2 | **Shared packages: database, auth, tenant-config** | Core abstractions needed by both API and apps. |
| 3 | **Tenant Resolver Middleware + Basic Auth** | Cannot build any feature without tenant context and authentication. |
| 4 | **Shipment CRUD** | Core domain object - needed before tracking or notifications. |
| 5 | **Customer + Branch management** | Required to create shipments with context. |
| 6 | **17TRACK integration + Tracking Engine** | Depends on Shipment CRUD existing. Webhook listener can be built in parallel. |
| 7 | **Notification Dispatcher + BullMQ queues** | Depends on tracking engine. Must have tracking status changes to trigger notifications. |
| 8 | **Socket.IO real-time updates** | Depends on tracking engine. Workers push updates through Socket.IO. |
| 9 | **Quotes + Invoices** | Can be built in parallel with tracking/notifications if needed. |
| 10 | **Dashboard metrics** | Depends on shipments, customers, quotes, invoices all having data. |
| 11 | **Super Admin cross-tenant views** | Requires all tenant-scoped features to exist first. |
| 12 | **PDF generation** | Parallel with dashboard - depends on invoices existing. |

### Parallelizable Work Streams

After Phase 3 (auth + tenant middleware), these can be built in parallel:

```
Stream A (Core domain):   Shipments -> Tracking -> Notifications -> Real-time
Stream B (Admin tools):   Customers -> Branches -> Quotes -> Invoices
Stream C (Cross-cutting): Dashboard -> Super Admin -> PDF gen
```

---

## 12. Sources

| Source | Type | Confidence | What It Informed |
|--------|------|:----------:|------------------|
| Multi-tenant database patterns (several 2025-2026 analyses) | WebSearch synthesis | HIGH | Chose shared DB model, three-layer isolation strategy |
| 17TRACK API documentation (api.17track.net) | Official docs (web fetch) | HIGH | Webhook ingestion, register-then-push pattern |
| CASL RBAC for multi-tenant SaaS (WorkOS, 2025-2026) | WebSearch | HIGH | Tenant-scoped role design, ability builder pattern |
| Socket.IO + Redis adapter official docs | Official docs | HIGH | Real-time room-per-shipment architecture |
| BullMQ queue patterns (docs.bullmq.io) | Official docs | HIGH | Separate queues per concern, concurrency control |
| Drizzle ORM multi-tenancy (drizzle-multitenant npm, community guides) | WebSearch + code | MEDIUM | Repository wrapper withTenant() pattern |
| Hono middleware + AsyncLocalStorage patterns | Official docs | HIGH | Tenant resolver middleware architecture |
| Industry patterns: AfterShip, 17TRACK, Track123 | Product observation | MEDIUM | Status normalization taxonomy, multi-carrier tracking |
| GT Express existing patterns (BullMQ, MSG91) | Existing code knowledge | HIGH | Queue architecture, notification provider choice |
| PostgreSQL RLS for multi-tenancy (Redis blog, 2026) | WebSearch | MEDIUM | RLS as future migration path if isolation needs grow |

---

## Quality Checklist

- [x] Components clearly defined with boundaries (Section 2)
- [x] Data flow direction explicit (Section 3)
- [x] Build order implications noted (Section 11)
- [x] Multi-tenant isolation strategy documented (Section 5)
- [x] CASL permission architecture (Section 6)
- [x] Infrastructure component configuration (Section 7)
- [x] Webhook ingestion patterns (Section 8)
- [x] Shared package boundaries (Section 10)
