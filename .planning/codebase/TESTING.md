# Testing Patterns

**Analysis Date:** 2026-06-13

## Test Framework

**Status: None configured.**

No test framework has been installed or configured in this project. The project was scaffolded from `create-turbo@latest` with no test setup.

### Current test script

In `apps/api/package.json`:
```json
"test": "echo \"Error: no test specified\" && exit 1"
```

This is the placeholder script from `npm init`. No test script exists in the root `package.json` or in `packages/ui/package.json`.

### Packages not present
- Jest (no `jest.config.*`, no `@jest/*` packages)
- Vitest (no `vitest.config.*`, no `vitest` package)
- Playwright (no `playwright.config.*`)
- Cypress (no `cypress.config.*`)
- Testing Library (no `@testing-library/*` packages)
- Any test runner at any scope

## Test File Organization

**Status: No test files exist.**

No `.test.*` or `.spec.*` files were found anywhere in the project tree. The `coverage` entry in `.gitignore` is included by default from the create-turbo template but no coverage tooling is installed.

### Anticipated locations (following monorepo conventions)
- Each app/package should co-locate tests near source files:
  - `apps/api/src/__tests__/*.test.ts`
  - `apps/api/src/routes/*.test.ts`
  - `packages/ui/src/*.test.tsx`
- Or use `src/**/*.test.ts` pattern alongside source files

## Coverage Requirements

**Status: Not enforced.**

No coverage tool, threshold configuration, or coverage reporting exists. The `.gitignore` contains `coverage` (standard create-turbo template output) but nothing generates coverage.

### Recommendation
When adding a test framework, typical thresholds for monorepos:
- **Unit tests:** 80%+ statement/line coverage
- **Integration tests:** Coverage optional, focus on critical paths
- **Package-level:** Each package enforces its own threshold in its config

## Current Test Coverage Level

**Status: Zero tests, zero coverage.**

| Area | Tests | Coverage |
|------|-------|----------|
| `apps/api` | 0 | 0% |
| `packages/ui` | 0 | 0% |
| `apps/admin` | N/A (empty) | N/A |
| **Total** | **0** | **0%** |

## Testing Patterns

**Status: No testing patterns established yet.**

The following patterns should be used when adding tests:

### API Testing (`apps/api`)
- **Framework:** Vitest (recommended for TypeScript-first projects)
- **HTTP testing:** Use `@hono/test-utils` or `vitest` with Hono's `app.request()` for route testing
- **Pattern:**
  ```typescript
  import { describe, it, expect } from 'vitest';
  import app from '../index';

  describe('GET /', () => {
    it('returns API message', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('ShipTrack API');
    });
  });
  ```

### UI Testing (`packages/ui`)
- **Framework:** Vitest + `@testing-library/react` (recommended)
- **Pattern:**
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { Button } from './button';

  describe('Button', () => {
    it('renders children', () => {
      render(<Button appName="test">Click me</Button>);
      expect(screen.getByText('Click me')).toBeDefined();
    });
  });
  ```

### Monorepo test orchestration
- Each package runs its own test script
- Root `turbo.json` should add a `test` task that depends on `^test`
  ```json
  "test": {
    "dependsOn": ["^test"],
    "outputs": ["coverage/**"]
  }
  ```
- Root `package.json` should add: `"test": "turbo run test"`

## CI Test Setup

**Status: No CI configured.**

- No `.github/workflows/` directory exists
- No CI configuration files found
- No CI badges or deployment pipelines configured

### Recommendation for CI pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm check-types
      - run: pnpm test
```

## Test Types

### Unit Tests — Not present
- Should cover individual functions, components, and utilities
- Mock external dependencies (database, HTTP calls)

### Integration Tests — Not present
- Should cover API route handlers end-to-end
- Component integration with real child components

### E2E Tests — Not present
- Not yet applicable (no deployed frontend)
- Future: Playwright for admin panel E2E

## Dev Dependencies Needed

To add testing capability, the following packages should be installed at appropriate scopes:

**Root/packages-level (shared):**
- `vitest` — test runner
- `@vitest/coverage-v8` — coverage reporting

**For `packages/ui`:**
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom` (vitest environment)

**For `apps/api`:**
- No additional HTTP test library needed if using Hono's built-in `app.request()`

---

*Testing analysis: 2026-06-13*
