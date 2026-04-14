import { useState, useRef } from 'react';
import { uid } from '../utils.js';
import { ChipInput, DelBtn, SectionNavFooter } from './UI.jsx';
import { Bot } from 'lucide-react';

const ATSTip = ({ tips }) => (
  <div className="ats-tips">
    <div className="ats-tips-title"><Bot size={13} strokeWidth={2} /> ATS Optimization Tips</div>
    {tips.map((t, i) => <div key={i} className="ats-tip">{t}</div>)}
  </div>
);

// ── Personal Section ─────────────────────────────────────────────
export function PersonalSection({ data, onChange, sections, onNavigate, onPrint }) {
  const p = data.personal;
  const set = k => e => onChange({ ...data, personal: { ...p, [k]: e.target.value } });
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Personal Information</div>
        <div className="section-desc">Your contact details appear at the top. Keep them professional and accurate.</div>
      </div>
      <div className="form-card">
        <div className="fg fg2">
          <div className="form-group">
            <label className="f-label">First Name<span className="f-required">*</span></label>
            <input className="f-input" placeholder="John" value={p.firstName} onChange={set('firstName')} />
          </div>
          <div className="form-group">
            <label className="f-label">Last Name<span className="f-required">*</span></label>
            <input className="f-input" placeholder="Doe" value={p.lastName} onChange={set('lastName')} />
          </div>
          <div className="form-group full">
            <label className="f-label">Professional Title</label>
            <input className="f-input" placeholder="e.g. Senior Software Engineer" value={p.title} onChange={set('title')} />
            <span className="f-hint">Your current or target job title — mirror the job posting</span>
          </div>
          <div className="form-group">
            <label className="f-label">Email Address<span className="f-required">*</span></label>
            <input className="f-input" type="email" placeholder="john@example.com" value={p.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label className="f-label">Phone Number</label>
            <input className="f-input" placeholder="+1 (555) 000-0000" value={p.phone} onChange={set('phone')} />
          </div>
          <div className="form-group full">
            <label className="f-label">Location</label>
            <input className="f-input" placeholder="City, State (e.g. San Francisco, CA)" value={p.location} onChange={set('location')} />
            <span className="f-hint">City and state only — don't include your full home address</span>
          </div>
          <div className="form-group">
            <label className="f-label">LinkedIn URL</label>
            <input className="f-input" placeholder="linkedin.com/in/johndoe" value={p.linkedin} onChange={set('linkedin')} />
          </div>
          <div className="form-group">
            <label className="f-label">GitHub</label>
            <input className="f-input" placeholder="github.com/johndoe" value={p.github} onChange={set('github')} />
          </div>
          <div className="form-group full">
            <label className="f-label">Portfolio / Website</label>
            <input className="f-input" placeholder="https://johndoe.dev" value={p.website} onChange={set('website')} />
          </div>
        </div>
      </div>
      <ATSTip tips={[
        'Use a professional email (gmail/outlook). Avoid old/fun usernames.',
        'Include your LinkedIn — many ATS extract it to auto-fill your profile.',
        'Do not add a photo, age, or gender — these trigger bias filters.',
        'City + State only. Full address wastes space and is not ATS-friendly.',
      ]} />
      <SectionNavFooter sections={sections} activeId="personal" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Summary Section ──────────────────────────────────────────────
export function SummarySection({ data, onChange, sections, onNavigate, onPrint }) {
  const len = data.summary.length;
  const scoreClass = len > 600 ? ' over' : len < 80 && len > 0 ? ' warn' : '';
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Profile Summary</div>
        <div className="section-desc">A 3–5 sentence overview of your experience, skills, and goals. Tailor this to each job description.</div>
      </div>
      <div className="form-card">
        <div className="form-group">
          <label className="f-label">Summary / Objective<span className="f-required">*</span></label>
          <textarea
            className="f-textarea" style={{ minHeight: 130 }}
            placeholder="Results-driven Software Engineer with 5+ years building scalable web applications. Proficient in React, Node.js, and AWS. Passionate about clean code and great developer experience. Seeking a senior role at a product-focused company..."
            value={data.summary}
            onChange={e => onChange({ ...data, summary: e.target.value })}
          />
          <div className={`char-count${scoreClass}`}>
            {len}/600 chars{len < 80 && len > 0 && <span style={{ color: 'var(--yellow)' }}> · Aim for 150–300</span>}
            {len > 600 && <span> · Too long!</span>}
          </div>
        </div>
      </div>
      <ATSTip tips={[
        'Mirror exact keywords from the job description in your summary.',
        'Mention years of experience and 2–3 core skills in the first sentence.',
        'Keep it to 3–4 sentences — ATS scans keyword density, not length.',
        'Avoid vague phrases like "hardworking team player" — be specific.',
      ]} />
      <SectionNavFooter sections={sections} activeId="summary" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Experience Section ───────────────────────────────────────────
export function ExperienceSection({ data, onChange, sections, onNavigate, onPrint }) {
  const exps = data.experience;
  const update = (id, key, val) => onChange({ ...data, experience: exps.map(e => e.id === id ? { ...e, [key]: val } : e) });
  const add = () => onChange({ ...data, experience: [...exps, { id: uid(), jobTitle: '', company: '', location: '', startDate: '', endDate: '', current: false, bullets: '' }] });
  const remove = id => onChange({ ...data, experience: exps.filter(e => e.id !== id) });
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Work Experience</div>
        <div className="section-desc">List your most recent experience first. Use bullet points with action verbs and quantified results.</div>
      </div>
      {exps.map((exp, i) => (
        <div className="form-card" key={exp.id}>
          <div className="form-card-header">
            <div>
              <div className="form-card-title">{exp.jobTitle || `Position ${i + 1}`}</div>
              <div className="form-card-sub">{exp.company || 'Company name'}</div>
            </div>
            {exps.length > 1 && <DelBtn onClick={() => remove(exp.id)} />}
          </div>
          <div className="fg fg2">
            <div className="form-group">
              <label className="f-label">Job Title<span className="f-required">*</span></label>
              <input className="f-input" placeholder="Software Engineer" value={exp.jobTitle} onChange={e => update(exp.id, 'jobTitle', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Company<span className="f-required">*</span></label>
              <input className="f-input" placeholder="Google" value={exp.company} onChange={e => update(exp.id, 'company', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Location</label>
              <input className="f-input" placeholder="San Francisco, CA / Remote" value={exp.location} onChange={e => update(exp.id, 'location', e.target.value)} />
            </div>
            <div className="form-group" />
            <div className="form-group">
              <label className="f-label">Start Date</label>
              <input className="f-input" type="month" value={exp.startDate} onChange={e => update(exp.id, 'startDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">End Date</label>
              <input className="f-input" type="month" value={exp.endDate} disabled={exp.current} onChange={e => update(exp.id, 'endDate', e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer', fontSize: '.75rem', color: 'var(--ink2)' }}>
                <input type="checkbox" checked={exp.current} onChange={e => update(exp.id, 'current', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Currently working here
              </label>
            </div>
            <div className="form-group full">
              <label className="f-label">Responsibilities & Achievements</label>
              <textarea
                className="f-textarea"
                style={{ minHeight: 120 }}
                placeholder={'• Led development of payment microservice handling $2M/month in transactions\n• Reduced page load time by 40% through code splitting and lazy loading\n• Mentored 3 junior developers and conducted weekly code reviews'}
                value={exp.bullets}
                onChange={e => update(exp.id, 'bullets', e.target.value)}
              />
              <span className="f-hint">Start each line with • and an action verb. Include numbers & percentages.</span>
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Another Position</button>
      <ATSTip tips={[
        'Start bullets with strong action verbs: Led, Built, Increased, Reduced, Managed.',
        'Quantify results: "improved performance by 40%", "managed team of 5 engineers".',
        'Include keywords from the job description in your bullet points.',
        'Use the exact company name — ATS may cross-reference employment records.',
      ]} />
      <SectionNavFooter sections={sections} activeId="experience" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Education Section ────────────────────────────────────────────
export function EducationSection({ data, onChange, sections, onNavigate, onPrint }) {
  const edus = data.education;
  const update = (id, key, val) => onChange({ ...data, education: edus.map(e => e.id === id ? { ...e, [key]: val } : e) });
  const add = () => onChange({ ...data, education: [...edus, { id: uid(), degree: '', field: '', school: '', location: '', startDate: '', endDate: '', gpa: '', honors: '' }] });
  const remove = id => onChange({ ...data, education: edus.filter(e => e.id !== id) });
  const degrees = ['Bachelor of Science', 'Bachelor of Arts', 'Bachelor of Engineering', 'Master of Science', 'Master of Arts', 'Master of Business Administration', 'Doctor of Philosophy', 'Associate Degree', 'High School Diploma', 'Diploma / Certificate', 'Other'];
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Education</div>
        <div className="section-desc">Most recent degree first. Include GPA if it's 3.5+ or equivalent.</div>
      </div>
      {edus.map((edu, i) => (
        <div className="form-card" key={edu.id}>
          <div className="form-card-header">
            <div>
              <div className="form-card-title">{edu.degree || (i === 0 ? 'Degree' : `Education ${i + 1}`)}</div>
              <div className="form-card-sub">{edu.school || 'Institution'}</div>
            </div>
            {edus.length > 1 && <DelBtn onClick={() => remove(edu.id)} />}
          </div>
          <div className="fg fg2">
            <div className="form-group">
              <label className="f-label">Degree Type<span className="f-required">*</span></label>
              <select className="f-select" value={edu.degree} onChange={e => update(edu.id, 'degree', e.target.value)}>
                <option value="">Select degree...</option>
                {degrees.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="f-label">Field of Study</label>
              <input className="f-input" placeholder="Computer Science" value={edu.field} onChange={e => update(edu.id, 'field', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">School / University<span className="f-required">*</span></label>
              <input className="f-input" placeholder="MIT" value={edu.school} onChange={e => update(edu.id, 'school', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Location</label>
              <input className="f-input" placeholder="Cambridge, MA" value={edu.location} onChange={e => update(edu.id, 'location', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Start Date</label>
              <input className="f-input" type="month" value={edu.startDate} onChange={e => update(edu.id, 'startDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">End Date (or Expected)</label>
              <input className="f-input" type="month" value={edu.endDate} onChange={e => update(edu.id, 'endDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">GPA (optional)</label>
              <input className="f-input" placeholder="3.8 / 4.0" value={edu.gpa} onChange={e => update(edu.id, 'gpa', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Honors / Awards</label>
              <input className="f-input" placeholder="Magna Cum Laude, Dean's List" value={edu.honors} onChange={e => update(edu.id, 'honors', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Another Degree</button>
      <ATSTip tips={[
        'Include your field of study — ATS filters often check for specific majors.',
        'Only list GPA if it\'s 3.5+ (or 3.7+ for competitive roles).',
        'List relevant coursework only if you\'re a recent grad with limited experience.',
      ]} />
      <SectionNavFooter sections={sections} activeId="education" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Skills Section ───────────────────────────────────────────────
export function SkillsSection({ data, onChange, sections, onNavigate, onPrint, matchedSkills = [] }) {
  const skills = data.skills;
  const updateCat = (id, key, val) => onChange({ ...data, skills: skills.map(s => s.id === id ? { ...s, [key]: val } : s) });
  const add = () => onChange({ ...data, skills: [...skills, { id: uid(), category: '', skills: [] }] });
  const remove = id => onChange({ ...data, skills: skills.filter(s => s.id !== id) });
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Skills</div>
        <div className="section-desc">Group skills by category. Type and press Enter or comma to add. Green chips match the job description.</div>
      </div>
      {skills.map((sg, i) => (
        <div className="form-card" key={sg.id}>
          <div className="form-card-header">
            <div className="form-card-title">{sg.category || `Category ${i + 1}`}</div>
            {skills.length > 1 && <DelBtn onClick={() => remove(sg.id)} />}
          </div>
          <div className="fg">
            <div className="form-group">
              <label className="f-label">Category Name</label>
              <input className="f-input" placeholder="e.g. Programming Languages, Frameworks, Tools..." value={sg.category} onChange={e => updateCat(sg.id, 'category', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Skills</label>
              <ChipInput
                chips={sg.skills}
                onChange={v => updateCat(sg.id, 'skills', v)}
                placeholder="Type a skill, press Enter..."
                matchedSkills={matchedSkills}
              />
              <span className="f-hint">Press Enter or comma after each skill · Green = matches job description</span>
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Skill Category</button>
      <ATSTip tips={[
        'Use exact skill names from the JD (e.g. "React.js" not "Reactjs").',
        'Separate: Languages, Frameworks, Tools, Cloud, Databases, Methodologies.',
        'Don\'t use graphical ratings — ATS cannot read bar-chart proficiency.',
        'Include both acronyms and full names: "ML / Machine Learning".',
      ]} />
      <SectionNavFooter sections={sections} activeId="skills" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Projects Section ─────────────────────────────────────────────
export function ProjectsSection({ data, onChange, sections, onNavigate, onPrint }) {
  const projs = data.projects;
  const update = (id, key, val) => onChange({ ...data, projects: projs.map(p => p.id === id ? { ...p, [key]: val } : p) });
  const add = () => onChange({ ...data, projects: [...projs, { id: uid(), name: '', tech: '', link: '', desc: '' }] });
  const remove = id => onChange({ ...data, projects: projs.filter(p => p.id !== id) });
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Projects</div>
        <div className="section-desc">Showcase 2–4 strong projects with tech stack and impact. Especially important for early-career candidates.</div>
      </div>
      {projs.map((proj, i) => (
        <div className="form-card" key={proj.id}>
          <div className="form-card-header">
            <div>
              <div className="form-card-title">{proj.name || `Project ${i + 1}`}</div>
              <div className="form-card-sub">{proj.tech || 'Tech stack'}</div>
            </div>
            {projs.length > 1 && <DelBtn onClick={() => remove(proj.id)} />}
          </div>
          <div className="fg fg2">
            <div className="form-group">
              <label className="f-label">Project Name<span className="f-required">*</span></label>
              <input className="f-input" placeholder="E-Commerce Platform" value={proj.name} onChange={e => update(proj.id, 'name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">GitHub / Live Link</label>
              <input className="f-input" placeholder="github.com/you/project" value={proj.link} onChange={e => update(proj.id, 'link', e.target.value)} />
            </div>
            <div className="form-group full">
              <label className="f-label">Technologies Used</label>
              <input className="f-input" placeholder="React, Node.js, PostgreSQL, Docker" value={proj.tech} onChange={e => update(proj.id, 'tech', e.target.value)} />
            </div>
            <div className="form-group full">
              <label className="f-label">Description</label>
              <textarea className="f-textarea" placeholder="Built a full-stack e-commerce platform with real-time inventory, Stripe payments, and admin dashboard. Reduced checkout time by 30% through UX optimization." value={proj.desc} onChange={e => update(proj.id, 'desc', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Another Project</button>
      <SectionNavFooter sections={sections} activeId="projects" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Certifications Section ───────────────────────────────────────
export function CertificationsSection({ data, onChange, sections, onNavigate, onPrint }) {
  const certs = data.certifications;
  const update = (id, key, val) => onChange({ ...data, certifications: certs.map(c => c.id === id ? { ...c, [key]: val } : c) });
  const add = () => onChange({ ...data, certifications: [...certs, { id: uid(), name: '', issuer: '', date: '', expiry: '' }] });
  const remove = id => onChange({ ...data, certifications: certs.filter(c => c.id !== id) });
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Certifications</div>
        <div className="section-desc">Add relevant professional certifications and licenses. These significantly boost ATS scores.</div>
      </div>
      {certs.map((cert, i) => (
        <div className="form-card" key={cert.id}>
          <div className="form-card-header">
            <div className="form-card-title">{cert.name || `Certification ${i + 1}`}</div>
            {certs.length > 1 && <DelBtn onClick={() => remove(cert.id)} />}
          </div>
          <div className="fg fg2">
            <div className="form-group">
              <label className="f-label">Certification Name</label>
              <input className="f-input" placeholder="AWS Solutions Architect Associate" value={cert.name} onChange={e => update(cert.id, 'name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Issuing Organization</label>
              <input className="f-input" placeholder="Amazon Web Services" value={cert.issuer} onChange={e => update(cert.id, 'issuer', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Issue Date</label>
              <input className="f-input" type="month" value={cert.date} onChange={e => update(cert.id, 'date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Expiry Date (if any)</label>
              <input className="f-input" type="month" value={cert.expiry} onChange={e => update(cert.id, 'expiry', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Certification</button>
      <SectionNavFooter sections={sections} activeId="certifications" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}

// ── Languages Section ────────────────────────────────────────────
export function LanguagesSection({ data, onChange, sections, onNavigate, onPrint }) {
  const langs = data.languages;
  const update = (id, key, val) => onChange({ ...data, languages: langs.map(l => l.id === id ? { ...l, [key]: val } : l) });
  const add = () => onChange({ ...data, languages: [...langs, { id: uid(), language: '', proficiency: 'Fluent' }] });
  const remove = id => onChange({ ...data, languages: langs.filter(l => l.id !== id) });
  const levels = ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'];
  return (
    <div>
      <div className="section-header">
        <div className="section-title">Languages</div>
        <div className="section-desc">List languages you can use professionally. Native language should be first.</div>
      </div>
      {langs.map((lang, i) => (
        <div className="form-card" key={lang.id}>
          <div className="form-card-header">
            <div className="form-card-title">{lang.language || `Language ${i + 1}`}</div>
            {langs.length > 1 && <DelBtn onClick={() => remove(lang.id)} />}
          </div>
          <div className="fg fg2">
            <div className="form-group">
              <label className="f-label">Language</label>
              <input className="f-input" placeholder="English" value={lang.language} onChange={e => update(lang.id, 'language', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="f-label">Proficiency Level</label>
              <div className="level-btns">
                {levels.map(lv => (
                  <button key={lv} className={`level-btn${lang.proficiency === lv ? ' active' : ''}`} onClick={() => update(lang.id, 'proficiency', lv)}>{lv}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Language</button>
      <SectionNavFooter sections={sections} activeId="languages" onNavigate={onNavigate} onPrint={onPrint} />
    </div>
  );
}
