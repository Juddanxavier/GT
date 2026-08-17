# Phase 8: Admin Operational Features — Context

## Overview

Ship the remaining high-value admin features identified after the dashboard polish: customer profiles, report export + charts, global search, and a settings page — plus KPI dark-mode support.

## Decisions

### 1. Customer profiles
- New `GET /api/invoices` filter `userId` (small API addition; shipments list already supports `customerId`).
- New page `/customers/[id]` — profile header (name, email, phone, branch, role) + Shipments table + Invoices table, both filtered to the customer.
- Read-only for now. Editing stays on `/customers/[id]/edit`.

### 2. Reports export & charts
- Use existing aggregates only — no new API work: `/api/reports/shipments` (summary, revenue, `statusDistribution`, `branchComparison`) and `/api/reports/shipments/data` + `/quotations/data` (paginated record rows).
- CSV export: client-side Blob download of fetched records (same pattern as shipments page).
- Charts: reuse in-file `CardMiniChart` / `Sparkline` — no new chart library.

### 3. Global search (Cmd+K)
- Backend already exists: `GET /api/search?q=` (shipments + customers + invoices, tenant-scoped).
- Frontend modal component, debounced input, keyboard shortcut, click-to-navigate. Gated on the existing tenant/branch scope (superadmin searches current filtered tenant).

### 4. Settings page
- Read-only operations page for now (no settings persistence layer exists):
  - 17TRACK quota card (reuse `/api/dashboard/17track-quota` → extract from dashboard `TrackQuotaCard`).
  - Branch summary (reuse `useDashboardBranches`).
  - Notification template listing (from `@repo/auth-config` buildEmailHtml constants) — display only.
- Editing/templates save deferred until a settings store exists.

### 5. Dark-mode polish (KPI cards)
- Dashboard local `KpiCard` used fixed pastel backgrounds (`bg-amber-50`) that wash out dark mode. Add `dark:` variants (translucent `/10` tinted cards, `-300` text). Trend pills same treatment.
- Shared `components/kpi-card.tsx` already uses theme tokens — no change.

### Deferred (recorded, not planned)
- **Notifications log (delivery outcomes)**: no send-result data is persisted (email/WhatsApp go through BullMQ + LRU; only logger + audit events exist). Needs a `notification_delivery` table + provider write-path — separate phase.
- **Exception queue**: the Shipments page already has an `Exception` status tab + stale flags; a dedicated worklist would duplicate it.

## Current relevant files

| File | Purpose |
|------|---------|
| `apps/api/src/routes/invoices.ts` | Add `userId` list filter (line ~142) |
| `apps/api/src/routes/shipments.ts` | List already supports `customerId` |
| `apps/api/src/routes/search.ts` | Global search endpoint (exists) |
| `apps/api/src/routes/reports.ts` | Aggregates + record data (exists) |
| `apps/admin/app/(dashboard)/reports/page.tsx` | Add CSV export + charts |
| `apps/admin/app/(dashboard)/customers/page.tsx` | Link rows to new profile page |
| `apps/admin/app/(dashboard)/page.tsx` | Local `KpiCard` dark variants; `TrackQuotaCard` to extract |
| `apps/admin/app/(dashboard)/layout.tsx` | Nav — add Settings link; search modal mount |
| `apps/admin/lib/queries.ts` | Invoice/customer hooks; search hook |