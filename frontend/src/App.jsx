import { useState, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import AuthPage from './pages/AuthPage';
import { apiGet } from './api/client';

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('nexnetra_token');
    return token ? { token } : null;
  });
  const [checking, setChecking] = useState(!!localStorage.getItem('nexnetra_token'));

  useEffect(() => {
    if (!checking) return;
    apiGet('/api/profile').then(() => {
      setChecking(false);
    }).catch(() => {
      localStorage.removeItem('nexnetra_token');
      localStorage.removeItem('nexnetra_refresh');
      setUser(null);
      setChecking(false);
    });
  }, [checking]);

  if (checking) {
    return <div className="page-stack" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#999' }}>Verifying session...</div>;
  }

  if (!user) {
    return <AuthPage onAuth={setUser} />;
  }

  return <AppRoutes />;
}

export default App;
