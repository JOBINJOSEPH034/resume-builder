import { useState, useEffect, useCallback } from 'react';

// ── useLocalStorage hook ─────────────────────────────────────────
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const val = typeof value === 'function' ? value(storedValue) : value;
      setStoredValue(val);
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// ── useToast hook ────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return { toasts, show };
}

// ── useTheme hook ────────────────────────────────────────────────
export function useTheme() {
  const [theme, setTheme] = useLocalStorage('rf_theme', 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  return { theme, toggle };
}
