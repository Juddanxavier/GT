import { randomInt } from 'node:crypto';
import { cacheClient } from '../redis';

const OTP_EXPIRY_SEC = 10 * 60; // 10 minutes
const OTP_EXPIRY_MS = OTP_EXPIRY_SEC * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

type OtpEntry = { otp: string; attempts: number; email: string; expiresAt: number };

// ponytail: in-memory fallback for when Redis is down; cross-instance safety
// depends on Redis being up.
const memStore = new Map<string, OtpEntry>();

function key(trackingNo: string): string {
  return `otp:claim:${trackingNo}`;
}

async function otpGet(k: string): Promise<OtpEntry | null> {
  if (cacheClient) {
    try {
      const raw = await cacheClient.get(k);
      if (raw) return JSON.parse(raw) as OtpEntry;
    } catch {
      // Redis down — fall through to memory
    }
  }
  const entry = memStore.get(k);
  if (entry && Date.now() < entry.expiresAt) return entry;
  memStore.delete(k);
  return null;
}

async function otpSet(k: string, entry: OtpEntry): Promise<void> {
  if (cacheClient) {
    try {
      await cacheClient.setex(k, OTP_EXPIRY_SEC, JSON.stringify(entry));
      return;
    } catch {
      // Redis down — fall through to memory
    }
  }
  memStore.set(k, entry);
  setTimeout(() => memStore.delete(k), OTP_EXPIRY_MS);
}

async function otpDel(k: string): Promise<void> {
  if (cacheClient) {
    try {
      await cacheClient.del(k);
    } catch {
      // ignore
    }
  }
  memStore.delete(k);
}

export async function generateOtp(trackingNo: string, email: string): Promise<string> {
  const k = key(trackingNo);
  const existing = await otpGet(k);
  if (existing && Date.now() < existing.expiresAt) return existing.otp;
  const otp = String(randomInt(100000, 999999));
  await otpSet(k, { otp, attempts: 0, email, expiresAt: Date.now() + OTP_EXPIRY_MS });
  return otp;
}

export async function verifyOtp(trackingNo: string, otp: string): Promise<boolean> {
  const k = key(trackingNo);
  const entry = await otpGet(k);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    await otpDel(k);
    return false;
  }
  if (entry.otp !== otp) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
      await otpDel(k);
    } else {
      await otpSet(k, entry);
    }
    return false;
  }
  await otpDel(k); // one-time use
  return true;
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 1) return email;
  return email.slice(0, 2) + '***' + email.slice(at);
}
