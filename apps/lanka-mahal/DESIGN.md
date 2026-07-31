# Customer App — Design System (Stripe-inspired)

Reference: https://stripe.com/in — light, crisp, high-contrast, generous whitespace,
signature diagonal gradient accents. This is the design contract for `apps/customer`.
Tenant accent colors (Gajan = emerald, Lanka = violet) replace Stripe's blurple.

## Principles
1. **Clarity over decoration** — content first, chrome minimal.
2. **Whitespace is a feature** — sections breathe; never cram.
3. **One accent, used sparingly** — tenant accent for CTAs, links, active states only.
4. **Crisp hairlines** — 1px `--border` (#e6e6e6), no heavy shadows for structure.
5. **Motion is subtle** — 150–200ms ease transitions, no bounce.

## Color (from globals.css tokens — do not hardcode hex in components)
| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#ffffff` | page canvas |
| `--surface` | `#ffffff` | cards |
| `--surface-secondary` | `#f5f5f5` | subtle fills, hover rows |
| `--foreground` | `#0a0a0a` | headings, body |
| `--muted` | `#737373` | secondary text, captions |
| `--border` | `#e6e6e6` | hairlines, dividers, card borders |
| accent | emerald-600 / violet-600 | CTA, links, active nav (tenant-driven) |

Always use Tailwind semantic classes: `bg-background`, `bg-surface`,
`bg-surface-secondary`, `text-foreground`, `text-muted`, `border-border`.
Accent uses `text-emerald-600`/`bg-violet-600` etc. via `useTenantConfig()`.

### Signature gradient
Stripe's diagonal band. Use ONLY for hero backdrops / feature highlights, never body:
```
bg-gradient-to-r from-emerald-400 to-cyan-500   /* Gajan */
bg-gradient-to-r from-violet-400 to-fuchsia-500 /* Lanka */
```
Optionally skewed: wrap in a `-skew-y-3` clipped container for the classic angle.

## Typography
- Font: `var(--font-sohne)` (sohne-var → Inter → system). Applied globally.
- Scale (Tailwind): display `text-5xl md:text-6xl font-bold tracking-tight`,
  h1 `text-3xl font-semibold`, h2 `text-xl font-semibold`, body `text-sm`,
  caption `text-xs text-muted`.
- Weights: 400 body, 600 headings, 700 display. No light weights for body.
- `tracking-tight` on all display/heading text. Line-height snug on headings.

## Spacing & shape
- 8px baseline grid. Use Tailwind steps that are multiples of 2 (`gap-4`, `p-6`, `py-8`).
- Radius: `rounded-lg` (8px) for cards/inputs, `rounded-full` for pill buttons/badges.
- Border weight: 1px (`border`).
- Section padding: `py-16 md:py-24` for marketing; `py-8` for app pages.
- Max content width: `max-w-5xl mx-auto px-4`.

## Components
### Buttons
- **Primary (CTA):** pill, accent gradient or solid accent, white text, `font-semibold`.
  `px-6 py-2.5 rounded-full text-sm`. Icon (lucide) `w-4 h-4` trailing.
- **Secondary:** `border border-border bg-surface text-foreground rounded-full`
  `hover:bg-surface-secondary`.
- **Ghost/link:** accent text, `hover:underline`.

### Cards
- `bg-surface border border-border rounded-lg p-6`. No drop shadow by default;
  use `hover:shadow-sm transition-shadow` for interactive cards only.

### Inputs
- `bg-surface border border-border rounded-lg px-3 py-2 text-sm`,
  placeholder `text-muted`, focus `ring-2 ring-accent/30 border-accent`.

### Nav
- Sticky/fixed, `bg-surface/90 backdrop-blur border-b border-border` when scrolled.
- Links `text-muted hover:text-foreground`, active = accent.

### Badges / status
- Pill, `text-xs font-medium px-2.5 py-0.5 rounded-full`, tinted bg
  (`bg-emerald-50 text-emerald-700` pattern) — semantic per shipment status.

## Do / Don't
- DO keep pages white with lots of air; DON'T reintroduce dark surfaces.
- DO use the gradient sparingly on heroes; DON'T gradient-fill cards or text blocks.
- DO drive accent from `useTenantConfig()`; DON'T hardcode emerald/violet in shared code.
- DO use semantic tokens; DON'T inline hex values in components.
