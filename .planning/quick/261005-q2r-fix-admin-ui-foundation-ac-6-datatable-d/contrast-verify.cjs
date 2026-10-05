/* WCAG AA contrast verifier for packages/ui/src/tokens.css.
 * Usage: node contrast-verify.cjs [path-to-tokens.css]
 * Alpha backgrounds are composited over the canvas before measuring, which is
 * how the browser actually renders them.
 * Exits 1 when any checked text pair is below 4.5:1. */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', '..', '..', 'packages', 'ui', 'src', 'tokens.css');
const css = fs.readFileSync(file, 'utf8');

function parse(str) {
  const s = str.trim();
  if (s.startsWith('#')) {
    let c = s.slice(1);
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x.trim()));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null;
}
function over(fg, bg) {
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
}
function lum(c) {
  const s = [c[0] / 255, c[1] / 255, c[2] / 255].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function cr(a, b) {
  let l1 = lum(a), l2 = lum(b);
  if (l1 < l2) [l1, l2] = [l2, l1];
  return (l1 + 0.05) / (l2 + 0.05);
}
function block(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(esc + '\\s*\\{([^}]*)\\}', 's'));
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
    if (mm) out[mm[1]] = mm[2].trim();
  }
  return out;
}

const themes = { light: block('[data-theme="default"]'), dark: block('[data-theme="dark"]') };
const canvas = { light: '#f4f4f5', dark: '#09090b' };

/* [foreground token, background token, label] — every pair below is rendered
 * text somewhere in the admin or in a shared component. */
const pairs = [
  ['--foreground', '--background', 'body text'],
  ['--muted', '--background', 'muted on canvas'],
  ['--muted-light', '--background', 'muted-light on canvas'],
  ['--muted-light', '--surface', 'muted-light on surface'],
  ['--field-foreground', '--field-background', 'field text'],
  ['--field-placeholder', '--field-background', 'field placeholder'],
  ['--accent-soft-foreground', '--accent-soft', 'accent-soft fg (soft chip)'],
  ['--accent-soft-foreground', '--default', 'secondary button label'],
  ['--primary-soft-foreground', '--primary-soft', 'primary-soft fg'],
  ['--secondary-soft-foreground', '--secondary-soft', 'secondary-soft fg'],
  ['--default-soft-foreground', '--default-soft', 'default-soft fg'],
  ['--sidebar-foreground', '--sidebar', 'sidebar text'],
  ['--sidebar-muted', '--sidebar', 'sidebar muted text'],
  ['--sidebar-active-fg', '--sidebar-active-bg', 'sidebar active item'],
  ['--overlay-foreground', '--overlay', 'overlay text'],
  ['--segment-foreground', '--segment', 'segment text'],
];

/* Status soft pairs — every StatusBadge swatch. Rendered from
 * status-config.ts, so these must hold in both themes. */
for (const st of ['success', 'warning', 'danger', 'info', 'accent', 'primary', 'secondary', 'default']) {
  pairs.push([`--${st}-soft-foreground`, `--${st}-soft`, `${st} status swatch`]);
}

/* Strong pairs (white/ink on the solid colour). HeroUI only reaches these for
 * solid chips/badges and the primary/danger buttons. */
for (const st of ['accent', 'danger', 'success', 'warning', 'info', 'secondary']) {
  pairs.push([`--${st}-foreground`, `--${st}`, `${st} strong (button/chip)`]);
}

const fails = [];
for (const [themeName, theme] of Object.entries(themes)) {
  const base = parse(canvas[themeName]);
  console.log(`\n== ${themeName.toUpperCase()} ==`);
  for (const [fgName, bgName, label] of pairs) {
    const fgRaw = theme[fgName], bgRaw = theme[bgName];
    if (!fgRaw || !bgRaw) { console.log(`  ${label.padEnd(34)} n/a`); continue; }
    let fg = parse(fgRaw), bg = parse(bgRaw);
    if (!fg || !bg) { console.log(`  ${label.padEnd(34)} unparsable ${fgRaw} / ${bgRaw}`); continue; }
    if (bg[3] < 1) bg = over(bg, base);
    if (fg[3] < 1) fg = over(fg, bg);
    const r = cr(fg, bg);
    const bad = r < 4.5;
    if (bad) fails.push(`${themeName}: ${label} — ${fgRaw} on ${bgRaw} = ${r.toFixed(2)}`);
    console.log(`  ${label.padEnd(34)} ${r.toFixed(2).padStart(6)}  ${bad ? 'FAIL' : 'ok  '}  ${fgRaw} on ${bgRaw}`);
  }
}

console.log('\n=== FAILURES (< 4.5:1) ===');
for (const f of fails) console.log(' - ' + f);
if (!fails.length) console.log(' none');

/* --- Non-text and derived-state checks (WCAG 1.4.11 needs 3:1) ---
 * `bg-<token>/10` avatar/icon panels in the admin, HeroUI's oklab-computed
 * hover states, and the secondary button's hover background. */
console.log('\n== NON-TEXT / DERIVED (needs 3:1 for graphics, 4.5:1 for text) ==');
const extra = [];
function add(label, fg, bg, req) {
  const r = cr(fg, bg);
  const bad = r < req;
  if (bad) extra.push(`${label} — ${r.toFixed(2)} (needs ${req})`);
  console.log(`  ${label.padEnd(56)} ${r.toFixed(2).padStart(6)}  ${bad ? 'FAIL' : 'ok  '}`);
}
const dCanvas = parse(canvas.light);
const p = (h) => parse(h);
const tint = (hexv, a) => over([p(hexv)[0], p(hexv)[1], p(hexv)[2], a], dCanvas).map(Math.round);
/* rendered `bg-<token>/10 text-<token>`: text in accent, icon-only elsewhere */
add('light accent on bg-accent/10 panel (TEXT)', p('#0d6e88'), tint('#0d6e88', 0.1), 4.5);
add('light danger on bg-danger/10 panel (TEXT)', p('#b91c1c'), tint('#b91c1c', 0.1), 4.5);
add('light success on bg-success/10 avatar (icon)', p('#047857'), tint('#047857', 0.1), 3);
add('light warning on bg-warning/10 avatar (icon)', p('#b45309'), tint('#b45309', 0.1), 3);
/* HeroUI: --default-hover = color-mix(in oklab, --default 96%, --default-foreground 4%) */
add('secondary button label on hover bg (#e9e9ea)', p('#0d6e88'), p('#e9e9ea'), 4.5);
/* HeroUI: --<x>-hover = color-mix(in oklab, --<x> 90%, --<x>-foreground 10%) */
add('white on danger hover (#c33e36)', p('#ffffff'), p('#c33e36'), 4.5);
add('white on accent hover (#0b657c)', p('#ffffff'), p('#0b657c'), 4.5);
add('white on accent active (#094f5e)', p('#ffffff'), p('#094f5e'), 4.5);

console.log('\n=== DERIVED/NON-TEXT FAILURES ===');
for (const f of extra) console.log(' - ' + f);
if (!extra.length) console.log(' none');
process.exit(fails.length || extra.length ? 1 : 0);
