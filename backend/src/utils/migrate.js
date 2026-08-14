import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

async function ensureMigrationsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`
  );
}

async function runMigrations() {
  await ensureMigrationsTable();

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort();

  const { rows: appliedRows } = await query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map(r => r.version));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] ${file} — already applied, skipping.`);
      continue;
    }

    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`[migrate] Applying ${file}...`);
    await query('BEGIN');
    try {
      await query(sql);
      await query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)',
        [file, new Date().toISOString()]);
      await query('COMMIT');
      console.log(`[migrate] ${file} — applied.`);
    } catch (err) {
      await query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }
}

export async function migrateJsonData() {
  const usersJson = path.join(PROJECT_ROOT, 'database/users.json');
  const dataJson = path.join(PROJECT_ROOT, 'database/data.json');

  // Never seed from JSON files in production — they may contain stale PII.
  if (process.env.NODE_ENV === 'production') {
    console.log('[migrate] Skipping JSON seed import (production).');
    return;
  }

  // Check if users table is empty
  const { rows } = await query('SELECT COUNT(*)::int AS cnt FROM users');
  if (rows[0].cnt > 0) {
    console.log(`Users table already has ${rows[0].cnt} rows — skipping JSON import.`);
  } else {
    try {
      const raw = await fs.readFile(usersJson, 'utf-8');
      const users = JSON.parse(raw);
      for (const u of users) {
          await query(
            `INSERT INTO users (id, first_name, last_name, display_name, avatar_url, email, password_hash, email_verified, verification_code_hash, verification_code_expiry, verification_attempts, last_code_sent_at, mfa_enabled, mfa_secret, mfa_pending_secret, theme, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT (id) DO NOTHING`,
            [u.id, u.firstName || '', u.lastName || '', u.displayName || '', u.avatarUrl || '', u.email, u.passwordHash,
             u.emailVerified || false, u.verificationCodeHash || null,
             u.verificationCodeExpiry || null, u.verificationAttempts || 0,
             u.lastCodeSentAt || 0, u.mfaEnabled || false,
             u.mfaSecret || null, u.mfaPendingSecret || null,
             u.theme || 'dark', u.createdAt || new Date().toISOString()]
          );
      }
      console.log(`Imported ${users.length} users from JSON.`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No users.json found — starting fresh.');
      } else {
        throw err;
      }
    }
  }

  // Check if activities table is empty
  const { rows: actCount } = await query('SELECT COUNT(*)::int AS cnt FROM activities');
  if (actCount[0].cnt > 0) {
    console.log(`Activities table already has ${actCount[0].cnt} rows — skipping JSON import.`);
  } else {
    try {
      const raw = await fs.readFile(dataJson, 'utf-8');
      const store = JSON.parse(raw);

      if (store.activities && Array.isArray(store.activities)) {
        for (const a of store.activities) {
          await query(
            `INSERT INTO activities (id, type, title, description, timestamp)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
            [a.id, a.type, a.title, a.description || null, a.timestamp || new Date().toISOString()]
          );
        }
        console.log(`Imported ${store.activities.length} activities from JSON.`);
      }

      if (store.incidents && Array.isArray(store.incidents)) {
        for (const inc of store.incidents) {
          await query(
            `INSERT INTO incidents (id, title, category, description, severity, reporter, status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
            [inc.id, inc.title, inc.category, inc.description,
             inc.severity, inc.reporter, inc.status || 'Open',
             inc.createdAt || new Date().toISOString()]
          );
        }
        console.log(`Imported ${store.incidents.length} incidents from JSON.`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No data.json found — starting fresh.');
      } else {
        throw err;
      }
    }
  }
}

export async function migrate() {
  await runMigrations();
  await migrateJsonData();
  console.log('Migration complete.');
}

// Run directly: node src/utils/migrate.js
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}