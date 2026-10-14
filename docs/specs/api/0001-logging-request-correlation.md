# 0001. Logging adoption and request correlation

**Date**: 2026-10-13
**Status**: In Progress

## Summary

The API already has a structured logger (pino, a fast logger that writes one JSON object per line) and a request id, but about 156 call sites still print with `console`, so production output mixes plain text with JSON and nothing lines up. This decision makes the pino logger the only way any code in `apps/api` writes a log, puts the request id and tenant id (the customer's organisation) on every line where they are known, gives background jobs their own id, masks customer emails and phone numbers, and stops new `console` calls with a lint rule. The payoff: take one id from a browser and read the whole story of that request in the platform's log view.

## Context

The logger exists and is mostly right. `apps/api/src/logger.ts` gives pino with a secret and token redaction list, the pretty human readable format in development, and one `LOG_LEVEL` environment variable. `apps/api/src/middleware/request-id.ts` accepts an inbound `x-request-id` header or mints a UUID, stores it on the request context, and echoes it in the response header. `apps/api/src/index.ts` already runs a request logging middleware that emits an incoming line and a response line (status, duration, user, tenant, role) through a child logger bound to `reqId`, and the global error handler already logs unhandled errors with `requestId` and hands that id to Sentry.

> ⚠️ Premise note: the scope row says nothing correlates to a request id, and that is only half true. The plumbing is there; what is missing is everything around it. About 156 `console.*` calls bypass the logger (38 in `index.ts`, the rest spread over workers, redis, cache, providers, email, seed, realtime, and route files), business and error lines inside handlers never pick up the request logger so they carry no id, background jobs have no correlation id at all, nothing stops the next `console` call from appearing, and customer contact details pass through logs in plain text. This spec covers that gap and does not rebuild the parts that already work.

The forces that shaped the choice:

- Logs are just the container's stdout, read through whatever the platform (Docker or Coolify) gives you. There is no log server and no budget for one, so whatever we choose has to be greppable there.
- One small team, one linter. Biome already runs in the lint task (`biome lint apps/api/src packages`), so enforcement that rides on it is free; a new service is not.
- Customer contact data is PII (personally identifiable information). The email provider logs `sent ... to <address>`, seed logs customer emails, and WhatsApp notifications are built on phone numbers. Anyone with host access can read stdout today.
- Background jobs (BullMQ workers, the DLQ monitor) have no HTTP request, so a request id never reaches them. A stalled job is currently traced by reading timestamps and guessing.
- Tests must stay quiet and fast; the suite runs under vitest.
- Scope features that come after this one (worker metrics, contract tests) need a correlation id and a structured line shape to build on.
- Not deciding keeps the current state: support greps mixed output and guesses, error lines look identical to info lines, and the metrics work has no id to hang on.

## Requirements

**User stories**:
- As an on call engineer, I want one id that gathers every log line for a single request, so that I can reconstruct what happened without reading unrelated traffic.
- As a support engineer, I want the id the API returns in its response header to work as a search key in the logs, so that a customer report turns into an answer quickly.
- As a maintainer, I want lint to reject `console` calls in API source, so that structured logging does not quietly rot back.
- As a privacy conscious operator, I want customer emails and phone numbers masked in log output, so that host access is not a path to reading customer contact details.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: No `console.*` call remains in `apps/api` outside `*.test.ts` files and outside the generated `apps/api/drizzle/` output, and Biome's `suspicious/noConsole` rule, set to `error` and scoped to `apps/api/**/*.ts` excluding those files in the root `biome.json`, fails `pnpm lint` on any new one. The root lint task widens from `biome lint apps/api/src packages` to `biome lint apps/api packages` so the one off scripts at the `apps/api` root are reached too. Covers the scope's "every log in src goes through the pino logger".
- **AC-2**: For any request, the incoming line, every business or error line, and exactly one terminal line (the response line, or the unhandled error line when a handler throws) all carry the same `reqId`, and lines carry `tenantId` once tenant middleware has resolved it. Grepping one `reqId` that the API minted in the server's stdout output returns that whole request path and nothing else. Covers the scope's "request ID and tenant ID ride along" and "searching one request ID reconstructs the whole request path".
- **AC-3**: Every background job logs through a child logger bound with `jobId` and `queue`, bound in the worker wrapper that owns the `job` object and passed into the processor, and the `failed` and `error` handlers rebuild the same child from `job?.id` or bind `queue` alone when no job is present; grepping one job id shows that job's start, its work, and its completion or failure.
- **AC-4**: By default in production (`NODE_ENV=production`) every log line is a single JSON object written to stdout, and development keeps the pretty human readable format; `LOG_PRETTY=1` wins over that default in either direction (pretty in production, JSON in development); `LOG_LEVEL` stays the single level control; under vitest the logger is silent.
- **AC-5**: The response line logs at `error` for 5xx status codes, `warn` for 4xx, and `info` otherwise; the incoming line logs the path only, never the query string.
- **AC-6**: No email address appears verbatim in any log line in any environment (rendered as `j***@example.com`), phone numbers are masked keeping only the last 4 digits, the existing secret, token, and cookie redaction still applies, and request bodies are never logged.
- **AC-7**: The admin proxy (`apps/admin/app/api/[...path]/route.ts`) uses the `x-request-id` header in both directions: it forwards a browser supplied id when one is present and valid, otherwise mints `crypto.randomUUID()`, sends it upstream, and sets it on its own response. That same id appears in the API's log lines for the proxied call. No admin client code changes are required.

## Options considered

### Option 1: Full conversion now, then turn the lint rule on

Convert every non test file in `apps/api` to the pino logger as part of this feature, then enable Biome's `noConsole` rule as an error so nothing new appears.

**Pros**:
- The strongest guarantee: one logging system to learn, to grep, and to parse.
- The rule turns on the moment the last call converts, so there is no window where the standard is written but not enforced.

**Cons**:
- The largest diff: about 156 call sites across roughly 40 files, which can collide with other branches in flight.
- Free text messages must be moved into structured fields with care so no message loses meaning.

### Option 2: Enforce for new code only, existing calls as debt

Write the standard, turn the rule on, but exempt files that still use `console` and convert them gradually.

**Pros**:
- Tiny first change, no churn, no merge conflicts.

**Cons**:
- Two logging systems coexist for months, and the scope's done when (every log through pino) cannot pass.
- Grepping a request id still fails on any path not yet converted, so the main goal stays unmet.
- Debt like this in practice rarely gets paid.

### Option 3: Document the standard only

Write the standard down and rely on code review to catch `console` calls.

**Pros**:
- No config change, no rule to maintain.

**Cons**:
- The current state is the proof this fails: pino has existed for a while and 156 `console` calls appeared anyway.
- Enforcement depends on humans remembering, and it rots with team turnover.

## Decision

**Chosen option**: Option 1: Full conversion now, then turn the lint rule on.

Every log emitted by `apps/api` (except test files and the generated `drizzle/` output) goes through the pino logger with request id and tenant id bound where known, background jobs bind `jobId` and `queue`, production output is JSON on stdout, customer contact details are masked before the line is written, and Biome's `noConsole` rule guards the standard.

Calls settled while writing this spec (each decided here, none left open):

- **Masking runs as a pino `logMethod` hook inside `logger.ts`** (it rewrites the message string and any top level string field values before the line is serialized), so one choke point covers both the JSON path and the pretty transport. Why: pino writes straight to file descriptor 1 through sonic boom and the pretty transport runs in a worker thread, so a wrapper around `process.stdout` would catch neither. Runner up: a destination stream wrapper, rejected because it misses pretty output and leaves two places to maintain.
- **Inbound `x-request-id` values are validated** before use: at most 128 characters and charset `[A-Za-z0-9._-]`, anything else replaced with a fresh UUID. Why: the header is caller supplied, so an unvalidated id can be padded to absurd length or sprayed across requests, which breaks the grep guarantee and log hygiene. Runner up: trust the header as is, rejected because the uniqueness claim in AC-2 only holds for ids we control.
- **Keep the existing inline access log middleware in `index.ts`** rather than adopting `pino-http`. Why: it already does the job with the right line shape. Runner up: `pino-http`, rejected because a dependency brings its own line shape and child logger conventions, and the rewrite buys nothing.
- **Errors are always logged as an `err` object** (`log.error({ err, ... }, 'message')`) so pino's error serializer keeps type, message, and stack. Runner up: pre formatted strings, rejected because they drop the stack.
- **Graceful shutdown awaits `logger.flush()` with its callback** (50ms cap) after queues close and before force exit, so deploy restarts do not eat the last lines. The pretty transport runs in a worker thread, so its very last development line can still drop; the production JSON path flushes synchronously through sonic boom, which is the one that matters. Runner up: fire and forget `logger.flush()`, rejected because process exit can beat the write.
- **`logger.ts` exports a `createLogger({ level, destination })` factory** and builds the app singleton from it. Why: the standard forces the logger silent under vitest, but the guard tests need a non silent instance writing to an in memory destination to assert on emitted lines. Runner up: reaching into pino internals from tests, rejected as fragile.
- **Worker failures that reach Sentry also carry `jobId` context** (the error handler already sends `requestId`). Runner up: leave worker Sentry events uncorrelated, rejected because job tracing is half the point of this work.
- **`pino-pretty` stays a runtime dependency** in `apps/api/package.json`, because any run where `NODE_ENV` is not production (including a seed run on a production box with `LOG_PRETTY=1`) needs it. Runner up: move it to devDependencies, rejected because it would break `LOG_PRETTY` where it is most useful.
- **`noConsole` has no allow list**: no `console` method is permitted inside the scoped paths. Runner up: allow `console.error`, rejected because a half ban is how the current state happened.
- **Explicit logger passing** (`c.get('logger')` in routes, a `log` argument in services) stays the way context travels. Runner up: AsyncLocalStorage ambient context, rejected as hidden state that makes tests harder for a codebase that already passes things explicitly.

## Rationale

The scope's done when demands full conversion, which rules out Option 2 and Option 3 on the contract alone: a standard that admits two logging systems at once is the state we already have. Option 1 is chosen because the expensive part (conversion) and the cheap part (one lint rule) arrive together, so the guarantee is real from the day the feature lands rather than aspirational.

The existing plumbing sets the shape of the answer. Because the request logger, the access middleware, and the error handler already exist and are correct, this is not a logging framework choice; it is a completion and enforcement job, so boring and local wins: keep pino, keep stdout, keep the inline middleware, and skip new infrastructure. There is no log server budget, which fixes JSON on stdout as the production format; PII in free text fixes masking at the stream rather than per call site; and Biome already sitting in the lint path makes it the natural enforcement point. Explicit logger passing was chosen over ambient context because the codebase already does it (the error handler and `LoggerVariables` typing in `routes/types.ts`), so the standard adds no new abstraction to learn at 5pm on a Tuesday.

## Standard definition

**Canonical pattern**:

```typescript
// In a route handler: take the request logger, put data in fields, keep the message human
const log = c.get('logger');
log.info({ shipmentId: shipment.id, status: next }, 'shipment status changed');
log.error({ err, shipmentId: shipment.id }, 'shipment track failed');

// In a service: accept a logger argument, never import console
export async function trackShipment(shipment: Shipment, log: Logger) {
  log.info({ trackingNo: shipment.trackingNo }, 'tracking shipment');
}

// In a worker job: bind the job identifiers once, in the wrapper that owns `job`
const log = childLogger({ jobId: job.id, queue: queueName });
log.info({ provider }, 'processing job');
```

**Replaces**:

- `console.log`, `console.error`, `console.warn`, `console.info`, `console.debug` anywhere in `apps/api` outside `*.test.ts` and outside `apps/api/drizzle/`.
- Reaching for the root `logger` inside request scoped code when `c.get('logger')` is available (lines lose `reqId` that way).
- Free text messages that embed a raw email address or phone number.
- Swallowing an error with a string only (`log.error('failed: ' + msg)`); the error object rides as `err`.

**Conversion rules** (for the roughly 156 sites):

- Level mapping, meaning never changes: `console.error` to `error`, `console.warn` to `warn`, `console.log` and `console.info` to `info`, `console.debug` to `debug`.
- Keys: `err` always carries the Error object (`console.error('msg:', err)` becomes `log.error({ err }, 'msg')`); `event` carries a short machine name for business occurrences, as `services/audit.ts` already does; domain ids use camelCase matching the schema field name (`shipmentId`, `invoiceId`, `tenantId`, `userId`, `trackingNo`, `provider`, `status`, `ms`, and in workers `jobId` and `queue`). No key is invented per file; anything outside this list follows the camelCase schema name.
- The human message keeps its meaning, drops the `[tag]` prefix the code uses today (the bindings carry that context now), and must not contain PII (personal information).

**Logger interface and where each field comes from** (value sourcing):

| Value produced | Source |
|---|---|
| `reqId` | request id middleware: `x-request-id` request header if the caller sent one, else a random UUID; echoed in the response header (minted or passed through) |
| `tenantId` | tenant middleware rebinds `c.get('logger')` as a child with `tenantId` immediately after it sets the tenant (with the `user.tenantId` fallback for session only routes), so lines before that point (incoming line, pre auth failures) carry `reqId` only; the access middleware reads `c.get('logger')` after `next()` for its terminal line, never its original closure |
| `userId`, `role` | session middleware `c.get('user')`, on the response line as today |
| `jobId`, `queue` | `jobId` is the BullMQ `job.id`, bound in the worker wrapper that owns the `job` object and passed into the processor; `queue` is the queue name passed at each Worker construction site (`workers/index.ts`, `webhook-worker.ts`, `dlq-monitor.ts`), and the periodic sweeps (archive, retrack) bind `queue` plus their job type name |
| log level | `LOG_LEVEL` environment variable (single control) |
| format (pretty or JSON) | `NODE_ENV` decides by default; `LOG_PRETTY` overrides it in either direction; vitest forces silent |
| level of the response line | `c.res.status`: 5xx to `error`, 4xx to `warn`, else `info` |
| masked email or phone | the `logMethod` hook in `logger.ts`, applied to the message string and top level string field values before serialization |
| inbound `x-request-id` validity | validated in the request id middleware: max 128 characters, charset `[A-Za-z0-9._-]`, else a fresh UUID |
| stack and error type | pino's error serializer on the `err` key |

**Key invariants**:

- Every request emits an incoming line and exactly one terminal line (the response line, or the unhandled error line when a handler throws), all sharing one `reqId`.
- The request id middleware and the access log middleware are the first two registered in the chain, ahead of the payload cap, content type parser, and timeout, so those rejections still get an id, an incoming line, and a terminal line. The access middleware wraps `next()` so a thrown error emits its terminal line before rethrowing.
- In production, one log call produces exactly one JSON object on one line on stdout. Application code never writes log files.
- Request bodies are never logged (kept deferred from the scope, PII heavy).
- Access lines log the path only, never the query string (query values can carry OTPs, tokens, or emails).
- Error lines always carry an `err` object, never a bare string.
- Logs are not an audit record; the audit table stays the source of truth for who did what.

**Security model**: There is no log endpoint and no role that grants log access. Logs are the container's stdout, readable by whoever operates the host, so the masking carries the privacy burden: emails and phone numbers are masked in every environment by the `logMethod` hook, secrets, tokens, cookies, and auth headers stay redacted by the pino redaction list (which remains the backstop for the never log bodies rule), and bodies are never logged. No formal compliance regime was named for this project; customer contact details are treated as PII regardless. A log line must never be the only place a fact is stored, which the audit table rule above already ensures.

**Masking patterns** (fixed here, proven by guard test fixtures):

- Emails, the standard email shape wherever it appears in a message or string field: the local part drops to its first character plus `***`, the domain stays (`jane@acme.com` becomes `j***@acme.com`).
- Phone numbers in international form: a `+` followed by 8 to 15 digits, last 4 digits kept, the rest replaced with `*`.
- Phone numbers written with separators: digit groups split by spaces or parentheses totalling 9 to 15 digits (`98765 43210`, `(011) 234 5678`), last 4 digits kept. The space or parenthesis requirement is deliberate: it is what keeps UUIDs, tracking numbers like `GT-123456789`, and durations in `ms` from being eaten by the pattern.
- Guard fixtures prove both sides: `reqId` UUIDs, tracking numbers, and `ms` pass through untouched, while an email and each of the two phone forms come out masked. A number shape not covered here stays readable rather than guessed at.

**Configuration required**:

- `LOG_LEVEL`: existing, stays the single level control for every area.
- `LOG_PRETTY`: new, set to `1` to force the pretty format in any environment (used by CLI scripts and by a production box when readable output is wanted).
- `NODE_ENV`: existing, decides the default format (production gives JSON, anything else gives pretty).
- `VITEST`: not set by the team; vitest sets it, and the logger reads it to go silent in tests.

**Enforcement**:

- The root `biome.json` gains this entry as the **last** entry of its existing `overrides` array (placed after the `**/*.test.ts` entry so nothing earlier re-enables `console` for tests), with no allow list:

```json
{
  "includes": ["apps/api/**/*.ts", "!apps/api/**/*.test.ts", "!apps/api/drizzle/**"],
  "linter": { "rules": { "suspicious": { "noConsole": "error" } } }
}
```

  The root `package.json` lint task widens to `biome lint apps/api packages` so `apps/api` root scripts are scanned too. Both run inside the existing `pnpm lint`, so no new script or CI step is needed.
- Guard tests (run in the default `test` task): one test asserts the root `biome.json` contains exactly the override entry above (the entry is fixed in this spec, so the assertion is not circular); one test builds a non silent logger through `createLogger({ level, destination })` writing to an in memory destination, drives a request with a known `x-request-id` through the app, and asserts every line for that request carries the id and that exactly one terminal line exists (this same test is the guard for the never the root logger inside request code rule: a route that reaches for the root logger emits a line without `reqId` and fails it); one test runs a worker job and asserts `jobId` and `queue` on its lines; one test logs a message and a string field containing an email and each of the two phone shapes and asserts the masked output plus the untouched UUID, tracking number, and `ms` fixtures.

**Rollout**: a single pass inside this feature, built as ordered slices so the app stays green throughout (project approach: Tracer Bullet, one thin end to end path first, then widen). The lint rule stays off until the conversion completes, then flips on:

1. Core logger upgrades: the `createLogger({ level, destination })` factory, `tenantId` rebinding assigned to tenant middleware right after it sets the tenant (and the terminal line changed to read `c.get('logger')` after `next()`), level by status, path only, the masking hook, inbound `x-request-id` validation, `LOG_PRETTY`, silent under vitest, awaited `logger.flush()` on shutdown.
2. One request path end to end: move the request id and access log middleware to the front of the chain (ahead of payload cap, content type, and timeout) and wrap `next()` so a thrown error still emits its terminal line; then prove middleware, one representative route, and the unhandled error path all correlate with a grep by id.
3. Convert the remaining areas to the logger: routes, services, middleware, shipment providers, email and notifications, cache, redis, realtime, workers and the DLQ monitor (worker seam per AC-3).
4. Convert the CLI scripts and startup code: seed, seed superadmin, apply migration, apply RLS, `instrument.ts`, the process handlers in `index.ts`, and the one off scripts at the `apps/api` root (`list-track.ts`, `fix-staff-roles.ts`, `test-shipment-insert.ts`).
5. Widen the lint task, add the override entry above, flip `noConsole` on, and get `pnpm lint` green (this is the gate that proves AC-1).
6. Admin proxy minting of `x-request-id` (AC-7), then verification and tests.

**Exceptions**: test files (`*.test.ts`) may use `console` for assertion diagnostics, and the generated files under `apps/api/drizzle/` are out of scope (migration output, scanned by nothing). Nothing else is exempt.

## Consequences

**Positive**:
- One id reconstructs a request end to end, HTTP and background jobs alike, which turns support and on call work from archaeology into grep.
- Production output becomes uniform JSON on stdout, parseable by any tool the platform offers later, with no new service to run.
- The lint rule makes the standard self enforcing; the failure mode that created 156 `console` calls cannot repeat.
- Customer emails and phone numbers stop flowing through logs in plain text.

**Negative / tradeoffs**:
- A large diff across roughly 40 files, with real conflict risk against other branches in flight; coordinating merges costs time.
- Operators grepping for old literal message text will miss lines once messages move into structured fields; the team has to learn the field names.
- The masking hook runs a regex over the message and string fields on every log call, a small cost per line, and it can false positive: a number written with spaces or parentheses (a formatted reference number, say) could get masked, which may confuse someone reading a log.
- The pretty transport in development runs a worker thread in the process, which is a small overhead that stays.

**Neutral**:
- The admin app gains id minting but no logging change of its own; its four stray `console` calls are untouched by this spec.
- The customer portals (`apps/customer`, `apps/lanka-mahal`) are not touched; their requests already get an `x-request-id` back from the API, but nobody mints one at the browser end yet.
- Log retention stays whatever the platform provides; there is still no log server, and the audit table remains the durable record.
- Worker metrics and DLQ alerting (scope feature 17) stay a separate decision, but they can now build on `jobId` and `queue` bindings.

## Follow-up

- [ ] Root `AGENTS.md` carries no logging convention yet. This standard belongs in the project context file, which `/sync` maintains; `/architect` does not edit `AGENTS.md`.
- [ ] The customer portals could mint `x-request-id` at their edge the way the admin proxy does, so a customer's browser action correlates from the first hop (not in this pass, portals are not scoped yet).
- [ ] Scope feature 17 (worker metrics and DLQ alerting) should reuse the `jobId` and `queue` bindings defined here rather than inventing a second job identity.
