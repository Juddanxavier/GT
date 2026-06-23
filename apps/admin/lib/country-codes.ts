export interface CountryCode {
  dialCode: string;
  flag: string;
}

const COUNTRY_CODES: Record<string, CountryCode> = {
  'India': { dialCode: '+91', flag: 'IN' },
  'Sri Lanka': { dialCode: '+94', flag: 'LK' },
};

export function getCountryCode(country: string | null | undefined): CountryCode {
  if (!country) return { dialCode: '+91', flag: 'IN' };
  return COUNTRY_CODES[country] ?? { dialCode: '', flag: '' };
}

export function stripDialCode(phone: string, dialCode: string): string {
  if (!phone) return '';
  return phone.startsWith(dialCode) ? phone.slice(dialCode.length).trim() : phone.trim();
}

export { COUNTRY_CODES };
