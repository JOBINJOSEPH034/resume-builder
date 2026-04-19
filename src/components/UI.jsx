import { useState } from 'react';
import { uid } from '../utils.js';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, X, Trash2, CheckCheck, Info, AlertCircle } from 'lucide-react';

// ── Chip Input ───────────────────────────────────────────────────
export function ChipInput({ chips = [], onChange, placeholder = 'Type and press Enter...', matchedSkills = [] }) {
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim();
    if (v && !chips.includes(v)) onChange([...chips, v]);
    setVal('');
  };
  const remove = (c) => onChange(chips.filter(x => x !== c));
  return (
    <div className="chips-input" onClick={e => e.currentTarget.querySelector('input')?.focus()}>
      {chips.map(c => (
        <span key={c} className={`chip${matchedSkills.includes(c.toLowerCase()) ? ' matched' : ''}`}>
          {c}
          <button className="chip-del" onClick={() => remove(c)} title={`Remove ${c}`} aria-label={`Remove ${c}`}>
            <X size={10} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        className="chip-input"
        value={val}
        placeholder={chips.length === 0 ? placeholder : 'Add more...'}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !val) remove(chips[chips.length - 1]);
        }}
        onBlur={add}
      />
    </div>
  );
}

// ── Toast Container ──────────────────────────────────────────────
export function ToastContainer({ toasts }) {
  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} role="status">
          {t.type === 'success' ? <CheckCircle2 size={15} strokeWidth={2} /> : t.type === 'error' ? <AlertCircle size={15} strokeWidth={2} /> : <Info size={15} strokeWidth={2} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 600 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={16} strokeWidth={2} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Section nav prev/next ────────────────────────────────────────
export function SectionNavFooter({ sections, activeId, onNavigate, onPrint }) {
  const idx = sections.findIndex(s => s.id === activeId);
  return (
    <div className="section-nav-footer">
      {idx > 0
        ? <button className="btn btn-secondary" onClick={() => onNavigate(sections[idx - 1].id)} style={{ gap: 5 }}>
            <ChevronLeft size={15} /> Previous
          </button>
        : <div />
      }
      {idx < sections.length - 1
        ? <button className="btn btn-primary" onClick={() => onNavigate(sections[idx + 1].id)} style={{ gap: 5 }}>
            Next Section <ChevronRight size={15} />
          </button>
        : <button className="btn btn-primary" onClick={onPrint} style={{ gap: 5 }}>
            <Download size={15} /> Download PDF
          </button>
      }
    </div>
  );
}

// ── Delete card button ───────────────────────────────────────────
export function DelBtn({ onClick, label = 'Remove' }) {
  return (
    <button className="card-del-btn" onClick={onClick} title={label} aria-label={label}>
      <Trash2 size={14} strokeWidth={1.8} />
    </button>
  );
}
