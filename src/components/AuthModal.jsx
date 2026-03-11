import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      onSuccess?.(tab);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal auth-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {tab === 'login' ? '👋 Welcome Back' : '✨ Create Account'}
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>
              {tab === 'login' ? 'Sign in to your ResumeForge account' : 'Free account — quick & easy'}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >Login</button>
          <button
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >Register</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          {tab === 'register' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="f-group">
                <label className="f-label">First Name</label>
                <input className="f-input" placeholder="Alex" value={form.first_name} onChange={set('first_name')} />
              </div>
              <div className="f-group">
                <label className="f-label">Last Name</label>
                <input className="f-input" placeholder="Smith" value={form.last_name} onChange={set('last_name')} />
              </div>
            </div>
          )}

          <div className="f-group">
            <label className="f-label">Email Address</label>
            <input
              className="f-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          <div className="f-group">
            <label className="f-label">Password {tab === 'register' && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(min 6 chars)</span>}</label>
            <input
              className="f-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>

          {error && (
            <div className="auth-error">⚠️ {error}</div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? '...' : tab === 'login' ? 'Sign In' : 'Create Free Account'}
          </button>
        </form>

        {/* Switch tab hint */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '.8rem', color: 'var(--muted)' }}>
          {tab === 'login' ? (
            <>Don't have an account?{' '}
              <button className="auth-switch-btn" onClick={() => { setTab('register'); setError(''); }}>Register free</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button className="auth-switch-btn" onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
