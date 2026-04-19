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
        onSuccess?.('login', form.email);
      } else {
        const u = await register(form);
        const name = u?.name || `${form.first_name} ${form.last_name}`.trim();
        onSuccess?.('register', name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ backdropFilter: 'blur(3px)' }}>
      <div className="modal auth-modal" style={{ padding: 0, overflow: 'hidden', display: 'flex', maxWidth: 800, minHeight: 480 }}>
        
        {/* Brand Side (hidden on mobile) */}
        <div style={{
          flex: '0.8', background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          padding: 40, color: 'white', display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
        }} className="auth-brand-side">
          <div className="brand-icon" style={{ width: 48, height: 48, fontSize: '1.3rem', marginBottom: 20, boxShadow: 'none', background: 'rgba(255,255,255,0.18)', borderRadius: 14 }}>C</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.2, marginBottom: 12, fontFamily: 'Outfit, sans-serif', letterSpacing: '-.04em' }}>Build your future with CraftCV.</h2>
          <p style={{ fontSize: '.87rem', opacity: 0.88, lineHeight: 1.6, fontWeight: 400 }}>Join thousands of professionals creating ATS-optimized resumes that actually land interviews.</p>
        </div>

        {/* Form Side */}
        <div style={{ flex: 1.2, padding: 'clamp(24px, 5vw, 40px) clamp(24px, 6vw, 48px)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)' }}>
                {tab === 'login' ? 'Welcome Back' : 'Create Account'}
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: 4 }}>
                {tab === 'login' ? 'Sign in to access your resumes.' : 'Start building for free.'}
              </div>
            </div>
            <button className="modal-close" onClick={onClose} style={{ background: 'var(--surface2)' }}>✕</button>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" style={{ marginBottom: 24 }}>
            <button
              className={`auth-tab${tab === 'login' ? ' active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
            >Sign In</button>
            <button
              className={`auth-tab${tab === 'register' ? ' active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
            >Register</button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tab === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--ink2)' }}>First Name</label>
                  <input className="f-input" placeholder="Alex" value={form.first_name} onChange={set('first_name')} style={{ padding: '10px 14px' }} required={tab === 'register'} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--ink2)' }}>Last Name</label>
                  <input className="f-input" placeholder="Smith" value={form.last_name} onChange={set('last_name')} style={{ padding: '10px 14px' }} required={tab === 'register'} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--ink2)' }}>Email Address</label>
              <input
                className="f-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required
                style={{ padding: '10px 14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--ink2)' }}>Password</label>
                {tab === 'register' && <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Min 8 chars, letters + numbers</span>}
              </div>
              <input
                className="f-input" type="password" placeholder="••••••••"
                value={form.password} onChange={set('password')} required
                style={{ padding: '10px 14px' }}
              />
            </div>

            {error && (
              <div className="auth-error" style={{ padding: '12px 16px', marginTop: 4 }}>⚠️ {error}</div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, padding: '12px', fontSize: '.9rem', justifyContent: 'center' }}>
              {loading ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center', fontSize: '.8rem', color: 'var(--muted)' }}>
            {tab === 'login' ? (
              <>Don't have an account? <button className="auth-switch-btn" onClick={() => { setTab('register'); setError(''); }}>Register free</button></>
            ) : (
              <>Already have an account? <button className="auth-switch-btn" onClick={() => { setTab('login'); setError(''); }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
