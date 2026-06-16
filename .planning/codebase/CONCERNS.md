# Codebase Concerns

**Analysis Date:** 2026-06-13

## Critical: Project Is an Unmodified Turborepo Scaffold

**Issue:** This monorepo was generated from the `create-turbo` starter template and has barely been modified. It contains no real application logic, no business domain code, no database models, and no user-facing functionality.

**Evidence:**
- `apps/admin/` is completely empty (zero files)
- `apps/api/` has a single 17-line `index.ts` with only a hello-world health-check endpoint
- `apps/api/package.json` has `"main": "index.js"` which does not exist — the entrypoint is `src/index.ts`
- `packages/ui/` contains only 3 placeholder components (button/card/code) from the Turbo template, including leftover UTM tracking links to `create-turbo`
- The README references `docs` and `web` apps that do not exist in this repository

**Impact:** Without any real application to analyze, all concerns below are about missing infrastructure that will need to be built before any feature work can begin.

**Fix approach:** This project needs end-to-end scaffolding before it can host a real application (see individual items below).

---

## Security: No Authentication or Authorization

**Issue:** There is no authentication, session management, token validation, or authorization of any kind anywhere in the codebase. The API is wide open.

**Files:** `apps/api/src/index.ts`

**Impact:** Any deployed instance of this API is completely unauthenticated. All data would be publicly accessible.

**Fix approach:** Integrate an auth library (e.g., Better Auth, Lucia, NextAuth.js, or a JWT middleware) before adding any real endpoints. Plan hashed passwords (with bcrypt/argon2), session tokens, and role-based access.

---

## Security: Hardcoded Port Number

**Issue:** The API server port is hardcoded to `3001` with no environment variable fallback.

**Files:** `apps/api/src/index.ts` (line 16: `port: 3001`)

**Impact:** Cannot deploy to different port environments without a code change. Prevents containerization best practices where the runtime provides `PORT`.

**Fix approach:** Use `process.env.PORT || 3001` and document the `PORT` env var.

---

## Security: No Input Validation or CORS Configuration

**Issue:** While the current codebase has no user-facing inputs yet, there are no patterns established for input validation, sanitization, or CORS handling.

**Files:** `apps/api/src/index.ts`

**Impact:** When real endpoints are added, there is no safety net. No validation middleware is configured. Request bodies would be accepted verbatim.

**Fix approach:** Add Hono middleware for CORS, body validation (Zod schemas), and request sanitization as a prerequisite for adding routes.

---

## Security: No Environment Variable Management or .env.example

**Issue:** No example environment file (`.env.example`) documents required environment variables. The `.npmrc` is empty. No env vars are read or validated anywhere.

**Files:** `.npmrc` (empty), `.gitignore` (lists `.env*` as ignored), root `package.json`

**Impact:** New developers have no way to know what secrets or configuration values are needed. Production secrets guidance does not exist.

**Fix approach:** Create `.env.example` with all required vars documented. Use Zod or a validation library to verify env vars at startup.

---

## Tests: Zero Test Coverage Across Entire Codebase

**Issue:** There are zero test files. The test script in `apps/api/package.json` (line 8) is a placeholder: `echo "Error: no test specified" && exit 1`. No testing framework is installed anywhere.

**Files:** `apps/api/package.json` (line 8)

**Impact:** No regression safety net. No confidence that any code changes are correct. No testing patterns to follow.

**Fix approach:** Install a test runner (Vitest recommended for TypeScript monorepos). Add unit tests for API endpoints, UI components, and any business logic. Set up CI to enforce test pass.

---

## Maintainability: Boilerplate Leftovers and Stale Documentation

**Issue:** The README describes apps (`docs`, `web`) that do not exist. The `packages/eslint-config/README.md` references `@turbo/eslint-config` but the package is `@repo/eslint-config`. The UI card component contains a hardcoded UTM parameter for `create-turbo`.

**Files:**
- `README.md` (lines 19-20 claim `docs` and `web` apps exist)
- `packages/eslint-config/README.md` (line 1: `@turbo/eslint-config`)
- `packages/ui/src/card.tsx` (line 17: `utm_source=create-turbo`)

**Impact:** Confusing for new developers. Suggests incomplete cleanup after project initialization.

**Fix approach:** Rewrite README to reflect the actual project structure. Remove UTM tracking from Card component.

---

## Maintainability: Misconfigured Package Main Entry

**Issue:** `apps/api/package.json` specifies `"main": "index.js"`, but the actual entry file is `src/index.ts`. No build step exists to transpile TypeScript — the dev script uses `tsx watch` for hot-reloading, which works for development but does not produce a compiled `index.js`.

**Files:** `apps/api/package.json` (line 5: `"main": "index.js"`, line 7: `"dev": "tsx watch src/index.ts"`)

**Impact:** No production build output is configured. Attempting to `require()` or deploy the API via the `main` field would fail. Only development-mode execution via `tsx` is supported.

**Fix approach:** Add a `build` script (e.g., `tsc` or `tsup`) that compiles to `dist/index.js`, and update `main` to `dist/index.js`.

---

## Maintainability: TypeScript Version Inconsistency

**Issue:** TypeScript versions differ across packages in the monorepo:
- Root: `typescript: "5.9.2"` (exact)
- `apps/api`: `typescript: "^6.0.3"` (caret, resolves to latest 6.x)
- `packages/eslint-config`: `typescript: "^5.9.2"` (caret, resolves to latest 5.x)
- `packages/ui`: `typescript: "5.9.2"` (exact)

**Files:**
- `package.json` (line 14)
- `apps/api/package.json` (line 20)
- `packages/eslint-config/package.json` (line 21)
- `packages/ui/package.json` (line 20)

**Impact:** Different packages may behave differently based on their TypeScript version. The API using TypeScript 6.x while the UI package uses 5.9.x can lead to compilation discrepancies in a monorepo context. `skipLibCheck: true` in tsconfig masks these differences.

**Fix approach:** Normalize all packages to use a single TypeScript version, preferably through the root `package.json` as a workspace-level dependency.

---

## Maintainability: No Linting Config at Root Level

**Issue:** The root `package.json` has a `lint` script (`turbo run lint`), but there is no root-level ESLint configuration file. Only the UI package has an eslint config.

**Files:** Root directory (no `.eslintrc*` or `eslint.config.*` present)

**Impact:** The `lint` script in the root package.json invokes Turbo to run lint across the workspace, but `apps/api` has no eslint config at all. Linting is inconsistent.

**Fix approach:** Add a root-level `eslint.config.js` (flat config) with shared rules for all packages, and add package-specific configs where needed.

---

## Maintainability: Prettier Has No Configuration File

**Issue:** Prettier (`^3.7.4`) is installed as a root devDependency and a `format` script exists, but there is no `.prettierrc` or `prettier.config.js` file.

**Files:** Root directory (no `.prettierrc` present), `package.json` (line 8: format script, line 12: prettier dependency)

**Impact:** Prettier uses default settings, which may not match team preferences. Inconsistent formatting is possible across different developer environments.

**Fix approach:** Add `.prettierrc` with explicit configuration for the team's preferred formatting rules.

---

## Maintainability: Dead ESLint Configuration for Non-Existent Next.js App

**Issue:** `packages/eslint-config/next.js` provides a Next.js-specific ESLint configuration (including `@next/eslint-plugin-next`), but no Next.js app exists in this monorepo. The `apps/admin/` directory is empty — if it's intended to be a Next.js app, it hasn't been created yet.

**Files:**
- `packages/eslint-config/next.js`
- `packages/eslint-config/package.json` (includes `@next/eslint-plugin-next` at `^16.2.0`)

**Impact:** Unnecessary dependency and config file that is not used by any package. Adds maintenance burden.

**Fix approach:** Remove `next.js` config and `@next/eslint-plugin-next` dependency until a Next.js app is actually added.

---

## Maintainability: Graphify Artifacts Committed to Git

**Issue:** The `graphify-out/` directory contains generated analysis artifacts (graph JSON, cache files, HTML output) that are committed to the repository.

**Files:** `graphify-out/` (106+ files including `graph.json`, `cache/ast/*.json`, `GRAPH_REPORT.md`, `graph.html`, etc.)

**Impact:** Bloat in the repository. Generated analysis caches should not be committed as they change with every analysis pass.

**Fix approach:** Add `graphify-out/` to `.gitignore`. Add a script to regenerate them on demand instead.

---

## Dependency Risk: Outdated `eslint-plugin-turbo`

**Issue:** `eslint-plugin-turbo` is pinned at `^2.7.1` which is a relatively old version — the latest stable is significantly newer.

**Files:** `packages/eslint-config/package.json` (line 19: `"eslint-plugin-turbo": "^2.7.1"`)

**Impact:** May not support the latest ESLint flat config patterns. Likely missing bug fixes and newer rule support.

**Fix approach:** Update to the latest compatible version.

---

## Dependency Risk: `typescript-eslint` at `^8.50.0`

**Issue:** `typescript-eslint` is pinned at `^8.50.0` which is older than the current latest. Combined with TypeScript 5.9.x/6.x, there may be compatibility gaps.

**Files:** `packages/eslint-config/package.json` (line 22: `"typescript-eslint": "^8.50.0"`)

**Impact:** Potential parsing rule mismatches with newer TypeScript syntax features.

**Fix approach:** Update `typescript-eslint` to the latest version compatible with the project's TypeScript version.

---

## Scaffolding Gap: No Database, ORM, or Storage Layer

**Issue:** There is no database client, ORM (Prisma, Drizzle, TypeORM), or storage backend configured anywhere. No schema files, no migration tooling, no connection setup.

**Impact:** Any persistent data feature requires starting from scratch with full database setup. No patterns exist for data access.

**Fix approach:** Choose and install a database/ORM solution (Drizzle + SQLite for simplicity, or Prisma + PostgreSQL) as early project infrastructure.

---

## Scaffolding Gap: No Caching Layer

**Issue:** No caching mechanism is configured (Redis, in-memory cache, CDN caching, or HTTP caching headers).

**Impact:** Performance of any API will degrade under load without caching. No patterns to prevent duplicate work.

**Fix approach:** Add HTTP caching via Hono's `cache` middleware, and consider Redis for distributed caching when multiple API instances are needed.

---

## Scaffolding Gap: No CI/CD Pipeline

**Issue:** No CI configuration files exist in the repository (no `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, etc.).

**Impact:** No automated testing, linting, type-checking, or deployment on commits or PRs. Code quality is entirely dependent on developers running scripts manually.

**Fix approach:** Add a CI pipeline (GitHub Actions recommended) that runs linting, type-checking, tests, and builds on every push and PR.

---

## Scaffolding Gap: No Logging or Observability

**Issue:** There are zero logging statements, no structured logging library (pino, winston, etc.), no error tracking integration, and no metrics export.

**Files:** `apps/api/src/index.ts` (no logging whatsoever)

**Impact:** Production debugging would be impossible. No way to track request rates, error rates, or diagnose failures.

**Fix approach:** Add structured logging middleware to the Hono app. Configure error tracking (Sentry) and request metrics.

---

## Configuration Drift: Unused ESLint GlobalIgnores API

**Issue:** `packages/eslint-config/next.js` uses `globalIgnores` imported from `eslint/config` — a new, experimental API introduced in ESLint 9.x. This file configures a Next.js project that does not exist in this repository.

**Files:** `packages/eslint-config/next.js` (line 2: `import { globalIgnores } from "eslint/config"`)

**Impact:** When/if a Next.js app is eventually added, this uncommon API may behave differently across ESLint versions, causing confusion.

**Fix approach:** Use standard `ignores` in the config array instead of the experimental `globalIgnores` function.

---

## Quality: Unused `generate:component` Script

**Issue:** The UI package has a `generate:component` script (`turbo gen react-component`), but the Turborepo generator system requires additional setup (codegen templates) that has not been configured.

**Files:** `packages/ui/package.json` (line 10: `"generate:component": "turbo gen react-component"`)

**Impact:** Dead script that will produce an error if run. Misleading to developers.

**Fix approach:** Either configure Turbo generators properly, or remove the unused script.

---

*Concerns audit: 2026-06-13*
