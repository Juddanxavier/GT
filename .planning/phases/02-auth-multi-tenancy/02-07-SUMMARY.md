# Plan 02-07 Summary: RLS Policies & Phase 2 Verification

## Status: ✅ Completed

### Output
- `apps/api/src/db/rls.ts` — `setRLSTenantContext()` and `getRLSTenantContext()` helpers
- `apps/api/src/db/migrations/0003_add_rls.sql` — RLS policies for tenant, branch, tenant_domain, user tables
- `apps/api/src/db/apply-rls.ts` — Script to apply RLS migration to NeonDB
- `apps/api/src/middleware/tenant.ts` — Updated to call `setRLSTenantContext()` after tenant resolution

### RLS Policies
- **tenant_isolation** on `tenant` table — via `is_tenant_accessible(id)` function
- **branch_isolation** on `branch` table — checks `tenant_id`
- **tenant_domain_isolation** on `tenant_domain` table — checks `tenant_id`
- **user_isolation** on `user` table — checks `tenant_id` or superadmin bypass
- Superadmin bypass via `app.tenant_id = 'superadmin'`

### RLS Application
```bash
pnpm --filter api tsx src/db/apply-rls.ts
```

### Files Modified
- `apps/api/src/db/rls.ts` — New file
- `apps/api/src/db/migrations/0003_add_rls.sql` — New file
- `apps/api/src/db/apply-rls.ts` — New file
- `apps/api/src/middleware/tenant.ts` — Added RLS context setter after tenant resolution
