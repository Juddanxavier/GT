# 0002. Accessibility pass

**Date**: 2026-10-06
**Status**: Built

## Summary

The admin app needs to reach WCAG AA, the standard for usable interfaces for people with disabilities. This spec sets one accessibility standard for `apps/admin` and `packages/ui`: dialogs announce themselves and hold focus, toasts are heard, colour is never the only signal, every control works from the keyboard, headings make sense, and page changes move focus. HeroUI's ComboBox and Modal supply the hard parts of the pattern. Biome's accessibility rules gate what a linter can see, and a checklist in `/check verify` covers what it cannot (focus order, whether an announcement reads right), with the rules written into `apps/admin/DESIGN.md` so later features keep the bar. There is no new dependency, and no data or API changes.

## Context

Feature 8 built the shared components and took the shared table, status badge, and tokens through a WCAG AA pass. The rest of the admin surface never got that treatment. Some parts are already fine, and the build should lean on them: the status badge always prints a text label next to the dot, the toast container already carries a live region, a skip link already points at `main#main-content`, and HeroUI components (modals, tables, menus) already trap focus and handle keys through react-aria.

Other parts are not fine. The shipment detail page draws its own delete dialog as a plain overlay div with no role, no accessible name, no Escape handling and no focus trap, and both confirmations (`window.confirm`) fire straight from button handlers. The toast container puts `role="alert"` and `aria-live="polite"` on the same node, which asks for attention and patience at once. There is no `aria-expanded`, `aria-current`, or `aria-controls` anywhere in the admin code. Icon only buttons exist without accessible names. The mobile navigation backdrop is a div with an onClick. Several pages start at `h2` with no `h1`. After a client side navigation, focus stays where it was, so a screen reader hears nothing about the new page. Three of these are already open in `apps/admin/PRODUCTION-CHECKLIST.md` (WR-19 colour only indicators, WR-22 missing `aria-expanded`, WR-23 no focus trapping in modals).

The forces at play: the users are staff and tenant admins who live in this surface all day, some on a keyboard only; the codebase already ships HeroUI, so the cheapest correct work is to use the components it owns instead of hand drawn ones, plus the state attributes it does not add for us; and enforcement has to be cheap, because the project lints with Biome and has no accessibility test suite. Deciding nothing means every new page invents its own dialog, label, and focus behaviour, and the gap grows with each feature.

> ⚠️ Premise note: the scope's done-when for toasts and status signals is already largely met by feature 8. The real gap is dialogs, ARIA state, headings, and focus, so this spec covers those plus the two items the done-when names, rather than re-doing work that shipped.

## Requirements

**User stories**:
- As a screen reader user, I am told what opened, what changed, and where I am, so that I can run the admin without seeing it.
- As a keyboard only user, I can reach every control, operate it, and see where I am, so that I never need a mouse.
- As a colour blind user, I get status meaning from text or shape rather than colour alone.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Every status and trend indicator carries a signal beyond colour. `packages/ui/src/status-badge.tsx` keeps its text label, `apps/admin/components/kpi-card.tsx` shows a trend glyph or sign as well as colour, `apps/admin/components/dashboard/status-breakdown.tsx` prints each row's name and value as text, the dashboard KPI sparklines carry a text value beside the gradient (closes WR-19), and the notification unread count shows a number plus a label rather than a coloured dot alone. No indicator in the admin relies on colour alone.
- **AC-2**: Every dialog is a real dialog. It comes from a HeroUI Modal or the new shared `ConfirmDialog` (`packages/ui/src/confirm-dialog.tsx`), has an accessible name, holds focus while open, closes on Escape, and returns focus to the control that opened it. No `window.confirm` and no hand drawn overlay dialog remains in `apps/admin`: the shipment detail delete overlay, the stop tracking confirm, and the shipments list bulk delete confirm all move to `ConfirmDialog`, and the HeroUI modals that currently ship with no accessible name (the filter confirm modals, the customer create modal, the audit modals) get one. Closes WR-23.
- **AC-3**: Toasts are announced once and can be dismissed from the keyboard. In `apps/admin/components/toast.tsx` the container keeps `aria-live="polite"`, each individual toast carries `role="alert"` (assertive for the error case, polite container for everything else, so the two never fight on one node), and each toast's dismiss control has `aria-label="Dismiss"`.
- **AC-4**: Every interactive control is keyboard reachable and operable, checked on the rendered DOM in the browser rather than by grepping source. No element carries only an onClick with no role, keyboard and mouse behaviour match, dropdown and filter triggers expose `aria-expanded`, the active sidebar item in `components/app-shell/dashboard-sidebar.tsx` carries `aria-current="page"`, icon only buttons in `components/app-shell/dashboard-header.tsx` have accessible names, navigation landmarks have labels, and the mobile backdrop in `app/(dashboard)/layout.tsx` is a real button. Rule: never hand add an attribute that HeroUI or react-aria already manages.
- **AC-5**: The Cmd+K palette in `components/search-dialog.tsx` is rebuilt on HeroUI ComboBox, which supplies the ARIA combobox pattern (combobox input with `aria-expanded`, listbox and option roles, `aria-activedescendant` tracking the active option). On top of that the build keeps arrow keys and the mouse on the same active option, Enter opens the active result, and the result count is announced in a polite live region.
- **AC-6**: Every admin list table (shipments, customers, invoices, branches, rate cards, reports, audit) has an accessible name using the `<Page name> table` convention, header cells carry `scope`, and pagination and rows per page controls have accessible names. The shared `DataTable` keeps `aria-sort` and its announced selection region.
- **AC-7**: Each admin route renders exactly one `h1`, owned by `packages/ui/src/page-header.tsx` (the admin wrapper `apps/admin/components/page-header.tsx` delegates to it rather than emitting its own `h1`), no page renders its first heading below `h1`, the skip link is visible when focused using the existing focus tokens and lands on `main#main-content`, and the `nav` and `main` landmarks have accessible names. Login and the unauthorized page are in scope.
- **AC-8**: In `app/(dashboard)/layout.tsx`, a `useEffect` on the pathname moves focus to `main#main-content` (`tabIndex={-1}`) on every navigation except the first render, so the new page heading is announced. Next's built in route announcer stays on as a complement, not a replacement.
- **AC-9**: With `prefers-reduced-motion: reduce`, non essential animation, transitions, and shimmer stop. The block lives in `apps/admin/app/globals.css` (admin only, portals untouched) and covers HeroUI animations from `@heroui/styles`, the dashboard skeleton, `packages/ui` `loading-state.tsx` shimmer, and `animate-spin` loaders.
- **AC-10**: The gate is real and visible: the root `lint` script runs `turbo run lint` so CI covers `apps/admin`, and Biome's accessibility group reports zero errors in `apps/admin` and `packages/ui`. Rules the linter cannot see (`aria-expanded`, `aria-current`, one `h1`, route focus, reduced motion, table names) are covered by a per AC checklist in the `/check verify` walkthrough, and `apps/admin/DESIGN.md` gains an Accessibility section recording these rules.

## Options considered

### Option 1: Single pass with a Biome lint gate

Fix every violation in this one feature and keep Biome's `a11y` rule group as the failing gate (it is already part of the `recommended` preset, so the work is clearing the violations, not flipping a switch), so `pnpm lint` fails on the next regression.

**Pros**:
- The surface becomes usable immediately, and the gate stops the gap reopening.
- Biome already runs in this repo, so the gate costs config rather than a dependency.

**Cons**:
- A larger change set across many files, which needs a careful verify pass.
- Lint cannot see focus order or whether an announcement reads well, so a manual walkthrough is still required.

### Option 2: Enforce going forward, existing violations tracked as debt

Write the rules, gate new code only, and keep a list of old violations for later.

**Pros**:
- Small change now, no wide diff.

**Cons**:
- The debt is the feature itself. Keyboard and screen reader users keep hitting broken dialogs for months, and there is no owner for the list.

### Option 3: Component test suite with jest-axe as the gate

Add vitest plus jest-axe assertions on the shared components and key pages.

**Pros**:
- Automated proof per component, and a regression net for the shared library.

**Cons**:
- Introduces the project's first accessibility test infra while the repo has almost no test suite to extend, and axe in jsdom still misses focus order, live region timing, and real keyboard flows.

### Option 4: Document only, rely on code review

Write the rules into `DESIGN.md` and leave enforcement to reviewers.

**Pros**:
- No config work at all.

**Cons**:
- Nothing mechanical stops a regression, and review is the weakest enforcement. It leaves the actual fixes undone, which is the feature.

## Decision

**Chosen option**: Option 1: Single pass with a Biome lint gate

Run one accessibility pass across `apps/admin` and `packages/ui` that replaces hand drawn dialogs with shared ones, adds the missing ARIA state, fixes headings and focus, and clears every Biome accessibility violation so the standard holds afterwards.

## Rationale

HeroUI already owns focus trapping and keyboard behaviour for the components it provides, so routing the two hand drawn dialogs through it removes a whole class of bugs instead of patching them. Biome is already the linter, which makes the gate nearly free and keeps the project on its stated tooling rather than adding a test stack the repo cannot maintain yet. The forward only option (Option 2) and the document only option (Option 4) both leave the broken dialogs in place, which is the user facing problem. The axe suite (Option 3) is the strongest long term proof, but it measures markup, not whether a person can actually complete a task, so it is held as a follow up rather than the gate.

## Standard definition

**Canonical pattern**:

```tsx
// Dialogs: one shared component, no hand drawn overlays
<ConfirmDialog
  open={deleteOpen}
  title="Delete shipment"
  description={`Delete ${shipment.trackingNo}? This cannot be undone.`}
  confirmLabel="Delete"
  onConfirm={async () => { await deleteMutation.mutateAsync(id); router.push('/shipments'); }}
  onCancel={() => setDeleteOpen(false)}
/>

// Controls: a real element with a name and its state
<button type="button" aria-label="Close panel" aria-expanded={open} onClick={toggle}>...</button>

// Status: colour plus a word, never colour alone
<StatusBadge status="in_transit" />  {/* dot aria-hidden, label always rendered */}

// Icons that carry meaning: hide the decorative one, name the control
<i className="fa-arrow-up" aria-hidden="true" />
```

The rules in one line each: interactive elements are `button`, `a`, or a component with a role; state that changes is exposed (`aria-expanded`, `aria-current`); status always prints text; each page starts at `h1`; focus moves on route change; motion respects `prefers-reduced-motion`.

**Replaces**:
- Bare `fixed inset-0` overlay divs used as dialogs (shipment detail delete)
- `window.confirm` for destructive actions (stop tracking, bulk delete)
- Colour only indicators (KPI trend colour, status breakdown bars)
- `div` or `span` with an onClick and no role (mobile navigation backdrop)
- Icon buttons and modals with no accessible name
- Pages whose first heading is `h2`, and unlabeled `nav` landmarks

**Enforcement**:
Biome's `a11y` rule group set to error (it is already part of the `recommended` preset in the root `biome.json`, so the work is making the violations go away, not flipping a switch), run by `pnpm lint`, which must be changed to `turbo run lint` so `apps/admin` is actually covered. Rules with no lint equivalent (`aria-expanded`, `aria-current`, one `h1`, route focus, reduced motion, table names) are enforced by the per AC checklist in `apps/admin/DESIGN.md`, walked in `/check verify`. Never hand add an attribute HeroUI or react-aria already manages; confirm on the rendered DOM in the browser.

**Rollout**:
Single pass inside this feature. The baseline and the widened lint script land first so the violation list is visible, and every accessibility violation is fixed before the feature is verified. New code must pass from then on.

**Exceptions**:
None for the rules above. If a third party widget emits its own complete semantics and cannot satisfy a rule, suppress that one Biome rule on that line with a comment saying why, and note it in the `DESIGN.md` Accessibility section.

## Build plan

Ordered as a tracer bullet: capture the baseline and widen the lint script first so the bar is measurable, then prove the standard end to end on one full dialog thread, then sweep the surface area by area.

1. Capture the current Biome baseline in `apps/admin` (90 errors today, a11y group among them) and switch the root `lint` script to `turbo run lint` so CI gates every workspace instead of only `apps/api` and `packages`, satisfies **AC-10**
2. Add `ConfirmDialog` to `packages/ui/src/confirm-dialog.tsx` (props: `open`, `title`, `description`, `confirmLabel`, `cancelLabel`, `isPending`, `onConfirm`, `onCancel`; initial focus on cancel, Escape and focus return from the HeroUI Modal underneath; add the `./src/confirm-dialog.tsx` entry to `packages/ui/package.json` exports), route both `window.confirm` calls and the shipment detail overlay through it, and give the HeroUI modals that ship with no accessible name one (`components/app-shell/filter-confirm-modals.tsx`, the customer create modal, the audit modals), satisfies **AC-2**
3. Non colour signals: `kpi-card.tsx` trend glyph, `dashboard/status-breakdown.tsx` name and value as text, sparkline text values, notification unread count as number plus label, satisfies **AC-1**
4. Toasts: `role="alert"` on each toast item, `aria-live="polite"` kept on the container, `aria-label="Dismiss"` on the dismiss control, satisfies **AC-3**
5. App shell sweep, verified against the rendered DOM so no library managed attribute is duplicated: `aria-expanded` where react-aria does not already emit it (dropdown and filter triggers, disclosure toggles such as the shipment details expander), `aria-current="page"` on the active sidebar item, accessible names on icon only header buttons, backdrop becomes a button, `nav` and `main` landmark labels, satisfies **AC-4**
6. Rebuild the Cmd+K palette on HeroUI ComboBox (roles and `aria-activedescendant` come from the library), keep keyboard and mouse on the same active option, announce the result count, satisfies **AC-5**
7. List table sweep across shipments, customers, invoices, branches, rate cards, reports, audit: accessible name per the `<Page name> table` convention, header `scope`, pagination and rows per page labels, satisfies **AC-6**
8. Heading and landmark pass: `@repo/ui` PageHeader becomes the single owner of `h1` and the admin wrapper delegates, fix pages starting at `h2`, skip link visible on focus from the existing focus tokens, satisfies **AC-7**
9. Route focus management in `app/(dashboard)/layout.tsx`: focus `main#main-content` on pathname change, skipping the first render, satisfies **AC-8**
10. Reduced motion block in `apps/admin/app/globals.css` covering HeroUI animations, the dashboard skeleton, `loading-state` shimmer, and `animate-spin`, satisfies **AC-9**
11. Drive the Biome accessibility group to zero errors (baseline for other groups unchanged), then write the `Accessibility` section of `apps/admin/DESIGN.md` including the per AC checklist the verify walkthrough uses, satisfies **AC-10**

## Consequences

**Positive**:
- Dialogs, toasts, and page changes become usable without a mouse or sight, which is the point of the feature.
- The lint gate keeps the standard from eroding as features 11 to 17 land.
- The shared `ConfirmDialog` gives every later feature (including the Phase 7 reassignment work) one correct dialog to reach for.

**Negative / tradeoffs**:
- The change set touches many files at once, so the verify pass has real surface area and regression risk.
- Rebuilding a working feature (the Cmd+K palette) on ComboBox can regress grouping, debounce, and the Enter behaviour; it is the item most likely to need a second pass.
- The gate covers markup rules only. Roughly half the acceptance criteria depend on a human walking the checklist, which costs verify time every release.
- Manual verification still needs a person with a screen reader; lint and the walkthrough do not prove the experience.

**Neutral**:
- No new runtime dependency; a lint script change plus rules.
- The root `biome.json` covers the whole repo, but this pass only clears violations inside `apps/admin` and `packages/ui`. Portals inherit the shared component fixes for free.
- HeroUI may already emit some of these attributes, so a few pages could end up with a duplicate label that the verify pass should trim.

## Follow-up

- [ ] The same pass is owed by `apps/customer` and `apps/lanka-mahal`; the scope defers portal work. The root `biome.json` already covers them, so their violations show up in the same lint run.
- [ ] Scope feature 15 (Global search) rebuilds the palette; it must keep the combobox semantics from AC-5.
- [ ] If accessibility regressions appear after this ships, add jest-axe component tests on `@repo/ui` (new dependency, deliberately not chosen here).
- [ ] Name the pages to spot check with a real screen reader (NVDA or VoiceOver) in the verify walkthrough: dashboard, shipments list, shipment detail, customers.
