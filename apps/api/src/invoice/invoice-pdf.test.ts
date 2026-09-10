import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('invoice PDF template', () => {
  const src = readFileSync(resolve(__dirname, 'pdf.tsx'), 'utf8');

  it('does not add GST line items (all-in freight amount)', () => {
    expect(src).not.toContain('hasGst');
    expect(src).not.toMatch(/GST @ 18%/);
    expect(src).not.toMatch(/GST \(18%\)/);
  });

  it('uses tenant currency symbol helper', () => {
    expect(src).toContain('currencySymbol(data.currency)');
  });
});
