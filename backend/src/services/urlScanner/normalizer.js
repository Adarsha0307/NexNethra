const PRIVATE_IP_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^169\.254\./,
  /^::1$/, /^fc00:/i, /^fe80:/i,
];

const HOMOGRAPH_MAP = {
  'а': 'a', 'е': 'e', 'і': 'i', 'о': 'o', 'с': 'c',
  'р': 'p', 'х': 'x', 'у': 'y', 'ј': 'j', 'қ': 'k', 'п': 'n',
  'һ': 'h', 'в': 'b', 'м': 'm',
};

function isPrivateIP(hostname) {
  return PRIVATE_IP_RANGES.some(r => r.test(hostname));
}

function detectHomograph(hostname) {
  const normalized = hostname.toLowerCase();
  const latinChars = /^[a-z0-9.-]+$/.test(normalized);
  if (latinChars) return null;
  const hasCyrillic = /[а-яіїєґ]/.test(normalized);
  if (!hasCyrillic) return null;
  let suspicionScore = 0;
  const suspiciousChars = [];
  for (const char of normalized) {
    if (HOMOGRAPH_MAP[char]) { suspicionScore++; suspiciousChars.push(char); }
  }
  if (suspicionScore > 1) {
    return {
      risk: suspicionScore >= 4 ? 'high' : 'medium',
      characters: [...new Set(suspiciousChars)],
      description: 'Hostname contains Cyrillic characters that visually resemble Latin letters (homograph attack).'
    };
  }
  return null;
}

export function normalizeUrl(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) return { error: 'No URL provided', normalized: null };
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  let parsed;
  try { parsed = new URL(url); } catch { return { error: 'Invalid URL format', normalized: null }; }
  const protocol = parsed.protocol.toLowerCase();
  let hostname = parsed.hostname.toLowerCase();
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1);
  if (hostname.includes('xn--')) { try { hostname = new URL(protocol + '//' + hostname).hostname; } catch {} }
  if (isPrivateIP(hostname)) return { error: 'URL points to a private/internal IP address — blocked for security', normalized: null, ssrfWarning: true };
  const homographRisk = detectHomograph(hostname);
  let port = parsed.port;
  if ((protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443')) port = '';
  const normalized = protocol + '//' + hostname + (port ? ':' + port : '') + parsed.pathname + parsed.search + parsed.hash;
  return { normalized, protocol, hostname, port: port || null, pathname: parsed.pathname, search: parsed.search, hash: parsed.hash, homographRisk, ssrfWarning: false };
}

export function validateUrlSafety(normalizedUrl) {
  const warnings = [];
  const parsed = new URL(normalizedUrl);
  if (parsed.protocol === 'http:') warnings.push({ severity: 'medium', category: 'protocol', message: 'URL uses unencrypted HTTP instead of HTTPS.' });
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0') warnings.push({ severity: 'critical', category: 'ssrf', message: 'URL targets localhost — potential SSRF risk.' });
  return warnings;
}
