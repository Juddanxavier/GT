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
- **Font size consistency** (lanka-mahal + customer): normalized typography across both tenant apps - hero h1 reduced to 	ext-3xl sm:text-4xl, section headings to 	ext-2xl md:text-3xl, eyebrows to 	ext-xs, body text to 	ext-base; consistent heading scales per level and identical typography classes across parallel components in both apps.
- **Portal nav UI/UX batch** (lanka-mahal + customer): flat dropdown panels (border highlight, no shadow), active nav state with ria-current=page accent, keyboard/focus dropdowns with Escape-to-close, press feedback on CTAs, and a mobile menu focus trap (Tab cycling + focus return to the hamburger).
- **Fix literal text bug** (lanka-mahal + customer): fixed mobileOpen && (); rendering as literal text in the navbar by wrapping the conditional in an expression container.
- **Remove Get a Quote button** (lanka-mahal + customer): removed the hero "Get a Quote" CTA and the now-unused ctaQuote config field.
- **SEO** (lanka-mahal + customer): added metadataBase, descriptions, keywords (incl. "ship to Europe"), Open Graph/Twitter cards, per-route metadata via pass-through server-component layouts, obots.ts and sitemap.ts (16 static URLs per tenant); home pages converted to Server Components to export metadata.
