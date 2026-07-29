const REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const MAX_REDIRECTS = 10;

export async function analyzeRedirects(url, timeout = 10000) {
  const findings = [];
  const chain = [];
  let riskScore = 0;
  let currentUrl = url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const res = await fetch(currentUrl, { method: 'HEAD', redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexnetraSecurityScanner/1.0)' } });
      chain.push({ url: currentUrl, statusCode: res.status, headers: Object.fromEntries(res.headers.entries()) });
      if (REDIRECT_STATUSES.includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) break;
        const nextUrl = new URL(location, currentUrl).href;
        if (chain.some(c => c.url === nextUrl)) { findings.push({ severity: 'high', category: 'redirect', title: 'Redirect Loop Detected', description: 'URL redirects in a loop back to a previously visited URL.' }); riskScore += 40; break; }
        if (i >= MAX_REDIRECTS - 1) { findings.push({ severity: 'high', category: 'redirect', title: 'Excessive Redirects', description: `URL has ${i + 1} redirects (maximum allowed: ${MAX_REDIRECTS}). Potential redirect abuse.` }); riskScore += 30; }
        currentUrl = nextUrl;
      } else break;
    }
  } catch (err) {
    if (err.name === 'AbortError') { findings.push({ severity: 'medium', category: 'redirect', title: 'Redirect Analysis Timed Out', description: `Redirect analysis timed out after ${timeout}ms.` }); riskScore += 10; }
    else { findings.push({ severity: 'low', category: 'redirect', title: 'Redirect Analysis Error', description: `Could not complete redirect analysis: ${err.message}` }); }
  } finally { clearTimeout(timer); }

  if (chain.some(c => c.url.startsWith('http://') && chain.indexOf(c) > 0)) { findings.push({ severity: 'critical', category: 'redirect', title: 'Protocol Downgrade', description: 'Redirect chain downgrades from HTTPS to HTTP, exposing traffic. Possible SSL stripping attack.' }); riskScore += 50; }

  const finalUrl = chain.length > 0 ? chain[chain.length - 1].url : url;
  const differentDomains = [...new Set(chain.map(c => { try { return new URL(c.url).hostname; } catch { return ''; } }).filter(Boolean))];
  if (differentDomains.length > 1) { findings.push({ severity: 'high', category: 'redirect', title: 'Cross-Domain Redirect', description: `URL redirects across ${differentDomains.length} different domains (${differentDomains.join(' → ')}), which can hide the final destination.` }); riskScore += 20; }

  return { chain, redirectCount: chain.length - 1, finalUrl, findings, riskScore: Math.min(100, riskScore), sameDomain: differentDomains.length <= 1 };
}
