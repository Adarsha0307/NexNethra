const SOURCES = [
  { id: 'google_safe_browsing', name: 'Google Safe Browsing', weight: 0.35 },
  { id: 'virustotal', name: 'VirusTotal', weight: 0.25 },
  { id: 'urlhaus', name: 'URLhaus', weight: 0.15 },
  { id: 'phishtank', name: 'PhishTank', weight: 0.15 },
  { id: 'abuseipdb', name: 'AbuseIPDB', weight: 0.10 },
];

export async function checkGoogleSafeBrowsing(url) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!apiKey) return { detected: false, source: 'google_safe_browsing', note: 'No API key configured' };
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: { clientId: 'nexnetra', clientVersion: '1.0.0' }, threatInfo: { threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url }] } })
    });
    if (!res.ok) return { detected: false, source: 'google_safe_browsing', note: `API error ${res.status}` };
    const data = await res.json();
    const matches = data.matches || [];
    if (matches.length > 0) return { detected: true, source: 'google_safe_browsing', threats: matches.map(m => m.threatType), note: `Flagged for: ${matches.map(m => m.threatType).join(', ')}` };
    return { detected: false, source: 'google_safe_browsing', note: 'No threats found' };
  } catch (err) { return { detected: false, source: 'google_safe_browsing', note: `Check failed: ${err.message}` }; }
}

export async function checkVirusTotal(url) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return { detected: false, source: 'virustotal', note: 'No API key configured' };
  try {
    const analysisRes = await fetch('https://www.virustotal.com/api/v3/urls', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-apikey': apiKey }, body: new URLSearchParams({ url }) });
    if (!analysisRes.ok) return { detected: false, source: 'virustotal', note: `Analysis submission failed: ${analysisRes.status}` };
    const analysisData = await analysisRes.json();
    const analysisId = analysisData.data?.id;
    if (!analysisId) return { detected: false, source: 'virustotal', note: 'No analysis ID returned' };
    await new Promise(r => setTimeout(r, 3000));
    const reportRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, { headers: { 'x-apikey': apiKey } });
    if (!reportRes.ok) return { detected: false, source: 'virustotal', note: `Report fetch failed: ${reportRes.status}` };
    const report = await reportRes.json();
    const stats = report.data?.attributes?.stats || {};
    const total = (stats.malicious || 0) + (stats.suspicious || 0);
    return { detected: total > 0, source: 'virustotal', detections: total, malicious: stats.malicious || 0, suspicious: stats.suspicious || 0, note: total > 0 ? `${total} engines flagged this URL` : 'No engines flagged this URL' };
  } catch (err) { return { detected: false, source: 'virustotal', note: `Check failed: ${err.message}` }; }
}

export async function checkURLhaus(url) {
  try {
    const res = await fetch('https://urlhaus-api.abuse.ch/v1/url/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ url }) });
    if (!res.ok) return { detected: false, source: 'urlhaus', note: `API error ${res.status}` };
    const data = await res.json();
    if (data.query_status === 'ok') return { detected: true, source: 'urlhaus', threat: data.threat || 'malware', urlhausReference: data.urlhaus_reference, note: `URL listed in URLhaus as: ${data.threat || 'malware'}` };
    return { detected: false, source: 'urlhaus', note: 'URL not found in URLhaus' };
  } catch (err) { return { detected: false, source: 'urlhaus', note: `Check failed: ${err.message}` }; }
}

export async function checkPhishTank(url) {
  try {
    const res = await fetch('https://checkurl.phishtank.com/checkurl/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ url, format: 'json', app_key: process.env.PHISHTANK_API_KEY || 'nexnetra' }) });
    if (!res.ok) return { detected: false, source: 'phishtank', note: `API error ${res.status}` };
    const data = await res.json();
    if (data.results?.in_phish_tank === true) return { detected: true, source: 'phishtank', phishDetailUrl: data.results.phish_detail_page, note: 'URL is listed in PhishTank as a confirmed phish' };
    return { detected: false, source: 'phishtank', note: 'URL not found in PhishTank' };
  } catch (err) { return { detected: false, source: 'phishtank', note: `Check failed: ${err.message}` }; }
}

export async function checkAbuseIPDB(ip) {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey || !ip) return { detected: false, source: 'abuseipdb', note: 'No API key or IP not available' };
  try {
    const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, { headers: { 'Key': apiKey, 'Accept': 'application/json' } });
    if (!res.ok) return { detected: false, source: 'abuseipdb', note: `API error ${res.status}` };
    const data = await res.json();
    const score = data.data?.abuseConfidenceScore || 0;
    return { detected: score > 50, source: 'abuseipdb', abuseConfidenceScore: score, country: data.data?.countryCode, isp: data.data?.isp, domain: data.data?.domain, totalReports: data.data?.totalReports || 0, lastReported: data.data?.lastReportedAt, note: score > 50 ? `IP has ${score}% abuse confidence score (${data.data?.totalReports || 0} reports)` : 'IP has clean reputation' };
  } catch (err) { return { detected: false, source: 'abuseipdb', note: `Check failed: ${err.message}` }; }
}

function scoreThreatIntel(result) {
  if (!result || !result.detected) return { score: 0, confidence: 0 };
  const source = SOURCES.find(s => s.id === result.source);
  const weight = source?.weight || 0.1;
  let score = 70 * weight;
  let confidence = 0.7 * weight;
  if (result.source === 'virustotal') { const ratio = (result.malicious || 0) / 90; score = Math.min(100, ratio * 100 * weight * 3); confidence = Math.min(1, ratio * 2) * weight; }
  if (result.source === 'abuseipdb' && result.abuseConfidenceScore) { score = (result.abuseConfidenceScore / 100) * 60 * weight; confidence = (result.abuseConfidenceScore / 100) * 0.8 * weight; }
  return { score, confidence };
}

export async function checkAllSources(url, hostname, ip) {
  const results = await Promise.allSettled([
    checkGoogleSafeBrowsing(url), checkVirusTotal(url), checkURLhaus(url), checkPhishTank(url),
    ip ? checkAbuseIPDB(ip) : Promise.resolve({ detected: false, source: 'abuseipdb', note: 'No IP to check' })
  ]);
  const threats = [];
  let totalScore = 0, totalConfidence = 0, anyDetected = false;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      threats.push(result.value);
      if (result.value.detected) anyDetected = true;
      const scored = scoreThreatIntel(result.value);
      totalScore += scored.score;
      totalConfidence += scored.confidence;
    }
  }
  return { threats, anyDetected, combinedScore: Math.min(100, totalScore), combinedConfidence: Math.min(1, totalConfidence), sourcesChecked: SOURCES.length };
}
