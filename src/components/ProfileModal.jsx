import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function ProfileModal({ onClose, showToast }) {
  const { user, applyPromoCode, logout, upgradeToPro } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPro = user?.plan === 'pro';

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const result = await applyPromoCode(promoCode.trim());
      showToast(result.message || 'Promo code applied successfully!', 'success');
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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ backdropFilter: 'blur(3px)' }}>
      <div className="modal" style={{ maxWidth: 500, width: '90%', padding: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)' }}>Your Profile</div>
          <button className="modal-close" onClick={onClose} style={{ background: 'var(--surface2)' }}>✕</button>
        </div>

        {/* User Info */}
        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{user.name}</div>
            <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>{user.email}</div>
          </div>
        </div>

        {/* Plan Details */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Current Plan</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isPro ? 'var(--green)' : 'var(--ink)' }}>
                {isPro ? 'Pro Member ⭐' : 'Free Tier'}
              </div>
            </div>
            {!isPro && (
              <button className="btn btn-sm btn-primary" onClick={async () => {
                showToast('Upgrading...', 'info');
                const success = await upgradeToPro();
                if (success) showToast('Upgraded to Pro! 🎉', 'success');
              }}>Upgrade</button>
            )}
          </div>
          
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
              <span style={{ color: 'var(--ink2)' }}>Resume Downloads</span>
              <span style={{ fontWeight: 700 }}>
                {isPro ? 'Unlimited' : `${user.downloads_used || 0} / 2 used`}
              </span>
            </div>
            {/* Progress bar for free users */}
            {!isPro && (
              <div style={{ marginTop: 8, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(((user.downloads_used || 0) / 2) * 100, 100)}%`, height: '100%', background: (user.downloads_used >= 2) ? 'var(--red)' : 'var(--blue)' }} />
              </div>
            )}
          </div>
        </div>

        {/* Promo Code Section */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Have a Promo Code?</div>
          <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: 8 }}>
            <input 
              type="text" 
              className="f-input" 
              placeholder="Enter code here" 
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              style={{ padding: '8px 12px', flex: 1, textTransform: 'uppercase' }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !promoCode.trim()} style={{ whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Apply'}
            </button>
          </form>
          {error && <div style={{ fontSize: '.8rem', color: 'var(--red)', marginTop: 8, fontWeight: 600 }}>{error}</div>}
        </div>

        {/* Action bounds */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'center' }}>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }} onClick={handleLogout}>
            Log out completely
          </button>
        </div>

      </div>
    </div>
  );
}
