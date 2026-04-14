import { useState, useRef } from 'react';
import { extractKeywords, matchKeywords, parseResumeText } from '../utils.js';
import { useAuth } from '../AuthContext.jsx';

// ── Resume Import Panel ──────────────────────────────────────────
export function ImportPanel({ onImport, onImportFile, onToast }) {
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const processFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    setStatus('loading');
    setMessage('Loading preview...');

    try {
      if (name.endsWith('.pdf')) {
        const [pdfjsLib, { default: workerUrl }] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // Use Y-coordinates to detect line breaks
          let lastY = null;
          let line = '';
          for (const item of content.items) {
            const y = item.transform ? item.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
              fullText += line.trim() + '\n';
              line = '';
            }
            line += item.str + ' ';
            lastY = y;
          }
          if (line.trim()) fullText += line.trim() + '\n';
          fullText += '\n'; // page break
        }
        const url = URL.createObjectURL(file);
        if (onImportFile) onImportFile({ type: 'pdf', url, text: fullText });
        setStatus('success');
        setMessage('Preview loaded directly in the right panel.');
        onToast('Resume preview loaded!', 'success');
      } else if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        // Clone for dual conversion
        const bufferCopy = arrayBuffer.slice(0);
        const [htmlResult, textResult] = await Promise.all([
           mammoth.convertToHtml({ arrayBuffer }),
           mammoth.extractRawText({ arrayBuffer: bufferCopy })
        ]);
        if (onImportFile) onImportFile({ type: 'html', content: htmlResult.value, text: textResult.value });
        setStatus('success');
        setMessage('Preview loaded directly in the right panel.');
        onToast('Resume preview loaded!', 'success');
      } else if (name.endsWith('.txt')) {
        const text = await file.text();
        if (onImportFile) onImportFile({ type: 'html', content: `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px;">${text}</pre>`, text });
        setStatus('success');
        setMessage('Preview loaded directly in the right panel.');
        onToast('Resume preview loaded!', 'success');
      } else {
        setStatus('error');
        setMessage('Unsupported file format. Please use PDF, DOCX, or TXT.');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(`Error loading file: ${err.message}`);
      onToast('Failed to load preview.', 'error');
    }
  };

  const onFileChange = (e) => processFile(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    processFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title">📂 Import Existing Resume</div>
        <div className="section-desc">Upload your current resume to auto-fill the form fields. We'll extract the data and you can refine it.</div>
      </div>

      <div className="form-card">
        <div
          className={`import-zone${drag ? ' dragover' : ''}`}
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <div className="import-zone-icon">📄</div>
          <div className="import-zone-title">{drag ? 'Drop your resume here!' : 'Drop your resume here or click to browse'}</div>
          <div className="import-zone-sub">We'll automatically extract your information</div>
          <div className="import-formats">
            <span className="import-format-tag">PDF</span>
            <span className="import-format-tag">DOCX</span>
            <span className="import-format-tag">TXT</span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {status && (
          <div className={`import-status ${status}`}>
            {status === 'loading' && '⏳'}
            {status === 'success' && '✓'}
            {status === 'error' && '✕'}
            {message}
          </div>
        )}
      </div>

      <div className="form-card" style={{ marginTop: 14 }}>
        <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>💡 How Import Works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['📧 Contact info', 'Email, phone, LinkedIn, and GitHub are detected automatically'],
            ['📝 Summary', 'Your profile/objective paragraph is extracted if present'],
            ['⚡ Skills', 'Skill lists are parsed from the Skills section of your resume'],
            ['✏️ Manual review', 'Work experience and education are harder to parse — you may need to fill those in manually'],
          ].map(([label, desc]) => (
            <div key={label} style={{ display: 'flex', gap: 10, fontSize: '.8rem' }}>
              <span style={{ flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'var(--muted)' }}>— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Job Description Analyzer ─────────────────────────────────────
export function JobDescSection({ jobDesc, setJobDesc, data, onKeywordsChange, text = null }) {
  const [showAll, setShowAll] = useState(false);
  const keywords = extractKeywords(jobDesc);
  const matches = matchKeywords(keywords, data, text);
  const found = matches.filter(m => m.found);
  const missing = matches.filter(m => !m.found);
  const matchPct = keywords.length > 0 ? Math.round((found.length / keywords.length) * 100) : 0;

  // Notify parent about matched keywords (for chip highlighting)
  const matchedKws = found.map(m => m.keyword.toLowerCase());

  const barColor = matchPct >= 70 ? 'var(--green)' : matchPct >= 40 ? 'var(--yellow)' : 'var(--red)';

  const displayedMissing = showAll ? missing : missing.slice(0, 10);
  
  const { user, offer } = useAuth();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleOptimize = async () => {
    if (!offer?.is_active || !offer?.ai_optimize_free) {
      setShowUpgradeModal(true);
      return;
    }
    
    if (!user) {
      // Must be logged in even for free offer
      alert('Please Login or Sign Up to use AI features.');
      return;
    }

    if (data.experience.length === 0) {
      setAiError('Please add at least one work experience section to optimize.');
      return;
    }

    setIsOptimizing(true);
    setAiError('');

    try {
      const API = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api');
      const res = await fetch(`${API}/optimize/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: data, jobDesc })
      });
      const result = await res.json();
      
      if (res.ok) {
        alert('Optimization successful (mock alert, see console for response)');
        console.log(result.optimizedBullets);
      } else {
        setAiError(result.error || 'Optimization failed.');
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title">🎯 Job Description Analyzer</div>
        <div className="section-desc">Paste the job description below. We extract keywords and show how well your resume matches.</div>
      </div>

      <div className="jd-panel">
        <div className="form-group">
          <label className="f-label">Job Description</label>
          <textarea
            className="f-textarea"
            style={{ minHeight: 160 }}
            placeholder="Paste the full job description here...&#10;&#10;We're looking for a Senior React Developer with experience in TypeScript, Node.js, AWS, and Agile methodology. The ideal candidate has 5+ years of experience building production-scale applications..."
            value={jobDesc}
            onChange={e => {
              setJobDesc(e.target.value);
              onKeywordsChange(matchKeywords(extractKeywords(e.target.value), data, text).filter(m => m.found).map(m => m.keyword.toLowerCase()));
            }}
          />
        </div>
      </div>

      {keywords.length > 0 && (
        <>
          <div className="jd-panel" style={{ marginTop: 10 }}>
            <div className="match-bar-container">
              <div className="match-bar-label">
                <span>Keyword Match Rate</span>
                <span style={{ color: barColor, fontWeight: 800 }}>{matchPct}% ({found.length}/{keywords.length})</span>
              </div>
              <div className="match-bar">
                <div className="match-bar-fill" style={{ width: `${matchPct}%`, background: barColor }} />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {found.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--green)', marginBottom: 5 }}>
                    ✓ Found in your resume ({found.length})
                  </div>
                  <div className="keyword-chips">
                    {found.map(m => <span key={m.keyword} className="keyword-chip found">{m.keyword}</span>)}
                  </div>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--red)', marginBottom: 5 }}>
                    ✕ Missing from your resume ({missing.length})
                  </div>
                  <div className="keyword-chips">
                    {displayedMissing.map(m => <span key={m.keyword} className="keyword-chip missing">{m.keyword}</span>)}
                    {missing.length > 10 && (
                      <button
                        onClick={() => setShowAll(v => !v)}
                        style={{ fontSize: '.7rem', fontWeight: 600, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '2px 6px' }}
                      >
                        {showAll ? 'Show less' : `+${missing.length - 10} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 16 }}>
                <button 
                  className="btn btn-primary w-full" 
                  disabled={isOptimizing || !jobDesc}
                  onClick={handleOptimize}
                  style={{ justifyContent: 'center', background: 'linear-gradient(90deg, var(--accent), var(--purple))', border: 'none' }}
                >
                  {isOptimizing ? '✨ Optimizing...' : '✨ Auto-Optimize with AI'}
                </button>
                {aiError && <div style={{ color: 'var(--red)', fontSize: '.75rem', marginTop: 8, textAlign: 'center' }}>⚠️ {aiError}</div>}
              </div>
            </div>
          </div>
          <div className="ats-tips" style={{ marginTop: 10 }}>
            <div className="ats-tips-title">💡 How to improve your match</div>
            {matchPct < 40 && <div className="ats-tip">Your resume needs significant keyword alignment. Add the missing terms to your Skills and Summary sections.</div>}
            {matchPct >= 40 && matchPct < 70 && <div className="ats-tip">Good start! Add the missing keywords naturally to your Summary, Experience bullets, or Skills.</div>}
            {matchPct >= 70 && <div className="ats-tip">Excellent keyword match! Your resume is well-aligned with this job description.</div>}
            <div className="ats-tip">Don't force-insert keywords — weave them naturally into context.</div>
            <div className="ats-tip">Add missing technical skills to the Skills section only if you actually have them.</div>
          </div>
        </>
      )}

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUpgradeModal(false)}>
          <div className="modal" style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', margin: '10px 0 20px' }}>🚀</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 10 }}>Premium AI Features</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.5, marginBottom: 24 }}>
              AI Optimization is currently available exclusively during active promotional periods or via ResumeForge Pro.
            </p>
            
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
              <div style={{ fontWeight: 800, color: 'var(--ink)' }}>ResumeForge Pro</div>
              <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.4rem', margin: '4px 0' }}>₹499<span style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 600 }}>/mo</span></div>
              <div style={{ color: 'var(--ink2)', fontSize: '.8rem', fontWeight: 600, marginTop: 4 }}>
                Payments Integration Coming Soon!
              </div>
            </div>

            <button className="btn btn-secondary w-full" onClick={() => setShowUpgradeModal(false)} style={{ justifyContent: 'center' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
