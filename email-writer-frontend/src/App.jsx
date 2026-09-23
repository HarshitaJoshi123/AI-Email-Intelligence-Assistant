import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';

const API_BASE = 'https://mailmind-backend-hr9p.onrender.com';
const LOGIN_URL = `${API_BASE}/oauth2/authorization/google`;
const LOGOUT_URL = `${API_BASE}/logout`;

function App() {
  // 'checking' | 'guest' | 'authenticated'
  const [authState, setAuthState] = useState('checking');
  const [user, setUser] = useState(null);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`, {
        withCredentials: true,
      });

      if (response.data?.authenticated) {
        setUser({
          name: response.data.name,
          email: response.data.email,
        });
        setAuthState('authenticated');
      } else {
        setAuthState('guest');
      }
    } catch {
      // Not logged in (401) or any other failure -> show landing page
      setAuthState('guest');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = () => {
    window.location.href = LOGIN_URL;
  };

  const handleLogout = () => {
    window.location.href = LOGOUT_URL;
  };

  if (authState === 'checking') {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (authState === 'authenticated') {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return <LandingPage onLogin={handleLogin} />;
}

export default App;
