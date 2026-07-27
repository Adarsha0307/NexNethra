import crypto from 'crypto';

const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export function generateCode() {
  const min = 0;
  const max = 10 ** CODE_LENGTH - 1;
  const num = crypto.randomInt(min, max + 1);
  return String(num).padStart(CODE_LENGTH, '0');
}

export function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function verifyCode(submittedCode, storedHash) {
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
