import { useState, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import AuthPage from './pages/AuthPage';
import CubeLoader from './components/ui/cube-loader';
import { getApiUrl } from './api';

function checkSession() {
  // Plain fetch with cookies (no refresh/redirect logic) — just answers
  // "is there a valid access cookie?".
  return fetch(getApiUrl('/api/profile'), { credentials: 'include' })
    .then(res => res.ok)
    .catch(() => false);
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    checkSession().then(ok => {
      setUser(ok ? {} : null);
      setChecking(false);
    });
  }, []);

  if (splash || checking) {
    return <CubeLoader />;
  }

  if (!user) {
    return <AuthPage onAuth={setUser} />;
  }

  return <AppRoutes />;
}

export default App;