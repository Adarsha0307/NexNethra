import crypto from 'crypto';
import { getJwtSecret } from './auth.js';

const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export function generateCode() {
  const min = 0;
  const max = 10 ** CODE_LENGTH - 1;
  const num = crypto.randomInt(min, max + 1);
  return String(num).padStart(CODE_LENGTH, '0');
}

// HMAC-SHA256 keyed with the server secret — resists offline brute-force
// of the 10^6 code space even if the DB leaks (the attacker needs the key).
export function hashCode(code) {
  return crypto
    .createHmac('sha256', getJwtSecret())
    .update(String(code))
    .digest('hex');
}

export function verifyCode(submittedCode, storedHash) {
  if (typeof submittedCode !== 'string' || typeof storedHash !== 'string') return false;
  const submittedHash = hashCode(submittedCode);
  const a = Buffer.from(submittedHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function getExpiryTimestamp() {
  return Date.now() + CODE_TTL_MS;
}

export function isExpired(expiryTimestamp) {
  return Date.now() > expiryTimestamp;
}
