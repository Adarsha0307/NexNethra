import crypto from 'crypto';
import { query } from './db.js';

function toCamel(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

export async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return toCamel(rows[0]);
}

export async function findUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return toCamel(rows[0]);
}

export async function createUser(userData) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const { rows } = await query(
    `INSERT INTO users (id, first_name, last_name, display_name, avatar_url, email, password_hash, email_verified,
       verification_code_hash, verification_code_expiry, verification_attempts,
       last_code_sent_at, mfa_enabled, mfa_secret, mfa_pending_secret, theme, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [id, userData.firstName, userData.lastName || '', '', '', userData.email,
     userData.passwordHash, false,
     userData.verificationCodeHash || null, userData.verificationCodeExpiry || null,
     0, Date.now(), false, null, null, 'dark', createdAt]
  );
  return toCamel(rows[0]);
}

export async function updateUser(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${col} = $${idx++}`);
    values.push(value);
  }

  if (fields.length === 0) return null;

  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return toCamel(rows[0]);
}
