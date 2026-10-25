import { useState, useEffect, useCallback } from 'react';
import { readableMessage } from './feedback.js';

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
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-3), { id, message: readableMessage(message), type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback(id=>setToasts(prev=>prev.filter(item=>item.id!==id)),[]);
  useEffect(()=>{const receive=e=>show(e.detail.message,e.detail.type,e.detail.type==='error'?7000:4000);window.addEventListener('rc-notice',receive);return()=>window.removeEventListener('rc-notice',receive);},[show]);
  return { toasts, show, dismiss };
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
