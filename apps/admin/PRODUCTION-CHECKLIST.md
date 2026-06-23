# Production Readiness Checklist — Admin App

## Authentication & Authorization
- [x] **Middleware route protection** — `proxy.ts` protects all non-public routes, redirects to `/login` if no session cookie.
- [x] **Session timeout / auto-logout** — 30min idle timeout in dashboard layout. Signs out on mouse/keyboard/touch/scroll inactivity.
- [x] **Unauthorized fallback** — Redirect to `/unauthorized` for wrong-role users.
- [x] **2FA support** — Login page detects `twoFactorRedirect`, `/2fa` page exists.

## Secrets & Environment
- [x] **Admin `.env` file** — `.env.local` created with `NEXT_PUBLIC_API_URL`.
- [x] **No secrets in client bundle** — `NEXT_PUBLIC_` prefix convention followed.
- [x] **CORS_ORIGIN configured in production** — API's CORS accepts configurable origins via env var.

## Error Handling & UX
- [x] **Error boundary** — `error-boundary.tsx` present, used in login page.
- [x] **Dashboard error page** — `(dashboard)/error.tsx` with retry button.
- [x] **Loading states** — `(dashboard)/loading.tsx` with skeleton animation.
- [x] **404 page** — Custom `not-found.tsx` with link to home.
- [x] **Global error page** — Root `error.tsx` catches unhandled errors app-wide.

## API Communication
- [x] **Non-JSON response handling** — `fetchJson` helper catches JSON parse errors gracefully.
- [x] **Retry logic** — 1 retry on network errors (TypeError/AbortError) before failing.
- [x] **Request timeout** — 15s timeout via `AbortController` on all API calls.
- [x] **X-Tenant-ID / X-Branch-ID** — Sent from client via module-level mutable state.

## Security Headers
- [ ] **CSP** — Only set at API level. Admin app has no Content-Security-Policy. Next.js generates inline scripts/styles — needs a `nonce`-based CSP.
- [x] **HSTS** — Set via `next.config.ts` `headers()` for all routes.

## Build & Deployment
- [x] **Vercel config** — `vercel.json` at root with `rootDirectory: apps/admin` and monorepo-aware build/install commands.
- [x] **Clean TypeScript build** — No errors. 18 routes + proxy successfully compiled.
- [x] **Build-time env validation** — `next.config.ts` validates `NEXT_PUBLIC_API_URL` (warns on Vercel, throws locally).
- [x] **Explicit `NODE_ENV=production`** — Set automatically by Vercel.

## Monitoring
- [x] **Sentry in admin app** — `instrumentation.ts` + `sentry.client.config.ts` + `global-error.tsx`. Catches server and client errors. DSN from root `.env`.
- [x] **Health check** — `GET /api/health` returns `{ status: 'ok', ts }`.

## Vercel Deployment

### Pre-deploy (Vercel Dashboard → Project Settings)
1. **Root Directory**: `apps/admin` (auto-detected from `vercel.json`)
2. **Framework**: Next.js (auto-detected)
3. **Build Command**: `cd ../.. && pnpm build --filter=admin` (auto-detected)
4. **Install Command**: `cd ../.. && pnpm install` (auto-detected)

### Required Environment Variables
| Variable | Production Value |
|----------|-----------------|
| `NEXT_PUBLIC_API_URL` | `https://your-api-domain.com` |
| `SENTRY_DSN` | From `.env` |

### Notes
- `proxy.ts` guards routes — runs on Vercel Edge Runtime natively
- No `output: 'standalone'` — Vercel serves Next.js natively
- Session timeout (30min idle) is client-side only
- Root `.env` is NOT deployed — enter env vars in Vercel dashboard
