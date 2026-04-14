import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Force relative '/api' in production so Vercel rewrites proxy it to the backend.
// In local dev, use the local django server.
const API = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api');

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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

  // Fetch current user with stored cookie
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/me/`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
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
      await fetchMe();
      setIsLoading(false);
    };
    init();
  }, []);

  const register = async ({ first_name, last_name, email, password }) => {
    const res = await fetch(`${API}/auth/register/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name, last_name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser(data.user);
    await fetchOffer();
    return data.user;
  };

  const login = async ({ email, password }) => {
    const res = await fetch(`${API}/auth/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    await fetchOffer();
    return data.user;
  };

  const logout = async () => {
    if (user) {
      try {
        await fetch(`${API}/auth/logout/`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch {}
    }
    setUser(null);
  };

  const upgradeToPro = async (transaction_id = null) => {
    if (!user) return;
    const res = await fetch(`${API}/upgrade/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user); // updates plan to 'pro'
      return true;
    }
    return false;
  };

  const applyPromoCode = async (code) => {
    if (!user) throw new Error('Not logged in');
    const res = await fetch(`${API}/apply-promo/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to apply promo code');
    if (data.user) setUser(data.user); // if instantly upgraded
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, offer, isLoading, login, logout, register, fetchOffer, upgradeToPro, applyPromoCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
