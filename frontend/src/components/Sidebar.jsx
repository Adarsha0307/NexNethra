import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiGet } from '../api/client';

function Sidebar() {
  const [score, setScore] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function fetchScore() {
      try {
        const data = await apiGet('/api/score/summary');
        setScore(data);
      } catch {}
    }
    fetchScore();
    const interval = setInterval(fetchScore, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '\u{2302}', path: '/dashboard' },
    { id: 'incidents', label: 'Incidents', icon: '\u{26A0}', path: '/incidents' },
    { id: 'analyzer', label: 'Analyzer', icon: '\u{1F50D}', path: '/analyzer' },
    { id: 'assistant', label: 'Assistant', icon: '\u{1F4AC}', path: '/assistant' },
    { id: 'settings', label: 'Settings', icon: '\u{2699}', path: '/settings' },
  ];

  const activeTab = location.pathname.replace('/', '') || 'dashboard';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-row">
          <img className="brand-logo" src="/logo.webp" srcSet="/logo.webp 128w" sizes="36px" alt="Nexnetra logo" />
          <div>
            <h2>Nexnetra</h2>
            <span className="sidebar-sub">Security Hub</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="sidebar-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {score && (
          <div className="mini-score">
            <span className="score-value" style={{ color: (score.score || 0) >= 80 ? '#4fd1c5' : (score.score || 0) >= 50 ? '#ffb020' : '#ff6b6b' }}>
              {score.score || 0}
            </span>
            <span className="score-label">Security Score</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
