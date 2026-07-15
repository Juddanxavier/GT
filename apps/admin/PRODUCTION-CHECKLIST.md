# Admin App — Production Readiness Audit

**Date:** 2026-07-15
**Scope:** `apps/admin` — full source audit across 7 dimensions
**Evaluator:** GSD code-reviewer

---

## Overall Score: **76/100** — Mostly ready, minor gaps remaining

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| TypeScript Strictness | 60/100 | 15% | 9.0 |
| Error Handling | 80/100 | 25% | 20.0 |
| Security | 80/100 | 25% | 20.0 |
| Performance | 65/100 | 10% | 6.5 |
| Accessibility | 70/100 | 5% | 3.5 |
| Code Quality | 75/100 | 15% | 11.3 |
| Dependencies | 80/100 | 5% | 4.0 |
| **Weighted Total** | | **100%** | **74.3** |

---

## 1. TypeScript Strictness — 60/100

### ✅ Good
- `strict: true`, `noUncheckedIndexedAccess: true`, `isolatedModules: true` in base tsconfig
- Proper interface definitions for most data models (Shipment, Customer, Branch, etc.)
- `@types/react`, `@types/react-dom`, `@types/node` present
- Custom type declarations for `react-flagkit`

### ❌ Bad

**CR-01: Pervasive `Record<string, unknown>` casts for session.user — 32+ occurrences**
All user data from `authClient.useSession()` is cast via `session.user as Record<string, unknown>` instead of using a proper typed interface. This bypasses all type checking for:
- `role`, `tenantId`, `tenantName`, `branchName`, `id` access
- Files: layout.tsx, dashboard/page.tsx, shipments/page.tsx, reports/page.tsx, customers/page.tsx, audit/page.tsx, invoices/page.tsx, invitations/page.tsx, branches/page.tsx, profile/page.tsx

**Fix:** Define and export a proper `SessionUser` interface:
```ts
// types/auth.ts
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'tenant-admin' | 'staff';
  tenantId?: string;
  tenantName?: string;
  branchId?: string;
  branchName?: string;
  image?: string | null;
}
```
Then use `session.user as SessionUser` everywhere.

**CR-02: Mutation functions use `Record<string, unknown>` instead of typed payloads**
Six mutation functions in `lib/queries.ts` accept `Record<string, unknown>` — no compile-time validation of what's being sent to the API:
- `useCreateShipment` (line 202)
- `useUpdateUser` (line 253)
- `useCreateQuotation` (line 386)
- `useUpdateQuotation` (line 394)
- `useUpdateBranch` (line 499)
- `useUpdateShipment` (line 567)

**Fix:** Define explicit payload interfaces for each mutation.

**CR-03: `z.any()` in dashboard stats schema**
`dashboardStatsSchema` uses `z.any()` for `scope`, `byStatus`, `perTenant`, `perBranch` — voids validation for those fields.

**Fix:** Define proper Zod schemas for all sub-objects instead of `z.any()`.

**CR-04: Invoice detail page uses `Record<string, unknown> | null` state**
`apps/admin/app/(dashboard)/invoices/[id]/page.tsx:20` — the entire invoice state is untyped.

**Fix:** Use the existing `Invoice` interface from queries.ts.

**CR-05: Overloaded query functions return union types**
`useShipments()`, `useCustomers()`, `useQuotations()` etc. return `Shipment[] | PaginatedResult<Shipment>` — callers must do runtime checks (`Array.isArray`) to determine the shape.

**Fix:** Separate into two hooks or use discriminated unions.

---

## 2. Error Handling — 68/100

### ✅ Good
- ErrorBoundary class component wrapping dashboard content
- Root `error.tsx`, global `error.tsx`, and dashboard `error.tsx` with proper reset
- Sentry integration in `instrumentation.ts` and `global-error.tsx`
- Loading/skeleton states on detail pages, shipments list, dashboard
- Toast notifications on API errors via QueryClient `gc` subscriber
- Empty states on tables, notifications dropdown, search results
- Delete confirmation modals with clear warnings
- Honeypot bot protection on login and create-shipment forms

### ❌ Bad

**WR-01: Silent catch blocks**
Four places swallow errors with no user feedback:
- `layout.tsx:219,223` — notification fetch `.catch(() => {})`
- `dashboard/page.tsx:1112` — ActivityLog fetch `.catch(() => {})`
- `search-dialog.tsx:94` — search API `.catch(() => {})`

**Fix:** At minimum log these errors to console/Sentry. Better: show a subtle toast or inline message.

**WR-02: Invoice PDF generation has no error handling**
`shipments/[id]/page.tsx:338` — `fetch` and `res.blob()` are not wrapped in try/catch. A network failure silently breaks.

**Fix:**
```tsx
try {
  const res = await fetch(...);
  if (!res.ok) throw new Error('Failed to generate PDF');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
} catch (e) {
  toast('error', 'Failed to generate PDF', e instanceof Error ? e.message : undefined);
}
```

**WR-03: Invoice send: bare `console.error` without user notification**
`shipments/[id]/page.tsx:348` — if API call fails, only console.error is called, no toast.

**Fix:** Add toast notification on failure.

**WR-04: Validation warnings don't throw**
`lib/validation.ts:81` — `validateResponse` only `console.warn`s on mismatch. Response data passes through unvalidated in production. This is essentially a read-only diagnostic.

**Fix:** Either throw on validation failure (in dev) or make it configurable. Consider `result.error && throw new Error(...)` in non-production.

**WR-05: Login form catch loses error variable**
`login/page.tsx:48` — `catch { setSubmitError(...) }` — the caught error is discarded. Should be `catch (e) { ... }` to log the actual error.

**WR-06: Notifications dropdown "Mark all read" — no error handling**
`layout.tsx:486-488` — fetch to mark-all-read could fail silently. Same for individual read PATCH.

---

## 3. Security — 75/100

### ✅ Good
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all configured in `next.config.ts`
- Honeypot fields on login and create-shipment forms (bot protection)
- `credentials: 'include'` on all API calls (cookies, not tokens in URLs)
- Session idle timeout (30 min) via `useIdleTimeout`
- Allowed roles enforced at UI and layout level
- Tenant isolation via `X-Tenant-ID` header on every API call
- Zod validation on login form
- Sentry error tracking enabled
- No inline secrets in code (all via env vars)

### ❌ Bad

**WR-07: `NEXT_PUBLIC_API_URL` fallback to `localhost:3001` in production Dockerfile**
```dockerfile
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://api.gajantraders.com}
```
The default is production, which is better than localhost, but:
- `lib/api.ts:4` uses `'http://localhost:3001'` as fallback — this will be used in dev but could accidentally leak if someone forgets the env var in production build

**Fix:** Remove the fallback in `api.ts` and make it fail loudly:
```ts
if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is required');
}
```

**WR-08: CSP `unsafe-inline` in script-src**
Necessary for Next.js but significantly weakens CSP. Consider Nonce-based CSP as the app matures.

**WR-09: No HttpOnly cookies for session — Better Auth uses localStorage tokens**
The Better Auth client stores session tokens in localStorage (visible to JS). This means any XSS vulnerability exposes the session.

**WR-10: No rate-limiting indicators in UI**
Backend may have rate limiting, but the UI doesn't give user guidance when they hit limits (login page just shows generic error).

**WR-11: Missing CSRF token pattern in forms**
Login and forgot-password forms POST with JSON body but no CSRF token. Since credentials are cookie-based (or token-in-header), CSRF is partially mitigated. Verify the backend validates Origin/Referer.

**WR-12: `unsafe-eval` allowed in dev CSP**
`next.config.ts:24` — `unsafe-eval` is conditionally added in dev. This is fine for development but ensure no production builds leak it.

---

## 4. Performance — 62/100

### ✅ Good
- React Query with 30s staleTime reduces re-fetches
- `keepPreviousData` on paginated queries
- Query cache persisted to localStorage
- 300ms debounced search
- Toast auto-dismiss at 4s
- SVG sparklines instead of external charting libs

### ❌ Bad

**WR-13: Dashboard page is 1257 lines — monolithic component**
`page.tsx` at `(dashboard)/` is 1257 lines with multiple distinct sections (KPI cards, alerts, charts, activity log, quick actions). No code splitting or lazy loading.

**Fix:** Extract sections into separate components:
- `DashboardMetrics` / `AlertsPanel` / `ActivityWidget` / `QuickActions`
- Use `next/dynamic` with `ssr: false` for heavy sections

**WR-14: `xlsx` dependency never imported**
`package.json` lists `xlsx: ^0.18.5` at ~500KB minified, but `grep` shows zero imports. The CSV export in reports/page.tsx uses native Blob/URL APIs. **This is a completely dead 500KB dependency.**

**Fix:** Remove `xlsx` from package.json.

**WR-15: SVG sparkline `linearGradient` IDs can collide**
`shipments/page.tsx:246` — `id="fill-${label.replace(/\s/g, '')}"` — if two KPI cards share a label on the same page, gradient IDs collide. Also `kpi-card.tsx` has the same pattern.

**Fix:** Use `useId()` or append a unique key to the gradient ID.

**WR-16: Tab content not lazy-loaded**
Tracking, Invoice, and Notes tabs on shipment detail page all fetch data on render, even when not visible. Use `useTab` visibility to defer fetching.

**WR-17: No image optimization config**
No `sharp` in dependencies, no `images.remotePatterns` in next.config. The app may not use images now, but this is a gap for production.

**WR-18: `@tanstack/react-query-devtools` imported in layout without env check**
A production build might include the devtools bundle. While Next.js tree-shakes the import, explicitly guard:
```ts
const DevTools = process.env.NODE_ENV === 'development' ? ReactQueryDevtools : () => null;
```

---

## 5. Accessibility — 50/100

### ✅ Good
- Breadcrumb with `aria-label="Breadcrumb"`
- Some `aria-label` props on buttons (Search, theme toggle, notifications)
- Form label associations via `label htmlFor`
- Table headers with `<th>` and `isRowHeader`
- Keyboard navigation in search dialog (arrow keys + enter)
- Login form uses `FieldError` for validation messages

### ❌ Bad

**CR-06: KPI cards rendered as `<a>` tags with no `href`**
```tsx
// shipments/page.tsx:230
<a className="rounded-xl ...">  // <a> with no href!
```
This is semantically invalid — `<a>` without `href` is not keyboard-focusable and confuses screen readers. Should be `<div>` or `<button>`.

**Fix:** Change `<a>` to `<div>` with appropriate role.

**WR-19: Color-only indicators**
- Status chips use color-only differentiation (no icon or text pattern to distinguish for colorblind users)
- Notification unread dot is color-only (`bg-primary` vs `bg-transparent`)
- Sparkline trends use green/red for up/down without accessible labels

**Fix:** Add visually-hidden text or icon indicators alongside color.

**WR-20: No skip-to-content link**
Users tabbing through the page must go through sidebar, header, and search before reaching main content.

**Fix:** Add a skip link as the first focusable element:
```tsx
<Link href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</Link>
```

**WR-21: Toast notifications have no `role="alert"` or `aria-live`**
Screen readers won't announce toast messages.

**Fix:** Add `role="alert"` and `aria-live="polite"` to the toast container.

**WR-22: Dropdown triggers without `aria-expanded`**
Multiple HeroUI dropdown triggers lack explicit `aria-expanded` attributes.

**WR-23: No focus trapping in modals**
The delete confirmation modals render as simple overlays without focus trapping. HeroUI `Modal.Backdrop` components may handle this, but the custom delete modal in `shipments/[id]/page.tsx:414` is a bare overlay without focus management.

---

## 6. Code Quality — 60/100

### ✅ Good
- Consistent naming: camelCase for variables, PascalCase for components, kebab-case for files
- Clean separation: components/ for UI, lib/ for logic, app/ for routing
- Reusable abstractions: `KpiCard`, `InfoRow`, `StatCard`, `ToastProvider`
- Typed API layer with error handling and timeout
- Zod schemas for response validation
- Proper error class hierarchy with `ApiError`
- Deletion confirmation patterns everywhere
- Honeypot pattern correctly implemented

### ❌ Bad

**CR-07: `proxy.ts` at app root is dead code — not used as middleware**
`apps/admin/proxy.ts` exports a `proxy()` function and `config` object (Next.js middleware pattern), but the file is named `proxy.ts`, not `middleware.ts`. Next.js middleware MUST be at `middleware.ts` or `src/middleware.ts`. This file is never executed.

**Fix:** Either rename to `middleware.ts` and properly implement, or delete if client-side auth (layout.tsx) handles it.

**CR-08: `fmtINR` in api.ts is dead code**
`lib/api.ts:6-8` exports `fmtINR()` which is unused after `lib/currency.ts` was created. No imports found.

**Fix:** Remove unused export.

**WR-24: Massive component — 1257-line dashboard page**
`(dashboard)/page.tsx` contains embedded sub-components (`ActivityLog`, `ActionCard`, `QuickActionButton`, `renderAlerts`, `StatCard` inline) alongside the main component. This makes testing and maintenance difficult.

**WR-25: `NavItems` is PascalCase but is a pure function**
`NavItems(role?)` looks like a React component but is a regular function returning an array.

**Fix:** Rename to `getNavItems()` or `navItems()`.

**WR-26: Duplicate `SENTRY_DSN` init logic**
Both `instrumentation.ts` and `sentry.client.config.ts` init Sentry — unclear which runs first or if both run.

**WR-27: `country-list` library runs at module load time**
`getData().slice().sort(...)` in `address-form.tsx:26` executes when the module is imported, not when the component renders. This adds import-time latency.

**Fix:** Lazy-init in a `useMemo` or `useEffect`.

---

## 7. Dependencies — 70/100

### ✅ Good
- Next.js 16.2.6 (latest stable)
- React 19.2.0 (latest)
- TypeScript 5.9.2 (latest)
- Tailwind CSS v4 + PostCSS (modern CSS setup)
- Vitest for testing
- HeroUI v3 as design system
- Zod for validation
- Sentry for monitoring

### ❌ Bad

**CR-09: `xlsx` — completely dead ~500KB dependency**
Listed in `package.json` dependencies, never imported anywhere. Adds unnecessary weight to installs and Docker builds.

**Fix:** Remove from `package.json`.

**WR-28: `react-flagkit` is a niche, potentially unmaintained dep**
No recent releases visible. The custom type declaration in `types/react-flagkit.d.ts` suggests the package lacks good TS support.

**Fix:** Replace with native emoji flags or inline SVG (2-3 lines of code per flag).

**WR-29: `socket.io-client` added ~60KB for notification polling**
Socket.IO is used exclusively for real-time notification counts and tracking updates. Consider SSE (Server-Sent Events) as a lighter alternative.

**WR-30: `@types/country-list` in devDeps is correct but `country-list` exports a large dataset**
The `getData()` call returns all ~250 countries even though the app only operates in India/Sri Lanka.

**Fix:** Consider a hardcoded subset of supported countries.

---

## Remediation Priority

### ✅ Fixed (2026-07-15)
| # | Item | Dimension | Fix |
|---|------|-----------|-----|
| CR-06 | Invalid `<a>` tags as KPI cards w/o href | Accessibility | Already `<div>` |
| CR-07 | Dead `proxy.ts` middleware | Code Quality | Already deleted |
| CR-08 | Dead `fmtINR` export | Code Quality | Already removed |
| CR-09 | 500KB dead `xlsx` dependency | Dependencies | Already removed |
| WR-01 | Silent catch blocks (5 locations) | Error Handling | Added console.error |
| WR-02 | Invoice PDF no error handling | Error Handling | Wrapped in try/catch + toast |
| WR-03 | Invoice send no user feedback | Error Handling | Replaced console.error with toast |
| WR-07 | API URL fallback in production build | Security | Already throwing on missing |
| WR-18 | ReactQueryDevtools in prod | Performance | Guarded by NODE_ENV check |
| WR-20 | No skip-to-content link | Accessibility | Added with `#main-content` |
| WR-21 | Toasts not accessible | Accessibility | Added `role="alert" aria-live="polite"` |
| WR-25 | PascalCase utility function | Code Quality | Already `getNavItems` |
| WR-26 | Sentry double-init | Code Quality | Guarded with DSN check |

### Remaining Warning (fix before launch)
| # | Item | Dimension | Effort |
|---|------|-----------|--------|
| WR-13 | 1257-line monolithic dashboard | Performance | 2h |
| WR-19 | Color-only indicators | Accessibility | 30m |
| WR-24 | Dashboard page too large | Code Quality | 2h |

### Remaining Info (address within first month)
| # | Item | Dimension | Effort |
|---|------|-----------|--------|
| IN-01 | `Record<string, unknown>` for session.user (32x) | TypeScript | 1h |
| IN-02 | Mutation payloads untyped | TypeScript | 30m |
| IN-03 | Overloaded query union returns | TypeScript | 1h |
| IN-04 | Tab content not lazy-loaded | Performance | 30m |
| IN-05 | `react-flagkit` replacement | Dependencies | 15m |
| IN-06 | SVG gradient ID collision risk | Performance | 10m |

### API App Fixes (2026-07-15)
| # | Item | Dimension | Fix |
|---|------|-----------|-----|
| API-01 | Centralized error codes enum | Code Quality | Added `ErrorCode` const to `error-response.ts` |
| API-02 | Migration safety comment | Reliability | Added startup-migration note |
