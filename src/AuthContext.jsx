import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('rf_token'));
  const [offer, setOffer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active offer (always, regardless of login)
  const fetchOffer = useCallback(async () => {
    try {
      const res = await fetch(`${API}/offer/`);
      const data = await res.json();
      setOffer(data.is_active ? data : null);
    } catch {
      setOffer(null);
    }
  }, []);

  // Fetch current user with stored token
  const fetchMe = useCallback(async (tok) => {
    try {
      const res = await fetch(`${API}/auth/me/`, {
        headers: { Authorization: `Token ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('rf_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchOffer();
      if (token) await fetchMe(token);
      setIsLoading(false);
    };
    init();
  }, []);

  const register = async ({ first_name, last_name, email, password }) => {
    const res = await fetch(`${API}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name, last_name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('rf_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchOffer();
    return data.user;
  };

  const login = async ({ email, password }) => {
    const res = await fetch(`${API}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('rf_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchOffer();
    return data.user;
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API}/auth/logout/`, {
          method: 'POST',
          headers: { Authorization: `Token ${token}` },
        });
      } catch {}
    }
    localStorage.removeItem('rf_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, offer, isLoading, login, logout, register, fetchOffer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
