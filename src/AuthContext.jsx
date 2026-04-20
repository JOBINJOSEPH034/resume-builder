import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Local dev uses Vite proxy to forward /api -> http://127.0.0.1:8000
// Production uses Vercel rewrites to forward /api -> backend URL
const API = import.meta.env.VITE_API_URL || '/api';

const AuthContext = createContext(null);

async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error("API returned non-JSON:", text.substring(0, 500));
    if (res.status === 500) throw new Error("Server error (500). The backend crashed.");
    if (res.status === 404) throw new Error("API completely missing (404). Check that your backend is running and the URL is correct.");
    if (res.status === 403) throw new Error("Access forbidden (403). Possible rate limit or CSRF block.");
    throw new Error(`Unexpected server response (${res.status}). Received HTML instead of JSON. Ensure the backend is running and '/api' routes correctly.`);
  }
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [offer, setOffer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOffer = useCallback(async () => {
    try {
      const res = await fetch(`${API}/offer/`);
      if (res.ok) {
        const data = await safeJson(res);
        setOffer(data.is_active ? data : null);
      } else {
        setOffer(null);
      }
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
        const data = await safeJson(res);
        setUser(data); // includes download_limit now
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
    const data = await safeJson(res);
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
    const data = await safeJson(res);
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
    try {
      localStorage.removeItem('rf_resume_v2');
    } catch {}
  };

  /**
   * Track a PDF download. Returns { allowed, downloads_used, download_limit, error? }
   * If allowed=false the caller should block the print and show an upgrade prompt.
   */
  const trackDownload = async () => {
    if (!user) return { allowed: false, error: 'Not logged in.' };
    try {
      const res = await fetch(`${API}/track-download/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.allowed) {
        // Keep user state in sync with new counter
        setUser(prev => prev ? { ...prev, downloads_used: data.downloads_used } : prev);
      }
      return data;
    } catch {
      return { allowed: true }; // fail-open: don't block download on network error
    }
  };

  /**
   * Track ATS report view. Returns { allowed, ats_reports_used, ats_report_limit, error? }
   */
  const trackAts = async () => {
    if (!user) return { allowed: false, error: 'Not logged in.' };
    try {
      const res = await fetch(`${API}/track-ats/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.allowed) {
        setUser(prev => prev ? { 
          ...prev, 
          ats_reports_used: data.ats_reports_used,
          ats_report_limit: data.ats_report_limit
        } : prev);
      }
      return data;
    } catch {
      return { allowed: true }; // fail-open
    }
  };

  /**
   * Permanently delete the user's account and all data (GDPR erasure).
   * Returns true on success, throws on failure.
   */
  const deleteAccount = async () => {
    if (!user) throw new Error('Not logged in.');
    const res = await fetch(`${API}/auth/delete-account/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Account deletion failed.');
    }
    // Clear all local state after deletion
    setUser(null);
    try { localStorage.removeItem('rf_resume_v2'); } catch {}
    return true;
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
    <AuthContext.Provider value={{ user, offer, isLoading, login, logout, register, fetchMe, fetchOffer, upgradeToPro, applyPromoCode, trackDownload, trackAts, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
