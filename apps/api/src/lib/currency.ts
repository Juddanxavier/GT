export const CURRENCY_SYMBOLS: Record<string, string> = {
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

export function currencySymbol(code: string | null | undefined): string {
  return CURRENCY_SYMBOLS[code ?? ''] ?? (code ? `${code} ` : '₹');
}
