<!-- GSD:project-start source:PROJECT.md -->
## Project

**Gajan Traders — Multi-Tenant Shipment Tracking**

A multi-tenant shipment tracking platform for Gajan Traders, a logistics company with 2 organizations and multiple branches per org. Three surfaces share a single Hono API: an admin app for managing shipments, customers, quotations, invoices, and branches; white-label customer portals for India and Sri Lanka where customers see their shipments and quotes; and a super admin view that cross-cuts all tenants. Integrates with 17TRACK for carrier tracking, sends email (ZeptoMail/Resend) and WhatsApp (MSG91) notifications on status changes.

**Core Value:** A shipment gets added → tracked via 17TRACK → status changes trigger email + WhatsApp to the right customer — without leaking data between tenants.

### Constraints

- **Tech stack**: Hono API, Next.js frontends, Drizzle ORM + PostgreSQL, Better Auth, CASL, Redis, Socket.IO, Docker/Coolify
- **Multi-tenant isolation**: Single DB with tenantId column — no separate schemas or per-tenant DBs
- **Notification providers**: Resend (email), MSG91 (WhatsApp/SMS) — already proven in GT Express
- **Tooling**: Biome to replace ESLint + Prettier
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- **TypeScript** 5.9.x — Used across all apps and packages (100% TypeScript codebase). Targets ES2022. Configured with strict mode, `noUncheckedIndexedAccess`, and `isolatedModules`.
- **TSX** (React JSX with TypeScript) — Used in `@repo/ui` for React components.
## Runtime
- **Node.js** >= 18 (enforced via `package.json` engines field)
- Platform: Cross-platform (developed on Windows, deployable to Linux)
- **pnpm** 9.0.0 (declared via `packageManager` in root `package.json` and `pnpm-lock.yaml`)
- Lockfile: `pnpm-lock.yaml` — committed to version control
## Monorepo Orchestration
- UI mode: TUI (Terminal User Interface)
- Pipeline tasks: `build`, `dev`, `lint`, `check-types`
- Build depends on `^build` (topological), outputs cached as `.next/**` (for Next.js apps)
- Dev runs with `--persistent` and no caching
- Remote Caching available (Vercel Remote Cache)
- Config: `turbo.json`
## Frameworks
- **Hono** ^4.12.25 — Lightweight HTTP framework used in `apps/api/src/index.ts`. Creates REST endpoints via `new Hono()`.
- **@hono/node-server** ^2.0.4 — Node.js adapter to run Hono without a full Node.js HTTP framework. Serves on port 3001.
- **React** ^19.2.0 — Component library in `@repo/ui` (`packages/ui/src/`). Uses `"use client"` directive for client components, `ReactNode`, `JSX.Element` types.
- **React DOM** ^19.2.0 — Peer dependency for rendering support.
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
- `base.json` — Strict base: ES2022 target, NodeNext module, strict mode, `noUncheckedIndexedAccess`, `isolatedModules`
- `nextjs.json` — Next.js app config (extends base: ESNext/Bundler, `jsx: "preserve"`, `noEmit`)
- `react-library.json` — Library config (extends base, adds `jsx: "react-jsx"`)
## Build Tools & Dev Infrastructure
- **Turborepo** — Orchestrates builds across workspaces (topological dependency ordering)
- **tsx** ^4.22.4 — Used in API app for TypeScript execution in dev (`tsx watch`)
- No bundler (webpack, esbuild, vite) explicitly configured — Hono API runs directly via tsx
- **ESLint** ^9.39.1 — Flat config format (`eslint.config.mjs`)
- Configs: `@repo/eslint-config/base.js` (shared), `next.js` (Next.js), `react-internal.js` (React libs)
- Key rules: `turbo/no-undeclared-env-vars: "warn"`, `react/react-in-jsx-scope: "off"`, React Hooks recommended rules
- Global ignores: `dist/**`, `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- **Prettier** ^3.7.4 — Used via `pnpm format` (writes `**/*.{ts,tsx,md}`)
- No `.prettierrc` config file found — uses Prettier defaults
- **TypeScript** ^5.9.x / ^6.0.3 — `check-types` scripts with `tsc --noEmit` in packages
- Strict mode enabled across configs (`strict: true`, `noUncheckedIndexedAccess: true`)
- **Not configured.** No test runner (vitest, jest, mocha) found. No test files present.
## Infrastructure Dependencies
- None configured. No ORM, database client, or connection strings in code.
- None configured. No Redis, Memcached, or in-memory cache layer.
- None configured.
- Not integrated. No S3, cloud storage, or local file system abstraction.
## Platform Requirements
- Node.js >= 18
- pnpm 9.0.0
- TypeScript 5.9.x
- OS: Windows (current development), macOS/Linux compatible
- Node.js >= 18 runtime
- No Docker/Dockerfile present
- No deployment configuration (no `vercel.json`, no CI/CD YAML files)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Project Overview
- `apps/api/` — Hono HTTP API server (TypeScript)
- `apps/admin/` — Placeholder (planned Next.js app, currently empty)
- `packages/ui/` — `@repo/ui` React 19 component library
- `packages/eslint-config/` — `@repo/eslint-config` shared ESLint flat configs
- `packages/typescript-config/` — `@repo/typescript-config` shared tsconfigs
## Naming Conventions
### Files
- **React components:** `kebab-case.tsx`
- **API routes:** `kebab-case.ts`
### Functions and Variables
- **camelCase** for all functions and variables
- **camelCase** for React hook usage: `use client` directive observed
### React Components
- **PascalCase** for component functions
- Both arrow-function and named-function declaration styles are used interchangeably
### Types and Interfaces
- **PascalCase** for interface names
- **Inline interface definitions** preferred for simple component props (no separate file)
## File Organization
### Directory Layout Pattern
### Component-per-file
- Each React component gets its own file: `button.tsx`, `card.tsx`, `code.tsx`
- Barrel exports are **not used** — imports use `@repo/ui/*` explicit paths via the `exports` map
## Import/Export Patterns
### Exports
- **Named exports only** — no default exports observed
- Package `exports` field in `packages/ui/package.json` maps all files at `./src/*.tsx`:
### Imports
- **Direct named imports** from packages:
- **React imports:** `import { ReactNode } from "react"` and `import { type JSX } from "react"`
- **Internal workspace imports** use the `workspace:*` protocol (pnpm) — though no cross-package imports exist yet in source files
## Code Style
### Formatting
- **Formatter:** Prettier ^3.7.4 (root devDependency)
- **No `.editorconfig`** found
### Linting
- **Linter:** ESLint v9 with flat config (`eslint.config.mjs`)
- **Config packages:**
- **Key rules:**
- **Ignore patterns:** `dist/**` (base), `.next/**`, `out/**`, `build/**`, `next-env.d.ts` (next.js)
### Lint enforcement
- `@repo/ui` uses `--max-warnings 0` flag — any lint warning fails the lint task
## TypeScript Configuration
### Base Config (`packages/typescript-config/base.json`)
### React Library Config
- Extends `base.json`, adds `"jsx": "react-jsx"` (automatic JSX runtime)
### App-specific Config
- API app (`apps/api`) has no local `tsconfig.json` — likely uses `tsx` for execution with inherited strict settings from node_modules
## Error Handling
- **Hono API:** Use Hono's `app.onError()` for global error handling
- **API responses:** Use `c.json({ error: string }, status)` pattern for error responses
- **UI:** No error boundaries or error states implemented yet
## Component Patterns (React)
### Functional Components Only
- All components are functional — no class components used
- Two styles coexist:
### TypeScript Props
- Props are typed with either a named interface (`ButtonProps`) or inline type annotation
- All props are destructured in the function signature
### "use client" Directive
- `"use client"` used in interactive components (`button.tsx` has event handlers)
## Logging
- **No logging framework configured** — the API uses Hono with no logger middleware yet
- Default to `console.log` or Hono logger if needed
## Turbo Tasks
- `build` — depends on `^build`, caches `.next/**` except cache/dev dirs
- `lint` — depends on `^lint`
- `check-types` — depends on `^check-types`
- `dev` — uncached, persistent
## Commit Message Conventions
- **Only one commit in history:** `5a28d92 Initial commit from create-turbo`
- **No commit convention established yet** — all future work should establish one
- **Recommendation:** Use conventional commits format: `type(scope): description`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## High-Level Architecture Diagram
```
```
## Monorepo Structure Overview
- `pnpm-workspace.yaml` — Declares `apps/*` and `packages/*` as workspace members
- `turbo.json` — Defines task pipelines (`build`, `dev`, `lint`, `check-types`) with dependency ordering and caching rules
- `package.json` — Root scripts proxy all commands through `turbo run`
- `apps/api` — Hono HTTP server (Express-like, TypeScript-first framework)
- `apps/admin` — Empty placeholder directory (intended for Next.js admin panel)
- `packages/eslint-config` — Shared ESLint configurations (`@repo/eslint-config`)
- `packages/typescript-config` — Shared TypeScript configurations (`@repo/typescript-config`)
- `packages/ui` — Shared React component library (`@repo/ui`)
## App Boundaries and Communication
### Current State
### Planned Communication Pattern
```
```
### CORS
## Layers (Planned Architecture)
```
```
## Data Flow
### Current Data Flow (Single App)
```
```
### Planned Data Flow (Admin + API)
```
```
### State Management
- **API app:** Stateless request/response pattern using Hono context (`c`) objects
- **Admin app:** Not yet implemented — will likely use React state or Next.js server actions
- **Data persistence:** None currently configured (no database integration)
## Route / Endpoint Structure
### apps/api (`src/index.ts`)
| Method | Path   | Handler | Response                      |
|--------|--------|---------|-------------------------------|
| GET    | `/`    | Inline  | `{ message: "ShipTrack API" }`|
- Port: `3001`
- Transport: HTTP
- No middleware currently applied
- Single inline route handler
```typescript
```
### apps/admin
```
```
## Key Design Patterns
### 1. Turborepo Monorepo Pattern
- **Task pipeline:** Tasks defined in `turbo.json` with dependency ordering (`^build` means "build dependencies first")
- **Caching:** Build outputs cached (`.next/**`) with inputs tracked (`$TURBO_DEFAULT$`, `.env*`)
- **Script routing:** All root scripts (`dev`, `build`, `lint`) proxy through `turbo run`
### 2. Hono HTTP Server Pattern
- **Pattern:** Simple `new Hono()` instantiation, `app.get()` route registration, `serve()` to start
- **Response:** `c.json()` for JSON responses
- **Context:** `c` (Hono Context) carries request/response data
- **Dev mode:** `tsx watch` for hot-reload development
### 3. Scoped Package Pattern
- `@repo/ui` — React components
- `@repo/eslint-config` — ESLint configurations
- `@repo/typescript-config` — TypeScript configurations
```json
```
### 4. ESLint Flat Config Pattern
- All configurations use the **flat config** format (ESLint v9+)
- Configs are JavaScript ESM files (`base.js`, `next.js`, etc.)
- Shared configs import from `@repo/eslint-config` workspace package
- Configs compose via spread operators (`...baseConfig`)
### 5. TypeScript Config Inheritance Pattern
- `@repo/typescript-config/base.json` — Shared strict settings
- `@repo/typescript-config/nextjs.json` — Extends base, adds Next.js settings
- `@repo/typescript-config/react-library.json` — Extends base, adds React JSX
- Individual packages/extend via `"extends": "@repo/typescript-config/..."`
### 6. Component Library Pattern
- `@repo/ui` provides basic React components (Button, Card, Code)
- Components use `"use client"` directive when they need browser APIs
- Exports use the `./src/*.tsx` glob pattern for direct file access
## Error Handling
- Global error handler middleware
- CORS middleware for cross-origin requests
- Request validation (zod or similar)
- Structured error responses (e.g., `{ error: { code, message } }`)
## Cross-Cutting Concerns
| Concern      | Current Implementation                    |
|-------------|------------------------------------------|
| **Logging** | None configured (console.log implied)    |
| **Validation** | None configured                       |
| **Auth**    | None configured                          |
| **CORS**    | None configured                          |
| **Rate limiting** | None configured                    |
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
