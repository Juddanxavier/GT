# Scope: Operations & production readiness

Everything outside the two app epics that decides whether the platform survives contact with real traffic: secret hygiene, deployment configuration, the background job pipeline, and the quality gates CI actually runs. Seeded from the production readiness audit of Oct 15, 2026 (`PRODUCTION-READINESS.md` recheck).

**Build approach:** Tracer Bullet (each fix proven by booting or querying the real thing before the next).
**Workflow:** Alpha (after develop, run check verify against a running stack; no separate test suite unless a feature needs it). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Secrets out of git & credential rotation | Foundation | in-progress |
| 2 | Production env & compose parity | Foundation | in-progress |
| 3 | Redis & queue readiness | Foundation | in-progress |
| 4 | Type & test gate coverage | Slice 1 | planned |
| 5 | Deploy runbook & staging smoke | Slice 2 | planned |

## Foundation

### 1. Secrets out of git & credential rotation · in-progress
`.env.production` is tracked in git and history with real credentials: `BETTER_AUTH_SECRET`, `TRACK_API_KEY`, `TRACK_WEBHOOK_SECRET`, `SEED_SECRET`, `SENTRY_DSN`. Untrack the file, keep it ignored, and treat every committed value as compromised.
**Done when:** `.env.production` is out of the index and `.gitignore`, all five credentials are rotated at their providers, and a repo scan finds no live secret in tracked files.
- [x] Build it: untrack `.env.production` (still ignored by `.gitignore:75`), rotate the self contained values (`BETTER_AUTH_SECRET`, `SEED_SECRET`), flag the provider side ones with TODO lines (built directly, Oct 15)
- [ ] Rotate `TRACK_API_KEY`, `TRACK_WEBHOOK_SECRET`, and `SENTRY_DSN` at their providers, paste the new values, clear the TODO lines (manual milestone)
- [ ] Verify it: /check verify secrets out of git & credential rotation

### 2. Production env & compose parity · in-progress
The prod compose file shipped the customer portal with no `NEXT_PUBLIC_API_URL` (so it built against `localhost:3001`), had no `lanka-mahal` service at all, gave no service a healthcheck, and `.env.production` was missing the `SEED_*`, `SMTP_*`, and archive cadence keys that `.env.example` declares. Code side defaults for seed passwords are covered by `apps/api` feature 14 and now refuse to apply in production.
**Done when:** every portal builds with its real API URL, all four apps have a prod service, healthchecks and `restart` policy cover each one, and `.env.production` declares every key `.env.example` does.
- [x] Build it: build args for both portals, a `lanka-mahal` image stage and service, healthchecks plus `service_healthy` ordering, full env key parity (built directly, Oct 15)
- [ ] Verify it: /check verify production env & compose parity

### 3. Redis & queue readiness · in-progress
`REDIS_URL` was empty in `.env.production`, so tracking jobs, the 17TRACK webhook queue, email/WhatsApp sends, and the retrack cron never ran while the API happily served reads and writes. Ship a real Redis, point the API at it, and prove the pipeline end to end with one shipment.
**Done when:** Redis is configured in prod, the API boots with workers attached (no "queues unavailable" warning), a test shipment moves from created to tracked through a real 17TRACK webhook, and a notification is delivered.
- [x] Build it: `redis` service with a volume and healthcheck in `docker-compose.prod.yml`, `REDIS_URL=redis://redis:6379`, API waits for a healthy broker (built directly, Oct 15)
- [ ] Verify it: /check verify Redis & queue readiness (needs a deployed stack plus one real 17TRACK webhook and a ZeptoMail key to prove delivery)

## Slice 1: Gates

### 4. Type & test gate coverage · planned
CI only type checks 4 of 9 workspaces: `apps/api`, `apps/customer`, `apps/lanka-mahal`, and `packages/permissions` have no `check-types` script, and a manual `tsc` in `apps/api` reports 54 errors (33 outside tests, including nullable Redis client use in `middleware/lockout.ts` and missing fields in `routes/customers.ts`). `packages/permissions` also has tests that no task runs, and `apps/customer` and `apps/lanka-mahal` are outside the root lint command.
**Done when:** `check-types` exists for every workspace and passes, `permissions` tests run in the default `test` task, the root lint covers both portals, and CI fails when any of them break.
- [ ] Build it: /develop type & test gate coverage

## Slice 2: Ops

### 5. Deploy runbook & staging smoke · planned
Deployment knowledge lives in this audit and an admin checklist dated July 2026; there is no runbook, and no staging pass has exercised the real path. Write the runbook, then walk the signoff list once against a real environment.
**Done when:** a runbook covers build, deploy, migrate, rollback, and where logs and Sentry live, and one recorded staging pass checks off login, create shipment, track via webhook, invoice PDF download, and a delivered email or WhatsApp for both tenants.
- [ ] Build it: /develop deploy runbook & staging smoke

## Deferred
Out of scope for this pass, kept so the plan stays honest.
- **Log aggregation service**: the API logs structured JSON to stdout and Sentry; a hosted log store waits until there is traffic to justify it (spec 0001 follow-up).
- **Portal `x-request-id` minting**: the portals are not scoped yet, so browser side correlation waits for them (spec 0001 follow-up).
- **Staging deploy job in CI**: added after the runbook exists and the first manual staging pass works.
- **Backup and restore drills**: worth doing once the prod database holds real shipments.

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+) |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** | boxes you ran ticked, skipped ones marked skipped; for Alpha the suggested point is after `/check verify` |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default, what runs after `/develop`: **Alpha** = `/check verify`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
