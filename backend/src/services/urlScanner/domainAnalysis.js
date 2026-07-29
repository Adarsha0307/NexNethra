import dns from 'dns/promises';

const SUSPICIOUS_TLDS = ['xyz','top','work','country','zip','click','link','download','stream','trade','review','science','win','bid','date','faith','racing','accountant','party','gdn','men','loan','download','cam','rest'];
const FREE_DOMAINS = ['tk','ml','ga','cf','gq','sbs','unoeuro.com','freenom'];

export async function resolveIp(hostname) {
  try { const addresses = await dns.resolve4(hostname); return addresses[0] || null; }
  catch { try { const addresses = await dns.resolve6(hostname); return addresses[0] || null; } catch { return null; } }
}

export async function resolveMxRecords(hostname) {
  try { const exchanges = await dns.resolveMx(hostname); return exchanges.sort((a,b) => a.priority - b.priority).map(e => e.exchange); } catch { return []; }
}

export async function resolveNameservers(hostname) {
  try { const ns = await dns.resolveNs(hostname); return ns; } catch { return []; }
}

export async function analyzeDomain(hostname) {
  const findings = [];
  let riskScore = 0;
  const parts = hostname.split('.');
  const tld = parts[parts.length - 1]?.toLowerCase() || '';
  const registrableDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;

  if (SUSPICIOUS_TLDS.includes(tld)) { findings.push({ severity: 'medium', category: 'tld', title: 'Suspicious Top-Level Domain', description: `Domain uses .${tld} TLD, which has a higher proportion of abusive registrations.` }); riskScore += 15; }
  if (FREE_DOMAINS.includes(tld)) { findings.push({ severity: 'high', category: 'tld', title: 'Free Domain TLD', description: `Domain uses .${tld} — a TLD commonly used for free domains and associated with high abuse rates.` }); riskScore += 20; }
  if (parts.length > 3) { findings.push({ severity: 'medium', category: 'subdomains', title: 'Excessive Subdomains', description: `Domain has ${parts.length - 2} subdomain levels (${parts.slice(0,-2).join('.')}), often used to disguise malicious destinations.` }); riskScore += 10; }

  let ip = null;
  try {
    ip = await resolveIp(hostname);
    if (!ip) { findings.push({ severity: 'high', category: 'dns', title: 'DNS Resolution Failed', description: 'Domain could not be resolved to an IP address.' }); riskScore += 30; }
  } catch { findings.push({ severity: 'high', category: 'dns', title: 'DNS Resolution Error', description: 'An error occurred while resolving the domain.' }); riskScore += 20; }

  let mxRecords = [], nameservers = [];
  try { [mxRecords, nameservers] = await Promise.all([resolveMxRecords(hostname), resolveNameservers(hostname)]); } catch {}
  if (mxRecords.length === 0 && parts.length >= 2) { findings.push({ severity: 'low', category: 'dns', title: 'No Mail Exchanger Records', description: 'Domain has no MX records — uncommon for legitimate business domains but fine for personal sites.' }); riskScore += 5; }

  return { registrableDomain, tld, ip, mxRecords, nameservers, subdomainCount: Math.max(0, parts.length - 2), findings, riskScore: Math.min(100, riskScore) };
}
