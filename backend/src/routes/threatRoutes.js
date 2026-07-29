import express from 'express';

const router = express.Router();

const threatTemplates = [
  { severity: 'Critical', sources: ['CISA Advisory', 'MITRE ATT&CK', 'Mandiant'], title: 'Ransomware variant {variant} targeting {target}', desc: 'Active exploitation of {vuln} in {target}. Patch immediately to prevent {impact}.' },
  { severity: 'High', sources: ['Open Threat Intel', 'Recorded Future', 'CrowdStrike'], title: 'Phishing campaign using {technique} against {target}', desc: 'Attackers impersonating {impersonation} via {vector} to harvest credentials from {target} employees.' },
  { severity: 'Medium', sources: ['Threat Feed', 'AlienVault OTX', 'VirusTotal'], title: '{actor} group probing {target} infrastructure', desc: 'Reconnaissance activity detected against {target}. Unusual scan patterns from {ip_range}.' },
  { severity: 'High', sources: ['NCSC Advisory', 'CISA Alert', 'Microsoft DART'], title: 'Supply chain attack via {vector} affecting {target}', desc: 'Compromised {comp_asset} used to distribute {malware} to {target} downstream partners.' },
  { severity: 'Critical', sources: ['Google TAG', 'Mandiant', 'Palo Alto Unit 42'], title: 'Zero-day exploitation of {vuln} in {software}', desc: 'In-the-wild exploitation of {vuln}. {actor} groups actively targeting {target} before patch availability.' },
  { severity: 'Low', sources: ['Community Intel', 'Shodan', 'GreyNoise'], title: 'Mass scanning for {vuln} in {target}', desc: 'Automated scanners probing for {vuln}. No active exploitation confirmed yet, but attack surface exposed.' },
  { severity: 'Medium', sources: ['Proofpoint', 'Cofense', 'Abuse.ch'], title: 'Malspam campaign delivering {malware}', desc: 'Emails spoofing {impersonation} delivering {malware} via {vector}. Campaign volume: {volume} messages.' },
  { severity: 'High', sources: ['Dragos', 'Mandiant', 'SANS ISC'], title: 'Industrial control system threat against {target}', desc: 'ICS-specific {malware} detected in {target} environment. Potential for {impact} on operational technology.' }
];

const variants = ['LockBit 3.0', 'BlackCat', 'Clop', 'Akira', 'BianLian', 'Play', 'Rhysida'];
const targets = ['healthcare', 'finance', 'energy sector', 'government agencies', 'education', 'technology firms', 'retail', 'critical infrastructure'];
const vulns = ['CVE-2024-1709', 'CVE-2024-27198', 'Log4Shell', 'ProxyNotShell', 'CitrixBleed', 'SonicWall SMA', 'MOVEit Transfer'];
const impacts = ['data encryption', 'lateral movement', 'data exfiltration', 'ransom deployment', 'backdoor installation'];
const techniques = ['QR code phishing', 'AI-generated deepfake audio', 'consent phishing OAuth', 'SMS smishing', 'vishing'];
const impersonations = ['Microsoft 365', 'DocuSign', 'IT support', 'HR portal', 'FedEx/DHL', 'internal accounting'];
const vectors = ['malicious attachment', 'embedded link', 'reply-chain hijack', 'cloud collaboration link', 'QR code'];
const actors = ['TA444', 'APT29 (Cozy Bear)', 'UNC3944', 'Lazarus Group', 'Wizard Spider', 'Scattered Spider', 'APT41'];
const ipRanges = ['Russian ASNs', 'Chinese VPS hosts', 'Tor exit nodes', 'residential proxy networks'];
const compAssets = ['software update server', 'code signing certificate', 'CI/CD pipeline', 'vendor portal'];
const malwares = ['Danabot', 'IcedID', 'QakBot', 'DarkGate', 'Latrodectus', 'Emotet', 'FormBook'];
const volumes = ['12,500', '8,700', '25,000+', '3,200', '50,000'];
const softwares = ['Palo Alto PAN-OS', 'Ivanti VPN', 'Cisco ASA', 'Fortinet FortiOS', 'Microsoft Exchange'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

router.get('/', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const count = 4 + Math.floor(Math.random() * 4);
  const generated = [];

  for (let i = 0; i < count; i++) {
    const template = threatTemplates[Math.floor(Math.random() * threatTemplates.length)];
    const severity = template.severity;
    const title = template.title
      .replace('{variant}', pick(variants))
      .replace('{target}', pick(targets))
      .replace('{technique}', pick(techniques))
      .replace('{actor}', pick(actors));
    const source = pick(template.sources);
    const description = template.desc
      .replace('{vuln}', pick(vulns))
      .replace('{target}', pick(targets))
      .replace('{impact}', pick(impacts))
      .replace('{impersonation}', pick(impersonations))
      .replace('{vector}', pick(vectors))
      .replace('{ip_range}', pick(ipRanges))
      .replace('{comp_asset}', pick(compAssets))
      .replace('{malware}', pick(malwares))
      .replace('{volume}', pick(volumes))
      .replace('{actor}', pick(actors))
      .replace('{software}', pick(softwares));

    const alert = { id: `${Date.now()}-${i}`, title, severity, source, description };

    if (!query || [alert.title, alert.description, alert.source, alert.severity].join(' ').toLowerCase().includes(query)) {
      generated.push(alert);
    }
  }

  return res.json(generated);
});

export default router;