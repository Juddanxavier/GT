---
quick_id: 261018-d0z
slug: fix-ci-build-by-supplying-a-valid-absolu
status: complete
date: 2026-10-18
---

# Quick Task 261018-d0z — Summary

The two portal auth clients no longer fall back to an invalid relative URL, so the
`customer` and `lanka-mahal` builds succeed with no environment variables set. This
unblocks CI, which has been red on `main` since at least 2026-09-24.

## What changed

`apps/customer/lib/auth-client.ts` and `apps/lanka-mahal/lib/auth-client.ts` were the
only two files in the repo falling back to a relative URL:

```ts
// before — relative '/api/auth' is rejected by createAuthClient
baseURL: process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth`
  : '/api/auth',
```

Both now use the same absolute fallback as `lib/api.ts`, `next.config.ts` and every
other consumer in the codebase:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: `${API_URL}/api/auth`,
});
```

`apps/admin/lib/auth-client.ts` was already correct (it sets no `baseURL`) and was not
touched.

## Why CI was failing

`createAuthClient` requires an absolute URL and throws at module evaluation when given
`/api/auth`. `.github/workflows/ci.yml` sets no environment variables, so
`NEXT_PUBLIC_API_URL` was undefined during the CI build and the prerender of
`/notifications/settings` died with:

```
[Error [BetterAuthError]: Invalid base URL: /api/auth. Please provide a valid base URL.]
```

This was **pre-existing**, not caused by the retheme branch — `ceafdad` (main tip) fails
with the identical error in run 38729455489.

## Verification at a glance

| Gate | Result |
|---|---|
| `pnpm --filter customer build`, `NEXT_PUBLIC_API_URL` unset | **exit 0** |
| `pnpm --filter lanka-mahal build`, `NEXT_PUBLIC_API_URL` unset | **exit 0** |
| CI on PR #2 | re-run triggered by this commit |

The CI condition was reproduced faithfully by temporarily moving the gitignored
`apps/*/.env.local` files aside — both set `NEXT_PUBLIC_API_URL=http://localhost:3001`
locally, which is why the defect never appeared on a developer machine. Both files were
restored afterwards.

## Notes

- Production behaviour is unchanged: `docker-compose.prod.yml` passes
  `NEXT_PUBLIC_API_URL=https://api.gajantraders.com` as a build arg, so the fallback is
  never reached in production.
- The fix was deliberately made in source rather than by adding a CI workflow variable,
  so that bare local builds are fixed too and the codebase keeps one convention.

## Out of scope (recorded, not fixed)

- Older `lanka-mahal#test` / `customer#test` CI failures (runs 36110965242, 36109075631,
  2026-09-25) — different jobs, not reproduced here.
- The unrelated `Workers Builds: hy` Cloudflare check failing on PR #2.

## Commit

- Code: `fix(customer,lanka-mahal): fall back to an absolute auth base URL`
- Docs: `docs(quick-261018-d0z): record CI auth base URL fix`
