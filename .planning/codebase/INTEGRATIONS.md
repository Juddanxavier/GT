# External Integrations

**Analysis Date:** 2026-06-13

## APIs & External Services

**Consumed APIs:**
- None detected. The API app (`apps/api/src/index.ts`) only defines a single root `GET /` endpoint returning a static JSON `{ message: "ShipTrack API" }`. No HTTP client libraries (axios, fetch wrappers, got, etc.) are installed.
- No third-party API SDKs (Stripe, Twilio, SendGrid, OpenAI, etc.) found in any `package.json`.

**Exposed APIs:**
- **Hono REST API** — Single endpoint at `GET /` on port 3001 (`apps/api/src/index.ts`). Currently a health-check/probe endpoint only.

## Data Storage

**Databases:**
- **None configured.** No database client dependencies found:
  - No Prisma, Drizzle, TypeORM, Knex, or MikroORM
  - No pg, mongodb, mysql2, redis drivers
  - No connection strings or database configuration in source code
  - No schema files, migrations, or seed scripts

**File Storage:**
- **Local filesystem only.** No cloud storage SDKs (AWS S3, Google Cloud Storage, Azure Blob) installed.

**Caching:**
- **None.** No Redis, Memcached, or in-memory cache setup.

## Authentication & Identity

**Auth Provider:**
- **Not implemented.** No auth middleware, session management, JWT libraries, or OAuth flows present.
- No `better-auth`, `next-auth`, `lucia`, `clerk`, `auth0`, or `firebase-auth` dependencies.
- No login/signup routes or auth-related configuration.

## Monitoring & Observability

**Error Tracking:**
- **None.** No Sentry, Datadog, New Relic, or similar SDKs.

**Logging:**
- **None configured.** No structured logging library (pino, winston, bunyan). The API uses Hono's default request handling with no explicit logging middleware.

**Metrics:**
- **None.** No Prometheus, OpenTelemetry, or custom metrics instrumentation.

## CI/CD & Deployment

**Hosting:**
- **Not configured.** No Vercel, Netlify, Railway, Fly.io, or cloud provider configuration.

**CI Pipeline:**
- **None.** No `.github/` workflows, GitLab CI, CircleCI, or Jenkins configs present.

**Docker:**
- No `Dockerfile`, `docker-compose.yml`, or `.dockerignore` file found.

## Environment Configuration

**Environment files:**
- `.env` files are listed in `.gitignore` (`.env`, `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`) — no `.env` file committed.
- No runtime env var validation library (e.g., zod, env-schema, dotenv-safe) found.

**Environment variables referenced:**
- `turbo/no-undeclared-env-vars` rule is enabled in ESLint, suggesting env vars are expected but none are currently declared or referenced in source code.

## Email & Notifications

**Email Service:**
- Not integrated. No SendGrid, Resend, Mailgun, AWS SES, or nodemailer.

**Push/SMS:**
- Not integrated.

## Payment Processing

**Payment Provider:**
- Not integrated. No Stripe, Lemon Squeezy, Paddle, or Braintree SDKs.

## File Uploads

- Not implemented. No multer, formidable, or upload handling middleware.

## Webhooks & Callbacks

**Incoming Webhooks:**
- None defined. No webhook route handlers or signature verification.

**Outgoing Webhooks:**
- None configured.

## Third-Party SaaS

None detected. The project is in an early scaffolded state with no external service connections.

## Known Infrastructure Integrations (from tooling)

**Turborepo Remote Caching:**
- Supported by tooling (`turbo.json` allows remote caching) but not configured. Requires `turbo login` and `turbo link` with a Vercel account.

## Graphify Knowledge Graph

- A `graphify-out/` directory exists containing a pre-computed code knowledge graph (AST cache, manifest, labels, relationships). This is a development tool, not a production integration.

---

*Integration audit: 2026-06-13*
