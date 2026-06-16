# Phase 2: Auth & Multi-Tenancy — Complete

## Summary

All 7 plans executed successfully. The multi-tenant auth foundation is fully built:

### What was built

| Plan | Deliverable | Status |
|------|-------------|--------|
| 02-01 | Drizzle tenant schema (tenant, branch, tenant_domain, user tables) + seed | ✅ |
| 02-02 | Better Auth v1.6.18 + Drizzle adapter + session middleware + CORS | ✅ |
| 02-03 | `@repo/permissions` CASL package — abilities + guards for 4 roles | ✅ |
| 02-04 | Admin login UI — shadcn components + Better Auth client + Tailwind | ✅ |
| 02-05 | Tenant resolver middleware — domain cache + host/header/user strategies | ✅ |
| 02-06 | CASL authorization middleware — requireRole/requireAbility + admin role gates | ✅ |
| 02-07 | PostgreSQL RLS policies — defense-in-depth tenant isolation | ✅ |

### Files created

**API (`apps/api/src/`):**
- `auth.ts` — Better Auth instance config
- `middleware/auth.ts` — Session middleware (getSession + inject context)
- `middleware/tenant.ts` — Tenant resolver (header → user → domain)
- `middleware/authorization.ts` — CASL route guards
- `db/rls.ts` — RLS session variable helpers
- `db/migrations/0003_add_rls.sql` — RLS policies
- `db/apply-rls.ts` — Apply script

**Permissions package (`packages/permissions/src/`):**
- `types.ts` — Role, Subject, Action, PermissionContext, ResourceContext
- `abilities.ts` — defineAbilityFor() with 4 roles
- `guards.ts` — canAccess(), queryScope(), hasRole()

**Admin app (`apps/admin/`):**
- `app/globals.css` — Tailwind v4 + shadcn theme
- `app/layout.tsx` — Role-gated layout
- `app/login/page.tsx` — Login form (email/password + Google OAuth)
- `app/unauthorized/page.tsx` — Access denied page
- `app/page.tsx` — Auth-aware dashboard placeholder
- `lib/auth-client.ts` — Better Auth client
- `lib/utils.ts` — cn() utility
- `components/ui/` — Button, Card, Input, Label, Separator
- `components.json`, `postcss.config.mjs` — shadcn/Tailwind config

### Key Architecture

```
Request → CORS → Better Auth handler (/api/auth/*) → Session → Tenant → RLS → Route
                                                        ↓           ↓       ↓
                                                  user+session  tenantId  app.tenant_id
                                                        ↓           ↓
                                                  └──→ PermissionContext ←──┘
                                                        ↓
                                              requireRole / requireAbility
                                                        ↓
                                                  Route handler
```

### Pending
- Run `pnpm --filter api tsx src/db/apply-rls.ts` to apply RLS migration to NeonDB
