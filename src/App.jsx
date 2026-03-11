import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { initData, SECTIONS, isDone, calcBaseScore, matchKeywords, extractKeywords } from './utils.js';
import { useLocalStorage, useToast, useTheme } from './hooks.js';
import { ToastContainer } from './components/UI.jsx';
import ResumePreview from './components/ResumePreview.jsx';
import { PersonalSection, SummarySection, ExperienceSection,
  EducationSection, SkillsSection, ProjectsSection,
  CertificationsSection, LanguagesSection,
} from './components/FormSections.jsx';
import { ImportPanel, JobDescSection } from './components/ImportAndJD.jsx';
import { useAuth } from './AuthContext.jsx';
import AuthModal from './components/AuthModal.jsx';

// A4 dimensions in pixels at 96dpi
const A4_W_PX = 794;
const A4_H_PX = 1123;

const ALL_SECTIONS = [
  { id: 'import', icon: '📂', label: 'Import Resume', special: true },
  { id: 'jd',     icon: '🎯', label: 'Job Description', special: true },
  ...SECTIONS,
];

export default function App() {
  const [data, setData] = useLocalStorage('rf_resume_v2', initData);
  const [active, setActive] = useState('personal');
  const [zoom, setZoom] = useState(0.56);
  const [template, setTemplate] = useState('classic');
  const [jobDesc, setJobDesc] = useState('');
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAtsModal, setShowAtsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toasts, show: showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, offer, logout } = useAuth();

  // ATS score = base content score + keyword match bonus
  const baseScore = calcBaseScore(data);
  const keywords = extractKeywords(jobDesc);
  const kwMatches = matchKeywords(keywords, data);
  const kwFound = kwMatches.filter(m => m.found);
  const kwMissing = kwMatches.filter(m => !m.found);
  const kwMatchPct = keywords.length > 0 ? Math.round((kwFound.length / keywords.length) * 100) : 0;
  const atsScore = jobDesc.length > 20
    ? Math.round(baseScore * 0.7 + kwMatchPct * 0.3)
    : baseScore;

  const scoreClass = atsScore >= 80 ? 'good' : atsScore >= 50 ? 'mid' : 'low';
  const scoreColor = atsScore >= 80 ? 'var(--green)' : atsScore >= 50 ? 'var(--yellow)' : 'var(--red)';

  const handleImport = useCallback((parsed) => {
    setData(parsed);
    setActive('personal');
  }, [setData]);

  const handleKeywordsChange = useCallback((kws) => {
    setMatchedKeywords(kws);
  }, []);

  const handleClear = () => {
    if (confirm('Clear all resume data? This cannot be undone.')) {
      setData(initData);
      setJobDesc('');
      setMatchedKeywords([]);
      showToast('Resume cleared.', 'info');
    }
  };

  // Print always uses the hidden #print-area (full scale, no transform)
  const handlePrint = () => {
    setShowPreviewModal(false);
    setTimeout(() => window.print(), 100);
  };

  const sectionProps = { data, onChange: setData, sections: SECTIONS, onNavigate: setActive, onPrint: () => setShowPreviewModal(true) };
  const sectionMap = {
    import: <ImportPanel onImport={handleImport} onToast={showToast} />,
    jd: <JobDescSection jobDesc={jobDesc} setJobDesc={setJobDesc} data={data} onKeywordsChange={handleKeywordsChange} />,
    personal:       <PersonalSection {...sectionProps} />,
    summary:        <SummarySection {...sectionProps} />,
    experience:     <ExperienceSection {...sectionProps} />,
    education:      <EducationSection {...sectionProps} />,
    skills:         <SkillsSection {...sectionProps} matchedSkills={matchedKeywords} />,
    projects:       <ProjectsSection {...sectionProps} />,
    certifications: <CertificationsSection {...sectionProps} />,
    languages:      <LanguagesSection {...sectionProps} />,
  };

  const templates = ['classic', 'modern', 'minimal', 'professional', 'executive', 'creative', 'tech', 'startup', 'elegant'];

  // Scaled preview dimensions
  const scaledW = Math.round(A4_W_PX * zoom);
  const scaledH = Math.round(A4_H_PX * zoom);

  return (
    <>
      {/* ── PRINT AREA — injected directly into document.body via Portal so it's outside #root.
           Uses position:fixed left:-9999px in normal view (always rendered, never visible).
           Print CSS via visibility:hidden on body + visibility:visible on #print-area ── */}
      {createPortal(
        <div id="print-area">
          <ResumePreview data={data} template={template} />
        </div>,
        document.body
      )}

      <div className="app">
      {/* ── TOP BAR ── */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">R</div>
          <div>
            <div className="brand-name">Resume<span>Forge</span></div>
            <div className="brand-tagline">ATS-Optimized Builder</div>
          </div>
        </div>

        <div className="topbar-center">
          <button className={`ats-score-badge ${scoreClass}`} style={{ cursor: 'pointer' }} onClick={() => setShowAtsModal(true)} title="Click to view detailed ATS Report">
            <div className="score-pulse" style={{ background: scoreColor }} />
            <span>ATS Score: <strong>{atsScore}%</strong></span>
            {atsScore >= 80 && <span>🎉</span>}
          </button>
          {jobDesc.length > 20 && (
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: kwMatchPct >= 70 ? 'var(--green)' : 'var(--yellow)' }}>●</span>
              JD match: {kwMatchPct}%
            </div>
          )}
        </div>

        <div className="topbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setActive('import')}>
            📂 Import
          </button>
          <button className="btn btn-sm btn-secondary" onClick={handleClear}>
            Clear
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowAtsModal(true)}>
            📊 ATS Report
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowPreviewModal(true)}>
            👁 Preview
          </button>
          <button className="btn btn-sm btn-primary" onClick={handlePrint}>
            ⬇ Download PDF
          </button>
          {!user ? (
            <button className="btn btn-sm btn-primary" style={{ background: 'var(--ink)' }} onClick={() => setShowAuthModal(true)}>
              Login / Sign Up
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', padding: '2px 4px 2px 10px', borderRadius: 20 }}>
              <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--ink)' }}>{user.name}</span>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', padding: '4px 6px', fontWeight: 600 }} onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>

      {/* ── OFFER BANNER ── */}
      {offer && offer.is_active && (
        <div className="offer-banner">
          <span className="offer-badge">{offer.discount_text}</span>
          <span style={{ fontWeight: 800 }}>{offer.title}</span> <span style={{ opacity: 0.8 }}>— {offer.description}</span>
        </div>
      )}

      {/* ── BODY ── */}
      <div className="body-row">

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="sidebar-section-label">Tools</div>
          {ALL_SECTIONS.filter(s => s.special).map(s => (
            <button
              key={s.id}
              className={`nav-item special-nav${active === s.id ? ' active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span className="nav-icon">{s.icon}</span>
              <span className="nav-label">{s.label}</span>
              {s.id === 'jd' && jobDesc.length > 20 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '.65rem', fontWeight: 700,
                  padding: '2px 7px', borderRadius: 10,
                  background: kwMatchPct >= 70 ? 'var(--green)' : 'var(--yellow)',
                  color: 'white',
                }}>{kwMatchPct}%</span>
              )}
            </button>
          ))}

          <div className="sidebar-section-label">Resume Sections</div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`nav-item${active === s.id ? ' active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span className="nav-icon">{s.icon}</span>
              <span className="nav-label">{s.label}</span>
              {isDone(s.id, data)
                ? <span className="nav-done">✓</span>
                : active === s.id ? <span className="nav-badge">Edit</span> : null
              }
            </button>
          ))}

          {/* Strength meter */}
          <div className="sidebar-strength" style={{ cursor: 'pointer' }} onClick={() => setShowAtsModal(true)} title="View Detailed ATS Report">
            <div className="strength-label">Resume Strength</div>
            <div className="strength-bar-bg">
              <div className="strength-bar-fill" style={{ width: `${atsScore}%` }} />
            </div>
            <div className="strength-pct" style={{ color: scoreColor }}>{atsScore}%</div>
            <div className="strength-msg">
              {atsScore < 40 ? 'Keep filling sections!'
                : atsScore < 65 ? 'Looking good, keep going!'
                : atsScore < 85 ? 'Almost there — add JD keywords!'
                : '🚀 Excellent resume!'}
            </div>
          </div>
        </div>

        {/* ── FORM PANEL ── */}
        <div className="form-panel">
          {sectionMap[active]}
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="preview-panel">
          <div className="preview-toolbar">
            <span className="preview-label">Live Preview</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="f-select" style={{ padding: '2px 8px', fontSize: '.7rem', height: 26 }} value={template} onChange={e => setTemplate(e.target.value)}>
                {templates.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <div className="zoom-ctrl">
                <button className="zoom-btn" onClick={() => setZoom(z => Math.max(.35, +(z - .06).toFixed(2)))}>−</button>
                <span className="zoom-val">{Math.round(zoom * 100)}%</span>
                <button className="zoom-btn" onClick={() => setZoom(z => Math.min(.9, +(z + .06).toFixed(2)))}>+</button>
              </div>
            </div>
          </div>

          {/* Scaler wrapper — clips the scaled resume so it doesn't overflow */}
          <div style={{ width: scaledW, height: scaledH, overflow: 'hidden', margin: '0 auto' }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: A4_W_PX }}>
              <ResumePreview data={data} template={template} />
            </div>
          </div>
        </div>

      </div>

      {/* ── ATS REPORT MODAL ── */}
      {showAtsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAtsModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">📊 ATS Compatibility Report</div>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>Analysis based on resume completeness and Job Description match</div>
              </div>
              <button className="modal-close" onClick={() => setShowAtsModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: 24, marginBottom: 24, alignItems: 'center', background: 'var(--surface2)', padding: 20, borderRadius: 12 }}>
              <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(${scoreColor} ${atsScore}%, var(--border) 0)` }}>
                <div style={{ position: 'absolute', inset: 8, background: 'var(--surface2)', borderRadius: '50%', display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{atsScore}</span>
                  <span style={{ fontSize: '.6rem', color: 'var(--muted)', fontWeight: 700 }}>SCORE</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>
                  {atsScore >= 80 ? 'Excellent Match! 🎉' : atsScore >= 50 ? 'Needs Optimization ⚠️' : 'Poor Match ❌'}
                </h3>
                <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                  {atsScore >= 80 ? 'Your resume is highly optimized for Applicant Tracking Systems. You have a great chance of passing the initial screen.' : atsScore >= 50 ? 'Your resume has a fair foundation but is missing critical keywords or sections required by the job description.' : 'Your resume lacks the fundamental keywords and sections needed to pass an ATS. Significant revisions are highly recommended.'}
                </p>
              </div>
            </div>

            <div className="fg fg2">
              <div className="form-card" style={{ padding: 16, margin: 0 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--ink)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>Content Completeness: <span style={{ color: baseScore >= 80 ? 'var(--green)' : 'var(--yellow)' }}>{baseScore}%</span></div>
                <ul style={{ paddingLeft: 18, margin: 0, fontSize: '.8rem', color: 'var(--ink2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.personal.firstName && data.personal.email && data.personal.phone ? <li>✅ Contact info complete</li> : <li style={{ color: 'var(--red)' }}>❌ Missing critical contact info</li>}
                  {data.summary.length > 50 ? <li>✅ Summary looks solid</li> : <li style={{ color: 'var(--yellow)' }}>⚠️ Summary is missing or too short</li>}
                  {data.experience.length > 0 ? <li>✅ Experience listed</li> : <li style={{ color: 'var(--red)' }}>❌ Missing work experience</li>}
                  {data.education.length > 0 ? <li>✅ Education listed</li> : <li style={{ color: 'var(--red)' }}>❌ Missing education</li>}
                  {data.skills.some(s => s.skills.length > 0) ? <li>✅ Skills listed</li> : <li style={{ color: 'var(--red)' }}>❌ Missing skills section</li>}
                </ul>
              </div>
              
              <div className="form-card" style={{ padding: 16, margin: 0 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--ink)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>Job Description Match: <span style={{ color: kwMatchPct >= 70 ? 'var(--green)' : 'var(--red)' }}>{jobDesc.length > 20 ? `${kwMatchPct}%` : 'N/A'}</span></div>
                {jobDesc.length < 20 ? (
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>Paste a job description in the Job Description tool to unlock keyword matching.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✓ Found ({kwFound.length})</div>
                      <div className="keyword-chips">
                        {kwFound.slice(0, 10).map(m => <span key={m.keyword} className="keyword-chip found" style={{ padding: '2px 6px', fontSize: '.65rem' }}>{m.keyword}</span>)}
                        {kwFound.length > 10 && <span style={{ fontSize: '.65rem', color: 'var(--muted)', alignSelf: 'center' }}>+{kwFound.length - 10} more</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>✕ Missing ({kwMissing.length})</div>
                      <div className="keyword-chips">
                        {kwMissing.slice(0, 10).map(m => <span key={m.keyword} className="keyword-chip missing" style={{ padding: '2px 6px', fontSize: '.65rem' }}>{m.keyword}</span>)}
                        {kwMissing.length > 10 && <span style={{ fontSize: '.65rem', color: 'var(--muted)', alignSelf: 'center' }}>+{kwMissing.length - 10} more</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: 'var(--accent-light)', border: '1px solid var(--accent-mid)', borderRadius: 12 }}>
              <h4 style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>💡 Recommendations to Improve</h4>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: '.8rem', color: 'var(--ink2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {kwMissing.length > 0 && <li>Tailor your resume by adding missing keywords like <strong>{kwMissing.slice(0, 3).map(m => m.keyword).join(', ')}</strong> naturally into your experience bullet points or summary.</li>}
                {baseScore < 100 && <li>Complete all standard resume sections (Summary, Experience, Education, Skills) to ensure parsing engines don't miss crucial categorization.</li>}
                <li>Use standard formatting. The generated PDF from ResumeForge is already optimized (clean text layer, standard fonts) for high ATS readability.</li>
                <li>Ensure your job titles in the Experience section somewhat mirror the target role title if applicable.</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setShowAtsModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {showPreviewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPreviewModal(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 24,
            width: '95vw', maxWidth: 960, maxHeight: '95vh',
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,.4)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>📄 Resume Preview</div>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>This is exactly how your PDF will look</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="f-select" style={{ padding: '4px 12px', fontSize: '.8rem', height: 'auto', fontWeight: 600 }} value={template} onChange={e => setTemplate(e.target.value)}>
                  {templates.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>⬇ Download PDF</button>
                <button
                  style={{ background:'none',border:'none',fontSize:'1.2rem',cursor:'pointer',color:'var(--muted)',padding:'4px 8px',borderRadius:6 }}
                  onClick={() => setShowPreviewModal(false)}
                >✕</button>
              </div>
            </div>

            {/* Scrollable resume preview at ~85% scale */}
            <div style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden',
              background: '#c8c7c0', borderRadius: 10, padding: 20,
              display: 'flex', justifyContent: 'center',
            }}>
              {(() => {
                const modalZoom = 0.84;
                const mW = Math.round(A4_W_PX * modalZoom);
                const mH = Math.round(A4_H_PX * modalZoom);
                return (
                  <div style={{ width: mW, height: mH, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ transform: `scale(${modalZoom})`, transformOrigin: 'top left', width: A4_W_PX }}>
                      <ResumePreview data={data} template={template} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={(tab) => showToast(tab === 'login' ? 'Welcome back! 👋' : 'Account created successfully! 🎉', 'success')} 
        />
      )}

      <ToastContainer toasts={toasts} />

      </div>{/* end .app */}
    </>
  );
}
