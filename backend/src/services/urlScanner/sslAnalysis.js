import tls from 'tls';

export function checkSslCertificate(hostname, port = 443, timeout = 8000) {
  return new Promise((resolve) => {
    const findings = [];
    let riskScore = 0;
    if (!hostname) { findings.push({ severity: 'high', category: 'ssl', title: 'No Hostname Available', description: 'Cannot check SSL — no hostname was resolved from the URL.' }); return resolve({ valid: false, findings, riskScore: 20, summary: 'No hostname' }); }

    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout });
    let settled = false;
    const finish = (result) => { if (settled) return; settled = true; socket.destroy(); resolve(result); };

    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      const protocol = socket.getProtocol();
      if (cert && Object.keys(cert).length > 0) {
        const now = new Date();
        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        if (validTo < now) { findings.push({ severity: 'critical', category: 'ssl', title: 'SSL Certificate Expired', description: `Certificate expired on ${validTo.toISOString().split('T')[0]}.` }); riskScore += 40; }
        if (validFrom > now) { findings.push({ severity: 'high', category: 'ssl', title: 'SSL Certificate Not Yet Valid', description: `Certificate becomes valid on ${validFrom.toISOString().split('T')[0]}.` }); riskScore += 30; }
        const remainingDays = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
        if (remainingDays >= 0 && remainingDays < 30) { findings.push({ severity: 'medium', category: 'ssl', title: 'SSL Certificate Expiring Soon', description: `Certificate expires in ${remainingDays} days (${validTo.toISOString().split('T')[0]}).` }); riskScore += 15; }
        if (cert.subject?.CN && cert.subject.CN !== hostname && !cert.subjectAltName?.includes(hostname)) { findings.push({ severity: 'critical', category: 'ssl', title: 'SSL Certificate Hostname Mismatch', description: `Certificate issued to ${cert.subject.CN} but URL hostname is ${hostname}.` }); riskScore += 50; }
        if (!authorized) { findings.push({ severity: 'high', category: 'ssl', title: 'SSL Certificate Not Trusted', description: `Certificate chain validation failed: ${socket.authorizationError || 'Unknown'}` }); riskScore += 35; }
        if (cert.issuer?.O) findings.push({ severity: 'info', category: 'ssl', title: 'Certificate Issuer', description: `Issued by: ${cert.issuer.O}` });
        if ((cert.bits || 0) > 0 && cert.bits < 2048) { findings.push({ severity: 'medium', category: 'ssl', title: 'Weak Encryption Key', description: `Certificate uses only ${cert.bits}-bit key (minimum 2048-bit recommended).` }); riskScore += 20; }
        if (protocol) {
          if (protocol.includes('SSLv2') || protocol.includes('SSLv3') || protocol.includes('TLSv1.0') || protocol.includes('TLSv1.1')) { findings.push({ severity: 'high', category: 'ssl', title: 'Outdated TLS Protocol', description: `Server uses ${protocol}, which has known vulnerabilities.` }); riskScore += 30; }
          else findings.push({ severity: 'info', category: 'ssl', title: 'TLS Protocol', description: `Server uses ${protocol} — modern and secure.` });
        }
        return finish({ valid: authorized, protocol, issuer: cert.issuer?.O || 'Unknown', subject: cert.subject?.CN || 'Unknown', validFrom: cert.valid_from, validTo: cert.valid_to, remainingDays: remainingDays >= 0 ? remainingDays : 0, expired: validTo < now, findings, riskScore: Math.min(100, riskScore), summary: findings.length === 0 ? 'SSL certificate is valid and properly configured' : `${findings.length} SSL issue${findings.length > 1 ? 's' : ''} found` });
      }
      findings.push({ severity: 'medium', category: 'ssl', title: 'No Certificate Details', description: 'Connected but could not retrieve certificate details.' });
      finish({ valid: false, protocol, findings, riskScore: Math.min(100, riskScore + 20), summary: 'Certificate details unavailable' });
    });

    socket.once('error', (err) => { findings.push({ severity: 'high', category: 'ssl', title: 'SSL Connection Failed', description: `Could not establish TLS connection: ${err.message}` }); finish({ valid: false, findings, riskScore: Math.min(100, riskScore + 50), summary: 'SSL connection failed', error: err.message }); });
    socket.once('timeout', () => { findings.push({ severity: 'medium', category: 'ssl', title: 'SSL Connection Timed Out', description: `TLS handshake timed out after ${timeout}ms.` }); finish({ valid: false, findings, riskScore: Math.min(100, riskScore + 20), summary: 'SSL connection timed out' }); });
  });
}
