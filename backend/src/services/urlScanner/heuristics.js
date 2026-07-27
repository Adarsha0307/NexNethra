const PHISHING_KEYWORDS = ['login','verify','secure','account','update','wallet','password','bank','payment','confirm','signin','auth','authenticate','credential','recover','unlock','reset','activate','validate','restore','protection','alert','suspended','limited','blocked','refund','bonus','free','prize','winner','gift','claim','reward','promotion','security','protect','verification','authorize'];
const SHORTENERS = ['bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','is.gd','buff.ly','tiny.cc','tr.im','shorturl.at','cut.ly','rb.gy','short.link','cutt.us','shorte.st','adf.ly','bit.do','mcaf.ee','v.gd','cli.gs','urlzs.com','su.pr','snipr.com','u.to','x.co','qr.ae'];
const SUSPICIOUS_PATTERNS = [
  { pattern: /@/, severity: 'high', desc: 'URL contains @ symbol — redirects to a different authority than it appears.' },
  { pattern: /%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}/, severity: 'medium', desc: 'URL contains IP-encoding via hex in the path — possible cloaking.' },
  { pattern: /-\d{8,}/, severity: 'low', desc: 'URL path contains long numeric suffix — common in auto-generated phishing pages.' },
];

function scoreSeverity(s) { switch(s) { case 'critical': return 35; case 'high': return 20; case 'medium': return 10; case 'low': return 5; default: return 0; } }

export function analyzeUrlHeuristics(url, hostname, pathname) {
  const findings = [];
  let riskScore = 0;
  const lowerUrl = url.toLowerCase();
  const lowerPath = (pathname || '').toLowerCase();

  if (SHORTENERS.some(s => lowerUrl.includes(s))) { findings.push({ severity: 'medium', category: 'url_structure', title: 'Shortened URL', description: 'URL uses a URL shortening service, which can hide the final destination domain.' }); riskScore += 15; }

  const pathWords = lowerPath.split(/[/\-_.=]+/).filter(Boolean);
  const foundKeywords = PHISHING_KEYWORDS.filter(k => pathWords.some(w => w === k));
  if (foundKeywords.length > 0) { findings.push({ severity: foundKeywords.length > 3 ? 'high' : 'medium', category: 'url_structure', title: 'Phishing-Related Keywords Detected', description: `URL path contains ${foundKeywords.length} keyword${foundKeywords.length > 1 ? 's' : ''} commonly associated with phishing: "${foundKeywords.join(', ')}".` }); riskScore += Math.min(30, foundKeywords.length * 8); }

  if (url.length > 200) { findings.push({ severity: 'medium', category: 'url_structure', title: 'Unusually Long URL', description: `URL is ${url.length} characters long — excessively long URLs are often used to hide suspicious parameters.` }); riskScore += 10; }

  for (const { pattern, severity, desc } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerUrl)) { findings.push({ severity, category: 'url_structure', title: 'Suspicious URL Pattern', description: desc }); riskScore += scoreSeverity(severity); }
  }

  if (hostname && /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) { findings.push({ severity: 'high', category: 'url_structure', title: 'IP Address URL', description: 'URL uses a raw IP address instead of a domain name — legitimate services rarely use IP-based URLs.' }); riskScore += 25; }

  const queryParams = lowerUrl.split('?')[1];
  if (queryParams) {
    const params = queryParams.split(/[&#]/);
    const suspiciousParams = ['redirect','url','link','goto','return','next','dest','target','continue'];
    for (const param of suspiciousParams) {
      if (params.some(p => p.startsWith(param + '=') || p.startsWith(param + '%3D'))) { findings.push({ severity: 'high', category: 'url_structure', title: 'Open Redirect Parameter', description: `URL contains a "${param}" parameter — can be used for open redirect attacks to phishing sites.` }); riskScore += 20; break; }
    }
  }
  return { findings, riskScore: Math.min(100, riskScore) };
}
