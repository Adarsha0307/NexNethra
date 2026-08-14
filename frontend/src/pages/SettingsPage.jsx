import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { getApiUrl } from '../api';

function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState({});

  function handleLogout() {
    fetch(getApiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    navigate('/dashboard');
    window.location.reload();
  }

  const setLoadingState = useCallback((key, val) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const showMessage = useCallback((msg) => { setMessage(msg); setError(''); }, []);
  const showError = useCallback((msg) => { setError(msg); setMessage(''); }, []);

  const fetcher = useCallback(async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body;
    if (method === 'GET') return apiGet(url);
    if (method === 'PUT') return apiPut(url, body ? JSON.parse(body) : undefined);
    if (method === 'POST') return apiPost(url, body ? JSON.parse(body) : undefined);
    if (method === 'DELETE') return apiDelete(url, body ? JSON.parse(body) : undefined);
  }, []);

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'api-keys', label: 'API Keys' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'quiet-hours', label: 'Quiet Hours' },
    { id: 'team', label: 'Team' },
    { id: 'ip-blocklist', label: 'IP Blocklist' },
    { id: 'auto-remediation', label: 'Auto-Remediation' },
    { id: 'incident-auto-close', label: 'Auto-Close' },
    { id: 'oauth', label: 'OAuth Providers' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'health', label: 'Health Checks' },
    { id: 'export', label: 'Export' },
    { id: 'danger', label: 'Account Deletion' },
    { id: 'logout', label: 'Logout' },
  ];

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
          <p className="page-copy">Manage your security platform configuration.</p>
        </div>
      </header>

      {message && <div className="alert-success">{message}</div>}
      {error && <div className="alert-error">{error}</div>}

      <div className="settings-layout">
        <nav className="settings-nav">
          {sections.map(s => (
            <button key={s.id} className={`sidebar-link ${activeSection === s.id ? 'active' : ''}`} style={s.id === 'logout' ? { color: '#ff6b6b' } : undefined} onClick={() => s.id === 'logout' ? handleLogout() : setActiveSection(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {activeSection === 'profile' && <ProfileSection fetcher={fetcher} showMessage={showMessage} showError={showError} setLoading={setLoadingState} loading={loading} />}
          {activeSection === 'security' && <SecuritySection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'api-keys' && <ApiKeysSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'notifications' && <NotificationsSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'quiet-hours' && <QuietHoursSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'team' && <TeamSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'ip-blocklist' && <IpBlocklistSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'auto-remediation' && <AutoRemediationSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'incident-auto-close' && <AutoCloseSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'oauth' && <OAuthSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'shortcuts' && <ShortcutsSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'health' && <HealthSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
          {activeSection === 'export' && <ExportSection fetcher={fetcher} />}
          {activeSection === 'danger' && <DangerSection fetcher={fetcher} showMessage={showMessage} showError={showError} />}
        </div>
      </div>
    </section>
  );
}

function ProfileSection({ fetcher, showMessage, showError }) {
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  useEffect(() => { fetcher('/api/settings/profile').then(d => { setProfile(d); setFirstName(d.firstName || ''); setLastName(d.lastName || ''); }).catch(showError); }, []);

  async function handleSave() {
    try { await fetcher('/api/settings/profile', { method: 'PATCH', body: JSON.stringify({ firstName, lastName }) }); showMessage('Profile updated.'); } catch (err) { showError(err.message); }
  }

  if (!profile) return <div className="panel-card" style={{ padding: '1.75rem' }}><p>Loading...</p></div>;

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Profile</h2>
      <p className="page-copy">Update your personal information.</p>
      <div className="form-group"><label>Email</label><input className="input-area" value={profile.email} disabled /></div>
      <div className="form-group"><label>First Name</label><input className="input-area" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
      <div className="form-group"><label>Last Name</label><input className="input-area" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
      <button className="primary-btn" onClick={handleSave}>Save</button>
    </div>
  );
}

function SecuritySection({ fetcher, showMessage, showError }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaStatus, setMfaStatus] = useState(null);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStep, setMfaStep] = useState('idle');

  async function handleChangePassword() {
    if (password !== confirmPassword) return showError('Passwords do not match.');
    try { await fetcher('/api/settings/security/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword: password }) }); showMessage('Password changed.'); setCurrentPassword(''); setPassword(''); setConfirmPassword(''); } catch (err) { showError(err.message); }
  }

  async function handleSetupMfa() {
    try { const d = await fetcher('/api/settings/security/mfa/setup', { method: 'POST' }); setMfaSecret(d.secret); setMfaQr(d.qrCodeDataUrl); setMfaStep('confirm'); } catch (err) { showError(err.message); }
  }

  async function handleConfirmMfa() {
    try { await fetcher('/api/settings/security/mfa/confirm', { method: 'POST', body: JSON.stringify({ secret: mfaSecret, code: mfaCode }) }); showMessage('MFA enabled.'); setMfaStep('idle'); setMfaStatus({ mfaEnabled: true }); } catch (err) { showError(err.message); }
  }

  async function handleDisableMfa() {
    try { await fetcher('/api/settings/security/mfa/disable', { method: 'POST' }); showMessage('MFA disabled.'); setMfaStatus({ mfaEnabled: false }); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Security</h2>
      <div style={{ marginBottom: '2rem' }}>
        <h3>Change Password</h3>
        <div className="form-group"><label>Current Password</label><input type="password" className="input-area" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
        <div className="form-group"><label>New Password</label><input type="password" className="input-area" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div className="form-group"><label>Confirm</label><input type="password" className="input-area" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
        <button className="primary-btn" onClick={handleChangePassword}>Update Password</button>
      </div>
      <div>
        <h3>Multi-Factor Authentication</h3>
        <p className="page-copy">Status: {mfaStatus?.mfaEnabled ? 'Enabled' : 'Disabled'}</p>
        {mfaStep === 'idle' && !mfaStatus?.mfaEnabled && <button className="primary-btn" onClick={handleSetupMfa}>Enable MFA</button>}
        {mfaStatus?.mfaEnabled && <button className="secondary-btn" onClick={handleDisableMfa}>Disable MFA</button>}
        {mfaStep === 'confirm' && (
          <div style={{ marginTop: '1rem' }}>
            {mfaQr && <div style={{ marginBottom: '1rem' }}><p>Scan with your authenticator app:</p><img src={mfaQr} alt="MFA QR Code" style={{ maxWidth: 200 }} /></div>}
            <p style={{ fontSize: '0.8rem', color: '#999', wordBreak: 'break-all' }}>Secret: {mfaSecret}</p>
            <div className="form-group"><label>Enter code from app</label><input className="input-area" value={mfaCode} onChange={e => setMfaCode(e.target.value)} /></div>
            <button className="primary-btn" onClick={handleConfirmMfa}>Verify & Enable</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeysSection({ fetcher, showMessage, showError }) {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  useEffect(() => { fetcher('/api/settings/api-keys').then(setKeys).catch(() => {}); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const d = await fetcher('/api/settings/api-keys', { method: 'POST', body: JSON.stringify({ name }) });
      setKeys(prev => [...prev, d]);
      showMessage(`Key created: ${d.fullKey || d.key} — copy it now, it won\'t be shown again.`);
      setName('');
    } catch (err) { showError(err.message); }
  }

  async function handleRevoke(id) {
    try { await fetcher(`/api/settings/api-keys/${id}/revoke`, { method: 'POST' }); setKeys(prev => prev.filter(k => k.id !== id)); showMessage('Key revoked.'); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>API Keys</h2>
      <p className="page-copy">Manage API access tokens.</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input className="input-area" placeholder="Key name" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
        <button className="primary-btn" onClick={handleCreate}>Generate</button>
      </div>
      {keys.map(k => (
        <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div><strong>{k.name}</strong><br /><span style={{ fontSize: '0.8rem', color: '#999' }}>{k.keyPrefix || k.key_prefix || k.id} — {k.lastUsedAt ? `Last used: ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}</span></div>
          <button className="secondary-btn" style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={() => handleRevoke(k.id)}>Revoke</button>
        </div>
      ))}
    </div>
  );
}

function NotificationsSection({ fetcher, showMessage, showError }) {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => { fetcher('/api/settings/notifications').then(setPrefs).catch(() => {}); }, []);

  async function toggle(key) {
    const updated = { ...prefs, [key]: !prefs[key] };
    try { await fetcher('/api/settings/notifications', { method: 'PUT', body: JSON.stringify(updated) }); setPrefs(updated); showMessage('Updated.'); } catch (err) { showError(err.message); }
  }

  if (!prefs) return <div className="panel-card" style={{ padding: '1.75rem' }}><p>Loading...</p></div>;
  const labels = { emailCritical: 'Email — Critical', emailHigh: 'Email — High', emailMedium: 'Email — Medium', emailLow: 'Email — Low', inappCritical: 'In-App — Critical', inappHigh: 'In-App — High', inappMedium: 'In-App — Medium', inappLow: 'In-App — Low' };

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Notification Preferences</h2>
      <p className="page-copy">Control which alerts you receive.</p>
      {Object.entries(labels).map(([key, label]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <span>{label}</span>
          <label className="toggle" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
            <input type="checkbox" checked={prefs[key]} onChange={() => toggle(key)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: prefs[key] ? '#2b7fff' : '#444', borderRadius: 24, transition: '0.2s' }}>
              <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#fff', top: 2, transition: '0.2s', left: prefs[key] ? 22 : 2 }} />
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

function QuietHoursSection({ fetcher, showMessage, showError }) {
  const [config, setConfig] = useState(null);
  useEffect(() => { fetcher('/api/settings/quiet-hours').then(setConfig).catch(() => {}); }, []);

  async function handleSave() {
    try { await fetcher('/api/settings/quiet-hours', { method: 'PUT', body: JSON.stringify(config) }); showMessage('Quiet hours updated.'); } catch (err) { showError(err.message); }
  }

  if (!config) return <div className="panel-card" style={{ padding: '1.75rem' }}><p>Loading...</p></div>;

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Quiet Hours</h2>
      <p className="page-copy">Suppress non-critical notifications during set hours.</p>
      <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <input type="checkbox" checked={config.enabled} onChange={() => setConfig(p => ({ ...p, enabled: !p.enabled }))} />
        Enabled
      </label>
      <div className="form-group"><label>Start</label><input className="input-area" type="time" value={config.startTime || '22:00'} onChange={e => setConfig(p => ({ ...p, startTime: e.target.value }))} /></div>
      <div className="form-group"><label>End</label><input className="input-area" type="time" value={config.endTime || '07:00'} onChange={e => setConfig(p => ({ ...p, endTime: e.target.value }))} /></div>
      <button className="primary-btn" onClick={handleSave}>Save</button>
    </div>
  );
}

function TeamSection({ fetcher, showMessage, showError }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  useEffect(() => { fetcher('/api/settings/team').then(setMembers).catch(() => {}); }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    try { await fetcher('/api/settings/team/invite', { method: 'POST', body: JSON.stringify({ email, role }) }); setEmail(''); showMessage('Invited.'); const d = await fetcher('/api/settings/team'); setMembers(d); } catch (err) { showError(err.message); }
  }

  async function handleRemove(memberId) {
    try { await fetcher(`/api/settings/team/${memberId}`, { method: 'DELETE' }); setMembers(prev => prev.filter(m => m.id !== memberId)); showMessage('Removed.'); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Team</h2>
      <p className="page-copy">Manage team members and roles.</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input className="input-area" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1 }} />
        <select className="input-area" value={role} onChange={e => setRole(e.target.value)} style={{ width: 'auto' }}><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select>
        <button className="primary-btn" onClick={handleInvite}>Invite</button>
      </div>
      {members.map(m => (
        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div><strong>{m.email || m.userId}</strong><br /><span style={{ fontSize: '0.8rem', color: '#999' }}>{m.role} — {m.joinedAt ? 'Joined' : 'Pending'}</span></div>
          <button className="secondary-btn" style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={() => handleRemove(m.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function IpBlocklistSection({ fetcher, showMessage, showError }) {
  const [entries, setEntries] = useState([]);
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => { fetcher('/api/settings/ip-blocklist').then(setEntries).catch(() => {}); }, []);

  async function handleAdd() {
    if (!ip.trim()) return;
    try { await fetcher('/api/settings/ip-blocklist', { method: 'POST', body: JSON.stringify({ ipAddress: ip, reason }) }); setIp(''); setReason(''); showMessage('IP blocked.'); const d = await fetcher('/api/settings/ip-blocklist'); setEntries(d); } catch (err) { showError(err.message); }
  }

  async function handleRemove(id) {
    try { await fetcher(`/api/settings/ip-blocklist/${id}`, { method: 'DELETE' }); setEntries(prev => prev.filter(e => e.id !== id)); showMessage('Removed.'); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>IP Blocklist</h2>
      <p className="page-copy">Block specific IP addresses from accessing your instance.</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input className="input-area" placeholder="IP address" value={ip} onChange={e => setIp(e.target.value)} style={{ flex: 1 }} />
        <button className="primary-btn" onClick={handleAdd}>Block</button>
      </div>
      <input className="input-area" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} style={{ marginBottom: '1rem' }} />
      {entries.map(e => (
        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div><strong>{e.ipAddress || e.ip_address}</strong>{e.reason ? <span style={{ color: '#999', marginLeft: '0.5rem' }}>— {e.reason}</span> : null}</div>
          <button className="secondary-btn" style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={() => handleRemove(e.id)}>Unblock</button>
        </div>
      ))}
    </div>
  );
}

function AutoRemediationSection({ fetcher, showMessage, showError }) {
  const [config, setConfig] = useState(null);
  useEffect(() => { fetcher('/api/settings/auto-remediation').then(setConfig).catch(() => {}); }, []);

  async function toggle(key) {
    const updated = { ...config, [key]: !config[key] };
    try { await fetcher('/api/settings/auto-remediation', { method: 'PUT', body: JSON.stringify(updated) }); setConfig(updated); showMessage('Updated.'); } catch (err) { showError(err.message); }
  }

  if (!config) return <div className="panel-card" style={{ padding: '1.75rem' }}><p>Loading...</p></div>;

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Auto-Remediation</h2>
      <p className="page-copy">Automatically respond to detected threats.</p>
      {[{ key: 'enabled', label: 'Enable Auto-Remediation' }, { key: 'autoBlockIp', label: 'Auto-Block IP Addresses' }, { key: 'autoKillProcess', label: 'Auto-Kill Suspicious Processes' }, { key: 'requiresApproval', label: 'Require Approval Before Actions' }].map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <span>{label}</span>
          <label className="toggle" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
            <input type="checkbox" checked={config[key]} onChange={() => toggle(key)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: config[key] ? '#2b7fff' : '#444', borderRadius: 24, transition: '0.2s' }}>
              <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#fff', top: 2, transition: '0.2s', left: config[key] ? 22 : 2 }} />
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

function AutoCloseSection({ fetcher, showMessage, showError }) {
  const [config, setConfig] = useState(null);
  useEffect(() => { fetcher('/api/settings/incident-auto-close').then(setConfig).catch(() => {}); }, []);

  async function handleSave() {
    try { await fetcher('/api/settings/incident-auto-close', { method: 'PUT', body: JSON.stringify(config) }); showMessage('Updated.'); } catch (err) { showError(err.message); }
  }

  if (!config) return <div className="panel-card" style={{ padding: '1.75rem' }}><p>Loading...</p></div>;

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Incident Auto-Close</h2>
      <p className="page-copy">Automatically close incidents after a set period.</p>
      <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <input type="checkbox" checked={config.enabled} onChange={() => setConfig(p => ({ ...p, enabled: !p.enabled }))} /> Enabled
      </label>
      <div className="form-group"><label>Auto-close after (hours)</label><input className="input-area" type="number" value={config.hours || 72} onChange={e => setConfig(p => ({ ...p, hours: parseInt(e.target.value) || 72 }))} /></div>
      <button className="primary-btn" onClick={handleSave}>Save</button>
    </div>
  );
}

function OAuthSection({ fetcher, showMessage, showError }) {
  const [providers, setProviders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ provider: 'google', clientId: '', clientSecret: '' });
  useEffect(() => { fetcher('/api/settings/oauth').then(setProviders).catch(() => {}); }, []);

  async function handleSave() {
    try { await fetcher(`/api/settings/oauth/${form.provider}`, { method: 'PUT', body: JSON.stringify({ enabled: true, clientId: form.clientId, clientSecret: form.clientSecret }) }); showMessage('OAuth config saved.'); const d = await fetcher('/api/settings/oauth'); setProviders(d); setEditing(null); } catch (err) { showError(err.message); }
  }

  async function handleToggle(provider, enabled) {
    try { await fetcher(`/api/settings/oauth/${provider}`, { method: 'PUT', body: JSON.stringify({ enabled }) }); setProviders(prev => prev.map(p => p.provider === provider ? { ...p, enabled } : p)); showMessage(enabled ? 'Enabled.' : 'Disabled.'); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>OAuth Providers</h2>
      <p className="page-copy">Configure SSO providers for your organization.</p>
      {providers.map(p => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <div><strong style={{ textTransform: 'capitalize' }}>{p.provider}</strong><span style={{ color: '#999', marginLeft: '0.5rem' }}>{p.clientId ? 'Configured' : 'Not configured'}</span></div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary-btn" onClick={() => { setEditing(p.provider); setForm({ provider: p.provider, clientId: p.clientId || '', clientSecret: '' }); }}>Edit</button>
            <button className={`secondary-btn ${p.enabled ? 'active' : ''}`} onClick={() => handleToggle(p.provider, !p.enabled)}>{p.enabled ? 'Disable' : 'Enable'}</button>
          </div>
        </div>
      ))}
      {editing && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <h3 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>{form.provider}</h3>
          <div className="form-group"><label>Client ID</label><input className="input-area" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} /></div>
          <div className="form-group"><label>Client Secret</label><input className="input-area" type="password" value={form.clientSecret} onChange={e => setForm(p => ({ ...p, clientSecret: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: '0.5rem' }}><button className="primary-btn" onClick={handleSave}>Save</button><button className="secondary-btn" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      )}
    </div>
  );
}

function ShortcutsSection({ fetcher, showMessage, showError }) {
  const [shortcuts, setShortcuts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [keys, setKeys] = useState('');
  useEffect(() => { fetcher('/api/settings/shortcuts').then(setShortcuts).catch(() => {}); }, []);

  async function handleSave(action) {
    try { await fetcher(`/api/settings/shortcuts/${action}`, { method: 'PUT', body: JSON.stringify({ keys }) }); const d = await fetcher('/api/settings/shortcuts'); setShortcuts(d); setEditing(null); showMessage('Shortcut updated.'); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Keyboard Shortcuts</h2>
      <p className="page-copy">Customize keyboard shortcuts for common actions.</p>
      {shortcuts.map(s => (
        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <div><strong>{s.action}</strong><span style={{ color: '#999', marginLeft: '0.5rem' }}>{s.keys}</span></div>
          <button className="secondary-btn" onClick={() => { setEditing(s.action); setKeys(s.keys); }}>Edit</button>
        </div>
      ))}
      {editing && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <input className="input-area" placeholder="e.g. Ctrl+Shift+A" value={keys} onChange={e => setKeys(e.target.value)} style={{ flex: 1 }} />
          <button className="primary-btn" onClick={() => handleSave(editing)}>Save</button>
          <button className="secondary-btn" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function HealthSection({ fetcher, showMessage, showError }) {
  const [checks, setChecks] = useState([]);
  useEffect(() => { fetcher('/api/settings/health').then(setChecks).catch(() => {}); }, []);

  async function handleRefresh() {
    try { const d = await fetcher('/api/settings/health'); setChecks(d); showMessage('Health check refreshed.'); } catch (err) { showError(err.message); }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Health Checks</h2>
      <p className="page-copy">Monitor the status of connected services.</p>
      <button className="primary-btn" onClick={handleRefresh} style={{ marginBottom: '1rem' }}>Run Health Check</button>
      {checks.map(c => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div><strong>{c.service}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: c.status === 'healthy' || c.status === 'ok' ? '#22c55e' : c.status === 'degraded' ? '#ffb020' : '#ff6b6b', fontWeight: 'bold' }}>{c.status}</span>
            {c.message && <span style={{ fontSize: '0.8rem', color: '#999' }}>{c.message}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportSection({ fetcher }) {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleExport() {
    setExporting(true);
    setResult(null);
    try {
      const data = await fetcher('/api/settings/export');
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem' }}>
      <h2>Export Data</h2>
      <p className="page-copy">Export your security data for backup or analysis.</p>
      <button className="secondary-btn" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export Data'}
      </button>
      {result && (
        <div className="analysis-result fade-in" style={{ marginTop: '1rem' }}>
          {result.error ? <p style={{ color: '#ff6b6b' }}>{result.error}</p> : (
            <pre style={{ fontSize: '0.75rem', maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(result.data || result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function DangerSection({ fetcher, showMessage, showError }) {
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount() {
    if (!password.trim()) { setDeleteError('Password is required.'); return; }
    setDeleteError('');
    try {
      await fetcher('/api/settings/account', { method: 'DELETE', body: JSON.stringify({ password }) });
      localStorage.clear();
      window.location.reload();
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  return (
    <div className="panel-card" style={{ padding: '1.75rem', border: '1px solid rgba(255,107,107,0.3)' }}>
      <h2 style={{ color: '#ff6b6b' }}>Account Deletion</h2>
      <p className="page-copy">Irreversible actions. Proceed with caution.</p>
      {deleteError && <div className="alert-error">{deleteError}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="password" className="input-area" placeholder="Enter your password to confirm" value={password} onChange={e => setPassword(e.target.value)} style={{ flex: 1 }} />
        <button className="primary-btn" style={{ background: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={handleDeleteAccount}>Delete Account</button>
      </div>
    </div>
  );
}

export default SettingsPage;
