import { useState, useRef } from 'react';
import { uid } from '../utils.js';

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
          <button className="chip-del" onClick={() => remove(c)}>×</button>
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
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'} {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 600 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
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
        ? <button className="btn btn-secondary" onClick={() => onNavigate(sections[idx - 1].id)}>← Previous</button>
        : <div />
      }
      {idx < sections.length - 1
        ? <button className="btn btn-primary" onClick={() => onNavigate(sections[idx + 1].id)}>Next Section →</button>
        : <button className="btn btn-primary" onClick={onPrint}>⬇ Download PDF</button>
      }
    </div>
  );
}

// ── Delete card button ───────────────────────────────────────────
export function DelBtn({ onClick }) {
  return (
    <button className="card-del-btn" onClick={onClick} title="Remove">✕</button>
  );
}
