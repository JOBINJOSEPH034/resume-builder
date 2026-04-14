import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { Crown, Download, Tag, LogOut, X, User, ChevronRight, Star } from 'lucide-react';

export default function ProfileModal({ onClose, showToast }) {
  const { user, applyPromoCode, logout, upgradeToPro } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPro = user?.plan === 'pro';
  const downloadsUsed = user?.downloads_used || 0;
  const downloadLimit = 2;
  const downloadPct = Math.min((downloadsUsed / downloadLimit) * 100, 100);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const result = await applyPromoCode(promoCode.trim());
      showToast(result.message || 'Promo code applied!', 'success');
      setPromoCode('');
    } catch (err) {
      setError(err.message || 'Invalid or expired promo code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    showToast('Logged out successfully', 'info');
  };

  if (!user) return null;

  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ backdropFilter: 'blur(6px)' }}>
      <div className="modal" style={{ maxWidth: 480, width: '92%', padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-.04em', fontFamily: 'Outfit, sans-serif' }}>Account</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>Manage your profile & subscription</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        </div>

        {/* User Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-light), var(--purple-light))',
          border: '1px solid var(--accent-mid)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 25,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', flexShrink: 0,
            boxShadow: 'var(--shadow-accent)'
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 2, letterSpacing: '-.02em', fontFamily: 'Outfit, sans-serif', truncate: true }}>{user.name}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          {isPro && (
            <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))', color: 'white', fontSize: '.68rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Crown size={11} /> PRO
            </div>
          )}
        </div>

        {/* Plan Card */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Current Plan</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-.03em', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 7 }}>
                {isPro ? (
                  <><Star size={16} fill="var(--yellow)" color="var(--yellow)" /> <span style={{ color: 'var(--yellow)' }}>Pro Member</span></>
                ) : (
                  <><User size={15} color="var(--muted)" /> <span style={{ color: 'var(--ink)' }}>Free Tier</span></>
                )}
              </div>
            </div>
            {!isPro && (
              <button
                className="btn btn-sm btn-primary"
                style={{ gap: 5 }}
                onClick={async () => {
                  showToast('Contact us to upgrade to Pro', 'info');
                }}
              >
                <ChevronRight size={13} /> Upgrade
              </button>
            )}
          </div>

          {/* Downloads Usage */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPro ? 0 : 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem', color: 'var(--ink2)', fontWeight: 500 }}>
                <Download size={14} strokeWidth={2} color="var(--muted)" />
                PDF Downloads
              </div>
              <span style={{ fontWeight: 800, fontSize: '.82rem', color: isPro ? 'var(--green)' : downloadsUsed >= downloadLimit ? 'var(--red)' : 'var(--ink)' }}>
                {isPro ? 'Unlimited' : `${downloadsUsed} / ${downloadLimit}`}
              </span>
            </div>
            {!isPro && (
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${downloadPct}%`, height: '100%',
                  background: downloadsUsed >= downloadLimit
                    ? 'var(--red)'
                    : 'linear-gradient(90deg, var(--accent), var(--purple))',
                  borderRadius: 3, transition: 'width .5s ease'
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Promo Code */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Tag size={14} strokeWidth={2} color="var(--accent)" />
            <div style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--ink)' }}>Promo Code</div>
          </div>
          <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="f-input"
              placeholder="Enter your code..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !promoCode.trim()} style={{ gap: 5, whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Apply'}
            </button>
          </form>
          {error && (
            <div style={{ fontSize: '.78rem', color: 'var(--red)', marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', background: 'var(--red-light)', border: '1px solid #fca5a5',
              color: 'var(--red)', cursor: 'pointer', fontWeight: 700, fontSize: '.85rem',
              borderRadius: 10, padding: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 7, transition: 'all .15s', fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-light)'; }}
          >
            <LogOut size={15} strokeWidth={2} /> Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
