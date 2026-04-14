import { useState, useRef, useEffect } from 'react';
import {
  FileUp, AlignLeft, Briefcase, Target, Download,
  BarChart2, CheckCircle2, ArrowRight, X, ChevronDown
} from 'lucide-react';

const STORAGE_KEY = 'craftcv_welcomed_v1';

const STEPS = [
  {
    icon: <FileUp size={22} strokeWidth={1.8} />,
    title: 'Import or Start Fresh',
    desc: 'Click "Import Resume" in the sidebar to upload your existing PDF or DOCX, or start typing in each section to build from scratch. Your data auto-saves to your browser.',
  },
  {
    icon: <AlignLeft size={22} strokeWidth={1.8} />,
    title: 'Fill Every Section',
    desc: 'Work through each section: Personal Info → Summary → Experience → Education → Skills → Projects → Certifications → Languages. Each section has a ✓ checkmark when complete.',
  },
  {
    icon: <Target size={22} strokeWidth={1.8} />,
    title: 'Paste the Job Description',
    desc: 'Open "Job Description" from the sidebar and paste the full JD. CraftCV will extract keywords and show you exactly which ones are missing from your resume — boosting your ATS score.',
  },
  {
    icon: <Briefcase size={22} strokeWidth={1.8} />,
    title: 'Pick Your Template',
    desc: 'Use the template switcher in the preview panel on the right to choose a style: Classic, Modern, Minimal, and more. Your resume previews in real time.',
  },
  {
    icon: <BarChart2 size={22} strokeWidth={1.8} />,
    title: 'Check Your ATS Score',
    desc: 'Your ATS Score at the top updates as you type. Click it to open a detailed breakdown showing exactly what\'s missing. Aim for 80%+ before downloading.',
  },
  {
    icon: <Download size={22} strokeWidth={1.8} />,
    title: 'Download Your PDF',
    desc: 'Click "Download PDF" in the top bar when you\'re happy. Free plan includes 2 downloads. Use a Promo Code in your Profile (⚙️ button) to unlock unlimited downloads on Pro.',
  },
];

export function hasBeenWelcomed() {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

export function markWelcomed() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
}

export default function WelcomeModal({ userName, onClose }) {
  const [step, setStep] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const isLast = step === STEPS.length - 1;

  // Enable the close/finish button only on the last step
  useEffect(() => {
    if (isLast) {
      const t = setTimeout(() => setCanClose(true), 800);
      return () => clearTimeout(t);
    }
  }, [isLast]);

  const handleClose = () => {
    markWelcomed();
    onClose();
  };

  const current = STEPS[step];

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 520, width: '92%', padding: 0, overflow: 'hidden' }}>

        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          padding: '30px 32px 24px',
          color: 'white',
        }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', opacity: .8, marginBottom: 8 }}>
            Welcome to CraftCV
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-.04em', marginBottom: 4, fontFamily: 'Outfit, sans-serif' }}>
            Hi {userName?.split(' ')[0] || 'there'}! 👋
          </h2>
          <p style={{ fontSize: '.87rem', opacity: .88, lineHeight: 1.55 }}>
            Let's get you up to speed. Read through these quick steps to build the perfect resume.
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => i <= step && setStep(i)}
                style={{
                  height: 4, flex: 1, borderRadius: 4,
                  background: i <= step ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.3)',
                  cursor: i < step ? 'pointer' : 'default',
                  transition: 'background .3s ease',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '.7rem', opacity: .7, marginTop: 8 }}>
            Step {step + 1} of {STEPS.length}
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding: '28px 32px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            background: 'var(--accent-light)', borderRadius: 12,
            padding: '18px 20px', marginBottom: 20,
            border: '1px solid var(--accent-mid)',
            transition: 'all .25s ease',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: 'var(--shadow-accent)',
            }}>
              {current.icon}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--ink)', marginBottom: 6, letterSpacing: '-.02em', fontFamily: 'Outfit, sans-serif' }}>
                {current.title}
              </div>
              <div style={{ fontSize: '.83rem', color: 'var(--ink2)', lineHeight: 1.65 }}>
                {current.desc}
              </div>
            </div>
          </div>

          {/* All steps tiny summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {STEPS.map((s, i) => (
              <div
                key={i}
                onClick={() => i <= step && setStep(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 8,
                  cursor: i < step ? 'pointer' : 'default',
                  opacity: i > step ? .35 : 1,
                  transition: 'opacity .2s',
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--border)', color: 'white' }}>
                  {i < step
                    ? <CheckCircle2 size={13} strokeWidth={2.5} />
                    : <span style={{ fontSize: '.62rem', fontWeight: 800 }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: '.78rem', fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--accent)' : 'var(--ink2)' }}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setStep(s => s - 1)}
                style={{ flex: '0 0 auto' }}
              >
                Back
              </button>
            )}
            {!isLast ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
                style={{ flex: 1, justifyContent: 'center', gap: 6 }}
              >
                Next <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleClose}
                disabled={!canClose}
                style={{
                  flex: 1, justifyContent: 'center', gap: 6,
                  opacity: canClose ? 1 : .65,
                  cursor: canClose ? 'pointer' : 'not-allowed',
                }}
              >
                <CheckCircle2 size={15} /> Let's Build My Resume!
              </button>
            )}
          </div>

          {isLast && !canClose && (
            <div style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--muted)', marginTop: 10 }}>
              Please read the last step before closing…
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '12px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface2)',
        }}>
          <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
            © {new Date().getFullYear()} CraftCV — Powered by <strong style={{ color: 'var(--ink2)' }}>Jobin Joseph</strong>
          </span>
          <button
            onClick={() => { setStep(STEPS.length - 1); }}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Skip to last step
          </button>
        </div>
      </div>
    </div>
  );
}
