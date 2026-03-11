// ── Initial state ──────────────────────────────────────────────
export const initData = {
  personal: { firstName: '', lastName: '', title: '', email: '', phone: '', location: '', linkedin: '', website: '', github: '' },
  summary: '',
  experience: [{ id: 1, jobTitle: '', company: '', location: '', startDate: '', endDate: '', current: false, bullets: '' }],
  education: [{ id: 1, degree: '', field: '', school: '', location: '', startDate: '', endDate: '', gpa: '', honors: '' }],
  skills: [{ id: 1, category: 'Technical Skills', skills: [] }],
  projects: [{ id: 1, name: '', tech: '', link: '', desc: '' }],
  certifications: [{ id: 1, name: '', issuer: '', date: '', expiry: '' }],
  languages: [{ id: 1, language: '', proficiency: 'Fluent' }],
};

// ── Sections definition ─────────────────────────────────────────
export const SECTIONS = [
  { id: 'personal',       icon: '👤', label: 'Personal Info' },
  { id: 'summary',        icon: '📝', label: 'Profile Summary' },
  { id: 'experience',     icon: '💼', label: 'Experience' },
  { id: 'education',      icon: '🎓', label: 'Education' },
  { id: 'skills',         icon: '⚡', label: 'Skills' },
  { id: 'projects',       icon: '🚀', label: 'Projects' },
  { id: 'certifications', icon: '🏅', label: 'Certifications' },
  { id: 'languages',      icon: '🌐', label: 'Languages' },
];

// ── UID ─────────────────────────────────────────────────────────
let _uid = 200;
export const uid = () => ++_uid;

// ── Section completeness ─────────────────────────────────────────
export function isDone(section, data) {
  if (section === 'personal') return !!(data.personal.firstName && data.personal.email);
  if (section === 'summary')  return data.summary.length > 30;
  if (section === 'experience') return data.experience.some(e => e.jobTitle && e.company);
  if (section === 'education')  return data.education.some(e => e.degree && e.school);
  if (section === 'skills')     return data.skills.some(s => s.skills.length > 0);
  if (section === 'projects')   return data.projects.some(p => p.name);
  if (section === 'certifications') return data.certifications.some(c => c.name);
  if (section === 'languages')  return data.languages.some(l => l.language);
  return false;
}

// ── ATS Score ────────────────────────────────────────────────────
export function calcBaseScore(data) {
  let score = 0;
  if (data.personal.firstName && data.personal.email) score += 14;
  if (data.personal.phone) score += 5;
  if (data.personal.linkedin) score += 5;
  if (data.personal.github) score += 3;
  if (data.summary.length > 50) score += 14;
  if (data.experience.some(e => e.jobTitle)) score += 20;
  if (data.education.some(e => e.degree)) score += 14;
  if (data.skills.some(s => s.skills.length > 0)) score += 15;
  if (data.projects.some(p => p.name)) score += 5;
  if (data.certifications.some(c => c.name)) score += 3;
  if (data.languages.some(l => l.language)) score += 2;
  return Math.min(score, 100);
}

// ── Date formatter ───────────────────────────────────────────────
export function fmtMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

// ── Extract keywords from job description ────────────────────────
export function extractKeywords(jd) {
  if (!jd || jd.trim().length < 10) return [];
  const stopWords = new Set([
    'the','and','or','in','on','at','to','for','of','a','an','is','are','was','were',
    'be','been','being','have','has','had','do','does','did','will','would','could',
    'should','may','might','shall','must','that','this','with','from','by','we','our',
    'you','your','they','their','it','its','we\'re','you\'ll','able','also','both',
    'but','can','each','get','help','how','if','like','make','more','need','new',
    'than','them','then','there','these','those','use','what','when','where','who',
    'why','work','working','experience','years','year','team','company','role','position',
    'candidate','ideal','strong','good','great','excellent','required','preferred',
    'including','such','i.e','e.g','etc','well','within','across','other','as',
    'not','no','any','all','some','very','highly','about','apply','please','join',
    'us','opportunity','understanding','knowledge','ability','skills',
  ]);

  // Exact tech/domain phrases to prioritize
  const phrases = [
    'machine learning','deep learning','natural language processing','computer vision',
    'data science','data engineering','software engineering','full stack','front end',
    'back end','rest api','graphql','node.js','react.js','vue.js','next.js',
    'ci/cd','devops','cloud computing','agile methodology','test driven development',
    'continuous integration','continuous deployment','docker','kubernetes',
  ];

  const foundPhrases = [];
  const jdLower = jd.toLowerCase();
  phrases.forEach(p => { if (jdLower.includes(p)) foundPhrases.push(p); });

  // Single words
  const words = jd.toLowerCase()
    .replace(/[^a-z0-9#+._/\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const singles = Object.entries(freq)
    .filter(([w, c]) => c >= 1 && !stopWords.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  const combined = [...new Set([...foundPhrases, ...singles])];
  return combined.slice(0, 35);
}

// ── Check which keywords appear in resume data ───────────────────
export function matchKeywords(keywords, data) {
  const resumeText = buildResumeText(data).toLowerCase();
  return keywords.map(kw => ({
    keyword: kw,
    found: resumeText.includes(kw.toLowerCase()),
  }));
}

function buildResumeText(data) {
  const parts = [
    data.personal.title || '',
    data.summary,
    ...data.experience.map(e => `${e.jobTitle} ${e.company} ${e.bullets}`),
    ...data.skills.map(s => `${s.category} ${s.skills.join(' ')}`),
    ...data.projects.map(p => `${p.name} ${p.tech} ${p.desc}`),
    ...data.certifications.map(c => `${c.name} ${c.issuer}`),
  ];
  return parts.join(' ');
}

// ── LocalStorage helpers ─────────────────────────────────────────
export function saveToStorage(data) {
  try { localStorage.setItem('rf_resume_data', JSON.stringify(data)); } catch {}
}
export function loadFromStorage() {
  try {
    const raw = localStorage.getItem('rf_resume_data');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Simple text resume parser (plain text fallback) ──────────────
export function parseResumeText(text) {
  const data = JSON.parse(JSON.stringify(initData));

  // Try to extract name (first line if it looks like a name)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length < 60 && /^[A-Z][a-z]+ [A-Z]/.test(firstLine)) {
      const parts = firstLine.split(' ');
      data.personal.firstName = parts[0] || '';
      data.personal.lastName = parts.slice(1).join(' ') || '';
    }
  }

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) data.personal.email = emailMatch[0];

  // Phone
  const phoneMatch = text.match(/[\+\(]?[\d\s\(\)\-\.]{10,17}/);
  if (phoneMatch) data.personal.phone = phoneMatch[0].trim();

  // LinkedIn
  const liMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (liMatch) data.personal.linkedin = liMatch[0];

  // GitHub
  const ghMatch = text.match(/github\.com\/[\w-]+/i);
  if (ghMatch) data.personal.github = ghMatch[0];

  // Website
  const webMatch = text.match(/https?:\/\/(?!linkedin|github)[\w.-]+\.\w{2,}[^\s]*/i);
  if (webMatch) data.personal.website = webMatch[0];

  // Summary — look for summary/objective/profile section
  const summaryMatch = text.match(/(?:summary|objective|profile|about me)[:\n]+([^]+?)(?:\n\n|\n[A-Z]{2,})/i);
  if (summaryMatch) data.summary = summaryMatch[1].trim().substring(0, 600);

  // Skills — look for skills section
  const skillsMatch = text.match(/(?:skills|technologies|tech stack)[:\n]+([^]+?)(?:\n\n|\n[A-Z]{2,})/i);
  if (skillsMatch) {
    const rawSkills = skillsMatch[1]
      .replace(/\n/g, ', ')
      .split(/[,|•·]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 40);
    if (rawSkills.length > 0) {
      data.skills[0].skills = rawSkills.slice(0, 20);
    }
  }

  return data;
}
