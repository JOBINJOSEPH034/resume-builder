import { useState, useEffect } from 'react';
import { X, ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { hasDoneTutorial, markTutorialDone } from './tutorialStorage.js';

// Steps work on all devices.
// targetId: element to spotlight — falls back to centered if hidden/absent.
// mobileBody: optional alternate description text for small screens.
const STEPS = [
  {
    targetId: 'tut-mode-toggle',
    title: '🔨 Builder vs Analyzer',
    body: 'Use these two buttons to switch modes. Builder lets you create a resume from scratch. Analyzer lets you upload and score an existing one.',
    mobileBody: 'Open the ☰ menu at the top-left to find the Builder / Analyzer toggle. Builder creates resumes from scratch; Analyzer scores an uploaded resume.',
    placement: 'bottom',
  },
  {
    targetId: 'tut-sidebar-nav',
    title: '📋 Resume Sections',
    body: 'Click any section in the sidebar to jump to that part of your resume — Personal, Experience, Education, Skills, and more.',
    mobileBody: 'Open the ☰ menu to navigate between resume sections — Personal Info, Experience, Education, Skills, and more.',
    placement: 'right',
  },
  {
    targetId: 'tut-ats-score',
    title: '📊 Your Live ATS Score',
    body: 'This score updates in real time as you type. Click it anytime to open a detailed breakdown of what\'s boosting or hurting your score.',
    placement: 'bottom',
  },
  {
    targetId: null,
    title: '🎯 Job Description Matching',
    body: 'In Builder mode, open "Job Description" from the sidebar. Paste the full JD and CraftCV will extract keywords and highlight exactly which ones are missing from your resume.',
    placement: null,
  },
  {
    targetId: 'tut-download',
    title: '⬇️ Download Your PDF',
    body: 'When your resume is ready, tap "Download PDF" in the top bar. Free accounts get 2 downloads; Pro accounts get unlimited exports.',
    placement: 'bottom',
  },
];

/** Returns bounding rect only if element exists AND is visible in the viewport */
function getVisibleRect(id) {
  if (!id) return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // Element is effectively hidden if its dimensions are zero or it's way off-screen
  if (rect.width === 0 || rect.height === 0) return null;
  if (rect.right < 0 || rect.bottom < 0) return null;
  if (rect.left > window.innerWidth || rect.top > window.innerHeight) return null;
  return rect;
}

function isMobile() {
  return window.innerWidth < 768;
}

/* ─── Tooltip positioning ─────────────────────────────────────── */
function calcStyle(step, rect) {
  const tipW = Math.min(310, window.innerWidth - 32);
  const pad = 14;

  if (!rect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: tipW,
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let style = { position: 'fixed', width: tipW };

  if (step.placement === 'bottom') {
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - tipW / 2, vw - tipW - 8));
    let top = rect.bottom + pad;
    if (top + 230 > vh) top = Math.max(8, rect.top - 230 - pad);
    style = { ...style, top, left };
  } else if (step.placement === 'right') {
    let left = rect.right + pad;
    let top = Math.max(8, Math.min(rect.top + rect.height / 2 - 100, vh - 210 - 8));
    if (left + tipW > vw - 8) left = Math.max(8, rect.left - tipW - pad);
    style = { ...style, top, left };
  } else {
    // top
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - tipW / 2, vw - tipW - 8));
    style = { ...style, top: Math.max(8, rect.top - 210 - pad), left };
  }

  // hard clamp
  if (style.top < 8) style.top = 8;
  if (style.left < 8) style.left = 8;
  return style;
}

/* ─── Tooltip card ────────────────────────────────────────────── */
function TooltipBox({ step, stepIndex, total, rect, onNext, onPrev, onSkip }) {
  const isLast = stepIndex === total - 1;
  const mobile = isMobile();
  const body = (mobile && step.mobileBody) ? step.mobileBody : step.body;
  const style = calcStyle(step, rect);

  return (
    <div
      style={{
        ...style,
        background: 'var(--surface)',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,.5), 0 0 0 1.5px var(--border)',
        padding: '20px 22px 18px',
        zIndex: 10002,
        animation: 'tutPop .25s cubic-bezier(.34,1.56,.64,1) both',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Step {stepIndex + 1} of {total}
        </span>
        <button
          onClick={onSkip}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, display: 'flex', borderRadius: 6 }}
          aria-label="Skip tutorial"
        >
          <X size={14} />
        </button>
      </div>

      {/* Title */}
      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'Outfit, sans-serif', lineHeight: 1.25, marginBottom: 8 }}>
        {step.title}
      </div>

      {/* Body */}
      <div style={{ fontSize: '.83rem', color: 'var(--ink2)', lineHeight: 1.65, marginBottom: 18 }}>
        {body}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 3,
            background: i <= stepIndex ? 'var(--accent)' : 'var(--border)',
            transition: 'background .3s',
          }} />
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        <button
          onClick={onSkip}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.74rem', cursor: 'pointer', fontWeight: 600, padding: '4px 6px', marginRight: 'auto' }}
        >
          Skip tour
        </button>
        {stepIndex > 0 && (
          <button onClick={onPrev} className="btn btn-secondary btn-sm" style={{ gap: 4, padding: '5px 12px' }}>
            <ChevronLeft size={13} /> Back
          </button>
        )}
        <button onClick={onNext} className="btn btn-primary btn-sm" style={{ gap: 5, padding: '5px 16px' }}>
          {isLast ? <><CheckCircle2 size={13} /> Done!</> : <>Next <ArrowRight size={13} /></>}
        </button>
      </div>
    </div>
  );
}

/* ─── Main overlay ────────────────────────────────────────────── */
export default function TutorialOverlay({ onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const current = STEPS[step];

  // Measure + track target element
  useEffect(() => {
    let raf;
    function measure() {
      setRect(getVisibleRect(current.targetId));
      raf = requestAnimationFrame(measure); // keep synced during layout shifts
    }
    measure();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Scroll target into view
  useEffect(() => {
    if (current.targetId) {
      const el = document.getElementById(current.targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [step]);

  const goNext = () => step < STEPS.length - 1 ? setStep(s => s + 1) : finish();
  const goPrev = () => setStep(s => Math.max(0, s - 1));
  const finish = () => { markTutorialDone(); onDone(); };

  // Highlight ring dimensions
  const pad = 8;
  const hl = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  return (
    <>
      <style>{`
        @keyframes tutPop {
          from { opacity: 0; transform: scale(.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);   }
        }
        .tut-ring {
          position: fixed;
          border-radius: 12px;
          pointer-events: none;
          z-index: 10001;
          transition: top .28s, left .28s, width .28s, height .28s;
          box-shadow:
            0 0 0 4000px rgba(0,0,0,.58),
            0 0 0 2.5px var(--accent),
            0 0 20px 6px rgba(99,102,241,.45);
        }
      `}</style>

      {/* Spotlight ring OR full dim */}
      {hl ? (
        <div className="tut-ring" style={{ top: hl.top, left: hl.left, width: hl.width, height: hl.height }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.58)', zIndex: 10001, pointerEvents: 'none' }} />
      )}

      {/* Invisible click-anywhere-to-advance layer (below tooltip) */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 10001, cursor: 'pointer' }}
        onClick={goNext}
        title="Click anywhere to continue"
      />

      <TooltipBox
        step={current}
        stepIndex={step}
        total={STEPS.length}
        rect={rect}
        onNext={goNext}
        onPrev={goPrev}
        onSkip={finish}
      />
    </>
  );
}
