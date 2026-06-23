# Phase 11: RBAC Hierarchy Enforcement

## Role Matrix

| Capability | Staff | Tenant Admin | Superadmin |
|-----------|-------|-------------|------------|
| **Scope** | Own branch only | Entire tenant | All tenants |
| **Create shipment** | ✅ own branch | ✅ | ✅ |
| **Edit shipment** | ✅ own branch (no billAmount) | ✅ | ✅ |
| **Delete shipment** | ❌ | ✅ | ✅ |
| **Create/edit/delete quotation** | ✅ own branch | ✅ | ✅ |
| **View customers** | Branch-linked only | All tenant | All |
| **Create/edit/delete customers** | ❌ | ✅ | ✅ |
| **View users** | Branch only, read-only | All tenant | All |
| **Create users** | ✅ own branch | ✅ | ✅ |
| **View branches** | Own branch only, read-only | All tenant | All |
| **Create/edit/delete branches** | ❌ | ✅ | ✅ |
| **Cross-branch access** | JSON 403 | N/A | N/A |
| **Nav visibility** | Visible, scoped | Visible | Visible |

## Guard Pattern
- `requireBranchScope` middleware (route-level, for staff)
- `queryScope` data filters (existing, enhanced for branch-scoped customer/user queries)

## Scope Rules
- **Staff**: `{ tenantId, branchId }` — only records linked to their branch
- **Tenant-admin**: `{ tenantId }` — entire tenant (no change)
- **Superadmin**: no scope limit (no change)
