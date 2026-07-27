import crypto from 'crypto';
import { query } from '../../utils/db.js';

const CACHE_DURATIONS = { malicious: 24*60*60*1000, clean: 6*60*60*1000, unknown: 2*60*60*1000, error: 5*60*1000 };

function hashUrl(url) { return crypto.createHash('sha256').update(url.toLowerCase()).digest('hex'); }

function getCacheDuration(riskScore, classification) {
  if (classification === 'critical' || classification === 'high') return CACHE_DURATIONS.malicious;
  if (classification === 'minimal' || classification === 'low') return CACHE_DURATIONS.clean;
  return CACHE_DURATIONS.unknown;
}

export async function getCachedResult(url) {
  const urlHash = hashUrl(url);
  const { rows } = await query('SELECT result, checked_at FROM url_scans WHERE url_hash = $1 AND expires_at > $2', [urlHash, Date.now()]);
  if (rows.length > 0) return { cached: true, result: rows[0].result, checkedAt: rows[0].checked_at };
  return null;
}

export async function cacheResult(url, result) {
  const urlHash = hashUrl(url);
  const expiresAt = Date.now() + getCacheDuration(result.riskScore, result.classification);
  await query('INSERT INTO url_scans (url_hash, url, result, checked_at, expires_at) VALUES ($1,$2,$3::jsonb,NOW(),$4) ON CONFLICT (url_hash) DO UPDATE SET url=$2, result=$3::jsonb, checked_at=NOW(), expires_at=$4', [urlHash, url, JSON.stringify(result), expiresAt]);
}

export async function clearExpiredCache() {
  const { rows } = await query('DELETE FROM url_scans WHERE expires_at < $1 RETURNING COUNT(*)', [Date.now()]);
  return rows[0]?.count || 0;
}
