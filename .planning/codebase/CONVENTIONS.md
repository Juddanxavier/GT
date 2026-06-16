# Coding Conventions

**Analysis Date:** 2026-06-13

## Project Overview

This is a **pnpm Turborepo monorepo** containing:
- `apps/api/` — Hono HTTP API server (TypeScript)
- `apps/admin/` — Placeholder (planned Next.js app, currently empty)
- `packages/ui/` — `@repo/ui` React 19 component library
- `packages/eslint-config/` — `@repo/eslint-config` shared ESLint flat configs
- `packages/typescript-config/` — `@repo/typescript-config` shared tsconfigs

**Root package manager:** pnpm 9.0.0 (`pnpm-lock.yaml` present)
**Node requirement:** >=18

## Naming Conventions

### Files
- **React components:** `kebab-case.tsx`
  - `packages/ui/src/button.tsx`
  - `packages/ui/src/card.tsx`
  - `packages/ui/src/code.tsx`
- **API routes:** `kebab-case.ts`
  - `apps/api/src/index.ts`

### Functions and Variables
- **camelCase** for all functions and variables
  - `appName`, `className`, `onClick`, `children`, `href`, `title`
- **camelCase** for React hook usage: `use client` directive observed

### React Components
- **PascalCase** for component functions
  - `export const Button = (...) => { ... }` (arrow function, `button.tsx`)
  - `export function Card(...) { ... }` (named function declaration, `card.tsx`)
  - `export function Code(...) { ... }` (named function declaration, `code.tsx`)
- Both arrow-function and named-function declaration styles are used interchangeably

### Types and Interfaces
- **PascalCase** for interface names
  - `ButtonProps` (`button.tsx`)
- **Inline interface definitions** preferred for simple component props (no separate file)
  - Props defined inline in the function signature (`card.tsx`, `code.tsx`)

## File Organization

### Directory Layout Pattern
```
apps/<app-name>/
├── src/
│   ├── index.ts          # Entry point
│   └── ...               # App-specific modules
├── package.json
└── tsconfig.json

packages/<package-name>/
├── src/
│   └── *.tsx             # Source files
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

### Component-per-file
- Each React component gets its own file: `button.tsx`, `card.tsx`, `code.tsx`
- Barrel exports are **not used** — imports use `@repo/ui/*` explicit paths via the `exports` map

## Import/Export Patterns

### Exports
- **Named exports only** — no default exports observed
  - `export const Button = ...`
  - `export function Card(...)`
  - `export function Code(...)`
- Package `exports` field in `packages/ui/package.json` maps all files at `./src/*.tsx`:
  ```json
  "./*": "./src/*.tsx"
  ```

### Imports
- **Direct named imports** from packages:
  - `import { serve } from '@hono/node-server'`
  - `import { Hono } from 'hono'`
- **React imports:** `import { ReactNode } from "react"` and `import { type JSX } from "react"`
- **Internal workspace imports** use the `workspace:*` protocol (pnpm) — though no cross-package imports exist yet in source files

## Code Style

### Formatting
- **Formatter:** Prettier ^3.7.4 (root devDependency)
  - Script: `prettier --write \"**/*.{ts,tsx,md}\"`
  - **No `.prettierrc` or `.prettierignore` file found** — formatting uses Prettier defaults
  - Runs only on `*.ts`, `*.tsx`, `*.md` files
- **No `.editorconfig`** found

### Linting
- **Linter:** ESLint v9 with flat config (`eslint.config.mjs`)
- **Config packages:**
  - `@repo/eslint-config/base.js` — Recommended JS + TypeScript-ESLint + Turbo + OnlyWarn
  - `@repo/eslint-config/react-internal.js` — Base + React + React Hooks (for `@repo/ui`)
  - `@repo/eslint-config/next.js` — Base + React + Next.js plugin (for future Next.js apps)
- **Key rules:**
  - `turbo/no-undeclared-env-vars`: warn
  - React scope check disabled (`react/react-in-jsx-scope`: off — new JSX transform)
  - React Hooks rules: recommended preset
  - `eslint-config-prettier` included to avoid conflicts with Prettier
  - `eslint-plugin-only-warn` — all violations downgraded to warnings
  - All ESLint configs use `@eslint/js` recommended + `typescript-eslint` recommended
- **Ignore patterns:** `dist/**` (base), `.next/**`, `out/**`, `build/**`, `next-env.d.ts` (next.js)

### Lint enforcement
- `@repo/ui` uses `--max-warnings 0` flag — any lint warning fails the lint task

## TypeScript Configuration

### Base Config (`packages/typescript-config/base.json`)
```json
{
  "declaration": true,
  "declarationMap": true,
  "esModuleInterop": true,
  "isolatedModules": true,
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "skipLibCheck": true,
  "resolveJsonModule": true
}
```

### React Library Config
- Extends `base.json`, adds `"jsx": "react-jsx"` (automatic JSX runtime)

### App-specific Config
- API app (`apps/api`) has no local `tsconfig.json` — likely uses `tsx` for execution with inherited strict settings from node_modules

## Error Handling

**Current codebase is minimal — no error handling patterns established yet.** The API (`apps/api/src/index.ts`) has no error middleware, try-catch blocks, or error response patterns.

The following patterns should be used going forward:
- **Hono API:** Use Hono's `app.onError()` for global error handling
- **API responses:** Use `c.json({ error: string }, status)` pattern for error responses
- **UI:** No error boundaries or error states implemented yet

## Component Patterns (React)

### Functional Components Only
- All components are functional — no class components used
- Two styles coexist:
  - Arrow function: `export const Button = ({ ... }: Props) => { ... }`
  - Named function: `export function Card({ ... }: { inline props }) { ... }`

### TypeScript Props
- Props are typed with either a named interface (`ButtonProps`) or inline type annotation
- All props are destructured in the function signature

### "use client" Directive
- `"use client"` used in interactive components (`button.tsx` has event handlers)

## Logging
- **No logging framework configured** — the API uses Hono with no logger middleware yet
- Default to `console.log` or Hono logger if needed

## Turbo Tasks

Defined in `turbo.json`:
- `build` — depends on `^build`, caches `.next/**` except cache/dev dirs
- `lint` — depends on `^lint`
- `check-types` — depends on `^check-types`
- `dev` — uncached, persistent

## Commit Message Conventions
- **Only one commit in history:** `5a28d92 Initial commit from create-turbo`
- **No commit convention established yet** — all future work should establish one
- **Recommendation:** Use conventional commits format: `type(scope): description`

---

*Convention analysis: 2026-06-13*
