import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/client';

function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', description: '', severity: 'Medium', reporter: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet('/api/incidents').then(data => {
      setIncidents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const data = await apiPost('/api/incidents', form);
      setIncidents(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ title: '', category: '', description: '', severity: 'Medium', reporter: '' });
    } catch (err) {
      setMessage(err.message);
    }
  }

  const severityColor = { Critical: '#e53e3e', High: '#ff6b6b', Medium: '#ffb020', Low: '#68d391' };

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Security incidents</p>
          <h1>Incident Tracker</h1>
          <p className="page-copy">Log and review security events across your environment.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Report Incident'}</button>
      </header>

      {showForm && (
        <form className="panel-card" onSubmit={handleSubmit}>
          <h2>Report New Incident</h2>
          {message && <p className="error-text">{message}</p>}
          <div className="form-group">
            <label>Title</label>
            <input className="input-area" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select className="input-area" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
              <option value="">Select...</option>
              <option>Phishing</option>
              <option>Malware</option>
              <option>Network</option>
              <option>Authentication</option>
              <option>Data Leak</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select className="input-area" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
              {['Low', 'Medium', 'High', 'Critical'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input-area" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} required />
          </div>
          <div className="form-group">
            <label>Reporter</label>
            <input className="input-area" value={form.reporter} onChange={e => setForm(p => ({ ...p, reporter: e.target.value }))} required />
          </div>
          <button type="submit" className="primary-btn">Submit</button>
        </form>
      )}

      {loading ? <p style={{ color: '#999' }}>Loading incidents...</p> : (
        <div className="incident-list">
          {incidents.length === 0 && <p className="page-copy">No incidents reported yet.</p>}
          {incidents.map(inc => (
            <div key={inc.id} className="panel-card incident-item">
              <div className="panel-title-row">
                <h2>{inc.title}</h2>
                <span className="pill" style={{ background: severityColor[inc.severity] || '#666', color: '#fff' }}>{inc.severity}</span>
              </div>
              <p className="page-copy">{inc.description}</p>
              <div className="incident-meta">
                <span>Category: {inc.category}</span>
                <span>Reporter: {inc.reporter}</span>
                <span>Status: {inc.status}</span>
                <span>{new Date(inc.created_at || inc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default IncidentsPage;
