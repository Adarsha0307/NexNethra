import crypto from 'crypto';
import { query } from './db.js';

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

export async function storeRefreshToken(userId, token, familyId) {
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;
  const tokenHash = hashToken(token);
  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, userId, tokenHash, familyId, expiresAt, new Date().toISOString()]
  );
}

export async function rotateRefreshToken(oldTokenRaw) {
  const oldHash = hashToken(oldTokenRaw);

  const { rows } = await query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [oldHash]);
  if (rows.length === 0) return { error: 'INVALID_TOKEN' };

  const existing = rows[0];

  if (Date.now() > existing.expires_at) {
    return { error: 'EXPIRED' };
  }

  // Theft detection: if already revoked, nuke all tokens for this user
  if (existing.revoked_at) {
    await query('UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2',
      [new Date().toISOString(), existing.user_id]);
    return { error: 'THEFT_DETECTED' };
  }

  // Revoke old token
  await query('UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2',
    [new Date().toISOString(), existing.id]);

  // Issue new token (same family)
  const newToken = generateRefreshToken();
  await storeRefreshToken(existing.user_id, newToken, existing.family_id);

  return { token: newToken, userId: existing.user_id };
}

export async function revokeUserTokens(userId) {
  await query('UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL',
    [new Date().toISOString(), userId]);
}

// Revoke the family of one refresh token (used by logout). No-op if unknown.
export async function revokeTokenFamily(rawToken) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await query('SELECT user_id FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  if (rows.length === 0) return false;
  await query('UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL',
    [new Date().toISOString(), rows[0].user_id]);
  return true;
}
