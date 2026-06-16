# Technology Stack

**Analysis Date:** 2026-06-13

## Languages

**Primary:**
- **TypeScript** 5.9.x — Used across all apps and packages (100% TypeScript codebase). Targets ES2022. Configured with strict mode, `noUncheckedIndexedAccess`, and `isolatedModules`.

**Markup/Style:**
- **TSX** (React JSX with TypeScript) — Used in `@repo/ui` for React components.

## Runtime

**Environment:**
- **Node.js** >= 18 (enforced via `package.json` engines field)
- Platform: Cross-platform (developed on Windows, deployable to Linux)

**Package Manager:**
- **pnpm** 9.0.0 (declared via `packageManager` in root `package.json` and `pnpm-lock.yaml`)
- Lockfile: `pnpm-lock.yaml` — committed to version control

## Monorepo Orchestration

**Tool:** **Turborepo** ^2.9.18 (`turbo.json`)
- UI mode: TUI (Terminal User Interface)
- Pipeline tasks: `build`, `dev`, `lint`, `check-types`
- Build depends on `^build` (topological), outputs cached as `.next/**` (for Next.js apps)
- Dev runs with `--persistent` and no caching
- Remote Caching available (Vercel Remote Cache)
- Config: `turbo.json`

## Frameworks

**API Server:**
- **Hono** ^4.12.25 — Lightweight HTTP framework used in `apps/api/src/index.ts`. Creates REST endpoints via `new Hono()`.
- **@hono/node-server** ^2.0.4 — Node.js adapter to run Hono without a full Node.js HTTP framework. Serves on port 3001.

**UI Library (internal):**
- **React** ^19.2.0 — Component library in `@repo/ui` (`packages/ui/src/`). Uses `"use client"` directive for client components, `ReactNode`, `JSX.Element` types.
- **React DOM** ^19.2.0 — Peer dependency for rendering support.

**Frontend App (planned):**
- **Next.js** — ESLint config includes `@next/eslint-plugin-next` ^16.2.0 and a `nextjs.json` tsconfig, indicating a Next.js admin app (`apps/admin/`) is scaffolded but contains no source files yet. TSConfig extends `@repo/typescript-config/nextjs.json` (uses `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "preserve"`, `plugins: [{ name: "next" }]`).

## Key Dependencies

### Root (`package.json`)
| Package | Version | Purpose |
|---------|---------|---------|
| turbo | ^2.9.18 | Monorepo task orchestrator & caching |
| prettier | ^3.7.4 | Code formatting |
| typescript | 5.9.2 | TypeScript compiler (root dev dep) |

### `apps/api` (Hono API Server)
| Package | Version | Purpose |
|---------|---------|---------|
| hono | ^4.12.25 | HTTP framework (router, middleware, JSON responses) |
| @hono/node-server | ^2.0.4 | Node.js adapter for Hono |
| tsx | ^4.22.4 | TypeScript execution engine (`tsx watch src/index.ts` for dev) |
| @types/node | ^22.15.3 | Node.js type definitions |
| typescript | ^6.0.3 | TS compiler for API app |

### `packages/ui` (`@repo/ui`)
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI component library (shared) |
| react-dom | ^19.2.0 | React DOM rendering |
| eslint | ^9.39.1 | Linting (dev) |
| @types/react | 19.2.2 | React type definitions (dev) |
| @types/react-dom | 19.2.2 | React DOM type definitions (dev) |
| @repo/eslint-config | workspace:* | Shared ESLint config (dev) |
| @repo/typescript-config | workspace:* | Shared TS config (dev) |

### `packages/eslint-config` (`@repo/eslint-config`)
| Package | Version | Purpose |
|---------|---------|---------|
| @eslint/js | ^9.39.1 | ESLint base JS recommended rules |
| eslint | ^9.39.1 | ESLint core (flat config) |
| eslint-config-prettier | ^10.1.1 | Disables ESLint rules that conflict with Prettier |
| eslint-plugin-only-warn | ^1.1.0 | Converts all errors to warnings |
| eslint-plugin-react | ^7.37.5 | React-specific linting rules |
| eslint-plugin-react-hooks | ^5.2.0 | React Hooks rules of hooks |
| eslint-plugin-turbo | ^2.7.1 | Turbo-specific env var rules |
| typescript-eslint | ^8.50.0 | TypeScript ESLint rules (`tseslint.configs.recommended`) |
| @next/eslint-plugin-next | ^16.2.0 | Next.js specific linting |
| globals | ^16.5.0 | Global variable definitions |
| typescript | ^5.9.2 | TypeScript (dev) |

### `packages/typescript-config` (`@repo/typescript-config`)
Shared TypeScript configs published internally:
- `base.json` — Strict base: ES2022 target, NodeNext module, strict mode, `noUncheckedIndexedAccess`, `isolatedModules`
- `nextjs.json` — Next.js app config (extends base: ESNext/Bundler, `jsx: "preserve"`, `noEmit`)
- `react-library.json` — Library config (extends base, adds `jsx: "react-jsx"`)

## Build Tools & Dev Infrastructure

**Build:**
- **Turborepo** — Orchestrates builds across workspaces (topological dependency ordering)
- **tsx** ^4.22.4 — Used in API app for TypeScript execution in dev (`tsx watch`)
- No bundler (webpack, esbuild, vite) explicitly configured — Hono API runs directly via tsx

**Linting:**
- **ESLint** ^9.39.1 — Flat config format (`eslint.config.mjs`)
- Configs: `@repo/eslint-config/base.js` (shared), `next.js` (Next.js), `react-internal.js` (React libs)
- Key rules: `turbo/no-undeclared-env-vars: "warn"`, `react/react-in-jsx-scope: "off"`, React Hooks recommended rules
- Global ignores: `dist/**`, `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**Formatting:**
- **Prettier** ^3.7.4 — Used via `pnpm format` (writes `**/*.{ts,tsx,md}`)
- No `.prettierrc` config file found — uses Prettier defaults

**Type Checking:**
- **TypeScript** ^5.9.x / ^6.0.3 — `check-types` scripts with `tsc --noEmit` in packages
- Strict mode enabled across configs (`strict: true`, `noUncheckedIndexedAccess: true`)

**Testing:**
- **Not configured.** No test runner (vitest, jest, mocha) found. No test files present.

## Infrastructure Dependencies

**Databases:**
- None configured. No ORM, database client, or connection strings in code.

**Caching:**
- None configured. No Redis, Memcached, or in-memory cache layer.

**Queues/Message Brokers:**
- None configured.

**File Storage:**
- Not integrated. No S3, cloud storage, or local file system abstraction.

## Platform Requirements

**Development:**
- Node.js >= 18
- pnpm 9.0.0
- TypeScript 5.9.x
- OS: Windows (current development), macOS/Linux compatible

**Production:**
- Node.js >= 18 runtime
- No Docker/Dockerfile present
- No deployment configuration (no `vercel.json`, no CI/CD YAML files)

---

*Stack analysis: 2026-06-13*
