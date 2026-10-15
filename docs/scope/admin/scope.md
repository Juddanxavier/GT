# Scope: Admin App

The internal operations surface for Gajan Traders and Lanka Mahal. Staff and tenant admins use it to manage shipments, customers, quotations, invoices, branches, users, rate cards, and reports across both organizations, while staying inside their tenant boundary.

**Build approach:** Tracer Bullet (each redesigned area built end to end and working before the next).
**Workflow:** Alpha (after develop, run check verify on the real app; no separate test suite or second model review unless a feature needs it). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Admin shell & navigation | existing | existing |
| 2 | Shipments management | existing | existing |
| 3 | Invoices management | existing | existing |
| 4 | Customers & invitations | existing | existing |
| 5 | Branches & rate cards | existing | existing |
| 6 | Audit log & reports | existing | existing |
| 7 | Notifications & realtime | existing | existing |
| 8 | UI foundation & tokens | Foundation | done |
| 9 | Accessibility pass | Foundation | in-progress |
| 10 | Type safety pass | Foundation | planned |
| 11 | Dashboard & analytics redesign | Slice 1 | planned |
| 12 | Shipments & detail redesign | Slice 2 | planned |
| 13 | Customers, profiles & bulk actions | Slice 3 | planned |
| 14 | Reports & exports redesign | Slice 4 | planned |
| 15 | Global search (Cmd+K) | Slice 5 | planned |
| 16 | Settings & notification delivery log | Slice 6 | planned |
| 17 | Mobile, performance & polish | Slice 7 | planned |
| 18 | Notification delivery log backend | Blocked | planned |
| 19 | Admin retheme | Foundation | in-progress |
| 20 | Server rendering pass | Slice 7 | planned |
| 21 | Query caching & session resilience | Slice 7 | planned |
| 22 | End to end smoke tests | Slice 8 | planned |

## Existing

### 1. Admin shell & navigation · existing
Sidebar, header, breadcrumbs, search dialog, idle timeout, and the role-gated dashboard layout already ship. code in `apps/admin/app/(dashboard)/layout.tsx`, `apps/admin/components/app-shell/`

### 2. Shipments management · existing
List with KPI row, filters, create modal, route journey stepper, invoice panel, tracking timeline, and detail page. code in `apps/admin/app/(dashboard)/shipments/`, `apps/admin/components/shipments/`

### 3. Invoices management · existing
Invoice list and detail with role-based editing and PDF generation and send. code in `apps/admin/app/(dashboard)/invoices/`, `apps/admin/lib/queries.ts`

### 4. Customers & invitations · existing
Customer list, customer assigner, invitation list, and create flow. code in `apps/admin/app/(dashboard)/customers/`, `apps/admin/app/(dashboard)/invitations/`

### 5. Branches & rate cards · existing
Branch management and a rate card editor with country input and shipping rates. code in `apps/admin/app/(dashboard)/branches/`, `apps/admin/app/(dashboard)/rate-cards/`

### 6. Audit log & reports · existing
Audit timeline with grouped events and a reports page with KPI and status breakdown. code in `apps/admin/app/(dashboard)/audit/`, `apps/admin/app/(dashboard)/reports/`

### 7. Notifications & realtime · existing
Notification list and preferences pages plus a Socket.IO realtime client for unread counts. code in `apps/admin/app/(dashboard)/notifications/`, `apps/admin/lib/socket.ts`

## Foundation

### 8. UI foundation & tokens · done
One design system for the whole admin surface, promoted into `@repo/ui`, so every redesigned area shares the same tokens, table, and state primitives instead of the ad hoc styles that exist today.
**Done when:** shared tokens plus a DataTable, FilterBar, EmptyState, ErrorState, and LoadingState exist in `@repo/ui` and at least one admin page uses them in light and dark mode.
- [x] Design it (spec): `/architect UI foundation & tokens`
- [x] Build it: `/develop UI foundation & tokens`
   - [x] Shared tokens + admin DESIGN.md (`0001-a`: token move, new token pairs, CSS resolution) (AC-1, AC-2)
   - [x] Shared DataTable on TanStack (AC-3)
   - [x] State + display components + status reconciliation (`0001-c`: status config, EmptyState/ErrorState/LoadingState, PageHeader, FilterBar, StatusBadge) (AC-4, AC-5, AC-7)
   - [x] Migrate shipments list as the end to end proof (AC-3, AC-5)
   - [x] Accessibility + light/dark pass across shared components (AC-6)
- [x] Verify it: `/check verify UI foundation & tokens`
Spec [0001](../../specs/admin/0001-ui-foundation-tokens/index.md) · code in `packages/ui/src/`, `apps/admin/app/globals.css`, `apps/admin/DESIGN.md`, `apps/admin/components/shipments/shipments-table.tsx`, `apps/admin/app/(dashboard)/shipments/page.tsx`

### 9. Accessibility pass · in-progress
Bring the admin surface to WCAG AA so color is never the only signal, focus is trapped in modals, and toasts and tables announce correctly.
**Done when:** status indicators carry a non-color signal, modals trap focus, toasts have `role="alert"` and `aria-live`, and every interactive control is keyboard reachable.
- [x] Design it (spec): `/architect accessibility pass`
- [x] Build it: /develop accessibility pass
   - [x] Baseline captured and root `lint` widened so CI gates the admin (AC-10) — built as `biome lint apps/api/src packages && pnpm --filter admin lint`, not `turbo run lint`, because the portals' `next lint` is broken on Next 16; deviation recorded in `apps/admin/DESIGN.md`
   - [x] Shared `ConfirmDialog` replaces every `window.confirm` and hand drawn overlay; unnamed modals get names (AC-2)
   - [x] Non-color signals on KPI trend, status breakdown, sparklines, unread count; toast live regions fixed (AC-1, AC-3)
   - [x] ARIA state sweep, Cmd+K rebuilt on HeroUI ComboBox, list tables named (AC-4, AC-5, AC-6)
   - [x] Headings and landmarks, route focus, reduced motion, zero a11y lint errors, DESIGN.md rules (AC-7, AC-8, AC-9, AC-10)
- [ ] Verify it: /check verify accessibility pass
Spec [0002](../../specs/admin/0002-accessibility-pass.md) · code in `packages/ui/src/confirm-dialog.tsx`, `packages/ui/src/page-header.tsx`, `apps/admin/components/page-header.tsx`, `apps/admin/components/search-dialog.tsx`, `apps/admin/components/use-table-header-scope.ts`, `apps/admin/app/(dashboard)/layout.tsx`, `apps/admin/app/globals.css`, `biome.json`, `apps/admin/DESIGN.md`

### 10. Type safety pass · needs a decision
Replace the remaining `Record<string, unknown>` casts on session user and mutation payloads with named interfaces, so payload shape errors are caught at compile time. The hand written API types in `lib/queries/types.ts` are replaced by types generated from the API's published contract (see `apps/api` scope), so a backend field change breaks the build instead of shipping silently.
**Done when:** `SessionUser` is exported and used everywhere session data is read, every mutation in `lib/queries.ts` takes a typed payload, and API response types come from the generated contract rather than a hand maintained file; `check-types` passes clean.
- [ ] Design it (spec): `/architect type safety pass`

### 19. Admin retheme · in-progress
Move the admin off its cyan accent and zinc neutrals onto an emerald accent over slate blue gray, give in transit its own blue status so it stops colliding with delivered, put every chart series on one six step ramp, and swap Inter for Geist with Geist Mono for tracking numbers and label codes.
**Done when:** both themes are emerald on blue gray with Geist rendering, no two shipment statuses share a color, every chart color comes from the one ramp, and the contrast verifier passes with zero failures in both themes.
- [x] Design it (spec): `/architect admin retheme`
- [ ] Build it: /develop Admin retheme
   - [x] Emerald accent and blue gray neutrals in both theme blocks, plus the `--transit` pair and the `status-config.ts` remap (`0001-a` tasks 5, 6) (AC-A5, AC-A6, AC-A7)
   - [x] App wiring: `--color-brand`, `--ops-accent`, `.ops-mono`, Geist and Geist Mono in `layout.tsx`, and the stepper foreground fix (tasks 7, 8) (AC-A5, AC-A9)
   - [x] Every chart, KPI, and status color moved onto the six step ramp, and the two reports status cells split (tasks 9, 10) (AC-A7, AC-A8)
   - [ ] Heading tracking, contrast verifier run clean, DESIGN.md rebuilt, then lint, type check, build, and the visual pass (tasks 11 to 14) (AC-A9, AC-A10, AC-A11)
- [ ] Verify it: /check verify Admin retheme
Spec [0001-a](../../specs/admin/0001-ui-foundation-tokens/0001-a-shared-tokens-and-designmd.md) · code in `packages/ui/src/tokens.css`, `packages/ui/src/status-config.ts`, `apps/admin/app/layout.tsx`, `apps/admin/app/globals.css`, `apps/admin/app/icon.svg`, `apps/admin/DESIGN.md`

## Slice 1: Dashboard & analytics redesign

### 11. Dashboard & analytics redesign · needs a decision
Rework the operational and superadmin dashboards so KPIs, alerts, charts, and the per-entity breakdown are fast, dark-mode correct, and readable at a glance.
**Done when:** the dashboard loads without layout shift, KPI sparklines render distinct gradients, dark mode holds contrast, and a loading and an error state render.
- [ ] Design it (spec): `/architect dashboard & analytics redesign`

## Slice 2: Shipments & detail redesign

### 12. Shipments & detail redesign · needs a decision
Redesign the shipments list and the detail page so filtering, status scanning, and the tracking timeline are clear, and tab content loads only when opened.
**Done when:** the list filters reflect in the URL, KPI gradient IDs no longer collide, tab data loads on open rather than on mount, and empty and error states render.
- [ ] Design it (spec): `/architect shipments & detail redesign`

## Slice 3: Customers, profiles & bulk actions

### 13. Customers, profiles & bulk actions · needs a decision
Add a per-customer profile page and multi-select bulk actions on the lists, so staff can act on many records without opening each one.
**Done when:** a customer profile shows their shipments, invoices, and contact details, and a staff user can multi-select rows and apply a bulk assignment or status change.
- [ ] Design it (spec): `/architect customers, profiles & bulk actions`

## Slice 4: Reports & exports redesign

### 14. Reports & exports redesign · needs a decision
Redesign reports with status and branch charts plus CSV export, so the numbers can be read and shared without a spreadsheet scrape.
**Done when:** the reports page renders status and branch charts, CSV export downloads the current filtered set, and charts have accessible labels.
- [ ] Design it (spec): `/architect reports & exports redesign`

## Slice 5: Global search (Cmd+K)

### 15. Global search (Cmd+K) · needs a decision
A global command palette that searches shipments, customers, and invoices from anywhere, replacing the need to navigate first. Note from the Oct 15 replan: a working palette already ships (`apps/admin/app/(dashboard)/search/page.tsx`, `apps/admin/components/search-dialog.tsx`, rebuilt on the HeroUI ComboBox during spec 0002), so this feature is a redesign and extension of it, and it must keep the combobox semantics from spec 0002 AC-5.
**Done when:** Cmd+K opens a palette, typing queries across the three entity types, results are keyboard navigable, and selecting one routes to its page.
- [ ] Design it (spec): `/architect global search (Cmd+K)`

## Slice 6: Settings & notification delivery log

### 16. Settings & notification delivery log · needs a decision
A read only settings page plus a delivery log view for sent email and WhatsApp notifications, so an operator can confirm what a customer received.
**Done when:** the settings page shows tenant and provider config read only, on top of the delivery log backend (feature 18), and the log lists sends with status and timestamp.
- [ ] Design it (spec): `/architect settings & notification delivery log`

### 18. Notification delivery log backend · blocked by feature 16 design
The delivery log needs a new `notification_delivery` table and a provider write path before any UI can show it. This is the decision feature 16 depends on.
**Done when:** every email and WhatsApp send writes a delivery row with status, provider, and timestamp, and the API can list them per tenant.
- [ ] Design it (spec): `/architect notification delivery log backend`

## Slice 7: Mobile, performance & polish

### 17. Mobile, performance & polish · needs a decision
Make the list tables usable on small viewports, split the heaviest pages (rate cards 38 KB, audit and reports 25 KB each, branches detail 20 KB), and shed the dead dependencies so the admin stays fast as it grows.
**Done when:** every data table scrolls correctly on mobile, the heaviest pages are code split into feature components, `react-flagkit` and other unused deps are removed, and the build reports no dead bundles.
- [ ] Design it (spec): `/architect mobile, performance & polish`

### 20. Server rendering pass · needs a decision
Move the read heavy pages off client side fetching where it pays: server components fetch the first paint data, so lists and dashboards arrive with HTML instead of a spinner, and client components stay for interaction only.
**Done when:** the main list and detail pages render their first data on the server, the client bundle no longer fetches what the server already had, and loading states still cover any client side refetch.
- [ ] Design it (spec): `/architect server rendering pass`

### 21. Query caching & session resilience · needs a decision
Tune TanStack Query across the admin (only 3 hooks set any stale time today) and refresh the session before it expires, so navigation feels instant and users are not dropped mid action by a silent 401.
**Done when:** list queries declare explicit stale times and prefetch on hover, mutations apply optimistic updates where safe, and an expired session refreshes or lands on login with a clear message instead of a failed request.
- [ ] Design it (spec): `/architect query caching & session resilience`

## Slice 8: End to end confidence

### 22. End to end smoke tests · needs a decision
A small browser suite over the flows that hurt most when they break: sign in, create a shipment, generate and send an invoice. Only unit tests exist today, so a broken mutation ships unnoticed.
**Done when:** the three flows run headless against a seeded environment, fail loudly with a screenshot on breakage, and are runnable in one command alongside the existing vitest run.
- [ ] Design it (spec): `/architect end to end smoke tests`

## Deferred
Out of scope for this pass, kept so the plan stays honest.
- **Portal accessibility pass** (from spec 0002): `apps/customer` and `apps/lanka-mahal` owe the same WCAG AA pass. Their violations already show up in the root Biome run; the fixes wait.
- **jest-axe regression tests** (from spec 0002): only worth adding if accessibility regressions appear after the pass ships.
- **Customer portal changes**: none of this touches `apps/customer` or `apps/lanka-mahal`.
- **Tenant landing pages**: brand imagery and landing work stays in Phase 4.
- **Socket.IO to SSE migration**: considered for bundle size, deferred until measured.
- **Nonce based CSP**: stronger script policy, deferred until Next.js middleware work is scheduled.

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+) |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** | boxes you ran ticked, skipped ones marked skipped; for Alpha the suggested point is after `/check verify` |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default, what runs after `/develop`: **Alpha** = `/check verify`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.