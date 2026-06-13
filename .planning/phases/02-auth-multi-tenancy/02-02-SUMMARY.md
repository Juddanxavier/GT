---
phase: 02-auth-multi-tenancy
plan: 02
subsystem: auth
tags: [better-auth, drizzle-adapter, hono, email-password, session-management, csrf]
requires:
  - phase: 02-auth-multi-tenancy
    plan: 01
    provides: Drizzle schema with tenant tables, user/session/account/verification tables
provides:
  - Better Auth instance (auth.ts) with Drizzle adapter for PostgreSQL
  - Mounted auth handler at /api/auth/* on Hono server
  - Session middleware injecting user+session into Hono context
  - CORS configuration for admin app (localhost:3000)
  - trustedOrigins for CSRF protection
affects: [02-03, 02-04, 02-05, 02-06, 02-07]

tech-stack:
  added:
    - better-auth@1.6.18
    - @better-auth/drizzle-adapter@1.2.8
  patterns:
    - Better Auth handler mounted via app.on(['POST','GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
    - Session middleware using auth.api.getSession() to inject user+session into Hono Variables
    - trustedOrigins for CSRF origin validation
    - custom user fields with input:false to prevent self-assignment

key-files:
  created:
    - apps/api/src/auth.ts: Better Auth instance with Drizzle adapter, email/password, Google OAuth, custom tenant fields
    - apps/api/src/middleware/auth.ts: Hono middleware fetching session and injecting user+session into context
  modified:
    - apps/api/src/index.ts: CORS middleware, auth handler mount, session middleware
    - apps/api/package.json: better-auth + @better-auth/drizzle-adapter dependencies
    - .env.example: BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID/SECRET
    - pnpm-lock.yaml: lockfile update with new auth packages

key-decisions:
  - "Used app.on(['POST','GET'], ...) instead of app.all() for auth handler mount, matching official Better Auth Hono integration docs"
  - "Added trustedOrigins config to auth.ts allowing admin app origin (localhost:3000) for CSRF origin validation"
  - "Custom user fields (tenantId, role, branchId) set to input:false to prevent users from self-assigning tenant context"
  - "crossSubDomainCookies enabled for future multi-subdomain architecture (admin.gajantraders.com → api.gajantraders.com)"
  - "CORS middleware registered before auth handler to handle OPTIONS preflight requests correctly"

patterns-established:
  - "Auth handler mount: app.on(['POST','GET'], '/api/auth/*') with raw request forwarding"
  - "Session injection: middleware uses auth.api.getSession() and sets user/session on Hono Variables"
  - "CSRF origin trust: trustedOrigins lists all allowed origins for POST requests"
  - "Custom field isolation: additionalFields with input:false for tenant-scoped fields"

requirements-completed:
  - AUTH-01

duration: 45min
completed: 2026-06-13
---

# Phase 02 Plan 02: Better Auth Integration Summary

**Better Auth v1.6.18 with Drizzle adapter, email/password auth, Google OAuth placeholder, custom tenant fields (tenantId/role/branchId), session middleware, and CORS+CSRF origin trust for multi-tenant Hono API**

## Performance

- **Duration:** 45 min
- **Completed:** 2026-06-13
- **Tasks:** 2 (combined into 1 commit)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- Installed better-auth and @better-auth/drizzle-adapter in apps/api
- Created auth.ts with email/password authentication, Google OAuth placeholder, custom user fields (tenantId, role, branchId with input:false)
- Created middleware/auth.ts that fetches session via auth.api.getSession() and injects user+session into Hono context Variables
- Updated index.ts with CORS config for admin app, Better Auth handler at /api/auth/*, and session middleware
- Added BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID/SECRET to .env and .env.example
- Added trustedOrigins config for CSRF origin validation against admin app origin
- Verified server-side auth flow works: signup → signin → session retrieval all pass

## Task Commits

All work committed as a single atomic commit:

1. **All tasks (1)** - `257a9e4` (feat: complete Better Auth integration with Drizzle adapter)

**Plan metadata:** (included in above commit)

_Note: No separate plan metadata commit needed — summary and state updates were handled as part of the same session._

## Files Created/Modified

- `apps/api/src/auth.ts` (66 lines) - Better Auth instance: Drizzle adapter for pg, email/password with autoSignIn, Google OAuth, custom fields (tenantId, role, branchId), trustedOrigins, cross-subdomain cookies
- `apps/api/src/middleware/auth.ts` (37 lines) - Session middleware: calls auth.api.getSession(raw.headers), sets user+session on Hono context Variables
- `apps/api/src/index.ts` (44 lines) - Hono server: CORS (localhost:3000), auth handler at /api/auth/*, session middleware for all routes, health check
- `apps/api/package.json` - Added better-auth@1.6.18, @better-auth/drizzle-adapter@1.2.8
- `.env.example` - Added BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID/CLIENT_SECRET, NEXT_PUBLIC_API_URL
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made

1. **app.on(['POST','GET']) for auth mount** — Used explicit method list instead of app.all() to match the official Better Auth Hono integration docs
2. **trustedOrigins config** — Added to auth.ts to explicitly allow localhost:3000 origin for CSRF validation. Required because Better Auth's built-in origin validation rejects requests from non-trusted origins. Without this, admin app POST requests (sign-in, sign-up) would be blocked with "Invalid origin"
3. **Custom fields with input:false** — tenantId, role, branchId marked input:false to ensure users cannot self-assign during signup. These must be set server-side by admin/superadmin API
4. **crossSubDomainCookies.enabled: true** — Enabled for future subdomain architecture where admin and API run on different subdomains

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added trustedOrigins configuration**
- **Found during:** Task 2 (Testing auth endpoints)
- **Issue:** Plan didn't specify trustedOrigins. Better Auth v1.6.18's built-in CSRF protection validates the Origin header against trusted origins. Without this, POST requests to sign-in/sign-up from admin app (localhost:3000) would be rejected with "Invalid origin"
- **Fix:** Added `trustedOrigins: ['http://localhost:3000', 'http://localhost:3001']` to the Better Auth config
- **Files modified:** apps/api/src/auth.ts
- **Verification:** Sign-in/sign-up with Origin: http://localhost:3000 passes validation
- **Committed in:** 257a9e4 (plan commit)

**2. [Rule 3 - Blocking] Discovered Better Auth v1.6.18 sign-up endpoint path**
- **Found during:** Task 2 verification
- **Issue:** Plan verification used `/api/auth/sign-up` but Better Auth v1.6.18 registers the endpoint at `/sign-up/email` (internal path), making it accessible at `/api/auth/sign-up/email`. GET endpoints like `/api/auth/list-sessions` have no extra path segment.
- **Fix:** Updated internal documentation and testing to use the correct endpoint paths. The plan's verification script was also incorrect.
- **Files modified:** None (documentation only)
- **Verification:** POST `/api/auth/sign-up/email` with JSON body returns 200 and creates user
- **Committed in:** 257a9e4

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both fixes necessary for correct operation. trustedOrigins prevents CSRF failures, endpoint path correction prevents 404 errors.

## Issues Encountered

- **Better Auth v1.6.18 sign-up path discovery:** The plan specified `/api/auth/sign-up` but the actual Better Auth endpoint is at `/api/auth/sign-up/email`. This is because Better Auth's internal register is `createAuthEndpoint("/sign-up/email", ...)`. Other endpoints like `/sign-in/email`, `/get-session`, `/list-sessions` follow a similar pattern. GET routes like `/get-session` and `/list-sessions` have no extra path segment.
- **CORS + CSRF interaction:** CORS middleware in Hono allows the cross-origin request, but Better Auth independently validates the Origin header. Both layers must be configured. trustedOrigins is the Better Auth side of this.
- **Non-browser testing:** curl/fetch from Node.js doesn't send Origin headers by default, causing 403 "Missing or null Origin"/"Invalid origin" errors. Browser clients send Origin automatically. Server-side API (`auth.api.signInEmail()`) is the correct server-to-server pattern.

## Key Verification Results

```
=== Server-side API (Test 1: Sign Up) ===
✓ Signup successful
  User ID: yg3v3jsTIYKwIuKQMg7ZszjLsyaenW3P
  Role: customer (default from additionalFields)
  Token: onuKocat3xamf4f...

=== Test 2: Sign In ===
✓ Signin successful
  Keys: redirect, token, url, user
  User ID: yg3v3jsTIYKwIuKQMg7ZszjLsyaenW3P

=== Test 3: Wrong password ===
✓ Correctly rejected: UNAUTHORIZED "Invalid email or password"
```

## User Setup Required

None - no external service configuration required for local dev.

**Optional:** Google OAuth requires client ID/secret from Google Cloud Console for production use. Until configured, a warning is logged but all email/password flows work correctly.

## Next Phase Readiness

- **Plan 02-03 (Permissions):** Permissions package (`@repo/permissions`) already created. Can now add CASL integration with auth session.
- **Plan 02-04 (Admin Login UI):** Better Auth endpoints available at `/api/auth/*`. Admin login page can call `sign-in/email` and `sign-up/email`. CORS configured for localhost:3000.
- **Plan 02-05 (Tenant Resolver):** Session middleware provides user data including tenantId. Tenant resolver can use this to scope queries.
- **Blockers:** None. Better Auth operational with email/password auth.

## Self-Check: PASSED

- [x] `apps/api/src/auth.ts` (66 lines) — Found
- [x] `apps/api/src/index.ts` (44 lines) — Found
- [x] `apps/api/src/middleware/auth.ts` (37 lines) — Found
- [x] `.env.example` (16 lines) — Found
- [x] `02-02-SUMMARY.md` — Found
- [x] Commit `257a9e4` — Verified in git log
- [x] Requirement `AUTH-01` — Marked complete in REQUIREMENTS.md

---

*Phase: 02-auth-multi-tenancy*
*Plan: 02*
*Completed: 2026-06-13*
