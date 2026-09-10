import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('check-price portal (no GST)', () => {
  const src = readFileSync(
    resolve(__dirname, '../app/(portal)/check-price/page.tsx'),
    'utf8',
  );

  it('does not show GST columns or 18% tax breakdown', () => {
    expect(src).not.toMatch(/GST/i);
    expect(src).not.toMatch(/18%/);
  });
});
