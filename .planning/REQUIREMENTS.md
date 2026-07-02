# Requirements: Gajan Traders Shipment Tracking

## v1 Requirements

### UI Foundation (UI-FOUND)
- [ ] **UI-FOUND-01**: Shared DataTable component with sorting, pagination, column visibility, and action slots
- [ ] **UI-FOUND-02**: Shared PageHeader component with title, subtitle, actions, breadcrumbs
- [ ] **UI-FOUND-03**: Shared StatusBadge component with semantic color mapping
- [ ] **UI-FOUND-04**: Shared FilterBar component with text search, selects, date range, and clear/reset
- [ ] **UI-FOUND-05**: Shared ConfirmDialog component for destructive actions
- [ ] **UI-FOUND-06**: Shared EmptyState, ErrorState, LoadingState components for data-display pages
- [ ] **UI-FOUND-07**: Shared KPI/Card grid components for dashboard-style layouts
- [ ] **UI-FOUND-08**: Shared export/action bar component (CSV, print, bulk actions)
- [ ] **UI-FOUND-09**: Design token system in CSS/Tailwind for spacing, color semantics, typography scale across apps

### Admin UI Restructuring (ADMIN-UI)
- [ ] **ADMIN-UI-01**: Admin shipments page refactored to use shared DataTable, FilterBar, StatusBadge, action patterns
- [ ] **ADMIN-UI-02**: Admin customers page refactored to use shared components
- [ ] **ADMIN-UI-03**: Admin quotations page refactored to use shared components
- [ ] **ADMIN-UI-04**: Admin invoices page refactored to use shared components
- [ ] **ADMIN-UI-05**: Admin branches page refactored to use shared components
- [ ] **ADMIN-UI-06**: Admin users page refactored to use shared components
- [ ] **ADMIN-UI-07**: Admin invitations page refactored to use shared components
- [ ] **ADMIN-UI-08**: Admin reports page refactored to use shared components
- [ ] **ADMIN-UI-09**: Admin audit log page refactored to use shared components
- [ ] **ADMIN-UI-10**: Admin dashboard extraction — move inline KpiCard, charts config, and dashboard sections into named components
- [ ] **ADMIN-UI-11**: Responsive mobile layout for admin navigation and data tables
- [ ] **ADMIN-UI-12**: Consistent error boundaries, loading skeletons, and empty states across all admin pages
- [ ] **ADMIN-UI-13**: Code splitting for large admin pages (shipments detail, quotation editor) to reduce initial bundle

### Customer Portal Enhancement (CUST-PORTAL)
- [ ] **CUST-PORTAL-04**: Customer dashboard with shipment summary KPIs, recent tracking updates, alerts/warnings
- [ ] **CUST-PORTAL-05**: Customer profile management — edit name, email, password, view account details
- [ ] **CUST-PORTAL-06**: Customer quotation viewer — list quotes, view line items, accept/reject status
- [ ] **CUST-PORTAL-07**: Customer invoice viewer — list invoices, view amounts, payment status, download
- [ ] **CUST-PORTAL-08**: Customer notification preferences — opt-in/out for email and WhatsApp per event type
- [ ] **CUST-PORTAL-09**: Improved "My Shipments" page with search, filtering, status charts, pagination
- [ ] **CUST-PORTAL-10**: Responsive mobile layout for customer portal — nav, tables, tracking timeline
- [ ] **CUST-PORTAL-11**: Consistent error, loading, and empty states across customer portal
- [ ] **CUST-PORTAL-12**: Enhanced tracking timeline with carrier logo, richer status descriptions, estimated delivery visualization

### Out of Scope
- Payment processing integration — customers pay offline
- Mobile native apps — web-only (responsive)
- Multi-language/i18n — English only
- Public API for third-party integrators
- Automated billing/subscriptions
- Warehouse/inventory management

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-FOUND-01 | Phase 1 | Pending |
| UI-FOUND-02 | Phase 1 | Pending |
| UI-FOUND-03 | Phase 1 | Pending |
| UI-FOUND-04 | Phase 1 | Pending |
| UI-FOUND-05 | Phase 1 | Pending |
| UI-FOUND-06 | Phase 1 | Pending |
| UI-FOUND-07 | Phase 1 | Pending |
| UI-FOUND-08 | Phase 1 | Pending |
| UI-FOUND-09 | Phase 1 | Pending |
| ADMIN-UI-01 | Phase 2 | Pending |
| ADMIN-UI-02 | Phase 2 | Pending |
| ADMIN-UI-03 | Phase 2 | Pending |
| ADMIN-UI-04 | Phase 2 | Pending |
| ADMIN-UI-05 | Phase 2 | Pending |
| ADMIN-UI-06 | Phase 2 | Pending |
| ADMIN-UI-07 | Phase 2 | Pending |
| ADMIN-UI-08 | Phase 2 | Pending |
| ADMIN-UI-09 | Phase 2 | Pending |
| ADMIN-UI-10 | Phase 2 | Pending |
| ADMIN-UI-11 | Phase 2 | Pending |
| ADMIN-UI-12 | Phase 2 | Pending |
| ADMIN-UI-13 | Phase 2 | Pending |
| CUST-PORTAL-04 | Phase 3 | Pending |
| CUST-PORTAL-05 | Phase 3 | Pending |
| CUST-PORTAL-06 | Phase 3 | Pending |
| CUST-PORTAL-07 | Phase 3 | Pending |
| CUST-PORTAL-08 | Phase 3 | Pending |
| CUST-PORTAL-09 | Phase 3 | Pending |
| CUST-PORTAL-10 | Phase 3 | Pending |
| CUST-PORTAL-11 | Phase 3 | Pending |
| CUST-PORTAL-12 | Phase 3 | Pending |

---
*Last updated: 2026-07-02*
