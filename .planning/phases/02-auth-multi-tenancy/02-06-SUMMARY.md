# Plan 02-06 Summary: Route Guards — CASL Authorization Middleware

## Status: ✅ Completed

### Output
- `apps/api/src/middleware/authorization.ts` — CASL-powered route guard middleware

### Middleware Exports
- `requireRole(roles)` — Role-based route guards (staff-only routes)
- `requireAbility(action, subject)` — Fine-grained CASL checks (bill amount writes)
- `requireResourceAbility(action, subject, resourceFn)` — Resource-scoped checks
- `getQueryScope(c)` — Drizzle WHERE filter builder

### Admin App Changes
- `apps/admin/app/layout.tsx` — Role-gated layout (redirects customers to /unauthorized)
- `apps/admin/app/unauthorized/page.tsx` — Access denied page with return link

### Files Modified
- `apps/api/src/index.ts` — Added requireRole/requireAbility imports + route examples
- `apps/api/src/middleware/authorization.ts` — New file
- `apps/admin/app/layout.tsx` — Replaced with role-gated layout
- `apps/admin/app/unauthorized/page.tsx` — New file
