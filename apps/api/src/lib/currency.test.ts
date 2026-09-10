import { describe, expect, it } from 'vitest';
import { CURRENCY_SYMBOLS, currencySymbol } from './currency';

describe('currencySymbol', () => {
  it('returns ₹ for Gajan Traders (INR)', () => {
    expect(currencySymbol('INR')).toBe('₹');
    expect(CURRENCY_SYMBOLS.INR).toBe('₹');
  });

  it('returns Rs for Lanka Mahal (LKR)', () => {
    expect(currencySymbol('LKR')).toBe('Rs');
    expect(CURRENCY_SYMBOLS.LKR).toBe('Rs');
  });

  it('defaults to ₹ when code is missing', () => {
    expect(currencySymbol(null)).toBe('₹');
    expect(currencySymbol(undefined)).toBe('₹');
  });

  it('falls back to code prefix for unknown currencies', () => {
    expect(currencySymbol('AUD')).toBe('AUD ');
  });
});
