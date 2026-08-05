import { useState, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import AuthPage from './pages/AuthPage';
import CubeLoader from './components/ui/cube-loader';
import { apiGet } from './api/client';

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('nexnetra_token');
    return token ? { token } : null;
  });
  const [checking, setChecking] = useState(!!localStorage.getItem('nexnetra_token'));
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

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

  if (splash || checking) {
    return <CubeLoader />;
  }

  if (!user) {
    return <AuthPage onAuth={setUser} />;
  }

  return <AppRoutes />;
}

export default App;
