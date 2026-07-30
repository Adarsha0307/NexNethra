import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';

function DashboardPage() {
  const navigate = useNavigate();
  const [threats, setThreats] = useState([]);
  const [scoreSummary, setScoreSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [threatsRes, scoreRes, activityRes] = await Promise.all([
          apiGet('/api/threats'),
          apiGet('/api/score/summary'),
          apiGet('/api/dashboard/activity'),
        ]);
        setThreats(threatsRes);
        setScoreSummary(scoreRes);
        setActivities(activityRes);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleQuickScan() {
    setScanResult({ scanning: true });
    try {
      const data = await apiPost('/api/dashboard/scan');
      setScanResult(data);
    } catch (err) {
      setScanResult({ error: err.message });
    }
  }

  if (loading) {
    return <div className="page-stack"><p style={{ color: '#999' }}>Loading dashboard...</p></div>;
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Welcome back</h1>
          <p className="page-copy">This is your real-time security operations dashboard.</p>
        </div>
      </header>

      <section className="panel-grid dashboard-grid">
        <article className="panel-card">
          <div className="panel-title-row">
            <h2>Active Threats</h2>
            <span className="pill">{threats.length}</span>
          </div>
          {threats.length === 0 && <p className="page-copy">No threats detected at this time.</p>}
          <div className="threat-list">
            {threats.slice(0, 5).map((t) => (
              <div key={t.id} className="threat-item">
                <div className="threat-item-body">
                  <span className="threat-item-title">{t.title}</span>
                  <span className="threat-item-source">{t.source}</span>
                </div>
                <span className={`severity-badge ${(t.severity || '').toLowerCase()}`}>{t.severity}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-title-row">
            <h2>Recent Activity</h2>
            <span className="pill">{activities.length}</span>
          </div>
          {activities.length === 0 && <p className="page-copy">No recent activity.</p>}
          {activities.length > 0 && (
            <ul className="feed-list">
              {activities.slice(0, 5).map((act) => (
                <li key={act.id} className="feed-item">
                  <div className="feed-title">{act.title}</div>
                  <div className="feed-body">{act.description}</div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-title-row">
            <h2>Quick Actions</h2>
          </div>
          <div className="action-list">
            <button className="action-btn" onClick={() => navigate('/analyzer')}>
              ➜ Run URL & Phishing Review
            </button>
            <button className="action-btn" onClick={() => navigate('/incidents')}>
              ➜ Report New Incident
            </button>
            <button className="action-btn" onClick={() => navigate('/assistant')}>
              ➜ Consult Nexnetra AI Assistant
            </button>
          </div>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-title-row">
          <h2>Security Score Summary</h2>
          <span className="pill">Live</span>
        </div>
        {scoreSummary && (
          <div className="analysis-result">
            <p><strong>Calculated Score:</strong> {scoreSummary.score}/100 — <strong style={{ color: scoreSummary.score >= 80 ? '#4fd1c5' : scoreSummary.score >= 50 ? '#ffb020' : '#ff4d4d' }}>{scoreSummary.label}</strong></p>
            <p className="summary-desc">{scoreSummary.summary}</p>
            <div className="breakdown-grid">
              <div className="breakdown-pill"><span className="breakdown-value">{scoreSummary.breakdown.alerts}</span>Alerts Active</div>
              <div className="breakdown-pill"><span className="breakdown-value">{scoreSummary.breakdown.incidents}</span>Open Incidents</div>
              <div className="breakdown-pill"><span className="breakdown-value">{scoreSummary.breakdown.analyzers}</span>System Analyzers</div>
              <div className="breakdown-pill"><span className="breakdown-value">{scoreSummary.breakdown.recommendations}</span>Recommendations</div>
            </div>
          </div>
        )}
        <button className="primary-btn" style={{ marginTop: '1rem' }} onClick={handleQuickScan}>
          {scanResult?.scanning ? 'Scanning...' : 'Run Quick Scan'}
        </button>
        {scanResult && !scanResult.scanning && (
          <div className="analysis-result fade-in" style={{ marginTop: '0.75rem' }}>
            {scanResult.error ? <p style={{ color: '#ff6b6b' }}>{scanResult.error}</p> : (
              <><p>{scanResult.message}</p><p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>{scanResult.findings || 0} findings &middot; Score: {scanResult.score}/100</p></>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

export default DashboardPage;
