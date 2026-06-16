# Phase 8: Admin Dashboard & Intelligence

## Goal

Staff see real-time operational KPIs and exception alerts at a glance on a single dashboard page, with data updating via Socket.IO push (no manual refresh needed).

## Depends On

- Phase 5 (Tracking Engine) — tracking events, statuses, carrier data
- Phase 7 (Invoices) — invoice amounts for revenue KPIs

## Requirements

- ADMIN-03: Dashboard KPIs with real-time updates

## Success Criteria

### For tenant-admin:
1. Dashboard displays In Transit, Out for Delivery, Delivered Today, Exceptions, Revenue This Month, and Quotation Conversion Rate — all from server-side aggregates, scoped to their org
2. Branch filter dropdown lets them drill into a specific branch's KPIs
3. Status distribution (donut chart) and shipments-per-day trend (bar chart) render with data from the API
4. Stale/exception alert list highlights shipments needing attention (stale >72h, overdue past ETA, exceptions)

### For staff:
5. Same dashboard as tenant-admin but pre-scoped to their assigned branch — no branch filter, just a read-only badge showing their branch name

### For superadmin:
6. Cross-tenant aggregate KPIs (total shipments, revenue, customers across all orgs)
7. Per-tenant breakdown table showing each org's stats (shipments, in-transit, delivered, revenue, branches)
8. Stacked bar chart showing shipments per day, segmented by tenant

### All roles:
9. Dashboard metrics update via Socket.IO push as shipments are created/updated/tracked — no page refresh needed
10. All data respects role-based scoping via `queryScope()` — superadmin sees all, tenant-admin sees org, staff sees branch

## Execution Order

| # | Plan | Effort | Depends On |
|---|------|--------|------------|
| 1 | 08-01 — KPI Data API + Exception Engine | Small | Nothing |
| 2 | 08-02 — Socket.IO Wiring (server + client) | Medium | 08-01 |
| 3 | 08-03 — Dashboard UI with Tremor Charts | Medium | 08-01, 08-02 |
