const WEIGHTS = { threatIntel: 0.30, domainAnalysis: 0.20, sslAnalysis: 0.15, redirectAnalysis: 0.15, urlHeuristics: 0.12, brandImpersonation: 0.08 };

export const RISK_LEVELS = [
  { min: 0, max: 19, label: 'Minimal Risk', classification: 'minimal', color: '#4fd1c5' },
  { min: 20, max: 39, label: 'Low Risk', classification: 'low', color: '#68d391' },
  { min: 40, max: 59, label: 'Medium Risk', classification: 'medium', color: '#ffb020' },
  { min: 60, max: 79, label: 'High Risk', classification: 'high', color: '#ff6b6b' },
  { min: 80, max: 100, label: 'Critical Risk', classification: 'critical', color: '#e53e3e' },
];

export function getRiskLevel(score) { return RISK_LEVELS.find(r => score >= r.min && score <= r.max) || RISK_LEVELS[0]; }

export function calculateRiskScore(results) {
  const { threatIntel = { combinedScore: 0, combinedConfidence: 0, anyDetected: false }, domainAnalysis = { riskScore: 0, findings: [] }, sslAnalysis = { riskScore: 0, findings: [], valid: false }, redirectAnalysis = { riskScore: 0, findings: [], redirectCount: 0 }, urlHeuristics = { riskScore: 0, findings: [] }, brandImpersonationFindings = [] } = results;

  const scoredSignals = [];
  const threatScore = threatIntel.anyDetected ? Math.max(threatIntel.combinedScore, 70) : threatIntel.combinedScore;
  scoredSignals.push({ name: 'Threat Intelligence', rawScore: threatScore, weighted: threatScore * WEIGHTS.threatIntel, weight: WEIGHTS.threatIntel, maxPossible: 100 * WEIGHTS.threatIntel, confidence: threatIntel.combinedConfidence || 0.5 });
  scoredSignals.push({ name: 'Domain Analysis', rawScore: domainAnalysis.riskScore, weighted: domainAnalysis.riskScore * WEIGHTS.domainAnalysis, weight: WEIGHTS.domainAnalysis, maxPossible: 100 * WEIGHTS.domainAnalysis, confidence: domainAnalysis.findings.length > 0 ? 0.8 : 0.4 });
  scoredSignals.push({ name: 'SSL/TLS', rawScore: sslAnalysis.riskScore, weighted: sslAnalysis.riskScore * WEIGHTS.sslAnalysis, weight: WEIGHTS.sslAnalysis, maxPossible: 100 * WEIGHTS.sslAnalysis, confidence: sslAnalysis.findings.length > 0 || !sslAnalysis.valid ? 0.9 : 0.5 });
  scoredSignals.push({ name: 'Redirect Analysis', rawScore: redirectAnalysis.riskScore, weighted: redirectAnalysis.riskScore * WEIGHTS.redirectAnalysis, weight: WEIGHTS.redirectAnalysis, maxPossible: 100 * WEIGHTS.redirectAnalysis, confidence: redirectAnalysis.findings.length > 0 ? 0.85 : 0.4 });
  scoredSignals.push({ name: 'URL Heuristics', rawScore: urlHeuristics.riskScore, weighted: urlHeuristics.riskScore * WEIGHTS.urlHeuristics, weight: WEIGHTS.urlHeuristics, maxPossible: 100 * WEIGHTS.urlHeuristics, confidence: urlHeuristics.findings.length > 0 ? 0.75 : 0.3 });
  const brandScore = brandImpersonationFindings.length > 0 ? 80 : 0;
  scoredSignals.push({ name: 'Brand Impersonation', rawScore: brandScore, weighted: brandScore * WEIGHTS.brandImpersonation, weight: WEIGHTS.brandImpersonation, maxPossible: 100 * WEIGHTS.brandImpersonation, confidence: brandImpersonationFindings.length > 0 ? 0.95 : 0.5 });

  const totalWeightedScore = scoredSignals.reduce((s, x) => s + x.weighted, 0);
  const totalMaxPossible = scoredSignals.reduce((s, x) => s + x.maxPossible, 0);
  const riskScore = totalMaxPossible > 0 ? Math.round((totalWeightedScore / totalMaxPossible) * 100) : 0;
  const signalConfidences = scoredSignals.filter(s => s.rawScore > 0).map(s => s.confidence);
  const overallConfidence = signalConfidences.length > 0 ? Math.round((signalConfidences.reduce((a,b) => a+b,0) / signalConfidences.length) * 100) : 50;
  const finalScore = threatIntel.anyDetected ? Math.max(riskScore, 90) : riskScore;
  const finalConfidence = threatIntel.anyDetected ? Math.max(overallConfidence, 95) : overallConfidence;
  const riskLevel = getRiskLevel(finalScore);

  return { riskScore: finalScore, confidence: finalConfidence, classification: riskLevel.classification, label: riskLevel.label, color: riskLevel.color, hardOverrideApplied: threatIntel.anyDetected, signals: scoredSignals };
}

export function aggregateFindings(results) {
  const allFindings = [];
  if (results.threatIntel?.threats) { for (const t of results.threatIntel.threats) { if (t.detected) allFindings.push({ severity: 'critical', category: 'threat_intelligence', title: `${t.source.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} Detection`, description: t.note, source: t.source }); } }
  if (results.domainAnalysis?.findings) allFindings.push(...results.domainAnalysis.findings);
  if (results.sslAnalysis?.findings) allFindings.push(...results.sslAnalysis.findings);
  if (results.redirectAnalysis?.findings) allFindings.push(...results.redirectAnalysis.findings);
  if (results.urlHeuristics?.findings) allFindings.push(...results.urlHeuristics.findings);
  if (results.brandImpersonationFindings) allFindings.push(...results.brandImpersonationFindings);
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  allFindings.sort((a,b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5));
  return allFindings;
}
