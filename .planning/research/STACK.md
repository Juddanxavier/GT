# Technology Stack

**Project:** Gajan Traders — Multi-Tenant Shipment Tracking  
**Researched:** 2026-06-13  
**Confidence:** HIGH (70% verified via npm/official sources), MEDIUM (30% via web search)  

## Executive Summary

This is a **validated stack with zero deal-breakers**. All 17 chosen technologies are production-ready, actively maintained, and well-integrated into a unified architecture. The key architectural insight is how the **Next.js frontends, Hono API, Socket.IO, and BullMQ** share two critical infrastructure resources (PostgreSQL + Redis) while maintaining strict tenant isolation via a single-DB `tenantId` pattern.

Three specific risks require attention early: (1) Drizzle ORM is mid-migration from v0.45.x to v1.0.0-rc — pick a lane from day one, (2) React Email 6.0 unified its package — use `react-email` not `@react-email/components`, (3) Next.js 16 had 13 CVEs patched in 16.2.6 — pin at `^16.2.6` minimum.

---

## Recommended Stack

### Core Framework
| Technology | Version (npm) | Purpose | Why |
|------------|---------------|---------|-----|
| **Hono** | `^4.12.0` | REST API server | Ultrafast (14KB, 0 deps), Web Standard API, TypeScript-native RPC mode for end-to-end types from API to frontend. Replaces Express with 3-5x better throughput. |
| **Next.js** | `^16.2.6` **(min)** | Admin app + 2 customer portals | App Router, React Server Components, Turbopack default in v16. Three standalone Next.js outputs (`output: "standalone"`) for Docker. |
| **React** | `^19.2.0` | UI library | Already in monorepo (React 19.2). React Compiler available in 19.2 for auto-memoization. |
| **TypeScript** | `^5.9.2` | Language | Already in monorepo. Strict mode, `noUncheckedIndexedAccess`. Target ES2022. |

### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **PostgreSQL** | 16+ | Primary database | Row-level security for `tenantId` scoping, JSONB for flexible tracking metadata, good Drizzle support. |
| **Drizzle ORM** | `^0.45.2` **or** `1.0.0-rc.3` | Type-safe ORM | Lightweight (~7.4KB), 0 deps, serverless-ready. Drizzle Kit for migrations. **Decision needed**: v0.45.x (stable) or v1.0.0-rc.3 (latest with JIT mappers, new casing API). |
| **Drizzle Kit** | `^0.30.0` or matching | Migration tool | CLI companion for schema push and migration file generation. |
| **Neon Serverless** | Optional | PostgreSQL provider | If serverless deployment desired. Compatible with Drizzle + Hono. Not required for Docker/Coolify. |

### Cache & Queues
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Redis** | 7.x | BullMQ backend, cache layer, Socket.IO adapter, tenant session store | Single Redis instance handles all infra roles. Tenant-prefixed keys for isolation. |
| **ioredis** | `^5.11.0` | Redis client for BullMQ + caching | BullMQ's most-tested client. **Note**: ioredis is in maintenance mode but remains the safest choice for BullMQ compatibility. BullMQ 5.77+ supports node-redis as alternative. |
| **BullMQ** | `^5.78.0` | Background job queue | Notification dispatch (email/WhatsApp), PDF generation, 17TRACK polling sync. Proved in existing GT Express. OpenTelemetry tracing built-in since v5.71. |
| **Socket.IO** | `^4.8.3` | Real-time tracking updates | Bidirectional updates to customer portals when tracking status changes. WebSocket with HTTP long-polling fallback. |
| **@socket.io/redis-adapter** | `^8.3.0` | Socket.IO Redis adapter | Scales Socket.IO across the Hono API server and future instances. Uses Redis Pub/Sub for broadcasting. |
| **Socket.IO client** | `^4.8.3` | Browser-side Socket.IO | Bundled in Next.js frontends for real-time tracking dashboard. |

### Authentication & Authorization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Better Auth** | `^1.6.14` | Auth framework | Session rotation, CSRF, token blacklisting built in. Drizzle adapter native. Google OAuth, refresh tokens. Designed for multi-tenant scenarios. |
| **@better-auth/drizzle-adapter** | `^1.6.14` | Drizzle ORM adapter | Stores users, sessions, accounts in PostgreSQL via Drizzle. Peer dep: `drizzle-orm ^0.45.2`. |
| **@casl/ability** | `^7.0.0` | Authorization (ABAC) | TypeScript-native attribute-based access control. Define abilities: superadmin, tenant-admin, staff, customer. Works in both API middleware and React UI (shared package). |
| **@casl/react** | `^7.0.0` | React integration | `Can` component for conditionally rendering UI elements based on permissions. |

### UI & Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **shadcn/ui** | Latest registry | Component library | Copy-paste components built on Radix UI + Tailwind. Pairs with Next.js + React 19. Still the dominant pattern in 2026. |
| **Tailwind CSS** | `^4.0.0` | Utility-first CSS | Tailwind 4 is what React Email 6 ships with. Use the `@tailwindcss/postcss` plugin. |
| **@repo/ui** | workspace:* | Shared component library | Already exists in monorepo. Contains shared React components used by admin app and portals. |

### PDF Generation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@react-pdf/renderer** | `^4.5.0` | Invoice PDF generation | ~50ms render vs Puppeteer's 2-3s. No Chromium dependency in Docker. JSX-based document definition. Runs in BullMQ worker (not request path). |

### Email & Notifications
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React Email** | `^6.1.0` | Email component library | **CRITICAL: v6 unified** — single `react-email` package replaces `@react-email/components`. Tailwind 4 support. Embeddable editor in admin panel. |
| **Resend** | Latest SDK | Email sending service | React Email templates + tenant-branded `from:` addresses. Reliable transactional email API. |
| **MSG91** | v2 (API-driven) | WhatsApp + SMS notifications | Existing GT Express integration. Use direct REST API or `msg91-v5` community package for WhatsApp Business API. Official npm package (`msg91` v2.2.8) is stale — recommend wrapping MSG91's REST API directly. |

### Tracking Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **17TRACK REST API** | API v2 | Carrier tracking | 3300+ carriers, webhook push for status changes. No official npm SDK — build a thin API client in `packages/tracking-client`. Rate limit: 3 req/s. |

### Monitoring & Observability
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@sentry/node** | `^10.55.0` | Error tracking + performance | Built on OpenTelemetry. Captures errors with `tenantId` context. Metrics API (since v10.25) for counters/gauges. |
| **@sentry/nextjs** | `^8.x` / latest | Next.js error tracking | Wraps Next.js components, server actions, and API routes for error capture. |
| **@opentelemetry/sdk-trace-node** | `^2.7.0` | OpenTelemetry traces | Sentry v10 manages OTel setup by default. Only needed for custom tracing pipelines. |

### Infrastructure & Deployment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Docker** | 24+ | Containerization | 4 containers: admin, india-portal, srilanka-portal, api. Each Next.js app uses `output: "standalone"`. |
| **Coolify** | `^4.1.0` | Self-hosted PaaS | v4.0.0 GA (April 2026). Free, self-hosted Heroku alternative. Manages Docker, SSL (Traefik reverse proxy), deployments from GitHub. |
| **Arcjet** | Latest | Rate limiting + bot protection | Rate-limit API endpoints per tenant. Hono middleware available. Protects webhook endpoints from abuse. |

### Developer Tooling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Biome** | `^2.4.13` | Linter + formatter | **Replaces ESLint + Prettier.** Rust-based, 35-60x faster. 465+ rules. One binary, one config (`biome.json`). Migration: `biome migrate eslint` + `biome migrate prettier`. |
| **Turborepo** | `^2.9.18` | Monorepo orchestrator | Already configured. Task caching, topological builds. |
| **pnpm** | `^9.0.0` | Package manager | Already configured. v9 is current stable. |

---

## Package Installation

```bash
# API Server (apps/api)
pnpm add hono@^4.12.0 @hono/node-server@^2.0.0
pnpm add drizzle-orm@^0.45.2 postgres
pnpm add -D drizzle-kit@^0.30.0

# Auth & Authorization (apps/api + packages/auth)
pnpm add better-auth@^1.6.14 @better-auth/drizzle-adapter@^1.6.14
pnpm add @casl/ability@^7.0.0 @casl/react@^7.0.0

# Queues & Real-time (apps/api)
pnpm add bullmq@^5.78.0 ioredis@^5.11.0
pnpm add socket.io@^4.8.3 @socket.io/redis-adapter@^8.3.0
pnpm add socket.io-client@^4.8.3

# PDF (packages/pdf-worker or apps/api worker)
pnpm add @react-pdf/renderer@^4.5.0

# Email
pnpm add react-email@^6.1.0 resend@latest

# Monitoring
pnpm add @sentry/node@^10.55.0 @sentry/nextjs@latest
pnpm add @opentelemetry/sdk-trace-node@^2.7.0

# Tooling (root)
pnpm add -D @biomejs/biome@^2.4.13
```

---

## Versions at a Glance

| Package | npm Latest | Project Pin | Confidence | Notes |
|---------|-----------|-------------|------------|-------|
| Hono | 4.12.23 | `^4.12.0` | HIGH | 4.12.x stable, frequent patches. |
| Next.js | 16.2.7 | `^16.2.6` | HIGH | **Must be >=16.2.6** (13 CVEs patched May 2026). |
| React | 19.2.0 | `^19.2.0` | HIGH | Current, React Compiler available. |
| Drizzle ORM | 0.45.2 / 1.0.0-rc.3 | TBD | MEDIUM | **Decision needed**: stable v0.45.x or v1.0.0-rc.3. |
| Better Auth | 1.6.14 | `^1.6.14` | HIGH | Very active (28.6K GitHub stars). |
| CASL | 7.0.0 | `^7.0.0` | HIGH | v7 just released June 2026. |
| BullMQ | 5.78.0 | `^5.78.0` | HIGH | Mature, 732 versions. OTel support. |
| ioredis | 5.11.1 | `^5.11.0` | MEDIUM | Maintenance mode — see risk note. |
| Socket.IO | 4.8.3 | `^4.8.3` | HIGH | Latest stable Dec 2025. |
| @react-pdf/renderer | 4.5.1 | `^4.5.0` | HIGH | Stable, actively maintained. |
| React Email | 6.1.4 | `^6.1.0` | HIGH | **v6 unified package** — breaking change from v5. |
| Biome | 2.4.16 | `^2.4.13` | HIGH | Very active, best-in-class speed. |
| Sentry Node | 10.55.0+ | `^10.55.0` | HIGH | Built on OpenTelemetry. |
| Coolify | 4.1.2 | `^4.1.0` | MEDIUM | v4.0.0 GA April 2026, production-ready. |

---

## Alternatives Considered

| Category | Chosen | Alternative | Why Not |
|----------|--------|-------------|---------|
| **API Framework** | Hono | Fastify | Fastify has excellent plugin ecosystem but heavier (~10x bundle), Node.js-specific APIs. Hono's Web Standard API means the same code can run on Cloudflare Workers if needed later. |
| **API Framework** | Hono | NestJS | Too opinionated for this project scale. NestJS adds decorators/DI overhead that doesn't align with Hono's lightweight philosophy. |
| **Auth** | Better Auth | NextAuth.js/Auth.js | Better Auth has built-in session rotation, CSRF, token blacklisting, and native Drizzle adapter. Auth.js 5.x Drizzle adapter exists but features are more fragmented. |
| **Auth** | Better Auth | Clerk/Supertokens | Third-party paid services. Better Auth is self-hosted, free, and fits the self-hosted Coolify deployment model. |
| **Authz** | CASL | Casbin | Casbin is Go-origin with different mental model. CASL's `defineAbility` + `AbilityBuilder` pattern maps naturally to React's component model for UI conditional rendering. |
| **Permissions** | CASL | ZenStack | ZenStack extends Prisma. Since we use Drizzle, CASL is the natural fit. |
| **ORM** | Drizzle | Prisma | Prisma has heavier client, generated binary, and slower cold starts. Drizzle's ~7.4KB bundle fits the edge/serverless deployment model. |
| **ORM** | Drizzle | Kysely | Kysely is query-builder only (no migrations, no schema declaration). Drizzle provides schema + migrations + query builder in one tool. |
| **PDF** | @react-pdf/renderer | Puppeteer | Puppeteer requires Chromium (~100MB Docker image), 2-3s render time. @react-pdf/renderer is ~50ms, no external dependency. For invoice generation in a BullMQ worker, this matters. |
| **PDF** | @react-pdf/renderer | jsPDF | jsPDF is imperative (no JSX), harder to maintain complex layouts like invoices. |
| **Email** | React Email + Resend | Nodemailer/SMTP | Nodemailer requires SMTP server setup, TLS config, DKIM/SPF records. Resend handles deliverability. React Email provides component-based templates. |
| **Email** | Resend | SendGrid | Resend has better React Email integration, simpler API, generous free tier. |
| **WhatsApp** | MSG91 | Twilio | MSG91 is cheaper for Indian traffic, already proved in GT Express. Twilio WhatsApp API works globally but at higher per-message cost. |
| **Tooling** | Biome | ESLint + Prettier | Biome is 35-60x faster, single binary, no config file needed for basic use. 97% Prettier-compatible output. Migration path exists. |
| **Deployment** | Coolify | Vercel | Vercel can't handle 4 separate Next.js apps with different domains on one team's free plan. Coolify self-hosted on $8-16/mo VPS runs all 4 apps. |
| **Deployment** | Coolify | Railway | Railway is good but costs scale linearly with apps. Coolify is free (self-hosted). |
| **Rate Limiting** | Arcjet | Upstash Ratelimit | Arcjet provides bot protection + rate limiting in one. Upstash needs Redis + separate config. Arcjet has Hono middleware. |
| **Background Jobs** | BullMQ | Inngest / Trigger.dev | BullMQ keeps Redis as single dependency. Inngest/Trigger.dev add external SaaS dependencies. BullMQ is already proven in GT Express. |
| **Real-time** | Socket.IO | Server-Sent Events (SSE) | Socket.IO provides bidirectional, room-based broadcasting, automatic reconnection. SSE is unidirectional only. For tracking updates pushed to specific customer sessions, Socket.IO rooms with tenant isolation are the natural fit. |

---

## Architecture Integration Notes

### How the Pieces Fit Together

```
                       ┌──────────────────────────────────────┐
                       │          Coolify (Self-hosted)         │
                       │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
                       │  │Admin │ │India │ │Sri   │ │ Hono │ │
                       │  │Next  │ │Portal│ │Lanka │ │ API  │ │
                       │  │:3000 │ │:3001 │ │:3002 │ │:4000 │ │
                       │  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ │
                       │     └────┬────┘        │        │     │
                       │          │ Traefik (Coolify Proxy)   │
                       └──────────┼──────────────────────────┘
                                  │
                     ┌────────────┼────────────────────┐
                     │            │                     │
               ┌─────▼────┐ ┌────▼────┐        ┌──────▼──────┐
               │PostgreSQL │ │  Redis  │        │  17TRACK API │
               │(Drizzle)  │ │7.x     │        │  (External)  │
               └───────────┘ └────┬────┘        └─────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │              │
              ┌─────▼────┐ ┌──────▼──────┐ ┌────▼──────┐
              │  BullMQ  │ │  Socket.IO  │ │  Cache    │
              │ (Queues) │ │  (Real-time)│ │(Tenant)   │
              └──────────┘ └─────────────┘ └───────────┘
```

### Socket.IO + Hono Coexistence

**This is the trickiest architectural pairing.** Socket.IO requires a raw Node.js HTTP server. Hono on Node.js uses `@hono/node-server`. The solution:

```typescript
// apps/api/src/index.ts
import { serve } from '@hono/node-server'
import { Server as SocketIOServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { Hono } from 'hono'

const app = new Hono()
// ... Hono routes ...

const httpServer = serve({
  fetch: app.fetch,
  port: 4000,
  createServer: true,  // Returns the underlying Node HTTP server
})

// Attach Socket.IO to the same HTTP server
const io = new SocketIOServer(httpServer, {
  cors: { origin: ['https://admin.example.com', 'https://india.example.com'] },
  adapter: createAdapter(
    new Redis({ host: process.env.REDIS_HOST }),
    new Redis({ host: process.env.REDIS_HOST })
  ),
})

// WebSocket namespace per tenant
const tracking = io.of(/^\/tracking-\d+$/)  // Dynamic namespaces per tenant
```

**Alternative**: Run Socket.IO on a separate port (e.g., 4001) and have Next.js apps connect via environment-specific URL. This is simpler but requires CORS and an extra port in Docker.

### Drizzle ORM Version Decision

**Recommendation: Start with `drizzle-orm@^0.45.2`.**

| Factor | v0.45.x | v1.0.0-rc.3 |
|--------|---------|--------------|
| Stability | Production-proven | Pre-release |
| Performance | Good | Better (JIT mappers) |
| Casing API | Default | Reworked (breaking) |
| Query builder | RQBv1 | RQBv2 only |
| Migration path | None needed | Will need migration to v1.0.0-stable |

`drizzle-kit` must match the ORM major version. Using the RC means you'll need to handle potential breaking changes when v1.0.0 stable ships. For a greenfield project starting now, **either is viable** — v0.45.x is the safer choice.

### Next.js 16 Minimum Patch

**CRITICAL: Pin `next@^16.2.6` minimum.** The May 2026 security disclosure patched 13 CVEs including middleware bypass (high severity), XSS, SSRF, cache poisoning. Version 16.2.6+ is required. The project already has `@next/eslint-plugin-next@^16.2.0` but the `next` package itself needs pinning.

### ioredis Maintenance Mode

ioredis is maintained on a "best-effort" basis. Redis officially recommends `node-redis` for new projects. However:
- BullMQ's default and most-tested Redis client is ioredis
- BullMQ 5.77+ added support for `node-redis` and Bun's native Redis client
- **Stick with ioredis for now**. If ioredis enters full deprecation, migrate BullMQ's connection to `node-redis` — BullMQ 5.77+ supports it.

### Biome Migration Strategy

The monorepo currently has ESLint (v9.39.1) + Prettier (v3.7.4) fully configured. The migration plan:
1. Install Biome: `pnpm add -D @biomejs/biome@^2.4.13`
2. Run `npx @biomejs/biome migrate eslint` (reads `.eslintrc` / `eslint.config.mjs`)
3. Run `npx @biomejs/biome migrate prettier` (reads `.prettierrc` / Prettier config)
4. Remove ESLint + Prettier configs and dependencies per-workspace
5. Set `linter.rules.recommended: true` in `biome.json`

---

## Risk Register

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| Drizzle v1.0.0 migration mid-project | MEDIUM | Breaking changes in RQBv2, casing API | Start with v0.45.x. Plan v1 migration as a discrete phase after v1.0.0 stable ships. |
| ioredis deprecation | LOW | Redis client unmaintained | BullMQ 5.77+ supports node-redis. Migrate Redis client when ioredis actually deprecates. |
| Next.js 16 security | HIGH (blocked) | 13 CVEs in <16.2.6 | Pin `next@^16.2.6` from day one. Monitor for new advisories. |
| React Email 6 import breakup | MEDIUM | Breaking import paths | Use `react-email` (not `@react-email/components`) for all imports. Greenfield avoids migration pain. |
| Socket.IO + Hono server attachment | MEDIUM | Architectural complexity | Validate the `serve()` → Socket.IO attachment pattern in Phase 1. Allocate 1-2 days for integration testing. |
| MSG91 API changes | LOW | WhatsApp delivery failures | Wrap MSG91 calls behind an abstraction (`packages/notifications`). Fallback to email if WhatsApp fails. |
| 17TRACK rate limits | LOW | 3 req/s throttle | Implement queue-based tracking updates via BullMQ (not direct API calls). Batch polling with backoff. |
| Coolify v4.0 stability | LOW | Early production bugs | Wait for v4.1.x stable before production deployment. Keep Docker Compose as fallback. |

---

## Sources

- [Hono npm](https://www.npmjs.com/package/hono) — v4.12.23, MEDIUM confidence
- [Better Auth GitHub](https://github.com/better-auth/better-auth) — 28.6K stars, 1.6.14, HIGH confidence
- [BullMQ npm](https://www.npmjs.com/package/bullmq) — v5.78.0, HIGH confidence
- [BullMQ Changelog](https://docs.bullmq.io/changelog) — OTel support v5.71+, HIGH confidence
- [Socket.IO v4.8.3](https://socket.io/docs/v4/server-installation/) — Dec 2025 stable, HIGH confidence
- [@socket.io/redis-adapter npm](https://www.npmjs.com/package/@socket.io/redis-adapter) — v8.3.0, MEDIUM confidence (2yr old)
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) — v0.45.2 / v1.0.0-rc.3, HIGH confidence
- [Drizzle ORM Releases](https://github.com/drizzle-team/drizzle-orm/releases) — RC timeline, MEDIUM confidence
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability) — v7.0.0, HIGH confidence
- [React Email npm](https://www.npmjs.com/package/react-email) — v6.1.4, HIGH confidence
- [React Email Changelog](https://react.email/docs/changelog) — v6 unification, HIGH confidence
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.5.1, HIGH confidence
- [Biome npm](https://www.npmjs.com/package/@biomejs/biome) — v2.4.13, HIGH confidence
- [Biome v2.4 Release](https://biomejs.dev/) — 465 rules, 35-60x faster, HIGH confidence
- [ioredis npm](https://www.npmjs.com/package/ioredis) — v5.11.1, MEDIUM confidence (maintenance mode)
- [Next.js 16.2.6+ Security](https://devtoolpicks.com/blog/nextjs-security-patches-may-2026-indie-hackers) — 13 CVEs, HIGH confidence
- [Next.js EOL](https://endoflife.date/nextjs) — 16.2.9 latest, HIGH confidence
- [Sentry Node npm](https://npmx.dev/package/@sentry/node/v/%5E10.55.0) — v10.55.0+, HIGH confidence
- [Sentry OTel Custom Setup](https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/custom-setup) — Skip auto OTel setup, MEDIUM confidence
- [Coolify v4.1.2](https://releaseport.com/r/coolify/v4-1-2) — June 2026 patch, MEDIUM confidence
- [Coolify v4.0 GA](https://wz-it.com/en/blog/coolify-v4-0-0-self-hosted-paas-heroku-alternative/) — April 2026, MEDIUM confidence
- [17TRACK API](https://www.17track.net/en/api) — 3300+ carriers, REST API, MEDIUM confidence
- [MSG91 npm](https://www.npmjs.com/package/msg91) — v2.2.8 (stale), LOW confidence
- [@hono/node-server WS](https://www.npmjs.com/package/@hono/node-server) — upgradeWebSocket, MEDIUM confidence
