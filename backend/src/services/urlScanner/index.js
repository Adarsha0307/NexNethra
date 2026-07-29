import { normalizeUrl, validateUrlSafety } from './normalizer.js';
import { checkAllSources } from './threatIntel.js';
import { analyzeDomain, resolveIp } from './domainAnalysis.js';
import { checkSslCertificate } from './sslAnalysis.js';
import { analyzeRedirects } from './redirectAnalysis.js';
import { detectBrandImpersonation } from './brandImpersonation.js';
import { analyzeUrlHeuristics } from './heuristics.js';
import { calculateRiskScore, aggregateFindings } from './scoringEngine.js';
import { getCachedResult, cacheResult } from './cache.js';

export async function scanUrl(url, options = {}) {
  const { useCache = true, followRedirects = true, checkSsl = true } = options;

  const normalized = normalizeUrl(url);
  if (normalized.error) {
    return { error: normalized.error, ssrfWarning: normalized.ssrfWarning || false, url, riskScore: 0, confidence: 100, classification: 'error', label: 'Invalid URL', color: '#999', findings: [{ severity: 'high', category: 'validation', title: 'Invalid URL', description: normalized.error }] };
  }

  if (useCache) { const cached = await getCachedResult(normalized.normalized); if (cached) return cached.result; }

  const safetyWarnings = validateUrlSafety(normalized.normalized);

  const [ip, domainResults] = await Promise.all([resolveIp(normalized.hostname), analyzeDomain(normalized.hostname)]);
  const ipForAbuse = ip || domainResults.ip;

  const [threatIntelResults, sslResults, redirectResults, heuristicResults] = await Promise.all([
    checkAllSources(normalized.normalized, normalized.hostname, ipForAbuse),
    checkSsl ? checkSslCertificate(normalized.hostname) : Promise.resolve({ valid: false, findings: [], riskScore: 0, summary: 'SSL check skipped' }),
    followRedirects ? analyzeRedirects(normalized.normalized) : Promise.resolve({ chain: [], redirectCount: 0, finalUrl: normalized.normalized, findings: [], riskScore: 0, sameDomain: true }),
    Promise.resolve(analyzeUrlHeuristics(normalized.normalized, normalized.hostname, normalized.pathname))
  ]);

  const brandFindings = detectBrandImpersonation(normalized.hostname, domainResults.registrableDomain);
  const allResults = { threatIntel: threatIntelResults, domainAnalysis: domainResults, sslAnalysis: sslResults, redirectAnalysis: redirectResults, urlHeuristics: heuristicResults, brandImpersonationFindings: brandFindings };

  const scoring = calculateRiskScore(allResults);
  const allFindings = aggregateFindings(allResults);

  for (const w of safetyWarnings) { allFindings.unshift({ severity: w.severity, category: w.category, title: w.category === 'ssrf' ? 'SSRF Risk Detected' : 'Unencrypted Protocol', description: w.message }); }

  const result = {
    url: normalized.normalized, originalUrl: url, riskScore: scoring.riskScore, confidence: scoring.confidence,
    classification: scoring.classification, label: scoring.label, color: scoring.color,
    hardOverrideApplied: scoring.hardOverrideApplied, findings: allFindings, signals: scoring.signals,
    technical: {
      hostname: normalized.hostname, protocol: normalized.protocol, ip: ip || domainResults.ip,
      registeredDomain: domainResults.registrableDomain, tld: domainResults.tld,
      mxRecords: domainResults.mxRecords, nameservers: domainResults.nameservers,
      sslIssuer: sslResults.issuer, sslValid: sslResults.valid, sslProtocol: sslResults.protocol,
      sslExpiresDays: sslResults.remainingDays, redirectCount: redirectResults.redirectCount,
      finalUrl: redirectResults.finalUrl, redirectChain: redirectResults.chain, homographRisk: normalized.homographRisk
    }
  };

  if (useCache) await cacheResult(normalized.normalized, result);
  return result;
}
