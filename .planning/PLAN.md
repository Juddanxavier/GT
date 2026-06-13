---
phase: 01-tooling-foundation
plan: single (4 sub-plans)
type: execute
waves: 4
autonomous: true
requirements:
  - TOOL-01
  - TOOL-02
  - TOOL-03
must_haves:
  truths:
    - "biome check passes with zero errors across the monorepo"
    - "No ESLint or Prettier configuration files remain in any package"
    - "All packages use the same TypeScript version (5.9.x)"
    - "Drizzle Kit can generate SQL migrations from schema definitions"
    - "API server starts and responds on port 3001"
    - "pnpm install completes without warnings or errors"
    - "pnpm build completes without errors"
  artifacts:
    - path: "biome.json"
      provides: "Unified linter + formatter config"
    - path: "drizzle.config.ts"
      provides: "Drizzle Kit configuration for migrations"
    - path: "apps/api/src/db/schema.ts"
      provides: "Initial Drizzle schema definitions"
    - path: "apps/api/src/db/index.ts"
      provides: "Drizzle client instance with connection pool"
    - path: ".env"
      provides: "Environment variables including DATABASE_URL"
    - path: ".env.example"
      provides: "Documented environment variable template"
  key_links:
    - from: "root/package.json"
      to: "biome.json"
      via: "biome devDependency + scripts"
    - from: "apps/api/src/db/index.ts"
      to: "drizzle.config.ts"
      via: "shared schema import path"
    - from: "apps/api/package.json"
      to: "src/db/index.ts"
      via: "db:* scripts"
---

# Phase 1: Tooling & Foundation

## Objective

Configure the monorepo with consistent tooling (Biome replacing ESLint + Prettier), uniform TypeScript versions, and Drizzle ORM foundation for database access.

**Purpose:** Eliminate tooling fragmentation before building features. Biome handles linting + formatting in a single binary, Drizzle provides type-safe SQL for the multi-tenant data layer.
**Output:** Working Biome config, normalized TS versions, Drizzle client ready for Phase 2 schema definitions.

## Execution Context

N/A — first phase, no prior plans exist.

## Context

@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/codebase/STACK.md
@.planning/codebase/ARCHITECTURE.md
@.planning/codebase/CONVENTIONS.md

---

## Wave 1 — Plan 1: Install & Configure Biome

**Goal:** Biome handles linting + formatting across the entire monorepo, replacing ESLint and Prettier entirely.

**Depends on:** Nothing
**Files modified:** `biome.json` (new), `root/package.json`, `turbo.json`, `apps/api/package.json`, `packages/ui/package.json`, `packages/ui/eslint.config.mjs` (delete), `packages/eslint-config/` (delete directory)

**Why this order:** 1) Install biome + create config first so the binary exists for formatting. 2) Remove ESLint/Prettier configs so Biome has no conflicts. 3) Run biome apply on all existing files. 4) Update turbo.json to use biome instead of eslint.

---

### Task 1.1: Install Biome and create root configuration

**Action:**
1. Run `pnpm add -Dw @biomejs/biome` to add biome as a root devDependency.
2. Create `biome.json` at workspace root with:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "useTemplate": "error"
      },
      "complexity": {
        "noForEach": "off",
        "noBannedTypes": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "quoteStyle": "single",
    "trailingCommas": "all"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "out/**",
      "build/**",
      ".turbo/**",
      "pnpm-lock.yaml",
      "**/*.js",
      "apps/api/node_modules/**"
    ]
  }
}
```

**Verify:** `./node_modules/.bin/biome --version` returns a version string.

---

### Task 1.2: Remove ESLint and Prettier configurations from all packages

**Action:**
1. **Root package.json**: Remove `"prettier": "^3.7.4"` from devDependencies. Remove the `"format"` script (it calls prettier). Keep `"lint"` script — it will be updated after turbo.json changes.
2. **apps/api/package.json**: No eslint/prettier deps exist here, but verify. This package has no lint script — confirm ESLint removal doesn't affect it.
3. **packages/ui/package.json**: Remove `"@repo/eslint-config": "workspace:*"` and `"eslint": "^9.39.1"` from devDependencies. Change the `"lint"` script from `"eslint . --max-warnings 0"` to `"biome check src/"`.
4. **packages/ui/eslint.config.mjs**: Delete this file entirely — it imports the deleted eslint-config package.
5. **packages/eslint-config/**: Delete the entire directory (`Remove-Item -Recurse -Force packages/eslint-config`).
6. **Root package.json scripts**: Change `"lint"` from `"turbo run lint"` to `"biome check ."`. Change `"format"` from `"prettier --write ..."` to `"biome format --write ."`.
7. **Remove pnpm-workspace reference**: Verify `pnpm-workspace.yaml` no longer references `packages/eslint-config` — it uses a glob pattern `packages/*` so the directory removal is sufficient. No config change needed.
8. Root `.prettierrc` — if it exists, it was not found by glob — but remove any hidden prettier config files.

**Verify:** 
- `dir packages/eslint-config 2>$null` returns "cannot find path" (directory removed).
- `dir packages/ui/eslint.config.mjs 2>$null` returns "cannot find path" (file removed).
- `grep -r "eslint" package.json packages/*/package.json apps/*/package.json 2>$null | grep -v node_modules` returns no eslint references.

---

### Task 1.3: Run Biome format + lint and fix existing files

**Action:**
1. Run `./node_modules/.bin/biome check --write .` from workspace root.
   - This formats all .ts, .tsx files per biome.json rules.
   - Fixes auto-fixable lint issues.
2. Review the output for any warnings or errors that require manual fixes.
3. Likely changes: 
   - `apps/api/src/index.ts` — trailing commas added, single quotes verified, semicolons confirmed.
   - `packages/ui/src/*.tsx` — same formatting pass.
4. If biome reports errors it cannot auto-fix (unsafe fixes), log them. For this phase, suppress safe-only fixes and leave manual warnings for cleanup.

**Verify:** `./node_modules/.bin/biome check .` exits with code 0 (zero errors, zero warnings — or acceptable warnings only).

---

### Task 1.4: Update turbo.json task definitions

**Action:**
1. In `turbo.json`, replace the `"lint"` task:
   - Remove `"dependsOn": ["^lint"]` — biome runs on the workspace, not per-package.
   - Change to: `"lint": { "dependsOn": [], "inputs": ["$TURBO_DEFAULT$"] }` or remove it entirely since biome runs from root.
   - Add a new `"format"` task: `"format": { "dependsOn": [], "inputs": ["$TURBO_DEFAULT$"] }` (optional, for `pnpm format` parity).
2. Root package.json scripts should now be:
   - `"lint": "biome check ."`
   - `"format": "biome format --write ."`
   - `"check-types": "turbo run check-types"`
   - `"build": "turbo run build"`
3. Remove the `"lint"` script from packages/ui/package.json scripts (or leave as-is with `biome check src/`).

**Final turbo.json structure:**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**"]
    },
    "lint": {
      "dependsOn": []
    },
    "format": {
      "dependsOn": []
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Verify:** `node -e "const t=require('./turbo.json'); console.log(JSON.stringify(t,null,2))"` shows updated structure.

---

## Wave 2 — Plan 2: Normalize TypeScript Version & Pin Next.js

**Goal:** All packages use the same TypeScript version (5.9.x) — no version drift across the monorepo. Next.js framework pinned to ^16.2.6.

**Depends on:** Plan 1 (same modified files: root/package.json, apps/api/package.json)
**Files modified:** `root/package.json`, `apps/api/package.json`, `packages/eslint-config/package.json` (already deleted by Plan 1, ignore), `apps/admin/package.json` (add next dep)

**Why:** Root + UI use 5.9.2, API uses ^6.0.3. This mismatch can cause subtle type-checking inconsistencies. Normalizing prevents "but it works in my package" issues.

---

### Task 2.1: Align TypeScript dependency to ^5.9.2 across all workspace packages

**Action:**
1. **apps/api/package.json**: Change `"typescript": "^6.0.3"` to `"typescript": "^5.9.2"`.
2. **root/package.json**: Already `"typescript": "5.9.2"` — confirm it has the caret: change to `"^5.9.2"` for consistency (allows patch updates).
3. **packages/typescript-config/package.json**: Has no typescript dep listed directly (relies on root) — no change needed.
4. **packages/ui/package.json**: Already `"typescript": "5.9.2"` — no change needed.

**Critical check:** The API's `tsconfig.json` doesn't exist (it uses `tsx` directly). Verify `apps/api/src/index.ts` compiles correctly after the TypeScript version change by running `npx -w apps/api tsc --noEmit` — but since there's no tsconfig, just ensure `pnpm dev` still starts.

**Verify:** Run `pnpm ls -r typescript --depth=0` (or equivalent recursive listing) and confirm all resolved versions show `5.9.x`.

---

### Task 2.2: Install and pin Next.js in admin app

**Action:**
1. Run `pnpm add next@^16.2.6 --filter admin` to install Next.js in apps/admin.
2. Verify apps/admin/package.json has `"next": "^16.2.6"` in dependencies.
3. Create `apps/admin/next.config.ts` with minimal config:
   ```typescript
   import type { NextConfig } from 'next';
   const nextConfig: NextConfig = {};
   export default nextConfig;
   ```

**Verify:** `pnpm ls next --depth=0 --filter admin` shows next@16.2.x resolved.

---

### Task 2.3: Remove @next/eslint-plugin-next reference

**Action:**
1. The `@next/eslint-plugin-next` package was in `packages/eslint-config/package.json` which was deleted in Plan 1.
2. Run `pnpm remove @next/eslint-plugin-next -w` to ensure it's pruned from the lockfile if it was hoisted.
3. Run `pnpm remove @next/eslint-plugin-next -r` to catch any residual references.

**Verify:** `grep -r "next/eslint-plugin" pnpm-lock.yaml 2>$null | head -5` — should return no matches.

---

## Wave 3 — Plan 3: Install & Configure Drizzle ORM

**Goal:** Drizzle ORM installed and configured in the API app with placeholders for schema definitions.

**Depends on:** Plan 2 (modifies apps/api/package.json)
**Files modified:** `apps/api/package.json`, `apps/api/drizzle.config.ts` (new), `apps/api/src/db/schema.ts` (new), `apps/api/src/db/index.ts` (new), `.env` (new), `.env.example` (new)

**Why:** Drizzle is the data access layer for all subsequent phases. Setting up the config, client, and placeholder schema now means Phase 2 (Auth + Multi-Tenancy) can immediately write real schema definitions.

---

### Task 3.1: Install Drizzle ORM dependencies in the API app

**Action:**
1. Run `pnpm add drizzle-orm postgres --filter api` to add production dependencies to apps/api.
2. Run `pnpm add -Dw drizzle-kit --filter api` to add drizzle-kit as a dev dependency.
3. **Verify package.json updated:**
   - `dependencies` now contains: `"drizzle-orm": "^0.45.x"`, `"postgres": "^3.x"`
   - `devDependencies` now contains: `"drizzle-kit": "^0.30.x"`

**Verify:** `pnpm ls -r drizzle-orm --depth=0` shows drizzle-orm resolved.

---

### Task 3.2: Create Drizzle configuration file

**Action:**
1. Create `apps/api/drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

2. The `DATABASE_URL` env var is required but will only have a placeholder value until PostgreSQL is provisioned in a later phase.

**Verify:** File exists at `apps/api/drizzle.config.ts` with the correct exports.

---

### Task 3.3: Create initial placeholder schema

**Action:**
1. Create `apps/api/src/db/schema.ts` with placeholder tables:

```typescript
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

// Placeholder: Auth-related tables will be added here in Phase 2
// Tenant and user schemas to be defined with Better Auth integration

export const __placeholder = pgTable('__placeholder', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

2. This schema is intentionally minimal — real tables (users, tenants, sessions, etc.) come in Phase 2. The placeholder exists so `drizzle-kit generate` produces a valid migration.

**Verify:** `npx -w apps api drizzle-kit generate` creates a migration file in `apps/api/src/db/migrations/`.

---

### Task 3.4: Create Drizzle client instance

**Action:**
1. Create `apps/api/src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// For production, use connection pooling with PgBouncer-compatible URL
const client = postgres(connectionString, {
  max: 10, // Pool size
  ssl: connectionString.includes('localhost') ? false : 'require',
});

export const db = drizzle(client, { schema });

export type DbClient = typeof db;
```

2. This exports a `db` singleton that all API routes will import for database operations.

**Verify:** File exists at `apps/api/src/db/index.ts` with proper Drizzle client initialization.

---

### Task 3.5: Add db:* scripts to API package.json

**Action:**
1. Update `apps/api/package.json` scripts section:

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:migrate": "drizzle-kit migrate",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

**Verify:** `node -e "const p=require('./apps/api/package.json'); console.log(Object.keys(p.scripts).filter(s=>s.startsWith('db:')).join(', '))"` shows db:generate, db:push, db:studio, db:migrate.

---

### Task 3.6: Create .env and .env.example

**Action:**
1. Create `.env` at workspace root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gt_dev?sslmode=disable"

# API
PORT=3001
```

2. Create `.env.example` at workspace root (same content, but with placeholder values):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gt_dev?sslmode=disable"

# API
PORT=3001
```

3. Add `.env` to root `.gitignore` if not already present.

**Verify:** Files exist at `.env` and `.env.example`. `.env.example` is tracked by git (no `.gitignore` rule for it).

---

## Wave 4 — Plan 4: Verify Everything Works

**Goal:** Confirm all changes are correct and the monorepo is healthy before moving to Phase 2.

**Depends on:** Plan 1, Plan 2, Plan 3 (all previous waves must complete)
**Files modified:** None (verification only)

---

### Task 4.1: pnpm install succeeds with zero warnings

**Action:**
1. Run `pnpm install` from workspace root.
2. Verify no dependency resolution errors or peer dependency warnings.
3. The lockfile should reflect:
   - Biome installed at root
   - No ESLint or Prettier packages remaining
   - Drizzle ORM packages in apps/api
   - Single TypeScript version resolved

**Verify:** `pnpm install` exits with code 0. `pnpm ls -r --depth=0` shows clean output.

---

### Task 4.2: biome check passes with zero errors

**Action:**
1. Run `pnpm lint` (which calls `biome check .`).
2. If errors are reported, fix them:
   - Run `pnpm format` (which calls `biome format --write .`) to fix formatting.
   - For remaining lint errors, fix manually or adjust `biome.json` rules if the rule is inappropriate.
3. Common issues after migration:
   - `noUnusedVariables` on test files → add ignore comments or adjust biome.json
   - Trailing comma expectations → biome --write fixes these
   - Import organization → biome organizeImports handles this

**Verify:** `pnpm lint` exits with code 0 and reports "Checked N files in Xms. No fixes needed."

---

### Task 4.3: pnpm build succeeds

**Action:**
1. Run `pnpm build` (which calls `turbo run build`).
2. Currently only `packages/ui` has a build step (the API runs via tsx, no build needed).
3. Verify the build output in `packages/ui/dist/` is generated.

**Verify:** `pnpm build` exits with code 0. `Test-Path packages/ui/dist` confirms build output exists.

---

### Task 4.4: Drizzle Kit generates a migration

**Action:**
1. Run `pnpm --filter api db:generate` to invoke drizzle-kit generate.
2. Verify a SQL migration file is created in `apps/api/src/db/migrations/`.

**Verify:** `Get-ChildItem apps/api/src/db/migrations/` shows at least one migration file (e.g., `0000_*.sql`).

---

### Task 4.5: API dev server starts on port 3001

**Action:**
1. Start the API in background: `Start-Process -WindowStyle Hidden pwsh -ArgumentList "-NoExit -Command pnpm --filter api dev"`
2. Wait 3 seconds for startup.
3. Probe the health endpoint: `curl -s http://localhost:3001/`
4. Verify response is `{"message":"ShipTrack API"}`.
5. Stop the server.

**Verify:** `Invoke-RestMethod -Uri http://localhost:3001/` returns `message: ShipTrack API` with status 200.

---

## Threat Model

### Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `Node.js → filesystem` | Biome, Drizzle Kit read/write source files and migrations |
| `Dev server → localhost` | Hono API listens on port 3001 during development |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | `biome.json` | accept | Local config file; no PII or secrets. Team convention prevents unauthorized edits. |
| T-01-02 | Information Disclosure | `.env` | mitigate | `.env` added to `.gitignore` before Phase 1 completes. Only `.env.example` is committed. |
| T-01-03 | Elevation of Privilege | `drizzle.config.ts` | mitigate | `DATABASE_URL` is read from environment, never hardcoded in source. Connection uses `require` SSL for non-localhost. |
| T-01-04 | Denial of Service | `drizzle-kit generate` | accept | Runs only on developer machines. No production exposure. |

---

## Verification

### Automated Checks (run in order)

```bash
# 1. Clean install
pnpm install

# 2. Biome lint + format check
pnpm lint

# 3. Build all packages
pnpm build

# 4. Generate Drizzle migration
pnpm --filter api db:generate

# 5. Verify migration file exists
Test-Path apps/api/src/db/migrations/0000_*.sql
```

### Manual Check (after Wave 4 completes)

```
curl http://localhost:3001/
# Expected: {"message":"ShipTrack API"}
```

---

## Success Criteria

1. ✅ `biome check` passes across entire monorepo with zero errors
2. ✅ All workspace packages resolve correctly with `pnpm install` and `pnpm build`
3. ✅ Drizzle Kit can generate a valid SQL migration from the schema definition
4. ✅ No ESLint, Prettier, or eslint-plugin references remain in any package.json or config file
5. ✅ All packages use TypeScript ^5.9.x — no version mismatch
6. ✅ API dev server starts and responds on port 3001

---

## Output

After completion, create summary artifacts:

1. List of files modified/created/deleted for accountability
2. A note in STATE.md: Phase 1 tooling foundation complete

---

## Execution Order Summary

| Wave | Plan | Description | Autonomous |
|------|------|-------------|------------|
| 1 | Plan 1 | Install & Configure Biome | yes |
| 2 | Plan 2 | Normalize TypeScript, remove eslint-plugin-next | yes |
| 3 | Plan 3 | Install & Configure Drizzle ORM | yes |
| 4 | Plan 4 | Verify Everything | yes |

---

## Decision Coverage Matrix

| Requirement | Plan | Task(s) | Coverage | Notes |
|-------------|------|---------|----------|-------|
| TOOL-01 | Plan 1 | 1.1, 1.2, 1.3, 1.4 | Full | Biome replaces ESLint + Prettier completely |
| TOOL-02 | Plan 2 | 2.1, 2.2, 2.3 | Full | TS normalized to ^5.9.2, Next.js ^16.2.6 installed & pinned in admin app |
| TOOL-03 | Plan 3 | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 | Full | Drizzle ORM installed, configured, schema/client created |
