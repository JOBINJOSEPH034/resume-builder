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
  { id: 'personal',       icon: 'user',        label: 'Personal Info' },
  { id: 'summary',        icon: 'align-left',  label: 'Profile Summary' },
  { id: 'experience',     icon: 'briefcase',   label: 'Experience' },
  { id: 'education',      icon: 'graduation',  label: 'Education' },
  { id: 'skills',         icon: 'zap',         label: 'Skills' },
  { id: 'projects',       icon: 'folder',      label: 'Projects' },
  { id: 'certifications', icon: 'award',       label: 'Certifications' },
  { id: 'languages',      icon: 'globe',       label: 'Languages' },
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

// Detailed text-based ATS analysis (for Analyzer mode)
export function analyzeResumeText(text, jdText = '') {
  const checks = [];
  const t = text || '';
  const lower = t.toLowerCase();
  const jdLower = jdText.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Contact Info (15 pts)
  const hasEmail = /[\w.+-]+@[\w.-]+\.\w{2,}/.test(t);
  const hasPhone = /[\+\(]?[\d\s\(\)\-\.]{10,17}/.test(t);
  const hasLinkedin = /linkedin\.com/i.test(t);
  const contactScore = (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0) + (hasLinkedin ? 5 : 0);
  checks.push({
    category: 'Contact Information', maxScore: 15, score: contactScore, icon: '📋',
    details: [
      { label: 'Email address', ok: hasEmail },
      { label: 'Phone number', ok: hasPhone },
      { label: 'LinkedIn profile', ok: hasLinkedin },
    ]
  });

  // 2. Professional Summary (10 pts)
  const hasSummary = /summary|objective|profile|about me/i.test(t);
  const summaryScore = hasSummary ? 10 : 0;
  checks.push({
    category: 'Professional Summary', maxScore: 10, score: summaryScore, icon: '📝',
    details: [{ label: 'Contains summary/objective/profile section', ok: hasSummary }]
  });

  // 3. Work Experience & Tenure (15 pts)
  const hasExperience = /experience|work history|employment/i.test(t);
  const hasJobTitles = /developer|engineer|manager|analyst|designer|consultant|lead|intern|associate|specialist|coordinator|director|president|officer/i.test(t);
  const hasDates = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s*\.?\s*\d{2,4}/i.test(t) || /\d{4}\s*[-–—]\s*(present|\d{4})/i.test(t);
  
  // Extract explicit mentions of "X years of experience"
  const yoeMatch = t.match(/(\d+)(?:\+|-)?\s*(?:years|yrs?)(?:\s*of)?\s*experience/i);
  const hasYoe = !!yoeMatch;
  const yoeLabel = yoeMatch ? `Explicit years of experience mentioned (${yoeMatch[1]}+ years)` : 'Years of experience not explicitly stated';

  // Check if job titles align with JD (if JD is provided)
  let titleMatch = false;
  let titleLabel = 'Add a Job Description to check title alignment';
  if (jdLower.length > 20) {
    const commonTitles = ['developer', 'engineer', 'manager', 'analyst', 'designer', 'consultant', 'lead', 'intern', 'associate', 'specialist', 'coordinator', 'director', 'architect', 'scientist', 'administrator'];
    const targetTitles = commonTitles.filter(title => jdLower.includes(title));
    if (targetTitles.length > 0) {
      titleMatch = targetTitles.some(title => lower.includes(title));
      titleLabel = titleMatch ? `Target title (${targetTitles[0]}) found in resume` : `Target title (${targetTitles[0]}) not found in resume`;
    } else {
      titleMatch = true; // no obvious title to match
      titleLabel = 'No specific target title extracted from JD to match';
    }
  } else {
    titleMatch = true; // default to ok if no JD
  }

  const expScore = (hasExperience ? 3 : 0) + (hasJobTitles ? 3 : 0) + (hasDates ? 3 : 0) + (hasYoe ? 3 : 0) + (titleMatch ? 3 : 0);
  checks.push({
    category: 'Work Experience', maxScore: 15, score: expScore, icon: '💼',
    details: [
      { label: 'Experience section present', ok: hasExperience },
      { label: 'Job titles identifiable', ok: hasJobTitles },
      { label: 'Date ranges included', ok: hasDates },
      { label: yoeLabel, ok: hasYoe },
      ...(jdLower.length > 20 ? [{ label: titleLabel, ok: titleMatch }] : [])
    ]
  });

  // 4. Education (10 pts)
  const hasEducation = /education|academic|school|degree|university|college|bachelor|master|phd|diploma/i.test(t);
  const hasDegree = /bachelor|master|b\.?sc|m\.?sc|b\.?tech|m\.?tech|b\.?e|m\.?e|mba|phd|diploma|b\.?a|m\.?a|b\.?com/i.test(t);
  const eduScore = (hasEducation ? 5 : 0) + (hasDegree ? 5 : 0);
  checks.push({
    category: 'Education', maxScore: 10, score: eduScore, icon: '🎓',
    details: [
      { label: 'Education section present', ok: hasEducation },
      { label: 'Degree type specified', ok: hasDegree },
    ]
  });

  // 5. Skills Section (10 pts)
  const hasSkills = /skills|technical skills|core competencies|technologies|proficiencies/i.test(t);
  const skillCount = (t.match(/\b(python|javascript|java|react|node|sql|aws|docker|git|html|css|typescript|angular|vue|django|flask|spring|kubernetes|linux|mongodb|postgresql|firebase|figma|photoshop|excel|tableau|power\s*bi)\b/gi) || []).length;
  const skillScore = (hasSkills ? 5 : 0) + (skillCount >= 3 ? 5 : skillCount >= 1 ? 3 : 0);
  checks.push({
    category: 'Skills & Technologies', maxScore: 10, score: skillScore, icon: '⚡',
    details: [
      { label: 'Skills section present', ok: hasSkills },
      { label: `Recognizable tech skills found (${skillCount})`, ok: skillCount >= 3 },
    ]
  });

  // 6. Action Verbs (10 pts)
  const actionVerbs = ['developed', 'implemented', 'designed', 'managed', 'led', 'built', 'created', 'improved', 'optimized', 'analyzed', 'collaborated', 'delivered', 'launched', 'maintained', 'automated', 'integrated', 'deployed', 'architected', 'spearheaded', 'streamlined', 'coordinated', 'established', 'reduced', 'increased', 'achieved'];
  const foundVerbs = actionVerbs.filter(v => lower.includes(v));
  const verbScore = foundVerbs.length >= 5 ? 10 : foundVerbs.length >= 3 ? 7 : foundVerbs.length >= 1 ? 4 : 0;
  checks.push({
    category: 'Action Verbs', maxScore: 10, score: verbScore, icon: '🎯',
    details: [
      { label: `Strong action verbs used (${foundVerbs.length}/5+)`, ok: foundVerbs.length >= 5 },
      { label: foundVerbs.length > 0 ? `Found: ${foundVerbs.slice(0, 6).join(', ')}` : 'No action verbs detected', ok: foundVerbs.length > 0 },
    ]
  });

  // 7. Quantifiable Results (10 pts)
  const metrics = t.match(/\d+[\+%]|\d+\s*%|\$[\d,]+|\d+\s*(users|clients|projects|applications|systems|team|members|revenue|sales)/gi) || [];
  const metricScore = metrics.length >= 3 ? 10 : metrics.length >= 1 ? 5 : 0;
  checks.push({
    category: 'Quantifiable Results', maxScore: 10, score: metricScore, icon: '📊',
    details: [
      { label: `Measurable achievements found (${metrics.length})`, ok: metrics.length >= 3 },
      { label: 'Numbers, percentages or metrics present', ok: metrics.length > 0 },
    ]
  });

  // 8. Formatting & Readability (10 pts)
  const lines = t.split('\n').filter(l => l.trim());
  const avgLineLen = lines.length > 0 ? lines.reduce((a, l) => a + l.length, 0) / lines.length : 0;
  const hasExcessiveCaps = (t.match(/[A-Z]{20,}/g) || []).length > 3;
  const hasSpecialChars = (t.match(/[★☆◆■□▪▸►◉❖✦✧⟐⯈]{3,}/g) || []).length > 0;
  const goodLineLen = avgLineLen < 120 && avgLineLen > 10;
  const formatScore = (goodLineLen ? 4 : 0) + (!hasExcessiveCaps ? 3 : 0) + (!hasSpecialChars ? 3 : 0);
  checks.push({
    category: 'Formatting & Readability', maxScore: 10, score: formatScore, icon: '📐',
    details: [
      { label: 'Reasonable line lengths (not wall-of-text)', ok: goodLineLen },
      { label: 'No excessive ALL CAPS blocks', ok: !hasExcessiveCaps },
      { label: 'No fancy symbols that confuse ATS parsers', ok: !hasSpecialChars },
    ]
  });

  // 9. Resume Length (5 pts)
  const goodLength = wordCount >= 200 && wordCount <= 1200;
  const lengthScore = goodLength ? 5 : wordCount >= 100 ? 3 : 0;
  checks.push({
    category: 'Resume Length', maxScore: 5, score: lengthScore, icon: '📏',
    details: [
      { label: `Word count: ${wordCount} (ideal: 200-1200)`, ok: goodLength },
    ]
  });

  // 10. Links & Portfolio (5 pts)
  const hasPortfolio = /github\.com|gitlab\.com|bitbucket|portfolio|\.dev|\.io/i.test(t);
  const hasWebsite = /https?:\/\/[^\s]+/i.test(t);
  const linkScore = (hasPortfolio ? 3 : 0) + (hasWebsite ? 2 : 0);
  checks.push({
    category: 'Links & Portfolio', maxScore: 5, score: linkScore, icon: '🔗',
    details: [
      { label: 'Portfolio/GitHub link', ok: hasPortfolio },
      { label: 'External URLs present', ok: hasWebsite },
    ]
  });

  const totalMax = checks.reduce((a, c) => a + c.maxScore, 0); // 100
  const totalScore = checks.reduce((a, c) => a + c.score, 0);

  return { checks, totalScore, totalMax, wordCount, foundVerbs };
}

export function calcBaseScore(data, text = null, jdText = '') {
  if (text !== null) {
     return analyzeResumeText(text, jdText).totalScore;
  }
  if (!data) return 0;
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
export function matchKeywords(keywords, data, text = null) {
  const resumeText = text !== null ? text.toLowerCase() : (data ? buildResumeText(data).toLowerCase() : '');
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
