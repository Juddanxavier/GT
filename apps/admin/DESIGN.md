# Admin App — Design System (Raycast-inspired, dark-first)

Reference: the shipped admin console. Dense operations tool, glass surfaces, emerald accent over blue gray neutrals, dark mode first with full light support. This is the design contract for `apps/admin`. Token values live in `packages/ui/src/tokens.css`; this file holds direction and rules. If values and prose disagree, the CSS wins.

## Principles
1. **Density without noise** — many records per screen, calm chrome, content first.
2. **Glass over flat** — frosted panels, hairline borders, soft shadows; depth from blur and light.
3. **One accent, used with intent** — emerald for actions, selection, focus, and active nav only.
4. **Quiet motion** — short ease-out transitions for color, border, shadow, and opacity; honor reduced motion.

## Color (from shared tokens — do not hardcode hex in components)
| Token | Value (light) | Use |
| --- | --- | --- |
| `--background` | `#f1f5f9` | page canvas |
| `--surface` | `rgba(255,255,255,0.92)` | frosted panels |
| `--foreground` | `#0f172a` | headings, body |
| `--muted` | `#475569` | secondary text |
| `--border` | `#e2e8f0` | hairlines, dividers |
| `--accent` | `#065f46` | actions, selection, focus |
| `--sidebar` | `#0f172a` | dark rail in both themes |
| `--sidebar-active-bg` / `--fg` | `#064e3b` / `#6ee7b7` | active nav item |

Both themes are tinted blue gray, never zinc. Dark moves to canvas `#0c0f14`, foreground `#f8fafc`, muted `#94a3b8`, translucent surfaces and borders built from `rgba(148, 163, 184, ...)`, rail `#0a0d12`, and lifts the accent to `#34d399` with `#052e1b` as its foreground. Always use semantic classes or `var()` references: `bg-background`, `text-foreground`, `text-muted`, `border-border`, `bg-[var(--glass-bg)]`.

### Status colors (shared config is the source)
`@repo/ui/status-config.ts` maps each shipment status to a semantic color and a token pair. Never invent a status color in a page. The badge always shows label text plus color — color alone is not enough.

- `pending` and `info_received` are `warning`; `exception` and `failed_attempt` are `danger`; `in_transit` and `out_for_delivery` are `transit`. Statuses share colors on purpose: it is what makes them read as groups.
- **`transit` is its own blue pair**, so an in transit badge can never be mistaken for the accent: light `#2563eb` strong / `#eff6ff` soft / `#1d4ed8` soft foreground; dark `#60a5fa` strong / `rgba(96,165,250,0.12)` soft / `#93c5fd` soft foreground.
- No shipment status resolves to `primary` or `accent`. The accent and `--success` are both emerald, one scale step apart in light and identical in dark, so an accent badge and a delivered badge look alike; the label carries the distinction.
- Cyan survives only as `--info` (quotation `sent`). `--secondary` stays teal.

## Chart palette
Every dashboard, reports, and KPI series color comes from this one six step ramp. Write ramp colors as literal hex (`bg-[#f43f5e]`), never as a Tailwind color class: this app runs Tailwind 4, where `emerald-500`, `blue-500` and the rest resolve to different hexes than the ramp.

| Step | Name | Hex | Meaning |
| --- | --- | --- | --- |
| 1 | emerald | `#10b981` | success outcomes: delivered, paid, accepted |
| 2 | blue | `#3b82f6` | totals and outbound: `total`, `out_for_delivery` |
| 3 | violet | `#8b5cf6` | in transit: `in_transit` |
| 4 | amber | `#f59e0b` | waiting and warnings: pending, unpaid, overdue, revenue, converted |
| 5 | rose | `#f43f5e` | problems: exceptions, rejected, failed attempt, notification |
| 6 | slate | `#94a3b8` | unknown and inactive: not tracked, expired, other |

`available_for_pickup` is the one step outside the ramp, on the `--secondary` teal. The audit timeline's entity colors are exempt from the ramp: they name entities rather than values.

## Typography
- Font: `Geist` via the Next font loader, variable `--font-geist`, applied globally.
- Mono: `Geist Mono`, variable `--font-geist-mono`, for tracking numbers, label codes, invoice numbers, quote numbers, and ids. Never fall back to `ui-monospace`, which renders differently on every machine.
- Scale: page title `text-lg font-bold tracking-tight`, section `text-base font-semibold`, body `text-sm`, meta `text-xs text-muted`.
- Uppercase micro labels (`text-[0.625rem] font-semibold tracking-wider`) for ops section headers only.
- **Heading tracking:** every `h1`, `h2`, and `h3` carries `tracking-tight`, because Geist is tighter than Inter and headings want to be tighter still. Excluded: headings that already carry a tracking class, uppercase micro labels (`tracking-wider` / `tracking-widest`), monospaced `ops-mono` headings, and the print label document. Body copy, paragraphs, and spans keep default tracking.

## Spacing & shape
- 8px baseline grid; Tailwind steps in multiples of 2.
- Radius: `0.75rem` panels (`.content-panel`), `0.5rem` inputs (`.input-surface`), full pills/badges.
- Borders: 1px hairlines via tokens, never raw gray.
- Page padding: `p-4 sm:p-6 lg:p-8`; tables scroll horizontally on small screens, never clip.
- Table density via `.table-density-compact` / `.table-density-comfortable`.

## Components
### PageHeader
- Title (h1), optional description, optional breadcrumb slot, actions slot. One per page.

### FilterBar
- Generic shell: filter controls as children plus an optional clear action. Not tied to any domain.

### DataTable
- Server-driven, fully controlled (sort, page, visibility, selection in; callbacks out). Slots for empty, error, loading. Sort headers announce via `aria-sort`; selection via checkboxes with labels; resize by drag with double-click reset.

### StatusBadge
- Pill with label text plus a status dot, colored from the shared token pairs. Reads `@repo/ui/status-config.ts`.

### Empty / Error / Loading
- `EmptyState`: message plus one optional action. `ErrorState`: message plus optional retry. `LoadingState`: skeleton shaped like the table.

## Do / Don't
- DO read every color from a token; DON'T paste hex in a component (the chart ramp above is the one exception, written as literals).
- DO pick chart colors from the six step ramp; DON'T introduce a seventh hue for a new series.
- DO keep dark and light equal; DON'T ship a dark-only component.
- DO give every status a label or icon; DON'T rely on color alone.
- DO put a new status in the shared config plus `@repo/types/status`; DON'T add a local status map.
- DO use the shared table for lists; DON'T copy table markup page to page.
- DO keep `@repo/ui` free of API calls; DON'T import app queries there.
- DO give headings `tracking-tight`; DON'T tighten body copy.
- DO keep interactive elements keyboard reachable with a visible focus ring; DON'T leave focus to browser default.

## Intentional visual changes (recorded per spec 0001)
- Accent moved from cyan `#0d6e88` / `#22d3ee` to emerald `#065f46` / `#34d399`.
- Both neutrals moved from zinc to slate blue gray (`#f1f5f9` light, `#0c0f14` dark).
- `in_transit` and `out_for_delivery` moved from `primary` to the new `transit` pair.
- Charts collapsed onto one six step ramp; the reports shipment rows now render the shared `StatusBadge` instead of a local map.
- Inter replaced by Geist with Geist Mono.
