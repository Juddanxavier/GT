import { describe, expect, it } from 'vitest';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';

describe('tenant currency formatting', () => {
  it('formats INR with rupee symbol for Gajan Traders', () => {
    expect(getCurrencySymbol('INR')).toBe('₹');
    expect(formatCurrency(1500, 'INR')).toBe('₹1,500');
    expect(formatCurrency(100000, 'INR')).toBe('₹1,00,000');
  });

  it('formats LKR with Rs for Lanka Mahal', () => {
    expect(getCurrencySymbol('LKR')).toBe('Rs');
    expect(formatCurrency(2500, 'LKR')).toBe('Rs2,500');
  });

  it('handles invalid amounts safely', () => {
    expect(formatCurrency('not-a-number', 'INR')).toBe('₹0.00');
    expect(formatCurrency(null, null)).toBe('₹0');
  });
});
