# Plan 02-03 Summary: CASL Permissions Package

## Status: ✅ Completed

### Output
- `packages/permissions/package.json` — `@repo/permissions` with `@casl/ability` dependency
- `packages/permissions/src/types.ts` — Role, Subject, Action, PermissionContext, ResourceContext types
- `packages/permissions/src/abilities.ts` — `defineAbilityFor()` with rules for all 4 roles + `can()` helper
- `packages/permissions/src/guards.ts` — `canAccess()`, `queryScope()`, `hasRole()` data-scoping helpers
- `packages/permissions/src/index.ts` — Public API re-exports

### Key Decisions
- CASL ability-based over simple role checks (allows `cannot` exceptions like staff-read-only billAmount)
- Guards separate from abilities (WHAT vs WHERE separation)
- `all` subject added for superadmin `manage('all')` support

### Files Modified
- Added `@repo/permissions` workspace package
- `apps/api/package.json` updated with `"@repo/permissions": "workspace:^"`

### Verification
- All 4 role ability rules tested
- Staff: can read billAmount, cannot update ✓
- Customer: can create quotes, cannot manage tenants ✓
- Superadmin: full manage on all subjects ✓
