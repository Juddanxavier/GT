# Architecture

**Analysis Date:** 2026-06-14

## High-Level Architecture Diagram

`
                             gt (pnpm monorepo root)
                                                                             
  ┌─────────────────────────────────┐    ┌──────────────────────────────────┐
  │         apps/                   │    │         packages/                 │
  │                                 │    │                                  │
  │  ┌─────────────────────────┐   │    │  ┌────────────────────────────┐  │
  │  │  api (Hono server)      │   │    │  │  @repo/ui (HeroUI v3 lib)  │  │
  │  │  port 3001              │───┼────┼──│  Re-exports @heroui/react  │  │
  │  │  /api/auth/*            │   │    │  └────────────────────────────┘  │
  │  │  /api/* (CRUD routes)   │   │    │                                  │
  │  └─────────────────────────┘   │    │  ┌────────────────────────────┐  │
  │                                │    │  │  @repo/eslint-config       │  │
  │  ┌─────────────────────────┐   │    │  └────────────────────────────┘  │
  │  │  admin (Next.js 16)     │   │    │                                  │
  │  │  port 3000              │   │    │  ┌────────────────────────────┐  │
  │  │  Branch/Customer/       │   │    │  │  @repo/typescript-config   │  │
  │  │  Shipment/Quotation     │   │    │  └────────────────────────────┘  │
  │  │  management pages       │   │    │                                  │
  │  └─────────────────────────┘   │    │  ┌────────────────────────────┐  │
  │                                │    │  │  @repo/permissions (CASL)  │  │
  │                                │    │  │  Role defs + ability       │  │
  │                                │    │  │  builders                  │  │
  │                                │    │  └────────────────────────────┘  │
  └─────────────────────────────────┘    └──────────────────────────────────┘
                                                                             
  Build Orchestration: Turborepo (turbo.json)
  Package Manager: pnpm@9.0.0 (pnpm-workspace.yaml)
  Language: TypeScript
  Database: PostgreSQL (NeonDB)
  Cache/Queue: Redis (Upstash)
`

`
Browser ──> admin (Next.js :3000) ──fetch──> Hono API (:3001) ──> PostgreSQL (NeonDB)
                                               │
                                               ├──> Redis (Upstash) — BullMQ + Socket.IO + Cache
                                               ├──> Better Auth — Sessions + rate limiting
                                               └──> 17TRACK (planned Phase 5)
`

## Monorepo Structure Overview

This project is a **pnpm workspaces monorepo** with **Turborepo** build orchestration. It follows the standard "apps + packages" convention.

**Root Configuration Files:**
- pnpm-workspace.yaml — Declares pps/* and packages/* as workspace members
- 	urbo.json — Defines task pipelines (uild, dev, lint, check-types) with dependency ordering and caching rules
- package.json — Root scripts proxy all commands through 	urbo run

**Workspace Membership:**
- pps/api — Hono HTTP server (auth, tenancy, CRUD routes for all entities)
- pps/admin — Next.js 16 admin app with HeroUI components
- packages/eslint-config — Shared ESLint configurations (@repo/eslint-config)
- packages/typescript-config — Shared TypeScript configurations (@repo/typescript-config)
- packages/ui — Shared React component library (@repo/ui, re-exports HeroUI v3)
- packages/permissions — CASL ability definitions for all roles

## App Boundaries and Communication

### Current State
Two active apps: pps/api (Hono server, port 3001) and pps/admin (Next.js 16, port 3000). The admin app communicates with the API via fetch calls to http://localhost:3001/api/*. Both use shared packages from packages/.

### Communication Pattern
`
Browser → Next.js (admin) ──fetch──> Hono (api) ──> PostgreSQL (NeonDB)
           :3000                      :3001            Redis (Upstash)
`

**Authentication:** Sessions managed by Better Auth. Admin app redirects to /login if no valid session. API validates session on every request via auth middleware.

**Tenant scoping:** All API routes are tenant-scoped via middleware that extracts tenantId from the session/JWT. Every query includes where(eq(table.tenantId, tenantId)).

## Layers (Architecture)

`
┌─────────────────────────────────────────┐
│            Presentation Layer            │
│  Next.js Admin App (apps/admin)          │
│  HeroUI v3 components (packages/ui)      │
├─────────────────────────────────────────┤
│            API Layer                     │
│  Hono HTTP Server (apps/api)             │
│  REST endpoints on port 3001             │
├─────────────────────────────────────────┤
│            Middleware Layer              │
│  Tenant Resolver → Auth → CASL Guard    │
├─────────────────────────────────────────┤
│            Application Layer             │
│  Route handlers, validation (Zod),       │
│  entity CRUD logic                       │
├─────────────────────────────────────────┤
│            Infrastructure Layer          │
│  BullMQ, Redis, Socket.IO, Sentry       │
├─────────────────────────────────────────┤
│            Data Layer                    │
│  Drizzle ORM + PostgreSQL (NeonDB)      │
│  RLS via session variables               │
└─────────────────────────────────────────┘
`

## Data Flow

### Request Flow (Authenticated)

`
User action → Next.js page → fetch(/api/*) → Hono
  → Tenant Resolver middleware (extracts tenantId)
  → Better Auth middleware (validates session)
  → CASL guard (checks ability)
  → Route handler
  → Drizzle query (tenantId filter)
  → PostgreSQL
  → JSON response → Next.js → UI update
`

### State Management
- **API app:** Stateless request/response using Hono context (c) objects
- **Admin app:** Client-side state via React hooks (useState for modals, form state)
- **Data persistence:** Drizzle ORM + PostgreSQL (NeonDB)
- **Cache:** Redis (Upstash) — with tenant-prefixed keys, graceful degradation when unavailable

## Route / Endpoint Structure

### apps/api (src/index.ts)

| Prefix | Routes | Purpose |
|--------|--------|---------|
| /api/auth/* | Better Auth handler | Login, register, session, OAuth |
| /api/branches | CRUD (4 routes) | Create, list, get, update/deactivate |
| /api/customers | CRUD (5 routes) | Create, list, get, update, deactivate |
| /api/shipments | CRUD (5 routes) | Create, list, get, update, deactivate |
| /api/quotations | CRUD + status + convert (6 routes) | Create, list, get, update, transition status, convert to shipment |
| /api/admin/* | Bull Board dashboard | Job queue monitoring |
| /socket.io/* | Socket.IO | Real-time events (planned) |

**All routes** are tenant-scoped via middleware. Quotation status transitions: draft → sent → accepted → converted → rejected.

### apps/admin (Next.js App Router)

| Path | Page | Purpose |
|------|------|---------|
| /login | Login page | Better Auth login form |
| /unauthorized | Unauthorized | Access denied page |
| / (dashboard) | Dashboard | Overview with stats links + quick actions |
| /branches | List page | Table with sort/pagination/KPI cards, create/delete modals |
| /branches/[id] | Detail page | Read-only Card view, edit/delete modals |
| /customers | List page | Table with sort/pagination/KPI cards, create/delete modals |
| /customers/[id] | Detail page | Read-only Card view, edit/delete modals |
| /shipments | List page | Table with sort/pagination/KPI cards, create/delete modals |
| /shipments/[id] | Detail page | Read-only Card view, edit/delete modals |
| /quotations | List page | Table with sort/pagination/KPI cards, create/delete modals |
| /quotations/[id] | Detail page | Read-only Card view, edit/delete modals, status action buttons |

**No /entity/new pages** — all creation happens via HeroUI Modal on list pages.

## Key Design Patterns

### 1. Turborepo Monorepo Pattern
- **Task pipeline:** Tasks defined in 	urbo.json with dependency ordering
- **Caching:** Build outputs cached (.next/**) with inputs tracked
- **Script routing:** All root scripts proxy through 	urbo run

### 2. Hono HTTP Server Pattern
- **Pattern:** Routes grouped by entity using 
ew Hono() + pp.route()
- **Middleware chain:** Tenant resolver → Auth → CASL for each group
- **Context:** c (Hono Context) carries request/response + tenantId + user

### 3. Better Auth + Hono Integration
- Mounted at /api/auth/* via pp.all('/api/auth/*', ...)
- Session validation on every protected route
- CSRF via trustedOrigins config

### 4. CASL Authorization Pattern
- Separate @repo/permissions package for ability definitions
- Guards applied as Hono middleware per route group
- Roles: superadmin, tenant-admin, staff, customer

### 5. Tenant Isolation (3-Layer)
- Middleware: extracts + validates tenantId from session/header
- Query: every Drizzle query includes eq(table.tenantId, tenantId)
- RLS: PostgreSQL session variable pp.tenant_id enforced at DB level

### 6. HeroUI UI Pattern
- packages/ui re-exports @heroui/react — apps import from @repo/ui
- No Provider wrapper (v3 auto-detects)
- @custom-variant dark in globals.css for dark mode
- CSS variable overrides with !important to beat HeroUI layer cascade

### 7. Modal Pattern
- **Controlled:** Modal.Backdrop isOpen={} onOpenChange={} wraps Container > Dialog > Header/Body/Footer
- **Form inside Modal:** <form> inside Modal.Body with id, footer submit button uses orm={id}
- **Uncontrolled:** Only used if a trigger Button is a child of Modal (DialogTrigger)

## Error Handling

- Global Hono pp.onError() for unhandled exceptions
- Route handlers return structured c.json({ error: string }, status) on validation/permission failures
- Zod validation in route handlers with formatted error messages
- CASL forbidden responses return 403

## Cross-Cutting Concerns

| Concern      | Current Implementation                    |
|-------------|------------------------------------------|
| **Logging** | Hono logger middleware                   |
| **Validation** | Zod schemas per entity                |
| **Auth**    | Better Auth + route middleware          |
| **CORS**    | Hono cors() middleware                  |
| **Rate limiting** | Better Auth built-in (auth endpoints) |
| **RLS**     | PostgreSQL session variables            |
| **Monitoring** | Sentry with tenantId tags            |
| **Background jobs** | BullMQ + Upstash Redis        |
| **Real-time** | Socket.IO + Redis adapter (planned)  |

---

*Architecture analysis: 2026-06-14 (updated from Phase 4 completion)*
