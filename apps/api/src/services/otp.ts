import { randomInt } from 'node:crypto';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ponytail: in-memory OTP store, replace with Redis if horizontal scaling needed
const store = new Map<string, { otp: string; expiresAt: number; trackingNo: string; email: string }>();

export function generateOtp(trackingNo: string, email: string): string {
  const otp = String(randomInt(100000, 999999));
  const key = `claim:${trackingNo}`;
  store.set(key, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS, trackingNo, email });
  // Auto-cleanup after expiry
  setTimeout(() => store.delete(key), OTP_EXPIRY_MS);
  return otp;
}

export function verifyOtp(trackingNo: string, otp: string): boolean {
  const key = `claim:${trackingNo}`;
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { store.delete(key); return false; }
  if (entry.otp !== otp) return false;
  store.delete(key); // one-time use
  return true;
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 1) return email;
  return email.slice(0, 2) + '***' + email.slice(at);
}
