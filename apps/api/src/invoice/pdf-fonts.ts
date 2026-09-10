import { Font } from '@react-pdf/renderer';
import { resolve } from 'node:path';

const FONT_DIR = resolve(
  process.cwd(),
  'node_modules/@fontsource-variable/noto-sans/files',
);

const NOTO_LATIN_EXT = resolve(FONT_DIR, 'noto-sans-latin-ext-wght-normal.woff2');

let registered = false;

/** Registers Noto Sans for PDF output (Helvetica cannot render ₹). */
export function ensurePdfFonts(): void {
  if (registered) return;
  Font.register({
    family: 'NotoSans',
    src: NOTO_LATIN_EXT,
  });
  registered = true;
}

export const PDF_FONT_FAMILY = 'NotoSans';
