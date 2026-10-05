# 0001-a. Shared tokens and admin DESIGN.md

Part of umbrella [0001](index.md). Supports the token authority and design doc decisions.

## Summary

The admin's color and spacing tokens move out of the admin app and into a shared stylesheet in `@repo/ui`, so one place defines the look and every app can import it. An `admin DESIGN.md` documents the rules in prose, matching what the customer and Lanka Mahal apps already have.

## Requirements

**User stories**:
- As an admin developer, I want to import the tokens from `@repo/ui` so that I do not copy a color scale into every app.
- As a maintainer, I want a written design contract so that new pages follow the same rules.

**Acceptance criteria**:
- **AC-A1**: The token variable blocks (`:root` and `[data-theme="dark"]`: `--background`, `--surface`, `--foreground`, `--border`, `--accent`, the status soft and strong pairs, the sidebar, rail, subnav, and glass tokens) plus framework neutral utility classes (`.glass-panel`, `.content-panel`, `.input-surface`, the `.table-*` density and hover classes) and the `:focus-visible` focus ring rule live in a shared CSS file in `@repo/ui`, exported as `./tokens.css`, and the admin app imports it.
- **AC-A2**: The admin `globals.css` keeps `@theme`, `@theme inline`, and `@custom-variant` (Tailwind v4 requires these in the consuming app's entry) and stops defining the moved tokens and utilities. Admin only additions stay.
- **AC-A3**: The admin renders identically in light and dark mode after the move, verified by a rendered page comparison; the status badge is the one intended exception (see `0001-c`).
- **AC-A3b**: The shared sheet defines the token pairs the status mapping needs that do not all exist today: a `--secondary` pair (strong, soft, and soft foreground) and soft pairs for `primary` and `default`, so every status color resolves to a token (see `0001-c`).
- **AC-A4**: `apps/admin/DESIGN.md` documents typography, color tokens, spacing, radius, the status to color mapping, and the component rules, following the structure of `apps/customer/DESIGN.md`, and records the two intentional visual changes (shared badge swatches, any status color remap).

## Decision

**Chosen option**: A shared CSS file in `@repo/ui`, plus an admin `DESIGN.md`.

Move the token variables and neutral utilities into `@repo/ui/src/tokens.css`, export it as `./tokens.css`, and import it from the admin `globals.css` after the existing imports, so it slots into the pattern the apps already use for `@heroui/styles`. The import specifier and workspace CSS resolution under Next 16 are the first thing to confirm (see the build plan). Keep `@theme`, `@theme inline`, and `@custom-variant` in the admin entry, since Tailwind v4 must process those in the consuming app. Record the contract in a new `apps/admin/DESIGN.md`.

**Implementation skills**: none.

## Inline rationale

The apps already import stylesheets from packages (`@heroui/styles`), so a shared token sheet is the same pattern with no new machinery. The TypeScript token provider alternative adds a runtime and typing layer for no benefit when the app is CSS driven. Keeping a per app `DESIGN.md` mirrors the sibling apps and gives `/develop` a written contract to build against.

## Token contract

- Tokens are the single source of truth. Components never hardcode a hex value or a raw Tailwind color.
- Both themes are always defined together. A new token is added to the light block and the dark block in the same change.
- What moves: the `:root` and `[data-theme="dark"]` variable blocks, the framework neutral utility classes, and the focus ring rule.
- What stays in the admin app: `@theme`, `@theme inline`, `@custom-variant dark` (Tailwind v4 requires these in the consuming entry), and admin only utilities (`.ops-*`, `.dashboard-glass`, `.app-mesh-bg`, `.shipments-ops`).
- The status soft and strong pairs (`--success-soft`, `--success-soft-foreground`, and the warning, danger, info, primary, secondary, and default equivalents) are part of the shared set, because the status badge depends on them.
- The focus ring rule (`:focus-visible` using `--focus`) moves into the shared sheet, so a shared component keeps a visible focus ring in any app that imports the tokens.

## Build plan

1. Confirm workspace CSS resolution: export `./tokens.css` from `@repo/ui/package.json` and prove a trivial import resolves in the admin app under Next 16 before moving anything. Fails fast if the mechanism needs a copy step. satisfies **AC-A1**.
2. Create the shared token stylesheet in `@repo/ui` from the current admin variables, frameworks neutral utilities, and the focus ring rule; add the missing `--secondary`, `--primary-soft`, and `--default-soft` pairs, satisfies **AC-A1**, **AC-A3b**.
3. Import it in the admin `globals.css` while the admin definitions still exist (additive), diff rendered pages in both themes, then remove the now shared definitions, satisfies **AC-A2**, **AC-A3**.
4. Write `apps/admin/DESIGN.md`, satisfies **AC-A4**.

## Consequences

**Positive**: one token source for the whole monorepo; a written design contract for future pages.

**Negative**: the token move touches the whole admin app's styling at once, so a mistake is visible everywhere; the shared file must stay framework neutral.

**Neutral**: other apps are not required to adopt the shared tokens in this feature.

## Follow-up

- [ ] Decide later whether `apps/customer` and `apps/lanka-mahal` adopt the shared tokens or keep their Stripe inspired docs.