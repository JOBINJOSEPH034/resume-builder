import { fmtMonth } from '../utils.js';

// Helper to render shared contact info
const renderContacts = (contacts, sep) => contacts.map((c, i) => (
  <span key={c}>{c}{i < contacts.length - 1 && <span className="r-contact-sep" style={{ margin: '0 6px', opacity: 0.5 }}>{sep}</span>}</span>
));

// ── 1. Classic Template ───────────────────────────────────────────
function ClassicResume({ data }) {
  const p = data.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
  const contacts = [p.email, p.phone, p.location, p.linkedin, p.github, p.website].filter(Boolean);

  return (
    <div className="resume tmpl-classic">
      <div className="r-header" style={{ textAlign: 'center', marginBottom: 15, borderBottom: '2px solid #333', paddingBottom: 10 }}>
        <div className="r-name" style={{ fontSize: '24pt', fontWeight: 800 }}>{fullName || 'Your Name'}</div>
        {p.title && <div className="r-title" style={{ fontSize: '12pt', marginBottom: 4 }}>{p.title}</div>}
        <div className="r-contact" style={{ fontSize: '9pt', color: '#444' }}>
          {contacts.length > 0 ? renderContacts(contacts, '|') : 'email | phone | location'}
        </div>
      </div>
      {data.summary && (
        <div className="r-section">
          <div className="r-section-title">Professional Summary</div>
          <div className="r-summary">{data.summary}</div>
        </div>
      )}
      {data.experience.some(e => e.jobTitle || e.company) && (
        <div className="r-section">
          <div className="r-section-title">Work Experience</div>
          {data.experience.filter(e => e.jobTitle || e.company).map(exp => (
            <div className="r-exp-item" key={exp.id}>
              <div className="r-exp-header">
                <span className="r-exp-title" style={{ fontWeight: 700 }}>{exp.jobTitle}</span>
                <span className="r-exp-dates">{fmtMonth(exp.startDate)}{(exp.startDate && (exp.current || exp.endDate)) ? ' – ' : ''}{exp.current ? 'Present' : fmtMonth(exp.endDate)}</span>
              </div>
              <div className="r-exp-company" style={{ fontStyle: 'italic', marginBottom: 4 }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</div>
              {exp.bullets && (
                <ul className="r-bullets">
                  {exp.bullets.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {data.education.some(e => e.school) && (
        <div className="r-section">
          <div className="r-section-title">Education</div>
          {data.education.filter(e => e.school).map(edu => (
            <div className="r-edu-item" key={edu.id}>
              <div className="r-edu-header">
                <span className="r-edu-degree" style={{ fontWeight: 700 }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}</span>
                <span className="r-edu-dates">{fmtMonth(edu.startDate)}{edu.startDate && edu.endDate ? ' – ' : ''}{fmtMonth(edu.endDate)}</span>
              </div>
              <div className="r-edu-school">{edu.school}{edu.location ? ` · ${edu.location}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      {data.skills.some(s => s.skills.length > 0) && (
        <div className="r-section">
          <div className="r-section-title">Skills</div>
          {data.skills.filter(s => s.skills.length > 0).map(sg => (
            <div className="r-skills-block" key={sg.id}>
              <strong>{sg.category || 'Skills'}: </strong><span>{sg.skills.join(', ')}</span>
            </div>
          ))}
        </div>
      )}
      {data.projects.some(p => p.name) && (
        <div className="r-section">
          <div className="r-section-title">Projects</div>
          {data.projects.filter(p => p.name).map(proj => (
            <div className="r-proj-item" key={proj.id} style={{ marginBottom: 6 }}>
              <div className="r-proj-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong className="r-proj-name">{proj.name}</strong>
                {proj.link && <span className="r-proj-link" style={{ fontSize: '8pt', color: '#555' }}>{proj.link}</span>}
              </div>
              {proj.tech && <div className="r-proj-tech" style={{ fontSize: '8pt', fontStyle: 'italic' }}>Tech: {proj.tech}</div>}
              {proj.desc && <div className="r-proj-desc" style={{ marginTop: 2 }}>{proj.desc}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 2. Modern Template (Blue Header) ─────────────────────────────
function ModernResume({ data }) {
  const p = data.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
  const contacts = [p.email, p.phone, p.location, p.linkedin, p.github, p.website].filter(Boolean);

  return (
    <div className="resume tmpl-modern">
      <div className="r-header-modern" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', padding: '24px 28px' }}>
        <div className="r-name" style={{ fontSize: '26pt', fontWeight: 800, margin: 0 }}>{fullName || 'Your Name'}</div>
        {p.title && <div style={{ fontSize: '11pt', fontWeight: 600, opacity: 0.9, marginTop: 4 }}>{p.title}</div>}
        <div style={{ marginTop: 10, fontSize: '8pt', opacity: 0.85 }}>{renderContacts(contacts, '•')}</div>
      </div>
      <div className="r-body" style={{ padding: '20px 28px' }}>
        {data.summary && (
          <div className="r-section"><div className="r-section-title" style={{ color: '#1e3c72', borderBottom: '1px solid #ddd' }}>Profile</div><div className="r-summary">{data.summary}</div></div>
        )}
        {data.experience.some(e => e.company) && (
          <div className="r-section"><div className="r-section-title" style={{ color: '#1e3c72', borderBottom: '1px solid #ddd' }}>Experience</div>
            {data.experience.filter(e => e.company).map(exp => (
              <div key={exp.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#222' }}>
                  <span>{exp.jobTitle}</span><span>{fmtMonth(exp.startDate)} – {exp.current ? 'Present' : fmtMonth(exp.endDate)}</span>
                </div>
                <div style={{ color: '#1e3c72', fontWeight: 600, fontSize: '9pt', marginBottom: 4 }}>{exp.company}</div>
                <ul className="r-bullets">{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        {data.education.some(e => e.school) && (
          <div className="r-section"><div className="r-section-title" style={{ color: '#1e3c72', borderBottom: '1px solid #ddd' }}>Education</div>
            {data.education.filter(e => e.school).map(edu => (
              <div key={edu.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>{[edu.degree, edu.field].filter(Boolean).join(', ')}</span><span>{fmtMonth(edu.endDate)}</span></div>
                <div style={{ color: '#555' }}>{edu.school}</div>
              </div>
            ))}
          </div>
        )}
        {data.skills.some(s => s.skills.length > 0) && (
          <div className="r-section"><div className="r-section-title" style={{ color: '#1e3c72', borderBottom: '1px solid #ddd' }}>Skills</div>
            {data.skills.filter(s => s.skills.length > 0).map(sg => (
              <div key={sg.id} style={{ marginBottom: 4 }}><strong>{sg.category || 'Skills'}: </strong><span>{sg.skills.join(', ')}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3. Minimal Template ──────────────────────────────────────────
function MinimalResume({ data }) {
  const p = data.personal;
  return (
    <div className="resume tmpl-minimal" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '22pt', letterSpacing: '-0.5px', margin: '0 0 5px 0', color: '#111' }}>{[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name'}</h1>
        <div style={{ fontSize: '8.5pt', color: '#666', marginTop: 8 }}>{renderContacts([p.email, p.phone, p.location, p.linkedin].filter(Boolean), '·')}</div>
      </div>
      {data.experience.some(e => e.jobTitle) && (
        <div className="r-section">
          <h3 style={{ fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 10 }}>Experience</h3>
          {data.experience.filter(e => e.jobTitle).map(exp => (
            <div key={exp.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                <span>{exp.jobTitle} <span style={{ color: '#888', fontWeight: 400 }}>at {exp.company}</span></span>
                <span style={{ fontSize: '8pt', color: '#888' }}>{fmtMonth(exp.startDate)} — {exp.current ? 'Present' : fmtMonth(exp.endDate)}</span>
              </div>
              <ul className="r-bullets" style={{ marginTop: 4 }}>{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {data.education.some(e => e.school) && (
        <div className="r-section">
          <h3 style={{ fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 10 }}>Education</h3>
          {data.education.filter(e => e.school).map(edu => (
            <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{edu.school} <span style={{ color: '#888' }}>— {[edu.degree, edu.field].filter(Boolean).join(', ')}</span></span>
              <span style={{ fontSize: '8pt', color: '#888' }}>{fmtMonth(edu.endDate)}</span>
            </div>
          ))}
        </div>
      )}
      {data.skills.some(s => s.skills.length > 0) && (
        <div className="r-section">
          <h3 style={{ fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: 10 }}>Skills</h3>
          {data.skills.filter(s => s.skills.length > 0).map(sg => (
            <div key={sg.id} style={{ marginBottom: 4 }}>
              <span style={{ color: '#555', width: '120px', display: 'inline-block' }}>{sg.category || 'Skills'}</span>
              <span>{sg.skills.join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 4. Professional Template (Two Column) ────────────────────────
function ProfessionalResume({ data }) {
  const p = data.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
  return (
    <div className="resume tmpl-professional" style={{ display: 'flex', minHeight: '100%', padding: 0 }}>
      <div style={{ width: '30%', background: '#2c3e50', color: '#ecf0f1', padding: '24px 20px', fontSize: '9pt' }}>
        <div style={{ fontSize: '20pt', fontWeight: 700, lineHeight: 1.1, marginBottom: 5 }}>{p.firstName}<br/>{p.lastName}</div>
        <div style={{ color: '#3498db', fontWeight: 600, marginBottom: 20 }}>{p.title}</div>
        
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '10pt', borderBottom: '1px solid #7f8c8d', paddingBottom: 5, marginBottom: 10 }}>Contact</h3>
          {[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).map(c => <div key={c} style={{ marginBottom: 5, wordBreak: 'break-word' }}>{c}</div>)}
        </div>

        {data.skills.some(s => s.skills.length > 0) && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '10pt', borderBottom: '1px solid #7f8c8d', paddingBottom: 5, marginBottom: 10 }}>Skills</h3>
            {data.skills.filter(s => s.skills.length > 0).map(sg => (
              <div key={sg.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: '#bdc3c7', marginBottom: 3 }}>{sg.category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {sg.skills.map(skill => <span key={skill} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 3, fontSize: '8pt' }}>{skill}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: '70%', padding: '24px 28px', background: 'white' }}>
        {data.summary && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '12pt', color: '#2c3e50', borderBottom: '2px solid #2c3e50', paddingBottom: 4, marginBottom: 8 }}>Profile</h3>
            <div>{data.summary}</div>
          </div>
        )}
        {data.experience.some(e => e.company) && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '12pt', color: '#2c3e50', borderBottom: '2px solid #2c3e50', paddingBottom: 4, marginBottom: 12 }}>Experience</h3>
            {data.experience.filter(e => e.company).map(exp => (
              <div key={exp.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>{exp.jobTitle}</span><span style={{ color: '#7f8c8d' }}>{fmtMonth(exp.startDate)} – {exp.current ? 'Present' : fmtMonth(exp.endDate)}</span></div>
                <div style={{ fontWeight: 600, color: '#34495e', marginBottom: 4 }}>{exp.company}</div>
                <ul className="r-bullets">{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        {data.education.some(e => e.school) && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '12pt', color: '#2c3e50', borderBottom: '2px solid #2c3e50', paddingBottom: 4, marginBottom: 12 }}>Education</h3>
            {data.education.filter(e => e.school).map(edu => (
              <div key={edu.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>{[edu.degree, edu.field].filter(Boolean).join(', ')}</span><span style={{ color: '#7f8c8d' }}>{fmtMonth(edu.endDate)}</span></div>
                <div>{edu.school}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 5. Executive Template (Serif, Elegant) ───────────────────────
function ExecutiveResume({ data }) {
  const p = data.personal;
  return (
    <div className="resume tmpl-executive" style={{ fontFamily: '"Merriweather", "Georgia", serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #111', paddingBottom: 16 }}>
        <h1 style={{ fontSize: '26pt', fontWeight: 400, margin: '0 0 8px 0', letterSpacing: '1px' }}>{[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name'}</h1>
        <div style={{ fontSize: '9pt', fontFamily: 'sans-serif', letterSpacing: '0.5px' }}>{renderContacts([p.email, p.phone, p.location, p.linkedin].filter(Boolean), ' • ')}</div>
      </div>
      {data.summary && <div style={{ fontSize: '10pt', marginBottom: 20, lineHeight: 1.6, textAlign: 'justify' }}>{data.summary}</div>}
      
      {data.experience.some(e => e.company) && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '6px 0', margin: '0 0 16px 0' }}>Professional Experience</h3>
          {data.experience.filter(e => e.company).map(exp => (
            <div key={exp.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '11pt' }}>{exp.company}</strong>
                <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>{fmtMonth(exp.startDate)} – {exp.current ? 'Present' : fmtMonth(exp.endDate)}</span>
              </div>
              <div style={{ fontStyle: 'italic', marginBottom: 6 }}>{exp.jobTitle}</div>
              <ul className="r-bullets" style={{ fontFamily: 'sans-serif', fontSize: '9pt' }}>{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {data.education.some(e => e.school) && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '6px 0', margin: '0 0 16px 0' }}>Education</h3>
          {data.education.filter(e => e.school).map(edu => (
            <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div><strong>{edu.school}</strong><br/><span style={{ fontStyle: 'italic' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}</span></div>
              <span>{fmtMonth(edu.endDate)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 6. Creative Template (Sidebar Strip) ─────────────────────────
function CreativeResume({ data }) {
  const p = data.personal;
  return (
    <div className="resume tmpl-creative" style={{ borderLeft: '16px solid #ff4757', paddingLeft: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '28pt', fontWeight: 900, color: '#2f3542', margin: 0 }}>{p.firstName} <span style={{ color: '#ff4757' }}>{p.lastName}</span></h1>
        {p.title && <div style={{ fontSize: '12pt', fontWeight: 700, color: '#747d8c', marginTop: 4 }}>{p.title}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: '9pt', color: '#57606f', flexWrap: 'wrap' }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map(c => <span key={c} style={{ background: '#f1f2f6', padding: '4px 8px', borderRadius: 4 }}>{c}</span>)}
        </div>
      </div>
      {data.summary && <div style={{ marginBottom: 20, fontSize: '9.5pt', lineHeight: 1.6 }}>{data.summary}</div>}
      
      {data.experience.some(e => e.company) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '14pt', fontWeight: 800, color: '#2f3542', borderBottom: '3px solid #f1f2f6', paddingBottom: 4, marginBottom: 12 }}>Experience</h3>
          {data.experience.filter(e => e.company).map(exp => (
            <div key={exp.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '11pt', color: '#2f3542' }}>{exp.jobTitle}</strong>
                <span style={{ color: '#ff4757', fontWeight: 700, fontSize: '9pt' }}>{fmtMonth(exp.startDate)} – {exp.current ? 'Present' : fmtMonth(exp.endDate)}</span>
              </div>
              <div style={{ fontWeight: 600, color: '#747d8c', marginBottom: 6 }}>{exp.company}</div>
              <ul className="r-bullets" style={{ color: '#57606f' }}>{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 24 }}>
        {data.education.some(e => e.school) && (
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '14pt', fontWeight: 800, color: '#2f3542', borderBottom: '3px solid #f1f2f6', paddingBottom: 4, marginBottom: 12 }}>Education</h3>
            {data.education.filter(e => e.school).map(edu => (
              <div key={edu.id} style={{ marginBottom: 8 }}>
                <strong style={{ display: 'block' }}>{edu.school}</strong>
                <span style={{ color: '#57606f' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
        {data.skills.some(s => s.skills.length > 0) && (
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '14pt', fontWeight: 800, color: '#2f3542', borderBottom: '3px solid #f1f2f6', paddingBottom: 4, marginBottom: 12 }}>Skills</h3>
            {data.skills.filter(s => s.skills.length > 0).map(sg => (
              <div key={sg.id} style={{ marginBottom: 6 }}>
                <strong style={{ display: 'block', fontSize: '9pt', color: '#ff4757' }}>{sg.category}</strong>
                <span style={{ fontSize: '9.5pt', color: '#57606f' }}>{sg.skills.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 7. Tech Template (Monospace accents) ─────────────────────────
function TechResume({ data }) {
  const p = data.personal;
  return (
    <div className="resume tmpl-tech" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 16, marginBottom: 16 }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>{[p.firstName, p.lastName].filter(Boolean).join(' ')}</h1>
        <div style={{ fontFamily: 'monospace', color: '#666', marginTop: 8 }}>{renderContacts([p.email, p.phone, p.github, p.linkedin].filter(Boolean), ' / ')}</div>
      </div>
      {data.experience.some(e => e.company) && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'monospace', fontSize: '11pt', background: '#000', color: '#0f0', display: 'inline-block', padding: '2px 8px', margin: '0 0 12px 0' }}>&gt; EXPERIENCE</h3>
          {data.experience.filter(e => e.company).map(exp => (
            <div key={exp.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: 4, marginBottom: 6 }}>
                <strong>{exp.jobTitle} @ {exp.company}</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '8.5pt' }}>[{fmtMonth(exp.startDate)} - {exp.current ? 'Present' : fmtMonth(exp.endDate)}]</span>
              </div>
              <ul className="r-bullets" style={{ fontSize: '9.5pt' }}>{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {data.skills.some(s => s.skills.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'monospace', fontSize: '11pt', background: '#000', color: '#0f0', display: 'inline-block', padding: '2px 8px', margin: '0 0 12px 0' }}>&gt; SKILLS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {data.skills.filter(s => s.skills.length > 0).map(sg => (
              <div key={sg.id}>
                <strong style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{sg.category}</strong>
                <div style={{ fontSize: '9pt', color: '#444' }}>{sg.skills.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.education.some(e => e.school) && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'monospace', fontSize: '11pt', background: '#000', color: '#0f0', display: 'inline-block', padding: '2px 8px', margin: '0 0 12px 0' }}>&gt; EDUCATION</h3>
          {data.education.filter(e => e.school).map(edu => (
            <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{[edu.degree, edu.field].filter(Boolean).join(', ')}</strong>, {edu.school}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '8.5pt' }}>[{fmtMonth(edu.endDate)}]</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 8. Startup Template (Bold, Compact) ──────────────────────────
function StartupResume({ data }) {
  const p = data.personal;
  return (
    <div className="resume tmpl-startup" style={{ color: '#1a1a1a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '4px solid #7c3aed', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '28pt', fontWeight: 900, margin: 0, lineHeight: 1 }}>{[p.firstName, p.lastName].filter(Boolean).join(' ')}</h1>
          <div style={{ fontSize: '12pt', fontWeight: 700, color: '#7c3aed', marginTop: 8 }}>{p.title}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map(c => <div key={c}>{c}</div>)}
        </div>
      </div>
      {data.summary && <div style={{ fontSize: '10.5pt', fontWeight: 500, marginBottom: 24, padding: '12px 16px', background: '#f3f4f6', borderRadius: 8 }}>{data.summary}</div>}
      {data.experience.some(e => e.company) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '16pt', fontWeight: 800, color: '#7c3aed', marginBottom: 12 }}>Experience.</h3>
          {data.experience.filter(e => e.company).map(exp => (
            <div key={exp.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '11pt', fontWeight: 800 }}>{exp.jobTitle} <span style={{ color: '#6b7280', fontWeight: 600 }}>@ {exp.company}</span></div>
              <div style={{ fontSize: '8.5pt', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{fmtMonth(exp.startDate)} – {exp.current ? 'Present' : fmtMonth(exp.endDate)}</div>
              <ul className="r-bullets" style={{ margin: 0 }}>{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {data.education.some(e => e.school) && (
          <div>
            <h3 style={{ fontSize: '16pt', fontWeight: 800, color: '#7c3aed', marginBottom: 12 }}>Education.</h3>
            {data.education.filter(e => e.school).map(edu => (
              <div key={edu.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 800 }}>{edu.school}</div>
                <div style={{ fontSize: '9.5pt', color: '#4b5563' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}</div>
                <div style={{ fontSize: '8.5pt', color: '#9ca3af', fontWeight: 700 }}>{fmtMonth(edu.endDate)}</div>
              </div>
            ))}
          </div>
        )}
        {data.skills.some(s => s.skills.length > 0) && (
          <div>
            <h3 style={{ fontSize: '16pt', fontWeight: 800, color: '#7c3aed', marginBottom: 12 }}>Skills.</h3>
            {data.skills.filter(s => s.skills.length > 0).map(sg => (
              <div key={sg.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: '9.5pt' }}>{sg.category}</div>
                <div style={{ fontSize: '9pt', color: '#4b5563' }}>{sg.skills.join(', ')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 9. Elegant Template (Clean, Lots of whitespace) ──────────────
function ElegantResume({ data }) {
  const p = data.personal;
  return (
    <div className="resume tmpl-elegant" style={{ fontFamily: 'sans-serif', color: '#333' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '28pt', fontWeight: 400, margin: '0 0 12px 0', letterSpacing: '2px' }}>{[p.firstName, p.lastName].filter(Boolean).join(' ')}</h1>
        <div style={{ fontSize: '9pt', color: '#777', letterSpacing: '1px' }}>{renderContacts([p.email, p.phone, p.location, p.linkedin].filter(Boolean), ' / ')}</div>
      </div>
      
      {data.experience.some(e => e.company) && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>Experience</h3>
          {data.experience.filter(e => e.company).map(exp => (
            <div key={exp.id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong style={{ fontSize: '11pt' }}>{exp.jobTitle}</strong>
                <span style={{ fontSize: '9pt', color: '#666' }}>{fmtMonth(exp.startDate)} — {exp.current ? 'Present' : fmtMonth(exp.endDate)}</span>
              </div>
              <div style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#555', marginBottom: 8 }}>{exp.company}</div>
              <ul className="r-bullets" style={{ fontWeight: 300 }}>{exp.bullets?.split('\n').filter(b => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[•\-\*]\s*/, '')}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      
      {data.education.some(e => e.school) && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>Education</h3>
          {data.education.filter(e => e.school).map(edu => (
            <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: '10.5pt' }}>{edu.school}</strong>
                <div style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#555', marginTop: 2 }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}</div>
              </div>
              <span style={{ fontSize: '9pt', color: '#666' }}>{fmtMonth(edu.endDate)}</span>
            </div>
          ))}
        </div>
      )}

      {data.skills.some(s => s.skills.length > 0) && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>Skills</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {data.skills.filter(s => s.skills.length > 0).map(sg => (
              <div key={sg.id} style={{ width: '45%' }}>
                <strong style={{ fontSize: '9pt', display: 'block', marginBottom: 4 }}>{sg.category}</strong>
                <span style={{ fontSize: '9.5pt', color: '#555', fontWeight: 300 }}>{sg.skills.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resume Wrapper ───────────────────────────────────────────────
export default function ResumePreview({ data, template }) {
  const templates = {
    classic: ClassicResume,
    modern: ModernResume,
    minimal: MinimalResume,
    professional: ProfessionalResume,
    executive: ExecutiveResume,
    creative: CreativeResume,
    tech: TechResume,
    startup: StartupResume,
    elegant: ElegantResume,
  };
  const Template = templates[template] || ClassicResume;
  return (
    <div className="resume-wrap">
      <Template data={data} />
    </div>
  );
}
