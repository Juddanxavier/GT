const SYMBOLS: Record<string, string> = {
  INR: '₹',
  LKR: 'Rs.',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SGD: 'S$',
  MYR: 'RM',
  CNY: '¥',
  THB: '฿',
  HKD: 'HK$',
};

export function getCurrencySymbol(code: string | null | undefined): string {
  return SYMBOLS[code ?? ''] ?? (code ? `${code} ` : '₹');
}

export function formatCurrency(amount: number | string | null | undefined, currencyCode: string | null | undefined): string {
  const sym = getCurrencySymbol(currencyCode);
  const amt = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(amt)) return `${sym}0.00`;
  if (currencyCode === 'INR') return `${sym}${amt.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  return `${sym}${amt.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
