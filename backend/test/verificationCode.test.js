import { describe, it, expect, beforeAll } from 'vitest';

process.env.JWT_SECRET = 'test-secret-0123456789-0123456789-0123456789';

import { generateCode, hashCode, verifyCode, isExpired, getExpiryTimestamp } from '../src/utils/verificationCode.js';

describe('verificationCode', () => {
  it('generates a 6-digit code with leading zeros', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('hashes are deterministic HMACs (same code -> same hash)', () => {
    expect(hashCode('123456')).toBe(hashCode('123456'));
  });

  it('verifies correct codes and rejects wrong/typed ones', () => {
    const hash = hashCode('654321');
    expect(verifyCode('654321', hash)).toBe(true);
    expect(verifyCode('654322', hash)).toBe(false);
    expect(verifyCode(654321, hash)).toBe(false);
    expect(verifyCode('654321', '')).toBe(false);
  });

  it('expiry helpers work', () => {
    expect(isExpired(Date.now() - 1)).toBe(true);
    expect(isExpired(Date.now() + 60000)).toBe(false);
    expect(getExpiryTimestamp()).toBeGreaterThan(Date.now());
  });
});