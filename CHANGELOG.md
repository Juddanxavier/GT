# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Portal hero redesign** (`lanka-mahal` + `customer`): redesigned the hero section mobile-first —
  touch-friendly tracking form (44px targets, full-width on mobile), refined type scale,
  staggered entrance motion that respects reduced-motion preferences, and the parcel background
  image now renders on mobile as well as desktop.
- **Quick Services section redesign** (`lanka-mahal` + `customer`): converted to a two-panel hub —
  headline + benefit bullets on the left, elevated tabbed quick-action widget on the right with a
  sliding tab indicator. Flat, minimal styling: no shadows, small corner radius (`rounded-sm`).
- **Typography**: replaced the per-app display fonts (Space Grotesk / Bricolage Grotesque) with a
  single modern variable font, **Manrope**, applied across both portals; removed the unused
  external `Mazzard H` `@font-face` declarations.
- **Typography tuning**: tuned hero and services typography size and contrast across both portals —
  updated heading scales, line heights, and color contrast for improved readability and visual hierarchy;
  consistent type ramp from h1 through body text with enhanced focus states on form inputs.
- **Mobile menu redesign** (`lanka-mahal` + `customer`): redesigned the mobile navigation as a full-screen overlay —
  persistent slide-in drawer with services dropdown, support links, branch navigation, and auth actions;
  touch-friendly close button, reduced-motion respect, and parity with desktop menu items across both portals.
