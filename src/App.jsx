import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { initData, SECTIONS, isDone, calcBaseScore, matchKeywords, extractKeywords, analyzeResumeText } from './utils.js';
import { useLocalStorage, useToast, useTheme } from './hooks.js';
import { ToastContainer } from './components/UI.jsx';
import ResumePreview from './components/ResumePreview.jsx';
import { PersonalSection, SummarySection, ExperienceSection,
  EducationSection, SkillsSection, ProjectsSection,
  CertificationsSection, LanguagesSection, CustomSection
} from './components/FormSections.jsx';
import { ImportPanel, JobDescSection } from './components/ImportAndJD.jsx';
import { useAuth } from './AuthContext.jsx';
import AuthModal from './components/AuthModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import WelcomeModal, { hasBeenWelcomed, markWelcomed } from './components/WelcomeModal.jsx';
import TutorialOverlay from './components/TutorialOverlay.jsx';
import { hasDoneTutorial } from './components/tutorialStorage.js';
import { PrivacyPolicyModal, TermsModal } from './components/LegalModals.jsx';
import {
  User, AlignLeft, Briefcase, GraduationCap, Zap, FolderOpen, Award, Globe,
  FolderInput, Target, Upload, PenLine, Sun, Moon, BarChart2, Eye, Download,
  LogIn, CheckCircle2, Wrench, ScanSearch, ChevronRight, ChevronLeft, Sparkles, X,
  Menu, Settings,
} from 'lucide-react';

// A4 dimensions in pixels at 96dpi
const A4_W_PX = 794;
const A4_H_PX = 1123;

const ALL_SECTIONS = [
  { id: 'import', icon: 'import', label: 'Import Resume', special: true },
  { id: 'jd',     icon: 'target', label: 'Job Description', special: true },
  ...SECTIONS,
];

// Map icon string -> Lucide component
const ICON_MAP = {
  'user': User, 'align-left': AlignLeft, 'briefcase': Briefcase,
  'graduation': GraduationCap, 'zap': Zap, 'folder': FolderOpen,
  'award': Award, 'globe': Globe, 'import': FolderInput, 'target': Target,
};
function NavIcon({ name, size = 16 }) {
  const Comp = ICON_MAP[name] || Zap;
  return <Comp size={size} strokeWidth={1.8} />;
}

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [importedFile, setImportedFile] = useState(null);
  const [importedText, setImportedText] = useState('');
  const [importedHtml, setImportedHtml] = useState('');
  const [appMode, setAppMode] = useState('BUILDER'); // 'BUILDER' | 'ANALYZER'
  const editRef = useRef(null);
  const [analyzerTab, setAnalyzerTab] = useState('import'); // 'import' | 'edit' | 'jd'
  const [mobileTutStep, setMobileTutStep] = useLocalStorage('craftcv_mobile_tut_seq', 1); // 1 = step1, 2 = step2, 0 = done
  const [showSplash, setShowSplash] = useState(true);
  const { toasts, show: showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, offer, logout, upgradeToPro, trackDownload, trackAts } = useAuth();

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // ── SESSION ISOLATION: reset ALL resume/session state on logout ──
  // This fires whenever `user` becomes null (logout). It ensures that
  // no data from a previous user's session leaks into the next session.
  useEffect(() => {
    if (!user) {
      setData(initData);
      setJobDesc('');
      setImportedFile(null);
      setImportedText('');
      setImportedHtml('');
      setAppMode('BUILDER');
      setAnalyzerTab('import');
      setMatchedKeywords([]);
    }
  }, [user]);

  // ── Global Escape key: close any open modal ──
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (showAtsModal)     { setShowAtsModal(false);     return; }
      if (showPreviewModal) { setShowPreviewModal(false); return; }
      if (showAuthModal)    { setShowAuthModal(false);    return; }
      if (showProfileModal) { setShowProfileModal(false); return; }
      if (showPrivacy)      { setShowPrivacy(false);      return; }
      if (showTerms)        { setShowTerms(false);        return; }
      if (showMobileSidebar){ setShowMobileSidebar(false);return; }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showAtsModal, showPreviewModal, showAuthModal, showProfileModal, showPrivacy, showTerms, showMobileSidebar]);

  // ATS score = base content score + keyword match bonus
  const analyzerReport = appMode === 'ANALYZER' ? analyzeResumeText(importedText, jobDesc) : null;
  const baseScore = appMode === 'ANALYZER' ? (analyzerReport?.totalScore || 0) : calcBaseScore(data, null, jobDesc);
  const keywords = extractKeywords(jobDesc);
  const kwMatches = appMode === 'ANALYZER' ? matchKeywords(keywords, null, importedText) : matchKeywords(keywords, data);
  const kwFound = kwMatches.filter(m => m.found);
  const kwMissing = kwMatches.filter(m => !m.found);
  const kwMatchPct = keywords.length > 0 ? Math.round((kwFound.length / keywords.length) * 100) : 0;
  const atsScore = jobDesc.length > 20
    ? Math.round(baseScore * 0.6 + kwMatchPct * 0.4)
    : baseScore;

  const scoreClass = atsScore >= 80 ? 'good' : atsScore >= 50 ? 'mid' : 'low';
  const scoreColor = atsScore >= 80 ? 'var(--green)' : atsScore >= 50 ? 'var(--yellow)' : 'var(--red)';

  const handleImport = useCallback((parsed) => {
    setData(parsed);
    setActive('personal');
  }, [setData]);

  const handleImportFile = useCallback((fileData) => {
    setImportedFile(fileData);
    if (fileData) {
      setImportedText(fileData.text || '');
      // Build formatted HTML for the editable preview
      if (fileData.type === 'html' && fileData.content) {
        setImportedHtml(fileData.content);
      } else if (fileData.text) {
        // For PDFs: convert raw text into formatted HTML preserving structure
        const lines = fileData.text.split('\n');
        let htmlParts = [];
        let isFirstContent = true;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            htmlParts.push('<div style="height:8px;"></div>');
            continue;
          }
          // First non-empty line = name/title
          if (isFirstContent) {
            htmlParts.push(`<div style="font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:4px;">${trimmed}</div>`);
            isFirstContent = false;
            continue;
          }
          // Contact info line (contains email/phone/url patterns)
          if (/[@|]/.test(trimmed) && (trimmed.includes('@') || trimmed.includes('linkedin') || /\d{10}/.test(trimmed))) {
            htmlParts.push(`<div style="font-size:11px;color:#555;margin-bottom:10px;word-break:break-all;">${trimmed}</div>`);
            continue;
          }
          // Section headers: ALL CAPS with 3+ chars
          if (/^[A-Z][A-Z\s&\/,.:()_-]{2,}$/.test(trimmed) && trimmed.length < 60) {
            htmlParts.push(`<h3 style="margin:14px 0 5px;font-size:13px;font-weight:800;text-transform:uppercase;border-bottom:2px solid #4361ee;padding-bottom:3px;color:#1a1a2e;letter-spacing:0.5px;">${trimmed}</h3>`);
            continue;
          }
          // Bullet points
          if (/^[•●▪\-\*]/.test(trimmed)) {
            htmlParts.push(`<div style="margin-left:16px;font-size:11.5px;line-height:1.7;color:#333;padding:1px 0;">• ${trimmed.replace(/^[•●▪\-\*]\s*/, '')}</div>`);
            continue;
          }
          // Regular paragraph
          htmlParts.push(`<div style="font-size:11.5px;line-height:1.7;color:#333;margin:1px 0;">${trimmed}</div>`);
        }
        setImportedHtml(htmlParts.join(''));
      }
      setAppMode('ANALYZER');
      setAnalyzerTab('edit');
    }
  }, []);
  const isUserEditing = useRef(false);

  const handleEditInput = useCallback(() => {
    if (editRef.current) {
      isUserEditing.current = true;
      setImportedText(editRef.current.innerText);
      setImportedHtml(editRef.current.innerHTML);
      // Reset flag after React renders
      setTimeout(() => { isUserEditing.current = false; }, 0);
    }
  }, []);

  // Populate the contentEditable div when switching to the edit tab (not during user edits)
  useEffect(() => {
    if (editRef.current && importedHtml && analyzerTab === 'edit' && !isUserEditing.current) {
      editRef.current.innerHTML = importedHtml;
    }
  }, [analyzerTab]);

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

  // Print — track download first, enforce free plan limit
  const handlePrint = async () => {
    setShowPreviewModal(false);
    const result = await trackDownload();
    if (result.allowed === false) {
      showToast(
        result.error || `You've used all your free downloads. Upgrade to Pro for unlimited PDF downloads.`,
        'error',
        5000
      );
      return;
    }
    if (result.downloads_used !== undefined && result.download_limit) {
      const remaining = result.download_limit - result.downloads_used;
      if (remaining === 0) {
        showToast('Last free download used! Upgrade to Pro for unlimited PDFs.', 'info', 4000);
      }
    }
    setTimeout(() => window.print(), 100);
  };

  const handleOpenAts = async () => {
    if (user?.plan === 'pro') {
      setShowAtsModal(true);
      return;
    }
    if (user) {
      try {
        const res = await trackAts();
        if (res.allowed) {
          setShowAtsModal(true);
          const remaining = res.ats_report_limit - res.ats_reports_used;
          if (remaining >= 0) {
            showToast(`ATS Report unlocked (${remaining} free uses remaining)`, 'info', 4000);
          }
        } else {
          showToast(res.error || 'ATS Report limit reached. Upgrade to Pro.', 'error');
        }
      } catch { 
        showToast('Error tracking ATS usage', 'error'); 
        setShowAtsModal(true); // fail open
      }
    } else {
      showToast('Please log in or register to view your ATS Report', 'info');
      setShowAuth(true);
    }
  };

  const sectionProps = { data, onChange: setData, sections: SECTIONS, onNavigate: setActive, onPrint: () => setShowPreviewModal(true) };
  const sectionMap = {
    import: <ImportPanel onImport={handleImport} onImportFile={handleImportFile} onToast={showToast} />,
    jd: <JobDescSection jobDesc={jobDesc} setJobDesc={setJobDesc} data={data} onKeywordsChange={handleKeywordsChange} onImport={handleImport} onToast={showToast} />,
    personal:       <PersonalSection {...sectionProps} />,
    summary:        <SummarySection {...sectionProps} />,
    experience:     <ExperienceSection {...sectionProps} />,
    education:      <EducationSection {...sectionProps} />,
    skills:         <SkillsSection {...sectionProps} matchedSkills={matchedKeywords} />,
    projects:       <ProjectsSection {...sectionProps} />,
    certifications: <CertificationsSection {...sectionProps} />,
    languages:      <LanguagesSection {...sectionProps} />,
    custom:         <CustomSection {...sectionProps} />,
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

      {/* ── SPLASH SCREEN ── */}
      <div className={`splash-screen ${!showSplash ? 'hidden' : ''}`}>
        <div className="splash-logo">C</div>
        <div className="splash-text">Craft<span>CV</span></div>
        <div className="splash-sub">ATS-Optimized Builder</div>
      </div>

      <div className="app" style={{ pointerEvents: showSplash ? 'none' : 'auto' }}>
      {/* ── AUTH INTERCEPTOR (locks interaction if not logged in) ── */}
      {!user && !showSplash && !showAuthModal && (
        <div className="auth-interceptor" onClickCapture={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowAuthModal(true);
        }}>
          {/* Invisible overlay that captures all clicks */}
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="topbar">
        {/* Hamburger - mobile only */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button className="mobile-menu-btn" onClick={() => { setShowMobileSidebar(v => !v); setMobileTutStep(0); }} title="Menu">
            <Menu size={20} strokeWidth={1.8} />
          </button>
          {/* Multi-step Onboarding Tooltip for first-time mobile users */}
          {mobileTutStep > 0 && !showMobileSidebar && (
            <div className="mobile-tutorial-tooltip" style={{
              position: 'absolute', top: 'calc(100% + 14px)', left: 0, width: 280, 
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              color: 'white', padding: '16px 18px', borderRadius: 14, 
              boxShadow: 'var(--shadow-xl)', zIndex: 1000, 
              textAlign: 'left', cursor: 'default'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ position: 'absolute', top: -6, left: 14, width: 14, height: 14, background: 'var(--accent)', transform: 'rotate(45deg)', borderRadius: 2 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '.9rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                  {mobileTutStep === 1 ? '1. Welcome to CraftCV!' : '2. Application Modes'}
                </span>
                <X size={15} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={(e) => { e.stopPropagation(); setMobileTutStep(0); }} />
              </div>
              
              <p style={{ margin: '0 0 16px', fontSize: '.8rem', lineHeight: 1.5, opacity: 0.95, fontWeight: 400 }}>
                {mobileTutStep === 1 ? (
                  <>Tap this <strong>3-line Menu</strong> anytime to access your layout options, resume builder sections, and PDF download.</>
                ) : (
                  <>Inside the menu, toggle between <strong>Builder</strong> mode (create from scratch) and <strong>Analyzer</strong> mode (score an imported resume).</>
                )}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: mobileTutStep === 1 ? 'white' : 'rgba(255,255,255,0.3)' }} />
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: mobileTutStep === 2 ? 'white' : 'rgba(255,255,255,0.3)' }} />
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  {mobileTutStep === 1 ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setMobileTutStep(0); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '.75rem', cursor: 'pointer', fontWeight: 600 }}>Skip</button>
                      <button onClick={(e) => { e.stopPropagation(); setMobileTutStep(2); }} style={{ background: 'white', border: 'none', color: 'var(--accent)', padding: '6px 14px', borderRadius: 8, fontSize: '.75rem', fontWeight: 800, cursor: 'pointer' }}>Next</button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setMobileTutStep(1); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '.75rem', cursor: 'pointer', fontWeight: 600 }}>Back</button>
                      <button onClick={(e) => { e.stopPropagation(); setMobileTutStep(0); }} style={{ background: 'white', border: 'none', color: 'var(--accent)', padding: '6px 14px', borderRadius: 8, fontSize: '.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} strokeWidth={3} /> Got it!</button>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="topbar-brand">
          <div className="brand-icon">C</div>
          <div>
            <div className="brand-name">Craft<span>CV</span></div>
            <div className="brand-tagline">ATS-Optimized Builder</div>
          </div>
        </div>

        <div className="topbar-center" id="tut-ats-score">
          <button className={`ats-score-badge ${scoreClass}`} style={{ cursor: 'pointer' }} onClick={handleOpenAts} title="Click to view detailed ATS Report">
            <div className="score-pulse" style={{ background: scoreColor }} />
            <span>ATS Report: <strong>{atsScore}%</strong></span>
            {atsScore >= 80 && <Sparkles size={13} />}
          </button>
          {jobDesc.length > 20 && (
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: kwMatchPct >= 70 ? 'var(--green)' : 'var(--yellow)' }}>●</span>
              JD match: {kwMatchPct}%
            </div>
          )}
        </div>

        <div className="topbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode" aria-label="Toggle dark mode">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn btn-sm btn-secondary topbar-hide-sm" onClick={() => setActive('import')} style={{ gap: 5 }}>
            <FolderInput size={14} /> Import
          </button>
          <button className="btn btn-sm btn-secondary topbar-hide-sm" onClick={handleClear}>Clear</button>
          <button className="btn btn-sm btn-secondary topbar-hide-sm" onClick={handleOpenAts} style={{ gap: 5 }}>
            <BarChart2 size={14} /> ATS Report
          </button>
          <button className="btn btn-sm btn-secondary topbar-hide-sm" onClick={() => setShowPreviewModal(true)} style={{ gap: 5 }}>
            <Eye size={14} /> Preview
          </button>
          <button id="tut-download" className="btn btn-sm btn-primary" onClick={handlePrint} style={{ gap: 5 }}>
            <Download size={14} /> <span className="topbar-hide-xs">Download PDF</span>
          </button>
          {!user ? (
            <button className="btn btn-sm btn-primary" onClick={() => setShowAuthModal(true)} style={{ gap: 5 }}>
              <LogIn size={14} /> <span className="topbar-hide-xs">Sign In</span>
            </button>
          ) : (
            <button
              className="profile-pill"
              onClick={() => setShowProfileModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 12px', background: 'var(--surface2)', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <span className="profile-pill-name" style={{ fontSize: '.8rem', fontWeight: 600 }}>{user.name?.split(' ')[0]}</span>
              <span className="profile-pill-icon" style={{ background: 'var(--border)', borderRadius: '50%', padding: 4 }}><User size={13} strokeWidth={2.5} /></span>
            </button>
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

        {/* ── MOBILE SIDEBAR OVERLAY ── */}
        {showMobileSidebar && (
          <div className="mobile-sidebar-overlay" onClick={() => setShowMobileSidebar(false)}>
            <div className="mobile-sidebar-drawer" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--ink)', fontFamily: 'Outfit, sans-serif' }}>Menu</div>
                <button onClick={() => setShowMobileSidebar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
              {/* same sidebar content injected here */}
              <div style={{ padding: '10px 10px', overflowY: 'auto', flex: 1 }}>
                {/* ── MODE TOGGLE ── */}
                <div style={{ display: 'flex', gap: 4, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
                   <button onClick={() => setAppMode('BUILDER')} className={`btn btn-sm ${appMode === 'BUILDER' ? 'btn-primary' : 'btn-secondary'} w-full`} style={{ justifyContent: 'center', gap: 5 }}><Wrench size={13} /> Builder</button>
                   <button onClick={() => { if (importedFile) { setAppMode('ANALYZER'); setAnalyzerTab('edit'); } else { setAppMode('ANALYZER'); setAnalyzerTab('import'); } }} className={`btn btn-sm ${appMode === 'ANALYZER' ? 'btn-primary' : 'btn-secondary'} w-full`} style={{ justifyContent: 'center', gap: 5 }}><ScanSearch size={13} /> Analyzer</button>
                </div>

                {appMode === 'BUILDER' ? (
                  <>
                    <div className="sidebar-section-label">Tools</div>
                    {ALL_SECTIONS.filter(s => s.special).map(s => (
                      <button key={s.id} className={`nav-item special-nav${active === s.id ? ' active' : ''}`} onClick={() => { setActive(s.id); setShowMobileSidebar(false); }}>
                        <span className="nav-icon"><NavIcon name={s.icon} /></span>
                        <span className="nav-label">{s.label}</span>
                      </button>
                    ))}
                    <div className="sidebar-section-label">Resume Sections</div>
                    {SECTIONS.map(s => (
                      <button key={s.id} className={`nav-item${active === s.id ? ' active' : ''}`} onClick={() => { setActive(s.id); setShowMobileSidebar(false); }}>
                        <span className="nav-icon"><NavIcon name={s.icon} /></span>
                        <span className="nav-label">{s.label}</span>
                        {isDone(s.id, data) ? <span className="nav-done"><CheckCircle2 size={14} strokeWidth={2} /></span> : null}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="sidebar-section-label">Analyzer Tools</div>
                    <button className={`nav-item special-nav${analyzerTab === 'import' ? ' active' : ''}`} onClick={() => { setAnalyzerTab('import'); setShowMobileSidebar(false); }}>
                      <span className="nav-icon"><Upload size={15} strokeWidth={1.8} /></span><span className="nav-label">Upload Resume</span>
                    </button>
                    <button className={`nav-item special-nav${analyzerTab === 'edit' ? ' active' : ''}`} onClick={() => { setAnalyzerTab('edit'); setShowMobileSidebar(false); }} disabled={!importedFile}>
                      <span className="nav-icon"><PenLine size={15} strokeWidth={1.8} /></span><span className="nav-label">Edit Resume Text</span>
                    </button>
                    <button className={`nav-item special-nav${analyzerTab === 'jd' ? ' active' : ''}`} onClick={() => { setAnalyzerTab('jd'); setShowMobileSidebar(false); }}>
                      <span className="nav-icon"><Target size={15} strokeWidth={1.8} /></span><span className="nav-label">Job Description</span>
                    </button>
                  </>
                )}
                <div style={{ padding: '16px 10px 4px', borderTop: '1px solid var(--border)', marginTop: 12 }}>
                  <button className="btn btn-primary w-full" onClick={() => { handlePrint(); setShowMobileSidebar(false); }} style={{ justifyContent: 'center', gap: 6 }}>
                    <Download size={14} /> Download PDF
                  </button>
                  <button className="btn btn-secondary w-full" style={{ justifyContent: 'center', marginTop: 8 }} onClick={() => { setShowPreviewModal(true); setShowMobileSidebar(false); }}>
                    <Eye size={14} /> Preview Resume
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          {/* ── MODE TOGGLE ── */}
          <div id="tut-mode-toggle" style={{ display: 'flex', gap: 4, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
             <button onClick={() => setAppMode('BUILDER')} className={`btn btn-sm ${appMode === 'BUILDER' ? 'btn-primary' : 'btn-secondary'} w-full`} style={{ justifyContent: 'center', gap: 5 }}><Wrench size={13} /> Builder</button>
             <button onClick={() => { if (importedFile) { setAppMode('ANALYZER'); setAnalyzerTab('edit'); } else { setAppMode('ANALYZER'); setAnalyzerTab('import'); } }} className={`btn btn-sm ${appMode === 'ANALYZER' ? 'btn-primary' : 'btn-secondary'} w-full`} style={{ justifyContent: 'center', gap: 5 }}><ScanSearch size={13} /> Analyzer</button>
          </div>

          {appMode === 'BUILDER' ? (
            <>
              <div className="sidebar-section-label">Tools</div>
              {ALL_SECTIONS.filter(s => s.special).map(s => (
                <button
                  key={s.id}
                  className={`nav-item special-nav${active === s.id ? ' active' : ''}`}
                  onClick={() => setActive(s.id)}
                >
                  <span className="nav-icon"><NavIcon name={s.icon} /></span>
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

              <div id="tut-sidebar-nav" className="sidebar-section-label">Resume Sections</div>
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  className={`nav-item${active === s.id ? ' active' : ''}`}
                  onClick={() => setActive(s.id)}
                >
                  <span className="nav-icon"><NavIcon name={s.icon} /></span>
                  <span className="nav-label">{s.label}</span>
                  {isDone(s.id, data)
                    ? <span className="nav-done"><CheckCircle2 size={14} strokeWidth={2} /></span>
                    : active === s.id ? <span className="nav-badge">Edit</span> : null
                  }
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="sidebar-section-label">Analyzer Tools</div>
              <button className={`nav-item special-nav${analyzerTab === 'import' ? ' active' : ''}`} onClick={() => setAnalyzerTab('import')}>
                <span className="nav-icon"><Upload size={15} strokeWidth={1.8} /></span><span className="nav-label">Upload Resume</span>
              </button>
              <button className={`nav-item special-nav${analyzerTab === 'edit' ? ' active' : ''}`} onClick={() => setAnalyzerTab('edit')} disabled={!importedFile}>
                <span className="nav-icon"><PenLine size={15} strokeWidth={1.8} /></span><span className="nav-label">Edit Resume Text</span>
              </button>
              <button id="tut-jd-section" className={`nav-item special-nav${analyzerTab === 'jd' ? ' active' : ''}`} onClick={() => setAnalyzerTab('jd')}>
                <span className="nav-icon"><Target size={15} strokeWidth={1.8} /></span><span className="nav-label">Job Description</span>
                {jobDesc.length > 20 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '.65rem', fontWeight: 700,
                    padding: '2px 7px', borderRadius: 10,
                    background: kwMatchPct >= 70 ? 'var(--green)' : 'var(--yellow)',
                    color: 'white',
                  }}>{kwMatchPct}%</span>
                )}
              </button>
            </>
          )}

          {/* Strength meter */}
          <div className="sidebar-strength" style={{ cursor: 'pointer' }} onClick={handleOpenAts} title="View Detailed ATS Report">
            <div className="strength-label">{appMode === 'ANALYZER' ? 'Uploaded Resume Strength' : 'Resume Strength'}</div>
            <div className="strength-bar-bg">
              <div className="strength-bar-fill" style={{ width: `${atsScore}%` }} />
            </div>
            <div className="strength-pct" style={{ color: scoreColor }}>{atsScore}%</div>
            <div className="strength-msg">
              {atsScore < 40 ? 'Keep filling sections!'
                : atsScore < 65 ? 'Looking good, keep going!'
                : atsScore < 85 ? 'Almost there — add JD keywords!'
                : 'Excellent resume! Ready to apply.'}
            </div>
          </div>
        </div>

        {/* ── FORM PANEL ── */}
        <div className="form-panel">
          {appMode === 'ANALYZER' ? (
             analyzerTab === 'import' ? (
               <ImportPanel onImport={handleImport} onImportFile={handleImportFile} onToast={showToast} />
             ) : analyzerTab === 'edit' ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div>
                     <div className="section-title">Edit Uploaded Resume</div>
                     <div className="section-desc">Click anywhere on the resume below to edit. Changes update your ATS Score live.</div>
                   </div>
                   <button
                     className="btn btn-sm btn-primary"
                     style={{ whiteSpace: 'nowrap' }}
                     onClick={() => {
                       if (!editRef.current) return;
                       const printWin = window.open('', '_blank');
                       printWin.document.write(`<!DOCTYPE html><html><head><title>Resume</title><style>body{font-family:"Segoe UI",system-ui,sans-serif;padding:40px 60px;color:#222;font-size:12px;line-height:1.6;}h3{margin:14px 0 5px;font-size:13px;font-weight:800;text-transform:uppercase;border-bottom:2px solid #4361ee;padding-bottom:3px;color:#1a1a2e;letter-spacing:0.5px;} @media print{body{padding:20px 40px;}}</style></head><body>${editRef.current.innerHTML}</body></html>`);
                       printWin.document.close();
                       printWin.focus();
                       setTimeout(() => { printWin.print(); printWin.close(); }, 300);
                       showToast('Print dialog opened — save as PDF!', 'success');
                     }}
                   >⬇ Save as PDF</button>
                 </div>
                 <div
                   ref={editRef}
                   contentEditable
                   suppressContentEditableWarning
                   onInput={handleEditInput}
                   style={{
                     width: '100%', minHeight: 600, padding: '40px 48px', boxSizing: 'border-box',
                     background: 'white', color: '#222', borderRadius: 10,
                     boxShadow: '0 2px 16px rgba(0,0,0,.08)',
                     border: '1px solid var(--border)',
                     fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
                     fontSize: '12px', lineHeight: 1.6,
                     outline: 'none', cursor: 'text',
                     overflowY: 'auto',
                   }}
                 />
               </div>
             ) : (
               <JobDescSection jobDesc={jobDesc} setJobDesc={setJobDesc} data={data} onKeywordsChange={handleKeywordsChange} text={importedText} onImport={handleImport} onToast={showToast} />
             )
          ) : (
             sectionMap[active]
          )}
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="preview-panel">
          <div className="preview-toolbar">
            <span className="preview-label">{appMode === 'ANALYZER' ? 'Uploaded Resume' : 'Live Preview'}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {appMode === 'BUILDER' && (
                <select className="f-select" style={{ padding: '2px 8px', fontSize: '.7rem', height: 26 }} value={template} onChange={e => setTemplate(e.target.value)}>
                  {templates.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              )}
              <div className="zoom-ctrl">
                <button className="zoom-btn" onClick={() => setZoom(z => Math.max(.35, +(z - .06).toFixed(2)))}>−</button>
                <span className="zoom-val">{Math.round(zoom * 100)}%</span>
                <button className="zoom-btn" onClick={() => setZoom(z => Math.min(.9, +(z + .06).toFixed(2)))}>+</button>
              </div>
            </div>
          </div>

          {/* Preview content */}
          <div style={{ width: scaledW, height: scaledH, overflow: 'hidden', margin: '0 auto', background: appMode === 'ANALYZER' ? 'white' : 'transparent' }}>
            {appMode === 'ANALYZER' && importedFile ? (
              importedFile.type === 'pdf' ? (
                <iframe src={importedFile.url + '#toolbar=0&navpanes=0&scrollbar=0'} width="100%" height="100%" style={{ border: 'none', width: A4_W_PX, height: A4_H_PX, transform: `scale(${zoom})`, transformOrigin: 'top left' }} />
              ) : (
                <div style={{ width: A4_W_PX, height: A4_H_PX, transform: `scale(${zoom})`, transformOrigin: 'top left', overflow: 'auto', padding: 40, boxSizing: 'border-box', background: 'white', color: 'black' }} dangerouslySetInnerHTML={{ __html: importedFile.content }} />
              )
            ) : appMode === 'ANALYZER' && !importedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '.85rem', textAlign: 'center', padding: 40 }}>Upload a resume using the sidebar to see the preview here.</div>
            ) : (
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: A4_W_PX }}>
                <ResumePreview data={data} template={template} />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── FOOTER ── */}
      <div style={{
        height: 32, flexShrink: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, fontSize: '.67rem', color: 'var(--muted)', flexWrap: 'wrap', padding: '0 12px',
      }}>
        <span>© {new Date().getFullYear()} CraftCV</span>
        <span style={{ opacity: .4 }}>·</span>
        <span>Powered by <strong style={{ color: 'var(--ink2)', fontWeight: 700 }}>Jobin Joseph</strong></span>
        <span style={{ opacity: .4 }}>·</span>
        <button onClick={() => setShowPrivacy(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>Privacy</button>
        <span style={{ opacity: .4 }}>·</span>
        <button onClick={() => setShowTerms(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>Terms</button>
      </div>

      {/* ── ATS REPORT MODAL ── */}
      {showAtsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAtsModal(false)}>
          <div className="modal" style={{ maxWidth: 750, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">ATS Compatibility Report</div>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>{appMode === 'ANALYZER' ? 'Detailed analysis of your uploaded resume' : 'Analysis based on resume completeness and Job Description match'}</div>
              </div>
              <button className="modal-close" onClick={() => setShowAtsModal(false)}><X size={16} strokeWidth={2} /></button>
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
                  {atsScore >= 80 ? 'Your resume is highly optimized for ATS.' : atsScore >= 50 ? 'Fair foundation but missing critical keywords or sections.' : 'Significant improvements needed to pass ATS screening.'}
                </p>
                {jobDesc.length > 20 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: '.75rem' }}>
                    <span>Content: <strong style={{ color: baseScore >= 70 ? 'var(--green)' : 'var(--yellow)' }}>{baseScore}%</strong></span>
                    <span>JD Match: <strong style={{ color: kwMatchPct >= 60 ? 'var(--green)' : 'var(--red)' }}>{kwMatchPct}%</strong></span>
                    <span style={{ color: 'var(--muted)' }}>Formula: 60% content + 40% JD</span>
                  </div>
                )}
              </div>
            </div>

            {/* Analyzer mode: detailed category breakdown */}
            {appMode === 'ANALYZER' && analyzerReport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, position: 'relative' }}>
                <div style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Category Breakdown</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analyzerReport.checks.map((check, i) => (
                    <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--ink)' }}>{check.icon} {check.category}</span>
                        <span style={{ fontSize: '.75rem', fontWeight: 800, color: check.score >= check.maxScore ? 'var(--green)' : check.score >= check.maxScore * 0.5 ? 'var(--yellow)' : 'var(--red)' }}>{check.score}/{check.maxScore}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ width: `${(check.score / check.maxScore) * 100}%`, height: '100%', background: check.score >= check.maxScore ? 'var(--green)' : check.score >= check.maxScore * 0.5 ? 'var(--yellow)' : 'var(--red)', borderRadius: 2, transition: 'width .3s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {check.details.map((d, j) => (
                          <div key={j} style={{ fontSize: '.72rem', color: d.ok ? 'var(--green)' : 'var(--red)' }}>
                            {d.ok ? '✓' : '✗'} {d.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Builder mode: simple content checks */}
            {appMode === 'BUILDER' && (
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
                    <div style={{ fontSize: '.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>Paste a job description to unlock keyword matching.</div>
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
                        <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>✗ Missing ({kwMissing.length})</div>
                        <div className="keyword-chips">
                          {kwMissing.slice(0, 10).map(m => <span key={m.keyword} className="keyword-chip missing" style={{ padding: '2px 6px', fontSize: '.65rem' }}>{m.keyword}</span>)}
                          {kwMissing.length > 10 && <span style={{ fontSize: '.65rem', color: 'var(--muted)', alignSelf: 'center' }}>+{kwMissing.length - 10} more</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analyzer JD Keywords */}
            {appMode === 'ANALYZER' && jobDesc.length > 20 && (
              <div className="form-card" style={{ padding: 16, margin: '0 0 16px' }}>
                <div style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--ink)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>Job Description Match: <span style={{ color: kwMatchPct >= 60 ? 'var(--green)' : 'var(--red)' }}>{kwMatchPct}%</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✓ Found ({kwFound.length})</div>
                    <div className="keyword-chips">
                      {kwFound.map(m => <span key={m.keyword} className="keyword-chip found" style={{ padding: '2px 6px', fontSize: '.65rem' }}>{m.keyword}</span>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>✗ Missing ({kwMissing.length})</div>
                    <div className="keyword-chips">
                      {kwMissing.map(m => <span key={m.keyword} className="keyword-chip missing" style={{ padding: '2px 6px', fontSize: '.65rem' }}>{m.keyword}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 8, padding: 16, background: 'var(--accent-light)', border: '1px solid var(--accent-mid)', borderRadius: 12 }}>
              <h4 style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>💡 Recommendations</h4>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: '.8rem', color: 'var(--ink2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {kwMissing.length > 0 && <li>Add missing keywords like <strong>{kwMissing.slice(0, 3).map(m => m.keyword).join(', ')}</strong> naturally into your experience or summary.</li>}
                {appMode === 'ANALYZER' && analyzerReport && analyzerReport.checks.filter(c => c.score < c.maxScore).slice(0, 3).map((c, i) => (
                  <li key={i}>Improve <strong>{c.category}</strong> ({c.score}/{c.maxScore}) — {c.details.filter(d => !d.ok).map(d => d.label).join('; ')}</li>
                ))}
                {baseScore < 80 && <li>Ensure all standard sections (Summary, Experience, Education, Skills) are present.</li>}
                <li>Use standard formatting. Avoid tables, images, and fancy fonts that ATS parsers may not read.</li>
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

      {/* ── PROFILE MODAL ── */}
      {showProfileModal && (
        <ProfileModal 
          onClose={() => setShowProfileModal(false)}
          showToast={showToast}
        />
      )}

      {/* ── AUTH MODAL ── */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={(tab, userName) => {
            setShowAuthModal(false);

            // ALWAYS wipe all session state on every login/register.
            // This prevents data from a previous user's session leaking
            // into the newly authenticated user's view.
            setData(initData);
            setJobDesc('');
            setImportedFile(null);
            setImportedText('');
            setImportedHtml('');
            setAppMode('BUILDER');
            setAnalyzerTab('import');
            setMatchedKeywords([]);

            if (tab === 'register') {
              // Launch Welcome flow ONLY on new registration
              setWelcomeName(userName || '');
              setTimeout(() => setShowWelcome(true), 150);
            } else {
              showToast('Welcome back! 👋', 'success');
            }
          }} 
        />
      )}

      <ToastContainer toasts={toasts} />

      {/* ── WELCOME / ONBOARDING MODAL ── */}
      {showWelcome && (
        <WelcomeModal
          userName={welcomeName}
          onClose={() => {
            setShowWelcome(false);
            showToast(`Welcome aboard, ${welcomeName?.split(' ')[0] || 'friend'}! 🎉`, 'success');
            // Launch tutorial after a short delay so the modal fully unmounts
            setTimeout(() => setShowTutorial(true), 400);
          }}
        />
      )}

      {/* ── TUTORIAL OVERLAY ── */}
      {showTutorial && (
        <TutorialOverlay onDone={() => setShowTutorial(false)} />
      )}

      {/* ── LEGAL MODALS ── */}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      {showTerms   && <TermsModal        onClose={() => setShowTerms(false)} />}

      </div>{/* end .app */}
    </>
  );
}
