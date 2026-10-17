# 0001-a. Shared tokens and admin DESIGN.md

Part of umbrella [0001](index.md). Supports the token authority and design doc decisions.

## Summary

The admin's color and spacing tokens move out of the admin app and into a shared stylesheet in `@repo/ui`, so one place defines the look and every app can import it. An `admin DESIGN.md` documents the rules in prose, matching what the customer and Lanka Mahal apps already have.

This file now carries a second decision taken on top of the move: the admin drops cyan for an emerald accent, both themes move from zinc neutrals to a blue gray, Inter is replaced by Geist with Geist Mono for codes and tracking numbers, and every chart series collapses onto one six step ramp. The two decisions share a file because they share a target: `packages/ui/src/tokens.css`. Only `apps/admin/app/globals.css` imports that sheet, so editing it changes exactly one app and the portals stay where they are.

## Requirements

**User stories**:
- As an admin developer, I want to import the tokens from `@repo/ui` so that I do not copy a color scale into every app.
- As a maintainer, I want a written design contract so that new pages follow the same rules.
- As an admin operator, I want an accent that reads as delivery and completion, and a dark theme that reads as a cool operations screen rather than a warm gray one.
- As a maintainer, I want one palette for every chart so that green means the same thing on every page.

**Acceptance criteria**:
- **AC-A1**: The token variable blocks (`:root` and `[data-theme="dark"]`: `--background`, `--surface`, `--foreground`, `--border`, `--accent`, the status soft and strong pairs, the sidebar, rail, subnav, and glass tokens) plus framework neutral utility classes (`.glass-panel`, `.content-panel`, `.input-surface`, the `.table-*` density and hover classes) and the `:focus-visible` focus ring rule live in a shared CSS file in `@repo/ui`, exported as `./tokens.css`, and the admin app imports it.
- **AC-A2**: The admin `globals.css` keeps `@theme`, `@theme inline`, and `@custom-variant` (Tailwind v4 requires these in the consuming app's entry) and stops defining the moved tokens and utilities. Admin only additions stay.
- **AC-A3**: The admin renders identically in light and dark mode after the move, verified by a rendered page comparison; the status badge is the one intended exception (see `0001-c`).
- **AC-A3b**: The shared sheet defines the token pairs the status mapping needs that do not all exist today: a `--secondary` pair (strong, soft, and soft foreground) and soft pairs for `primary` and `default`, so every status color resolves to a token (see `0001-c`).
- **AC-A4**: `apps/admin/DESIGN.md` documents typography, color tokens, spacing, radius, the status to color mapping, and the component rules, following the structure of `apps/customer/DESIGN.md`, and records the two intentional visual changes (shared badge swatches, any status color remap).
- **AC-A5 (accent)**: The admin accent is emerald in both themes. Light uses `#065F46` with `#064E3B` hover, `#043F2E` active, `#D1FAE5` soft, `#065F46` soft foreground, `rgba(6, 95, 70, 0.28)` glow, and `#065F46` focus. Dark uses `#34D399` with `#6EE7B7` hover, `#A7F3D0` active, `#064E3B` soft, `#6EE7B7` soft foreground, `rgba(52, 211, 153, 0.35)` glow, and `#34D399` focus. `--primary-soft` and `--primary-soft-foreground` follow the accent in both themes, both mesh gradients become emerald, no cyan value remains on any accent, primary, focus, or mesh token, and `--color-brand` and `--ops-accent` in `apps/admin/app/globals.css` are emerald rather than cyan.
- **AC-A6 (blue gray neutrals)**: Both themes are tinted blue gray. Light moves to canvas `#F1F5F9`, foreground `#0F172A`, borders `#E2E8F0` with `#CBD5E1` hover, muted `#475569`, and slate shaped surfaces and fields. Dark moves to canvas `#0C0F14`, foreground `#F8FAFC`, translucent blue gray surfaces and borders built from `rgba(148, 163, 184, ...)`, muted `#94A3B8`, and slate rails at `#0A0D12`. The rail and sidebar are slate `#0F172A` in light and `#0A0D12` in dark, and the active nav pill is emerald `#064E3B` on `#6EE7B7` text in both themes. No zinc neutral value remains in either theme block.
- **AC-A7 (transit status)**: A `--transit` pair exists in both themes (light `#2563EB` strong, `#FFFFFF` foreground, `#EFF6FF` soft, `#1D4ED8` soft foreground; dark `#60A5FA` strong, `#172554` foreground, `rgba(96, 165, 250, 0.12)` soft, `#93C5FD` soft foreground), `StatusColor` gains `'transit'`, `STATUS_TOKEN_TRIPLES` gains the matching triple, and `in_transit` and `out_for_delivery` map to `'transit'` instead of `'primary'`. No shipment status resolves to `primary` or `accent`, so no shipment status can be mistaken for the accent or for an accent colored chip. Statuses still share colors on purpose, since `pending` and `info_received` are both warning, `exception` and `failed_attempt` are both danger, and the two transit statuses are both `transit`; that is what makes them read as groups.
- **AC-A8 (one chart palette)**: Every shipment and quotation status series color, and every dashboard and reports KPI series color, in `apps/admin` comes from one six step ramp (emerald `#10B981`, blue `#3B82F6`, violet `#8B5CF6`, amber `#F59E0B`, rose `#F43F5E`, slate `#94A3B8`) with the meanings in the palette table below, plus the `--secondary` teal that `available_for_pickup` already uses. The audit timeline's eight category colors are exempt from the ramp, because they name entities rather than values: only `notification` changes, moving from `#06b6d4` to `#F43F5E`. No cyan hex remains outside `--info`, which deliberately keeps cyan for quotation `sent`.
- **AC-A9 (Geist)**: `Geist` and `Geist_Mono` load through `next/font/google` in `apps/admin/app/layout.tsx` with the variables `--font-geist` and `--font-geist-mono`. `--font-sans` resolves to `var(--font-geist)` and `--font-mono` resolves to `var(--font-geist-mono)`, no `--font-inter` reference remains under `apps/admin/`, `.ops-mono` uses `var(--font-mono)` instead of the `ui-monospace` stack, and tracking numbers, label codes, invoice numbers, and quote numbers render in Geist Mono, including the invoice number and tracking number on the invoice detail page. Every `h1`, `h2`, and `h3` in `apps/admin` that is not monospaced, does not already carry a tracking class, is not an uppercase micro label, and is not inside the print label document carries `tracking-tight`; body copy, paragraphs, and span text keep default tracking.
- **AC-A10 (contrast holds)**: After the values change, the WCAG AA verifier runs clean in both themes: 0 failures under 4.5:1 for text pairs and 0 failures under 3:1 for the graphics pairs. Run it as `node contrast-verify.cjs` with no path argument, because the script already resolves `packages/ui/src/tokens.css` relative to its own directory and a relative argument is resolved against the current working directory instead. The verifier's own hardcoded canvas, accent, and derived surface values are updated to the new ones first, otherwise it measures the old theme, and that includes the secondary button hover background `#e9e9ea` derived from the old `#f4f4f5` and `#09090b`, which becomes `#E8ECF1` from `#F1F5F9` and `#0F172A`. Two dark pairs are added alongside the light ones: `--accent-foreground` `#052E1B` on `--accent` `#34D399` at 4.5:1, and `#34D399` on its 10 percent tint over canvas `#0C0F14` at 3:1. The dashboard, the shipments list, and the shipment detail page are then checked by eye in both themes for the focus ring, the primary button, a status badge, and muted secondary text.
- **AC-A11 (contract matches the build)**: `apps/admin/DESIGN.md` states the emerald accent, the blue gray canvases, Geist and Geist Mono, the heading tracking rule, the six step chart palette, and the `transit` status, with values that match `packages/ui/src/tokens.css` exactly. The rule from the top of the file still holds: where prose and CSS disagree, the CSS wins.

## Decision

**Chosen option**: A shared CSS file in `@repo/ui`, plus an admin `DESIGN.md`.

Move the token variables and neutral utilities into `@repo/ui/src/tokens.css`, export it as `./tokens.css`, and import it from the admin `globals.css` after the existing imports, so it slots into the pattern the apps already use for `@heroui/styles`. The import specifier and workspace CSS resolution under Next 16 are the first thing to confirm (see the build plan). Keep `@theme`, `@theme inline`, and `@custom-variant` in the admin entry, since Tailwind v4 must process those in the consuming app. Record the contract in a new `apps/admin/DESIGN.md`.

**Implementation skills**: none.

## Decision 2: emerald, blue gray, Geist

**Chosen option**: Edit the existing sheet in place. No new spec, no superseding file.

The admin keeps its Raycast inspired structure, glass surfaces, and density, and changes three things about its values.

**The accent becomes emerald.** Light `#065F46` is emerald 800, chosen because white text on it measures 7.7:1 and the value itself sits on the page canvas at 7.0:1, while staying one scale step away from `--success` at `#047857` so the two are never the same swatch. Dark `#34D399` is emerald 400, 9.98:1 on the new dark canvas, with `#052E1B` as its foreground for 7.7:1. Hover and active step darker in light and lighter in dark, matching the existing direction. The light soft tint becomes emerald 100 `#D1FAE5` rather than emerald 50, so that accent soft and success soft stay distinguishable instead of rendering as the same pale green.

**Both neutrals become blue gray.** Light canvas `#F1F5F9` and dark canvas `#0C0F14`, which is the near black the app already uses with a small blue lift. Every zinc neutral becomes its slate neighbour, and every translucent white border in dark becomes `rgba(148, 163, 184, ...)` at a similar alpha, so the blue reads only when set beside a true neutral. The rail goes slate rather than near black, and the active nav pill becomes emerald.

**The font becomes Geist with Geist Mono.** Geist ships from Google Fonts and both faces are in the Next font data, so this is a loader swap and two variables, no new dependency. Geist is tighter than Inter, so headings take `tracking-tight` and body copy is left alone.

Three things deliberately do not move. `--info` keeps cyan (light `#0d6e88`, dark `#22d3ee`), which is convenient, because those were the old accent values, so the cyan hue survives as a semantic instead of disappearing. `--secondary` keeps teal. And the rate cards page keeps the portal orange `#E8621A`.

**Status collision.** The accent turning emerald puts it on top of `--success`, so any status colored `accent` or `primary` would look like a delivered or paid one. The fix is a new `--transit` pair, blue in both themes, and moving `in_transit` and `out_for_delivery` onto it. Blue was already the KPI color for those two and the timeline dot for `out_for_delivery`, so the token follows a hue the charts were using rather than introducing a new one. After the move no shipment status resolves to `primary` or `accent`. The chart ramp still differentiates the two (`in_transit` violet, `out_for_delivery` blue) while the badge treats them as one blue pair, which is noted in Consequences.

**Chart palette.** One six step ramp, emerald leading:

| Step | Name | Hex | Tailwind v3 name (reference only) | Meaning |
| --- | --- | --- | --- | --- |
| 1 | emerald | `#10B981` | `emerald-500` | success outcomes: delivered, paid, accepted |
| 2 | blue | `#3B82F6` | `blue-500` | totals and outbound: `total`, `out_for_delivery` |
| 3 | violet | `#8B5CF6` | `violet-500` | in transit: `in_transit` |
| 4 | amber | `#F59E0B` | `amber-500` | waiting and warnings: pending, unpaid, overdue, revenue, converted |
| 5 | rose | `#F43F5E` | `rose-500` | problems: exceptions, rejected, failed attempt, notification |
| 6 | slate | `#94A3B8` | `slate-400` | unknown and inactive: not tracked, expired, other |

The hex column is the authority. The Tailwind column names the v3 color that used to carry that value, and it is reference only: this app runs Tailwind 4.3.1, where `emerald-500` resolves to `#00bb7f`, `blue-500` to `#3080ff`, `violet-500` to `#8d54ff`, `amber-500` to `#f99c00`, `slate-400` to `#90a1b9`, `rose-500` to `#FF2056`, and `teal-500` to `#00BBA7`. None of those is the ramp value. So no ramp color is ever written as a Tailwind color class: write an arbitrary value class such as `bg-[#F43F5E]` or a literal hex, and nothing has to be registered in `@theme`.

Four of the six hexes already appear in the code today (blue, violet, amber, slate), so the real work is small: green `#22c55e` becomes emerald `#10B981` wherever it marked success, red `#ef4444` and any `bg-red-500` become rose `#F43F5E` so the ramp has no red gap, cyan `#06B6D4` becomes blue `#3B82F6` for `total`, and the cyan audit `notification` becomes rose `#F43F5E`. Those four hex literals keep their exact values, but only because they are written as literals, not as class names.

## Inline rationale

The apps already import stylesheets from packages (`@heroui/styles`), so a shared token sheet is the same pattern with no new machinery. The TypeScript token provider alternative adds a runtime and typing layer for no benefit when the app is CSS driven. Keeping a per app `DESIGN.md` mirrors the sibling apps and gives `/develop` a written contract to build against.

On the retheme: emerald is the one color in a logistics console that already means "done", and `--success` was already emerald, so the accent and the success state now read as one family instead of two. Blue gray neutrals remove the warm cast from the light theme and give the dark theme a slight cool lift without becoming a blue interface. Geist is a tighter, more neutral grotesk than Inter, and pairing it with Geist Mono stops the tracking numbers from falling back to `ui-monospace`, which renders differently on every machine. Collapsing the charts onto one ramp is what makes `emerald` mean the same thing on the dashboard, the reports page, the invoices page, and a status badge.

## Token contract

- Tokens are the single source of truth. Components never hardcode a hex value or a raw Tailwind color.
- Both themes are always defined together. A new token is added to the light block and the dark block in the same change.
- What moves: the `:root` and `[data-theme="dark"]` variable blocks, the framework neutral utility classes, and the focus ring rule.
- What stays in the admin app: `@theme`, `@theme inline`, `@custom-variant dark` (Tailwind v4 requires these in the consuming entry), and admin only utilities (`.ops-*`, `.dashboard-glass`, `.app-mesh-bg`, `.shipments-ops`).
- The status soft and strong pairs (`--success-soft`, `--success-soft-foreground`, and the warning, danger, info, primary, secondary, transit, and default equivalents) are part of the shared set, because the status badge depends on them.
- The focus ring rule (`:focus-visible` using `--focus`) moves into the shared sheet, so a shared component keeps a visible focus ring in any app that imports the tokens.
- A status color is never chosen in a page. `apps/admin/app/(dashboard)/reports/page.tsx` is the one place that still keeps a local map, and only for quotation statuses, which are not shipment statuses.
- A chart series picks its color from the ramp table above, not from an arbitrary Tailwind class.

## Design: the values

All light values live on the `:root` block (lines 11 to 104 of `packages/ui/src/tokens.css`), all dark values on `[data-theme="dark"]` (lines 106 to 193). Rows marked "same" are unchanged by this work.

### Light theme

| Token | New value | Was |
| --- | --- | --- |
| `--accent` | `#065F46` | `#0d6e88` |
| `--accent-hover` | `#064E3B` | `#0b657c` |
| `--accent-active` | `#043F2E` | `#094f5e` |
| `--accent-soft` | `#D1FAE5` | `#ecfeff` |
| `--accent-soft-foreground` | `#065F46` | `#0d6e88` |
| `--accent-foreground` | `#FFFFFF` | same |
| `--accent-glow` | `rgba(6, 95, 70, 0.28)` | `rgba(13, 110, 136, 0.28)` |
| `--background` | `#F1F5F9` | `#f4f4f5` |
| `--foreground` | `#0F172A` | `#09090b` |
| `--surface` | `rgba(255, 255, 255, 0.92)` | same |
| `--rail` | `#0F172A` | `#18181b` |
| `--subnav` | `#F8FAFC` | `#fafafa` |
| `--sidebar` | `#0F172A` | `#18181b` |
| `--sidebar-foreground` | `#F8FAFC` | `#fafafa` |
| `--sidebar-muted` | `#94A3B8` | `#a1a1aa` |
| `--sidebar-border` | `rgba(15, 23, 42, 0.10)` | `rgba(0, 0, 0, 0.08)` |
| `--sidebar-hover` | `rgba(15, 23, 42, 0.06)` | `rgba(0, 0, 0, 0.04)` |
| `--sidebar-active-bg` | `#064E3B` | `#164e63` |
| `--sidebar-active-fg` | `#6EE7B7` | `#67e8f9` |
| `--glass-bg` | `rgba(255, 255, 255, 0.75)` | same |
| `--topbar-frost` | `rgba(255, 255, 255, 0.62)` | same |
| `--glass-border` | `rgba(15, 23, 42, 0.10)` | `rgba(0, 0, 0, 0.08)` |
| `--mesh-1` | `rgba(6, 95, 70, 0.06)` | `rgba(13, 110, 136, 0.06)` |
| `--mesh-2` | `rgba(16, 185, 129, 0.04)` | `rgba(6, 182, 212, 0.04)` |
| `--surface-hover` | `#F1F5F9` | `#f4f4f5` |
| `--surface-active` | `#E2E8F0` | `#e4e4e7` |
| `--surface-secondary` | `#F8FAFC` | `#fafafa` |
| `--surface-secondary-foreground` | `#0F172A` | `#09090b` |
| `--surface-tertiary` | `#F1F5F9` | `#f4f4f5` |
| `--surface-tertiary-foreground` | `#0F172A` | `#09090b` |
| `--border` | `#E2E8F0` | `#e4e4e7` |
| `--border-hover` | `#CBD5E1` | `#d4d4d8` |
| `--muted` | `#475569` | `#52525b` |
| `--muted-light` | `#5E6A79` | `#6b6b73` |
| `--separator` | `#E2E8F0` | `#e4e4e7` |
| `--field-background` | `#FFFFFF` | same |
| `--field-border` | `#E2E8F0` | `#e4e4e7` |
| `--field-foreground` | `#0F172A` | `#09090b` |
| `--field-placeholder` | `#64748B` | `#71717a` |
| `--primary-soft` | `#D1FAE5` | `#ecfeff` |
| `--primary-soft-foreground` | `#065F46` | `#0e7490` |
| `--transit` (new) | `#2563EB` | does not exist |
| `--transit-foreground` (new) | `#FFFFFF` | does not exist |
| `--transit-soft` (new) | `#EFF6FF` | does not exist |
| `--transit-soft-foreground` (new) | `#1D4ED8` | does not exist |
| `--default` | `#F1F5F9` | `#f4f4f5` |
| `--default-foreground` | `#0F172A` | `#09090b` |
| `--default-soft` | `#F1F5F9` | `#f4f4f5` |
| `--default-soft-foreground` | `#475569` | `#52525b` |
| `--focus` | `#065F46` | `#0d6e88` |
| `--overlay` | `#FFFFFF` | same |
| `--overlay-foreground` | `#0F172A` | `#09090b` |
| `--scrollbar` | `#CBD5E1` | `#d4d4d8` |
| `--segment` | `#FFFFFF` | same |
| `--segment-foreground` | `#0F172A` | `#09090b` |
| `--surface-shadow` | `0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.08)` | same shape, zinc rgba |
| `--overlay-shadow` | `0 8px 32px -8px rgba(15, 23, 42, 0.12), 0 24px 48px -24px rgba(15, 23, 42, 0.16)` | same shape, zinc rgba |

Unchanged in light: `--field-radius`, `--primary`, `--primary-foreground`, `--secondary` and its three companions, `--success`, `--warning`, `--danger`, `--info` and their companions, `--field-shadow`, `--radius`, and `--app-header-height`.

### Dark theme

| Token | New value | Was |
| --- | --- | --- |
| `--accent` | `#34D399` | `#22d3ee` |
| `--accent-hover` | `#6EE7B7` | `#67e8f9` |
| `--accent-active` | `#A7F3D0` | `#a5f3fc` |
| `--accent-soft` | `#064E3B` | `#164e63` |
| `--accent-soft-foreground` | `#6EE7B7` | `#67e8f9` |
| `--accent-foreground` | `#052E1B` | `#082f49` |
| `--accent-glow` | `rgba(52, 211, 153, 0.35)` | `rgba(34, 211, 238, 0.35)` |
| `--background` | `#0C0F14` | `#09090b` |
| `--foreground` | `#F8FAFC` | `#fafafa` |
| `--surface` | `rgba(21, 26, 36, 0.85)` | `rgba(24, 24, 27, 0.85)` |
| `--rail` | `#0A0D12` | `#0a0a0b` |
| `--subnav` | `#13171E` | `#111113` |
| `--sidebar` | `#0A0D12` | `#0a0a0b` |
| `--sidebar-foreground` | `#F8FAFC` | `#fafafa` |
| `--sidebar-muted` | `#94A3B8` | `#a1a1aa` |
| `--sidebar-border` | `rgba(148, 163, 184, 0.12)` | `rgba(255, 255, 255, 0.06)` |
| `--sidebar-hover` | `rgba(148, 163, 184, 0.10)` | `rgba(255, 255, 255, 0.05)` |
| `--sidebar-active-bg` | `#064E3B` | `#164e63` |
| `--sidebar-active-fg` | `#6EE7B7` | `#67e8f9` |
| `--glass-bg` | `rgba(21, 26, 36, 0.65)` | `rgba(24, 24, 27, 0.65)` |
| `--topbar-frost` | `rgba(12, 15, 20, 0.58)` | `rgba(9, 9, 11, 0.58)` |
| `--glass-border` | `rgba(148, 163, 184, 0.14)` | `rgba(255, 255, 255, 0.08)` |
| `--mesh-1` | `rgba(52, 211, 153, 0.1)` | `rgba(34, 211, 238, 0.1)` |
| `--mesh-2` | `rgba(16, 185, 129, 0.06)` | `rgba(6, 182, 212, 0.06)` |
| `--surface-hover` | `rgba(30, 37, 50, 0.8)` | `rgba(39, 39, 42, 0.8)` |
| `--surface-active` | `#1E2530` | `#27272a` |
| `--surface-secondary` | `#151A22` | `#18181b` |
| `--surface-secondary-foreground` | `#F8FAFC` | `#fafafa` |
| `--surface-tertiary` | `#1E2530` | `#27272a` |
| `--surface-tertiary-foreground` | `#F8FAFC` | `#fafafa` |
| `--border` | `rgba(148, 163, 184, 0.14)` | `rgba(255, 255, 255, 0.08)` |
| `--border-hover` | `rgba(148, 163, 184, 0.22)` | `rgba(255, 255, 255, 0.12)` |
| `--muted` | `#94A3B8` | `#a1a1aa` |
| `--muted-light` | `#7C8798` | `#8a8a93` |
| `--separator` | `rgba(148, 163, 184, 0.12)` | `rgba(255, 255, 255, 0.06)` |
| `--field-background` | `rgba(21, 26, 36, 0.9)` | `rgba(24, 24, 27, 0.9)` |
| `--field-border` | `rgba(148, 163, 184, 0.16)` | `rgba(255, 255, 255, 0.1)` |
| `--field-foreground` | `#F8FAFC` | `#fafafa` |
| `--field-placeholder` | `#7C8798` | `#8b8b93` |
| `--primary-soft` | `rgba(52, 211, 153, 0.12)` | `rgba(34, 211, 238, 0.12)` |
| `--primary-soft-foreground` | `#6EE7B7` | `#67e8f9` |
| `--transit` (new) | `#60A5FA` | does not exist |
| `--transit-foreground` (new) | `#172554` | does not exist |
| `--transit-soft` (new) | `rgba(96, 165, 250, 0.12)` | does not exist |
| `--transit-soft-foreground` (new) | `#93C5FD` | does not exist |
| `--default` | `#1E2530` | `#27272a` |
| `--default-foreground` | `#F8FAFC` | `#fafafa` |
| `--default-soft` | `rgba(148, 163, 184, 0.10)` | `rgba(255, 255, 255, 0.06)` |
| `--default-soft-foreground` | `#94A3B8` | `#a1a1aa` |
| `--focus` | `#34D399` | `#22d3ee` |
| `--overlay` | `rgba(21, 26, 36, 0.95)` | `rgba(24, 24, 27, 0.95)` |
| `--overlay-foreground` | `#F8FAFC` | `#fafafa` |
| `--scrollbar` | `#334155` | `#3f3f46` |
| `--segment` | `#1E2530` | `#27272a` |
| `--segment-foreground` | `#F8FAFC` | `#fafafa` |

Unchanged in dark: `color-scheme: dark`, `--primary`, `--primary-foreground`, `--secondary` and its three companions, `--success`, `--warning`, `--danger`, `--info` and their companions, `--field-shadow`, and both shadows (dark shadows stay black).

### Contrast, checked before build

| Pair | Ratio | Needs |
| --- | --- | --- |
| white on light `--accent` `#065F46` | 7.7:1 | 4.5 |
| light `--accent` on light canvas `#F1F5F9` | 7.0:1 | 4.5 |
| light `--accent-soft-foreground` on `--accent-soft` `#065F46` on `#D1FAE5` | 6.8:1 | 4.5 |
| light `--muted` `#475569` on canvas `#F1F5F9` | 6.9:1 | 4.5 |
| light `--muted-light` `#5E6A79` on canvas `#F1F5F9` | 5.0:1 | 4.5 |
| light `--sidebar-muted` `#94A3B8` on rail `#0F172A` | 7.0:1 | 4.5 |
| light and dark `--sidebar-active-fg` `#6EE7B7` on `--sidebar-active-bg` `#064E3B` | 6.4:1 | 4.5 |
| light `--transit` `#2563EB` under white | 5.2:1 | 4.5 |
| light `--transit-soft-foreground` `#1D4ED8` on `#EFF6FF` | 6.2:1 | 4.5 |
| dark `--foreground` `#F8FAFC` on canvas `#0C0F14` | 18.0:1 | 4.5 |
| dark `--accent` `#34D399` on canvas `#0C0F14` | 9.98:1 | 4.5 |
| dark `--accent-foreground` `#052E1B` on `#34D399` | 7.7:1 | 4.5 |
| dark `--accent-soft-foreground` `#6EE7B7` on `#064E3B` | 6.4:1 | 4.5 |
| dark `--muted` `#94A3B8` on canvas `#0C0F14` | 7.4:1 | 4.5 |
| dark `--muted-light` `#7C8798` on canvas `#0C0F14` | 5.2:1 | 4.5 |
| dark `--sidebar-muted` `#94A3B8` on rail `#0A0D12` | 7.6:1 | 4.5 |
| dark `--transit-soft-foreground` `#93C5FD` on `rgba(96, 165, 250, 0.12)` over canvas | 9.0:1 | 4.5 |

`--muted-light` in light is `#5E6A79` rather than the slate 500 value `#64748B`, because slate 500 on the new canvas measures 4.3:1 and fails. The chosen value keeps the same luminance as the old `#6b6b73` and passes at 5.0:1.

### Other values that change outside the sheet

| File | Line | Was | Becomes |
| --- | --- | --- | --- |
| `apps/admin/app/globals.css` | 8 | `--color-brand: #06B6D4` | `#10B981` |
| `apps/admin/app/globals.css` | 41 | `--font-sans: var(--font-inter)` | `var(--font-geist)` |
| `apps/admin/app/globals.css` | 42 | `--font-mono: var(--font-inter)` | `var(--font-geist-mono)` |
| `apps/admin/app/globals.css` | 163 | `--ops-accent: #0ea5e9` | `var(--accent)` |
| `apps/admin/app/globals.css` | 218 | `.ops-mono` `ui-monospace, SFMono-Regular, Menlo, ...` | `var(--font-mono)` |
| `apps/admin/app/layout.tsx` | 3, 6 to 9, 21, 22 | `Inter`, `--font-inter` | `Geist` plus `Geist_Mono`, `--font-geist`, `--font-geist-mono` |
| `apps/admin/app/icon.svg` | 3 | `fill="#22c55e"` | `fill="#10B981"` |
| `packages/ui/src/status-config.ts` | 6 to 13 | `StatusColor` union | add `'transit'` |
| `packages/ui/src/status-config.ts` | 19, 20 | `in_transit: 'primary'`, `out_for_delivery: 'primary'` | `'transit'` |
| `packages/ui/src/status-config.ts` | after 72 | no transit triple | add the `transit` triple |
| `app/(dashboard)/invoices/[id]/page.tsx` | 65 | invoice number `h1` with no mono class | add `font-mono` |
| `app/(dashboard)/invoices/[id]/page.tsx` | 73 | invoice number with no mono class | add `font-mono` |
| `app/(dashboard)/invoices/[id]/page.tsx` | 75 | tracking number with no mono class | add `font-mono` |
| `app/(dashboard)/reports/page.tsx` | 54 | `Record<string, 'accent' \| 'success' \| 'danger' \| 'warning' \| 'default'>` | widen to include `'info'` for quotation `sent` |
| `app/(dashboard)/reports/page.tsx` | 55 to 58 | the four shipment keys `delivered`, `in_transit`, `exception`, `pending` | delete, once line 467 renders `<StatusBadge>` |
| `app/(dashboard)/reports/page.tsx` | 6 | imports `Chip` only | add `StatusBadge` from `@repo/ui/status-badge` |

### The chart and status color files

| File | Line | Was | Becomes |
| --- | --- | --- | --- |
| `components/dashboard/kpi-colors.ts` | 4 | `delivered: '#22c55e'` | `'#10B981'` |
| `components/dashboard/kpi-colors.ts` | 5 | `exceptions: '#ef4444'` | `'#F43F5E'` |
| `components/dashboard/kpi-colors.ts` | 8 | `total: '#06B6D4'` | `'#3B82F6'` |
| `components/dashboard/kpi-stat-card.tsx` | 8 | fallback `'#6366f1'` | `'#10B981'` |
| `components/shipments/shipments-kpi-row.tsx` | 79 | `color="#22c55e"` (Delivered) | `color="#10B981"` |
| `app/(dashboard)/invoices/page.tsx` | 154 | `color="#22c55e"` (Paid) | `color="#10B981"` |
| `app/(dashboard)/reports/page.tsx` | 379 | `delivered` `'#22c55e'` | `'#10B981'` |
| `app/(dashboard)/reports/page.tsx` | 381 | `exceptions` `'#ef4444'` | `'#F43F5E'` |
| `app/(dashboard)/reports/page.tsx` | 385 | `accepted` `'#22c55e'` | `'#10B981'` |
| `app/(dashboard)/reports/page.tsx` | 387 | `rejected` `'#ef4444'` | `'#F43F5E'` |
| `app/(dashboard)/reports/page.tsx` | 69, 70 | `pending`, `info_received` `bg-amber-500` (renders `#f99c00`) | `bg-[#F59E0B]` |
| `app/(dashboard)/reports/page.tsx` | 71, 72 | `in_transit: 'bg-blue-500'`, `out_for_delivery: 'bg-violet-500'` (swapped) | `in_transit` `bg-[#8B5CF6]`, `out_for_delivery` `bg-[#3B82F6]` |
| `app/(dashboard)/reports/page.tsx` | 73, 75 | `failed_attempt`, `exception` `bg-red-500` (renders `#FF2056`) | `bg-[#F43F5E]` |
| `app/(dashboard)/reports/page.tsx` | 74 | `delivered: 'bg-emerald-500'` (renders `#00bb7f`) | `bg-[#10B981]` |
| `app/(dashboard)/reports/page.tsx` | 76 | `expired: 'bg-slate-400'` (renders `#90a1b9`) | `bg-[#94A3B8]` |
| `app/(dashboard)/reports/page.tsx` | 77 | `available_for_pickup: 'bg-sky-500'` | `bg-secondary`, resolving `var(--secondary)` |
| `app/(dashboard)/reports/page.tsx` | 411 | unknown status fallback `?? 'bg-accent'` | `?? 'bg-[#94A3B8]'` |
| `app/(dashboard)/reports/page.tsx` | 416 | fixed chart fill `'bg-accent'` | `'bg-[#3B82F6]'` |
| `components/audit-timeline.tsx` | 81 | `notification: '#06b6d4'` | `'#F43F5E'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 25 | `delivered: '#22c55e'` | `'#10B981'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 26 | `in_transit: '#3b82f6'` | `'#8B5CF6'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 27 | `out_for_delivery: '#3b82f6'` | unchanged, already `'#3B82F6'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 28, 30 | `exception`, `failed_attempt` `'#ef4444'` | `'#F43F5E'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 29 | `expired: '#ef4444'` | `'#94A3B8'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 31, 32 | `pending`, `info_received` `'#9ca3af'` | `'#F59E0B'` |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 33 | `available_for_pickup: '#f59e0b'` | `'#2dd4bf'`, matching the reports bar |
| `app/(dashboard)/shipments/[id]/tracking-timeline.tsx` | 61 | fallback `'#9ca3af'` | `'#94A3B8'` |
| `components/shipments/route-journey-stepper.tsx` | 77 | `text-white` on `--ops-accent` | `text-[var(--accent-foreground)]` |
| `components/shipments/shipment-command-sidebar.tsx` | 51 | `<Chip color={cfg.color as 'success' \| 'danger' \| 'warning' \| 'default'}>` | `<StatusBadge status={shipment.status} />`, and delete the cast at line 51 |

One chart hex per status, so every surface agrees: `delivered`, `accepted`, and `paid` take `#10B981`; `total` and `out_for_delivery` take `#3B82F6`; `in_transit` takes `#8B5CF6`; `pending`, `info_received`, `overdue`, `revenue`, and `converted` take `#F59E0B`; `exception`, `failed_attempt`, `rejected`, and `notification` take `#F43F5E`; `expired` and the unknown fallback take `#94A3B8`; and `available_for_pickup` takes the `--secondary` teal `#2dd4bf`, the one seventh step outside the ramp. The two tables above are exactly this list applied file by file, so if a status appears in more than one file it gets the same hex in all of them.

The sidebar row is in this table because the `transit` value would otherwise be dropped silently: the cast at line 51 only names four of the eight `StatusColor` members, so it still compiles after `transit` is added and HeroUI's `Chip` emits no color class for it, which renders a colorless chip. Replacing it with `StatusBadge` is the same fix already chosen for the reports shipment rows.

`route-journey-stepper.tsx` line 77 needs the change because `--ops-accent` becomes `var(--accent)`. White on the light accent is 7.7:1, but white on the dark accent `#34D399` is 1.9:1 and fails, which is why the foreground token carries the text instead. The current sky value already fails this at 2.77:1 in dark, so the change also fixes a defect that exists today.

### Reports status chips

`apps/admin/app/(dashboard)/reports/page.tsx` keeps its own status color map next to the shared one, and the accent change breaks two rows in it:

- `in_transit: 'accent'` would sit beside `delivered: 'success'`, both emerald.
- `sent: 'accent'` would sit beside `accepted: 'success'`, both emerald.

HeroUI's `Chip` only accepts five colors (`accent`, `danger`, `default`, `success`, `warning`), so no remap inside `Chip` produces a sixth. Two changes:

- **Shipment rows (line 467)** drop the local map and render `<StatusBadge status={r.status} />`, the same component `components/shipments/shipments-table.tsx` uses. It reads `STATUS_STYLE`, so `in_transit` picks up the new `transit` pair, and DESIGN.md's rule about never inventing a status color in a page stops being broken.
- **Quotation rows (line 479)** are not shipment statuses, so they keep a local map, but rendered as a plain span over shared soft pairs rather than a `Chip`: `draft` on default, `sent` on info (cyan is the one place it survives as a semantic, and it is a distinct token), `accepted` on success, `converted` on warning, `rejected` on danger. Five statuses, five distinct pairs, label text always present.

### Heading tracking

Rule: every `h1`, `h2`, and `h3` in `apps/admin` carries `tracking-tight`, which is what Tailwind calls minus 0.025em.

Excluded, because they would fight the rule:

- Headings that already carry a tracking class, about ten of them, including `PageHeader`'s `h1` in `packages/ui/src/page-header.tsx`.
- Uppercase micro labels that use `tracking-wider` or `tracking-widest`: the three group headings in `app/(dashboard)/search/page.tsx` and the label in `components/dashboard/kpi-stat-card.tsx`.
- Monospaced headings: `ops-mono` headings at `app/(dashboard)/shipments/[id]/page.tsx` line 93 and `components/shipments/shipment-preview-panel.tsx` line 67.
- The print label document `app/(dashboard)/shipments/page.tsx` line 238.
- `packages/ui/src/card.tsx`, which is the untouched create turbo template component and is not rendered by the admin.

That leaves about twenty six headings across eighteen files. The full inventory is 44 matches of `<h[123]` across 25 files before the exclusions, so the exclusions remove about eighteen of them. Grep `<h[123]` under `apps/admin` to enumerate the real list rather than trusting a frozen number.

## Build plan

Tasks 1 to 4 came from the original token move and have already shipped: `./tokens.css` is exported at `packages/ui/package.json:6`, `packages/ui/src/tokens.css` exists with both theme blocks, `apps/admin/app/globals.css:3` already imports it, and the `--secondary`, `--primary-soft`, and `--default-soft` pairs are already defined. Treat them as verify, not build: confirm each is present and do not re create anything, or the sheet ends up with duplicate definitions.

1. Confirm workspace CSS resolution: export `./tokens.css` from `@repo/ui/package.json` and prove a trivial import resolves in the admin app under Next 16 before moving anything. Fails fast if the mechanism needs a copy step. satisfies **AC-A1**. **Already done, verify only.**
2. Create the shared token stylesheet in `@repo/ui` from the current admin variables, frameworks neutral utilities, and the focus ring rule; add the missing `--secondary`, `--primary-soft`, and `--default-soft` pairs, satisfies **AC-A1**, **AC-A3b**.
3. Import it in the admin `globals.css` while the admin definitions still exist (additive), diff rendered pages in both themes, then remove the now shared definitions, satisfies **AC-A2**, **AC-A3**.
4. Write `apps/admin/DESIGN.md`, satisfies **AC-A4**. The file already exists at 57 lines and documents the old contract (cyan accent at line 3, zinc hexes at lines 14 to 23, `--font-inter` at line 29, `ui-monospace` at line 31), so this is a replacement of that file in full, not a new file beside it. Those stale rows are why task 13 exists.
5. Apply the light and dark token tables above to `packages/ui/src/tokens.css`, adding the four `--transit` values to each block, satisfies **AC-A5**, **AC-A6**, **AC-A7**. **(built)**
6. Update `packages/ui/src/status-config.ts`: widen `StatusColor`, add the `transit` triple, remap `in_transit` and `out_for_delivery`. `apps/admin/lib/status-config.ts` is a re export and needs no edit, satisfies **AC-A7**. **(built)**
7. In `apps/admin/app/globals.css`, set `--color-brand` to `#10B981`, point `--ops-accent` at `var(--accent)`, and point `.ops-mono` at `var(--font-mono)`, satisfies **AC-A5**, **AC-A9**. **(built)**
8. In `apps/admin/app/layout.tsx`, swap `Inter` for `Geist` and `Geist_Mono`, set `--font-geist` and `--font-geist-mono` on `<html>`, point the body at `var(--font-geist)`, and update `--font-sans` and `--font-mono` in `globals.css`, satisfies **AC-A9**. First build needs network to fetch the faces; see Consequences if it is unavailable. **(built, Geist and Geist Mono fetched and present in the built CSS)**
9. Walk the chart and status color table above and apply every row, satisfies **AC-A8**. Then grep `apps/admin` for `#22c55e`, `#ef4444`, `#06b6d4`, `#06B6D4`, `#0ea5e9`, `#6366f1`, `#a1a1aa`, `bg-red-500`, and `bg-sky-500` and confirm the only survivors are the three audit category colors that stay by decision (`audit-timeline.tsx` line 79 `user` `#22c55e`, line 84 `login` `#6366f1`, line 85 `other` `#a1a1aa`) plus `app/onboard/page.tsx`, which is out of scope for this change and is only discussed for its canvases and its emerald. `#a1a1aa` has to be in the pattern, otherwise that survivor can never print, and `#6366f1` and `bg-red-500` have to be declared even though they remain, or the list of survivors will not match what the grep returns. **(built, survivors are exactly `audit-timeline.tsx` `user`, `login`, `other` plus `app/onboard/page.tsx`)**
10. Split the two status cells in `app/(dashboard)/reports/page.tsx` as described above, satisfies **AC-A7**, **AC-A8**. **(built)**
11. Add `tracking-tight` to every heading the exclusion list above does not cover, satisfies **AC-A9**. **(built, 26 headings got it, the 3 excluded ones remain)**
12. Update `.planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`: change its `canvas` values to `#F1F5F9` and `#0C0F14`, add `'transit'` to the two status lists, change the derived accent hexes from `#0d6e88` / `#0b657c` / `#094f5e` to `#065F46` / `#064E3B` / `#043F2E`, change the secondary button hover background `#e9e9ea` to `#E8ECF1` because it is derived from `#f4f4f5` and `#09090b` which become `#F1F5F9` and `#0F172A`, change that row's foreground `#0d6e88` to `#065F46`, and add the two dark pairs `#052E1B` on `#34D399` at 4.5:1 and `#34D399` on its 10 percent tint over canvas `#0C0F14` at 3:1. Run `node contrast-verify.cjs` with no path argument, since a relative argument is resolved against the current working directory and fails, while the script already resolves the tokens file from its own directory, and require zero failures, satisfies **AC-A10**. **(built, zero failures in both themes plus both new dark pairs)**
13. Update `apps/admin/DESIGN.md` for accent, canvases, typography, heading tracking, the chart ramp, and `transit`, satisfies **AC-A11**. **(built)**
14. `biome lint apps/admin packages/ui`, `pnpm --filter admin check-types`, `pnpm --filter @repo/ui check-types`, and `pnpm build` all clean, then a visual pass on the dashboard, shipments list, and shipment detail in both themes, satisfies **AC-A10**. **(partly built: type check and full monorepo build clean on 2026 10 14 including a regenerated `.next/dev/types/routes.d.ts`, full monorepo build green twice (4 of 4 tasks), format drift fixed (`biome format --write` on `tokens.css` and `page-header.tsx`, `pnpm --filter @repo/ui lint` back to green), `DESIGN.md` hex normalized to match the lowercased token values; lint stays at the 90 error pre existing baseline, proven by swapping HEAD and retheme content at the same paths (identical 90 errors and 59 warnings both ways, so the retheme adds none of them, and the accessibility pass that would clear many is still stash@{0}); the by eye visual pass is still owed — then 2026 10 15/16: the direction was superseded twice (emerald → Graphite & Signal cyan → signal violet `#4f46e5` / `#a5b4fc`), the glass layer and every shadow came out, card radius tightened to `0.375rem` panels / `0.5rem` modals and `--radius`/`--field-radius` to `0.25rem`, IBM Plex replaced Geist, the shell was rebuilt as a flat hairline instrument bar (`w-56`/`w-12` rail, `h-14` opaque topbar with cluster dividers) and gained a View Transitions cross-fade on theme switch, `apps/admin/DESIGN.md` was rewritten to match, and the contrast verifier reports zero failures in both themes on the violet values; `check-types` (admin and `@repo/ui`), `lint` (0 errors, 119 pre existing warnings), and `build` are green — the by eye visual pass on the dashboard, shipments list, and shipment detail in both themes is the only owed item)**

## Consequences

**Positive**: emerald already means done in this product, so the accent and the success state now read as one family. The slate neutrals remove the warm cast from the light theme and give the dark theme a cool lift without turning it blue. Geist and Geist Mono stop tracking numbers from falling back to a different monospace on every machine, and one ramp makes green mean the same thing on every chart. The reports shipment table stops maintaining its own status map. The onboard flow already uses `emerald-400` and `emerald-500`, so it now agrees with the app accent instead of looking like a separate product.

**Negative**: the accent and `--success` are now both emerald, one scale step apart in light and identical in dark, so an accent badge and a delivered badge can look alike; colour was never the only signal and the labels still render, but the distinction is gone. `next/font/google` fetches the faces during the build, so the first build needs network access. Rate cards keeps the portal orange `#E8621A` on seven buttons, which now reads as an outsider color beside emerald. Onboard keeps its own near black `#0c0c12` and `#07070b` canvases, close to but not the new `#0C0F14`.

**Neutral**: cyan survives only as `--info`, which happens to be the old accent value, so nothing that was cyan is lost. `--secondary` stays teal. The chart ramp colors `in_transit` violet and `out_for_delivery` blue while the shared `--transit` badge token is blue for both, so those two statuses are one color in a badge and two in a chart; the labels carry the distinction. The audit timeline keeps eight of its nine category colors, including `user` at `#22c55e`, so that green no longer matches the chart emerald `#10B981`. The portals, their own token sheets, and `packages/auth-config` email templates are untouched. The shared sheet changes reach one app, because `apps/admin/app/globals.css` is its only importer.

## Follow-up

- [ ] Decide later whether `apps/customer` and `apps/lanka-mahal` adopt the shared tokens or keep their Stripe inspired docs.
- [ ] Decide whether `--accent` and `--success` should stay one scale step apart in light and identical in dark, or move `--success` somewhere that keeps them distinguishable.
- [ ] Replace the audit timeline `user` green `#22c55e` with the chart emerald `#10B981` if the two greens read as a mistake once the theme is up.
- [ ] Revisit the rate cards orange `#E8621A` once the portal brand question is settled.
- [ ] Decide whether the rate cards status chips and error box, `bg-green-100 text-green-800` and `bg-red-100 text-red-800` at `app/(dashboard)/rate-cards/page.tsx` lines 390 and 634 plus the red error box at line 357, should move onto the ramp. They are deliberately out of scope now, as portal brand surfaces like the orange, but AC-A8's wording would otherwise appear to cover them.
- [ ] Point `app/onboard/page.tsx` at `--background` and `--rail` instead of `#0c0c12` and `#07070b`.
- [ ] Derive `tracking-timeline.tsx` `DOT_COLORS` from `STATUS_STYLE` and delete the map, per the note on line 23 of that file.
- [ ] If Google Fonts is unreachable at build time, switch to the `geist` package with `next/font/local`.

## Migration plan

**Strategy**: an atomic in place retheme of one shared stylesheet plus the files that read it. There is no data, no schema, and no API change, so nothing needs a backfill or a dual write. The one safety trick is ordering: the token values move together in a single pass, and the pieces that depend on those values (the font, the chart colors, the reports chips) move in the pass after, so a half finished tree still renders.

**Phases**:
1. Prerequisites, nothing visible: confirm the `./tokens.css` export resolves under Next 16 (task 1) and confirm `next/font/google` can fetch Geist on this machine (task 8). Both fail loudly before any value changes.
2. Values: apply the light and dark token tables and the four `--transit` values to `packages/ui/src/tokens.css`, and make the `status-config.ts` edits (tasks 5, 6). After this the whole admin is emerald on blue gray, and only the charts, the font, and the reports chips are out of step.
3. App wiring: `--color-brand`, `--ops-accent`, `.ops-mono`, `layout.tsx`, and the two `@theme` font variables (tasks 7, 8), plus the `route-journey-stepper` foreground fix.
4. Surfaces: the chart and status color table and the two reports status cells (tasks 9, 10). This is where the app becomes internally consistent again.
5. Typography detail and proof: heading tracking (task 11), the verifier update and run (task 12), `DESIGN.md` (task 13), then lint, type check, build, and the visual pass (task 14).

**Rollback**: `git revert`. Every change in this spec is presentation, so reverting restores the old theme with no residue in data or behavior. One caveat recorded here rather than discovered later: the accessibility work from feature 9 is sitting uncommitted on this branch, so the theme work must land as its own commit on top of a clean commit, never mixed into the same working change. If the tree is still dirty when this starts, commit or stash first.

**Risks**:
- **The font fetch needs network.** `next/font/google` downloads Geist and Geist Mono during the first build. Offline, the build fails. Mitigation is task 1 running before anything else, and the `geist` package with `next/font/local` as the documented fallback.
- **Contrast could silently regress.** Twelve of the values are new and a few are tight (`--muted-light` in light is 5.0:1 against a 4.5 floor). Mitigation is task 12: update the verifier's own hardcoded canvas and accent values first, then require zero failures in both themes. Running the old verifier against the new values would measure the wrong theme and pass or fail for the wrong reason.
- **HeroUI's `Chip` only accepts five colors.** `accent` and `success` now render the same emerald, so any place that colored two different meanings with those two now shows one color. Task 10 removes both of the known instances in the reports table, and the sidebar row in the file table removes the one that would have swallowed `transit`. The three remaining role maps that put `accent` beside `success` are `app/(dashboard)/customers/page.tsx` lines 19 to 21, `app/(dashboard)/profile/page.tsx` lines 109 and 110, and `app/(dashboard)/customers/[id]/page.tsx` lines 19 to 22, where both keys become the same emerald. Check those three by name rather than grepping `color="accent"` across all 45 hits in 12 files; `command-header.tsx` uses it as a decorative badge and is fine.
- **`--ops-accent` becomes the main accent.** It used to be sky `#0ea5e9`, a separate hue from the cyan accent. Pointing it at `var(--accent)` is a real visual change on the shipment detail operations strip and the route stepper, not just a rename. The `text-white` on it at `route-journey-stepper.tsx:77` fails in dark with the new value, which is why that line is in the table.
- **`next/font` variables land on `<html>` while `--font-sans` and `--font-mono` are declared in the light only selector group.** It resolves because `:root` and `<html>` are the same element and `:root` is always matched, so the values apply in both themes. Worth a glance at the dark render in task 14 rather than a rewrite.
- **A wrong value in `tokens.css` is visible everywhere.** Mitigation is the additive style already used by task 3 of the original move: here the values are edited in one block, so the mitigation is simply that the verifier and the visual pass run before the spec is considered done.
