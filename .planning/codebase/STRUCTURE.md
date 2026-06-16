# Codebase Structure

**Analysis Date:** 2026-06-13

## Directory Layout

```
gt/                                    # Monorepo root (pnpm + Turborepo)
├── .git/                              # Git repository data
├── .planning/                         # Planning & analysis documents
│   └── codebase/                      # Generated codebase analysis files
├── .turbo/                            # Turborepo cache (build artifacts)
├── apps/                              # Application workspaces
│   ├── admin/                         # Empty Next.js admin app (placeholder)
│   └── api/                           # Hono HTTP API server
│       ├── src/
│       │   └── index.ts               # Server entry point (port 3001)
│       └── package.json               # Dependencies: hono, @hono/node-server
├── graphify-out/                      # Knowledge graph export
│   ├── cache/                         # AST/semantic cache files
│   ├── .graphify_labels.json          # Graph labels
│   ├── .graphify_python               # Python marker
│   ├── .graphify_root                 # Root marker
│   ├── cost.json                      # Extraction cost data
│   ├── graph.html                     # Interactive graph visualization
│   ├── graph.json                     # Full knowledge graph data
│   ├── GRAPH_REPORT.md                # Graph analysis report
│   └── manifest.json                  # Source file index with hashes
├── node_modules/                      # Root dependencies (pnpm hoisted)
├── packages/                          # Shared library workspaces
│   ├── eslint-config/                 # @repo/eslint-config
│   │   ├── base.js                    # Base flat config (JS)
│   │   ├── next.js                    # Next.js flat config
│   │   ├── react-internal.js          # React library flat config
│   │   ├── package.json               # ESM, exports map
│   │   └── README.md                  # Package documentation
│   ├── typescript-config/             # @repo/typescript-config
│   │   ├── base.json                  # Base strict TS config
│   │   ├── nextjs.json                # Next.js TS config
│   │   ├── react-library.json         # React library TS config
│   │   └── package.json               # Config publication info
│   └── ui/                            # @repo/ui React component library
│       ├── src/
│       │   ├── button.tsx             # Button component ("use client")
│       │   ├── card.tsx               # Card component (link wrapper)
│       │   └── code.tsx               # Code component (inline <code>)
│       ├── eslint.config.mjs          # ESLint config (react-internal)
│       ├── package.json               # Exports map, React 19 deps
│       └── tsconfig.json              # Extends react-library config
├── .gitignore                         # Standard ignores (node_modules, .env, .next, build)
├── .npmrc                             # Empty npm config file
├── package.json                       # Root scripts (build, dev, lint, format, check-types)
├── pnpm-lock.yaml                     # Lockfile (committed)
├── pnpm-workspace.yaml                # Workspace definition (apps/*, packages/*)
├── README.md                          # Turborepo starter documentation
└── turbo.json                         # Pipeline config (build, dev, lint, check-types)
```

## Directory Purposes

### `apps/`
- **Purpose:** Runnable applications deployable as standalone services
- **Contains:** Each subdirectory is a full application with its own `package.json`
- **Key files:** `apps/api/src/index.ts` (Hono server), `apps/api/package.json`

### `apps/api/`
- **Purpose:** Backend HTTP API server using Hono framework
- **Contains:** Single entry point `src/index.ts`, no routes directory yet
- **Runtime:** `tsx watch src/index.ts` for dev, targets Node.js
- **Port:** 3001

### `apps/admin/`
- **Purpose:** Placeholder for a Next.js admin frontend application
- **Contains:** Empty directory — no files or configuration
- **Status:** Not yet initialized; no `package.json`, `tsconfig.json`, or `next.config.*`

### `packages/eslint-config/`
- **Purpose:** Shared ESLint flat configurations consumed across all apps/packages
- **Contains:** Three config variants (base, next-js, react-internal)
- **Format:** ESM JavaScript files (`"type": "module"` in package.json)
- **Exports pattern:** Named exports mapped via `import { config } from "@repo/eslint-config/base"` etc.

### `packages/typescript-config/`
- **Purpose:** Shared TypeScript compiler configurations
- **Contains:** Base strict config + two specialized configs (nextjs, react-library)
- **Usage:** Apps/packages extend via `"extends": "@repo/typescript-config/base.json"`

### `packages/ui/`
- **Purpose:** Shared React component library for use across frontend apps
- **Contains:** Simple reusable components (Button, Card, Code)
- **Directives:** Button uses `"use client"` (has browser-side event handlers)
- **Exports pattern:** `"exports": { "./*": "./src/*.tsx" }` — direct file access

### `graphify-out/`
- **Purpose:** Output directory for the graphify knowledge graph extraction tool
- **Contains:** JSON graph data, HTML visualization, AST caches, reports
- **Generated:** Yes — regenerates when graph extraction runs
- **Committed:** Yes — analysis artifacts are tracked

### `node_modules/`
- **Purpose:** pnpm dependency installation (hoisted root + isolated per package)
- **Contains:** All third-party dependencies, symlinked workspace packages
- **Generated:** Yes — do not modify manually
- **Committed:** No (in `.gitignore`)

### `.planning/`
- **Purpose:** Planning and analysis documentation for development workflows
- **Contains:** Codebase analysis documents, design docs, planning files
- **Generated:** Yes (by `/gsd-map-codebase` and related tools)
- **Committed:** Yes — planning artifacts are tracked

### `.turbo/`
- **Purpose:** Turborepo local build cache
- **Contains:** Cached build outputs for faster rebuilds
- **Generated:** Yes — safe to delete (cache regenerates)
- **Committed:** No (in `.gitignore`)

## Key File Locations

### Entry Points
- `apps/api/src/index.ts` — Hono HTTP server, single entry point for the API
- `apps/admin/` — No entry point yet (empty directory)

### Configuration Files
- `package.json` — Root workspace config, scripts, devDependencies, packageManager
- `turbo.json` — Turborepo task pipeline, caching rules
- `pnpm-workspace.yaml` — Workspace member glob patterns
- `.gitignore` — Git exclusion rules
- `.npmrc` — npm configuration (empty, reserved for future settings)

### Core Logic
- `apps/api/src/index.ts` — Only source file; Hono app instantiation, route definition, server startup
- `packages/ui/src/button.tsx` — Button React component with click handler
- `packages/ui/src/card.tsx` — Card React component (anchor wrapper)
- `packages/ui/src/code.tsx` — Code inline component

### Shared Package Configurations
- `packages/eslint-config/base.js` — Base ESLint flat config (TypeScript, Prettier)
- `packages/eslint-config/next.js` — Next.js ESLint config
- `packages/eslint-config/react-internal.js` — React library ESLint config
- `packages/typescript-config/base.json` — Base TS strict settings
- `packages/typescript-config/nextjs.json` — Next.js TS overrides
- `packages/typescript-config/react-library.json` — React library TS overrides
- `packages/ui/tsconfig.json` — UI package TS config (extends react-library)

### Build Artifacts / Generated
- `pnpm-lock.yaml` — Dependency lockfile (regenerated by `pnpm install`)
- `node_modules/` — Installed packages (regenerated by `pnpm install`)
- `.turbo/` — Turborepo cache (regenerated by `turbo build`)
- `graphify-out/` — Knowledge graph data (regenerated by graphify)
- `apps/api/node_modules/` — API-specific dependency stubs

## Naming Conventions

### Files
| Pattern | Example | Where |
|---------|---------|-------|
| `kebab-case.ts` | `react-library.json` | TypeScript config files, package names |
| `kebab-case.tsx` | `button.tsx` | React components in `packages/ui/src/` |
| `kebab-case.js` | `react-internal.js` | ESLint config files in `packages/eslint-config/` |
| `kebab-case.mjs` | `eslint.config.mjs` | ESLint config file at package level |
| `PascalCase.*` | — | Not yet used; expected for page components |
| `index.ts` | `src/index.ts` | Entry point files |

### Directories
| Pattern | Example | Where |
|---------|---------|-------|
| `short-name/` | `api/`, `ui/` | App and package directories use short singular names |
| `kebab-case/` | `eslint-config/`, `typescript-config/` | Multi-word package directories |
| `src/` | `packages/ui/src/` | Source code directory within packages |

### Package Names
| Pattern | Example |
|---------|---------|
| `app-name` (no scope) | `api` |
| `@repo/package-name` | `@repo/ui`, `@repo/eslint-config`, `@repo/typescript-config` |

### Functions, Variables, Types
- **React components:** PascalCase (`Button`, `Card`, `Code`)
- **Functions:** camelCase inferred from Hono usage (`serve()`, `app.get()`)
- **Variables:** camelCase observed (`className`, `appName`, `children`)
- **Interfaces:** PascalCase with `Props` suffix (`ButtonProps`)
- **Exported configs:** camelCase (`config`, `nextJsConfig`)

## Where to Add New Code

### New API Endpoint
- **Primary code:** `apps/api/src/index.ts` (currently all routes are inline)
- **Future pattern (recommended):** `apps/api/src/routes/*.ts` — route files
- **Better still (when app grows):** `apps/api/src/routes/resource.ts` — grouped Hono routes
- **Tests:** No test framework configured yet; use `apps/api/src/__tests__/` or co-located `.test.ts`

### New Frontend App
- **Primary code:** `apps/<app-name>/` — create new app directory
- **Add to workspace:** Already covered by `apps/*` glob in `pnpm-workspace.yaml`
- **Example setup future:** `apps/admin/app/page.tsx` (Next.js App Router)
- **Consuming UI:** `import { Button } from "@repo/ui/button"`

### New Shared Component
- **Implementation:** `packages/ui/src/<component-name>.tsx`
- **Exports:** No additional configuration needed — `@repo/ui` uses glob export (`./*`)
- **Feature components with deps:** `packages/ui/src/<feature>/index.tsx`

### New Shared Package
- **Create:** `packages/<package-name>/`
- **Package name:** `@repo/<package-name>`
- **Add exports:** Declare in package.json `"exports"` map
- **TypeScript:** Extend `@repo/typescript-config/react-library.json` (or `base.json`)
- **ESLint:** Use `@repo/eslint-config/react-internal` config

### New ESLint / TS Config
- **ESLint config:** `packages/eslint-config/<name>.js` — export named config object; add to `exports` map in package.json
- **TS config:** `packages/typescript-config/<name>.json` — extend `base.json`; add override options

### Utilities / Helpers
- **Shared helpers:** `packages/ui/src/lib/` or create new `packages/helpers/`
- **Cross-app shared logic:** Create a new workspace package under `packages/`

## Module Boundaries and Exports

### `@repo/ui`
```json
{
  "exports": {
    "./*": "./src/*.tsx"
  }
}
```
**Usage:**
```typescript
import { Button } from "@repo/ui/button";   // resolves to packages/ui/src/button.tsx
import { Card } from "@repo/ui/card";       // resolves to packages/ui/src/card.tsx
import { Code } from "@repo/ui/code";       // resolves to packages/ui/src/code.tsx
```

### `@repo/eslint-config`
```json
{
  "exports": {
    "./base": "./base.js",
    "./next-js": "./next.js",
    "./react-internal": "./react-internal.js"
  }
}
```
**Usage:**
```javascript
import { config } from "@repo/eslint-config/base";           // base settings
import { nextJsConfig } from "@repo/eslint-config/next-js";  // Next.js settings
import { config } from "@repo/eslint-config/react-internal";  // React lib settings
```

### `@repo/typescript-config`
Not declared in `exports` (old-style resolution via `"extends"` path):
```json
{
  "extends": "@repo/typescript-config/base.json",
  "extends": "@repo/typescript-config/nextjs.json",
  "extends": "@repo/typescript-config/react-library.json"
}
```

## Configuration Files Inventory

| File | Purpose | Format | Location |
|------|---------|--------|----------|
| `package.json` | Root workspace: scripts + devDependencies + engines | JSON | Root |
| `turbo.json` | Turborepo task pipeline definition | JSON | Root |
| `pnpm-workspace.yaml` | pnpm workspace member globs | YAML | Root |
| `pnpm-lock.yaml` | Locked dependency resolution | YAML | Root |
| `.gitignore` | Git exclusion rules | Gitignore | Root |
| `.npmrc` | npm/pnpm config (empty) | INI | Root |
| `apps/api/package.json` | API dependencies (hono, tsx) | JSON | apps/api/ |
| `packages/ui/package.json` | UI lib deps (React, React DOM) | JSON | packages/ui/ |
| `packages/ui/tsconfig.json` | UI lib TS config | JSON | packages/ui/ |
| `packages/ui/eslint.config.mjs` | UI lib ESLint flat config | ESM | packages/ui/ |
| `packages/eslint-config/package.json` | ESLint config deps + exports | JSON | packages/eslint-config/ |
| `packages/typescript-config/package.json` | TS config publication info | JSON | packages/typescript-config/ |
| `packages/typescript-config/base.json` | Base strict TS settings | JSON | packages/typescript-config/ |
| `packages/typescript-config/nextjs.json` | Next.js TS overrides | JSON | packages/typescript-config/ |
| `packages/typescript-config/react-library.json` | React lib TS overrides | JSON | packages/typescript-config/ |

## Special Directories

### `node_modules/`
- **Purpose:** Installed dependencies (pnpm uses content-addressable storage with hoisting)
- **Generated:** Yes — recreate via `pnpm install`
- **Committed:** No

### `.turbo/`
- **Purpose:** Turborepo local build cache for incremental builds
- **Generated:** Yes — recreate via `turbo build`
- **Committed:** No

### `graphify-out/`
- **Purpose:** Knowledge graph extraction output (AST analysis, community detection)
- **Generated:** Yes — produced by graphify ingestion tool
- **Committed:** Yes — analysis artifacts are tracked for reference

### `node_modules/.pnpm/`
- **Purpose:** pnpm's virtual store (hard-linked copies of all packages)
- **Generated:** Yes — created by `pnpm install`
- **Committed:** No

---

*Structure analysis: 2026-06-13*
