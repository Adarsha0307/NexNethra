import { useState } from 'react';
import { getApiUrl } from '../api';

function AnalyzerPage() {
  const [url, setUrl] = useState('');
  const [emailText, setEmailText] = useState('');
  const [password, setPassword] = useState('');

  const [urlResult, setUrlResult] = useState(null);
  const [emailResult, setEmailResult] = useState(null);
  const [passwordResult, setPasswordResult] = useState(null);

  const [urlLoading, setUrlLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showTech, setShowTech] = useState(false);

  async function analyzeUrlInput() {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlResult(null);
    setShowTech(false);
    try {
      const response = await fetch(getApiUrl('/api/analyze/url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      setUrlResult(data);
    } catch (err) {
      console.error('URL analysis error:', err);
      setUrlResult({ error: true, riskScore: 0, label: 'Error', findings: [{ severity: 'high', title: 'Connection Error', description: 'Connection to security server failed.' }] });
    } finally {
      setUrlLoading(false);
    }
  }

  async function analyzeEmailInput() {
    if (!emailText.trim()) return;
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const response = await fetch(getApiUrl('/api/analyze/email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emailText })
      });
      const data = await response.json();
      setEmailResult(data);
    } catch (err) {
      console.error('Email analysis error:', err);
      setEmailResult({ score: 0, label: 'Error', issues: ['Connection to security server failed.'], recommendations: [] });
    } finally {
      setEmailLoading(false);
    }
  }

  async function analyzePasswordInput() {
    if (!password.trim()) return;
    setPasswordLoading(true);
    setPasswordResult(null);
    try {
      const response = await fetch(getApiUrl('/api/analyze/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      setPasswordResult(data);
    } catch (err) {
      console.error('Password analysis error:', err);
      setPasswordResult({ score: 0, label: 'Error', issues: ['Connection to security server failed.'], recommendations: [] });
    } finally {
      setPasswordLoading(false);
    }
  }

  function getScoreColor(score) {
    if (score >= 80) return '#e53e3e';
    if (score >= 60) return '#ff6b6b';
    if (score >= 40) return '#ffb020';
    if (score >= 20) return '#68d391';
    return '#4fd1c5';
  }

  function getSeverityIcon(severity) {
    switch (severity) {
      case 'critical': return '\u{26A0}\u{FE0F}';
      case 'high': return '\u{2757}';
      case 'medium': return '\u{26A0}';
      case 'low': return '\u{2139}\u{FE0F}';
      case 'info': return '\u{2139}\u{FE0F}';
      default: return '\u{2022}';
    }
  }

  function renderUrlResult() {
    if (!urlResult) return null;
    if (urlResult.error) {
      return (
        <div className="analysis-result fade-in" style={{ borderLeft: '4px solid #ff6b6b', marginTop: '1rem', padding: '1rem' }}>
          <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{urlResult.ssrfWarning ? 'SSRF Risk Blocked' : 'Scan Error'}</p>
          <p>{urlResult.error || urlResult.message}</p>
          {urlResult.ssrfWarning && <p className="ssrf-warning">The URL targets an internal/private IP and was blocked for security.</p>}
        </div>
      );
    }

    const score = urlResult.riskScore || urlResult.score || 0;
    const confidence = urlResult.confidence;
    const label = urlResult.label || 'Unknown';
    const color = urlResult.color || getScoreColor(score);
    const findings = urlResult.findings || [];
    const signals = urlResult.signals || [];
    const tech = urlResult.technical || {};

    return (
      <div className="analysis-result fade-in" style={{ marginTop: '1rem' }}>
        <div className="score-display-box">
          <div className="score-display-number" style={{ color }}>{score}/100</div>
          <div className="score-display-label" style={{ color }}>{label}</div>
          {confidence !== undefined && (
            <div className="score-display-meta">
              Confidence: {confidence}%
              {urlResult.hardOverrideApplied && <span style={{ color: '#ff6b6b', marginLeft: '0.5rem' }}>— Override: Threat Intel Confirmed</span>}
            </div>
          )}
          <div className="score-display-url">{urlResult.url}</div>
        </div>

        {signals.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p className="signal-heading">Signal Breakdown</p>
            {signals.map((s, i) => (
              <div key={i} style={{ marginBottom: '0.35rem' }}>
                <div className="signal-row">
                  <span>{s.name}</span>
                  <span style={{ color: getScoreColor(s.rawScore) }}>{s.rawScore}/100</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: s.rawScore + '%', background: getScoreColor(s.rawScore), borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
            <div className="signal-footer">Weighted aggregation of {signals.length} independent checks</div>
          </div>
        )}

        {findings.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Findings ({findings.length})</p>
            {findings.map((f, i) => (
              <div key={i} className="finding-item" style={{ padding: '0.5rem 0.75rem', marginBottom: '0.35rem', borderRadius: '6px', borderLeft: '3px solid ' + (f.severity === 'critical' ? '#e53e3e' : f.severity === 'high' ? '#ff6b6b' : f.severity === 'medium' ? '#ffb020' : '#68d391'), background: 'rgba(255,255,255,0.02)' }}>
                <div className="finding-title">
                  {getSeverityIcon(f.severity)} {f.title}
                  <span className="finding-severity">{f.severity}</span>
                  {f.source && <span className="finding-source">({f.source.replace(/_/g, ' ')})</span>}
                </div>
                <div className="finding-desc">{f.description}</div>
                {f.brand && <div className="finding-brand">Impersonated brand: {f.brand}</div>}
              </div>
            ))}
          </div>
        )}

        {tech.hostname && (
          <div style={{ marginTop: '1rem' }}>
            <button onClick={() => setShowTech(!showTech)} className="secondary-btn" style={{ width: '100%' }}>
              {showTech ? 'Hide' : 'Show'} Technical Details
            </button>
            {showTech && (
              <div className="tech-details-box">
                {tech.hostname && <div className="tech-row"><span className="tech-label">Hostname</span><span className="tech-value">{tech.hostname}</span></div>}
                {tech.protocol && <div className="tech-row"><span className="tech-label">Protocol</span><span>{tech.protocol}</span></div>}
                {tech.ip && <div className="tech-row"><span className="tech-label">IP Address</span><span>{tech.ip}</span></div>}
                {tech.registeredDomain && <div className="tech-row"><span className="tech-label">Registered Domain</span><span>{tech.registeredDomain}</span></div>}
                {tech.tld && <div className="tech-row"><span className="tech-label">TLD</span><span>{tech.tld}</span></div>}
                {tech.sslIssuer && <div className="tech-row"><span className="tech-label">SSL Issuer</span><span>{tech.sslIssuer}</span></div>}
                {tech.sslProtocol && <div className="tech-row"><span className="tech-label">TLS Protocol</span><span>{tech.sslProtocol}</span></div>}
                {tech.sslExpiresDays !== undefined && <div className="tech-row"><span className="tech-label">SSL Expires In</span><span>{tech.sslExpiresDays} days</span></div>}
                {tech.redirectCount !== undefined && <div className="tech-row"><span className="tech-label">Redirects</span><span>{tech.redirectCount}</span></div>}
                {tech.finalUrl && tech.finalUrl !== urlResult.url && <div className="tech-row"><span className="tech-label">Final URL</span><span className="tech-value">{tech.finalUrl}</span></div>}
                {tech.homographRisk && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', border: '1px solid #ffb020', borderRadius: '6px', background: 'rgba(255,176,32,0.1)' }}>
                    <strong>Homograph Attack Detected</strong>
                    <div>{tech.homographRisk.description}</div>
                    <div className="tech-warning">Characters: {tech.homographRisk.characters?.join(', ')}, Risk: {tech.homographRisk.risk}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function getScoreColorOld(score) {
    if (score >= 80) return '#4fd1c5';
    if (score >= 50) return '#ffb020';
    return '#ff4d4d';
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analysis tools</p>
          <h1>Review URLs, email content, and passwords</h1>
          <p className="page-copy">Each analyzer provides dynamic risk ratings, detailed threat observations, and mitigation steps.</p>
        </div>
      </header>

      <section className="panel-grid">
        <article className="panel-card">
          <h2>URL Reputation Scan</h2>
          <p className="page-copy">Multi-layer scanner: threat intelligence, DNS, SSL, redirects, brand impersonation, and heuristics with weighted scoring.</p>
          <textarea
            className="input-area"
            placeholder="https://suspicious-login-portal.net"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button
            className={`primary-btn ${urlLoading ? 'btn-loading' : ''}`}
            onClick={analyzeUrlInput}
            disabled={urlLoading}
          >
            {urlLoading ? 'Scanning URL...' : 'Scan URL'}
          </button>
          {renderUrlResult()}
        </article>

        <article className="panel-card">
          <h2>Phishing Email Review</h2>
          <p className="page-copy">Check whether message content looks like phishing and get advisory warnings.</p>
          <textarea className="input-area" placeholder="Paste suspicious email text, headers, or links here..." value={emailText} onChange={(e) => setEmailText(e.target.value)} />
          <button className={`primary-btn ${emailLoading ? 'btn-loading' : ''}`} onClick={analyzeEmailInput} disabled={emailLoading}>
            {emailLoading ? 'Analyzing Email...' : 'Analyze Email'}
          </button>
          {emailResult && (
            <div className="analysis-result fade-in">
              <p><strong>Risk Score:</strong> <span className="result-score" style={{ color: getScoreColorOld(emailResult.score) }}>{emailResult.score}/100</span> — <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{emailResult.label}</span></p>
              <div className="analysis-section"><span className="section-title">Findings:</span><ul>{emailResult.issues.map((issue, idx) => <li key={idx} className="finding-item">{issue}</li>)}</ul></div>
              {emailResult.recommendations?.length > 0 && <div className="analysis-section"><span className="section-title">Recommendations:</span><ul>{emailResult.recommendations.map((rec, idx) => <li key={idx} className="rec-item">{rec}</li>)}</ul></div>}
            </div>
          )}
        </article>
      </section>

      <section className="panel-card">
        <h2>Password Strength Auditor</h2>
        <p className="page-copy">Estimate how resilient a credential is against dictionary attacks and brute-forcing.</p>
        <input type="password" className="input-area" style={{ minHeight: 'auto', padding: '0.85rem' }} placeholder="Type or paste password to review..." value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className={`primary-btn ${passwordLoading ? 'btn-loading' : ''}`} onClick={analyzePasswordInput} disabled={passwordLoading} style={{ marginTop: '0.5rem' }}>
          {passwordLoading ? 'Auditing Password...' : 'Audit Password Strength'}
        </button>
        {passwordResult && (
          <div className="analysis-result fade-in">
            <p><strong>Complexity Score:</strong> <span className="result-score" style={{ color: getScoreColorOld(passwordResult.score) }}>{passwordResult.score}/100</span> — <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{passwordResult.label}</span></p>
            <div className="analysis-section"><span className="section-title">Findings:</span><ul>{passwordResult.issues.map((issue, idx) => <li key={idx} className="finding-item">{issue}</li>)}</ul></div>
            {passwordResult.recommendations?.length > 0 && <div className="analysis-section"><span className="section-title">Recommendations:</span><ul>{passwordResult.recommendations.map((rec, idx) => <li key={idx} className="rec-item">{rec}</li>)}</ul></div>}
          </div>
        )}
      </section>
    </section>
  );
}

export default AnalyzerPage;
