import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, LayoutDashboard, FileText, Linkedin, Mail, Play, UserRound, Plus, Sun, Moon, Menu, X, Check, Save, Trash2, Copy, Upload, ShieldCheck, BookOpen, LogIn, Eye } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import LearningMaterials from './LearningMaterials.jsx';
import { readDocumentText } from '../fileText.js';
import { askConfirmation } from '../feedback.js';

const navigation = [
  ['dashboard', 'Overview', LayoutDashboard], ['resume', 'Resume Studio', FileText],
  ['linkedin', 'LinkedIn Studio', Linkedin], ['cover', 'Cover Letters', Mail],
  ['tutorials', 'Learning library', Play], ['account', 'Account & plans', UserRound],
];
const fallbackConfig = {
  dashboard_title: 'Your next chapter starts here.',
  dashboard_description: 'A considered resume. A confident profile. Everything you need to introduce yourself well.',
  starter_price: 199,
  pro_price: 499,
  starter_resume_limit: 5,
  pro_resume_limit: 50,
  starter_ats_limit: 5,
  starter_download_limit: 5,
  ai_enabled: false,
  payments_enabled: false
};

function Brand() {
  return <div className="rc-brand"><span className="rc-brand-mark">r<span>c</span><i /></span><span>Ready<br /><strong>Candidate</strong></span></div>;
}

function Empty({ icon: Icon = FileText, title, children, action }) {
  return <div className="rc-empty"><span className="rc-empty-icon"><Icon size={25} /></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}

function TutorialList({ videos, section }) {
  return <LearningMaterials videos={videos} section={section}/>;
}

function WritingStudio(props) {
  const {kind, user, cfg, onUpgrade, onNavigate, videos} = props;
  const isLinkedIn = kind === 'linkedin';
  const isPro = user?.plan === 'pro';
  const enabled = isLinkedIn ? cfg.linkedin_enabled : cfg.cover_enabled;
  if (enabled === false) return <Empty title="This service is taking a short break">The administrator has temporarily disabled this service.</Empty>;
  // Writing services are exclusively available on the ₹499 Pro Plan
  if (!isPro) {
    return <>
      <div className="rc-page-heading">
        <div>
          <span className="rc-eyebrow">READY CANDIDATE PRO EXCLUSIVE</span>
          <h1>{isLinkedIn ? 'Your story, professionally told on LinkedIn.' : 'A personal introduction for every opportunity.'}</h1>
          <p>{isLinkedIn ? "Shape your headline, about section and experience highlights." : "Connect your experience to a specific company and role."}</p>
        </div>
      </div>
      <div className="rc-panel rc-pro-locked-card">
        <div className="rc-locked-badge">
          <div className="rc-locked-icon-wrap"><Linkedin size={26} /></div>
          <span className="rc-pill rc-locked-pill">EXCLUSIVE TO PRO · ₹{cfg.pro_price || 499}</span>
        </div>
        <h2>{isLinkedIn ? 'Unlock LinkedIn Studio with Pro' : 'Unlock Cover Letters with Pro'}</h2>
        <p className="rc-locked-desc">
          Preview LinkedIn and cover-letter tools here. Pro unlocks drafting, saving and AI assistance.
        </p>
        <div className="rc-locked-features-grid">
          <div className="rc-locked-feat">
            <span className="rc-feat-num">01</span>
            <div>
              <strong>Writing assistance</strong>
              <p>Generate high-impact headlines and about narratives directly from your resume experience.</p>
            </div>
          </div>
          <div className="rc-locked-feat">
            <span className="rc-feat-num">02</span>
            <div>
              <strong>One-Click Clipboard Sync</strong>
              <p>Copy formatted sections cleanly to update your LinkedIn profile in minutes.</p>
            </div>
          </div>
          <div className="rc-locked-feat">
            <span className="rc-feat-num">03</span>
            <div>
              <strong>Multiple Saved Drafts</strong>
              <p>Save and switch between customized profile versions for different roles and industries.</p>
            </div>
          </div>
          <div className="rc-locked-feat">
            <span className="rc-feat-num">04</span>
            <div>
              <strong>Complete Suite Included</strong>
              <p>Also includes {cfg.pro_resume_limit} saved resumes, all 50 templates, AI ATS optimization, and unlimited downloads.</p>
            </div>
          </div>
        </div>
        <div className="rc-locked-actions">
          <button className="rc-button rc-primary" onClick={() => onUpgrade?.('pro')}>
            Upgrade to Pro — ₹{cfg.pro_price || 499} <ArrowRight size={16} />
          </button>
          <button className="rc-button" onClick={() => onNavigate?.('account')}>
            View all plans & features
          </button>
        </div>
        <p className="rc-fine" style={{ textAlign: 'center', marginTop: 14 }}>
          One-time payment of ₹{cfg.pro_price || 499}. No monthly subscriptions or recurring fees.
        </p>
      </div>
      <section className="rc-section">
        <div className="rc-section-heading"><h2>Learn as you go</h2></div>
        <TutorialList videos={videos} section={kind} />
      </section>
    </>;
  }

  return <WritingStudioContent {...props} />;
}

function WritingStudioContent({ kind, data, documents, setDocuments, cfg, onSignIn, notify, user, videos, onResume }) {
  const isLinkedIn = kind === 'linkedin';
  const [title, setTitle] = useState(isLinkedIn ? 'My LinkedIn profile' : 'My cover letter');
  const [context, setContext] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [review, setReview] = useState([]);
  const [draft, setDraft] = useState(isLinkedIn ? { headline: '', about: '', experience: '' } : { letter: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const fields = isLinkedIn ? [['headline', 'Headline', 3], ['about', 'About', 8], ['experience', 'Experience highlights', 6]] : [['letter', 'Your letter', 18]];
  const copy = async text => { try { await navigator.clipboard.writeText(text); notify('Copied to clipboard', 'success'); } catch { notify('Copy unavailable. Select the text and copy it manually.', 'error'); } };
  const useResume = () => {
    const p = data.personal;
    if (isLinkedIn) setDraft({ headline: p.title || '', about: data.summary || '', experience: data.experience.filter(item => item.jobTitle).map(item => `${item.jobTitle}${item.company ? ` · ${item.company}` : ''}\n${item.bullets || ''}`).join('\n\n') });
    else setDraft({ letter: `Dear Hiring Team,\n\nI am interested in the ${p.title || '[role]'} position at [company].\n\n${data.summary || '[Explain your relevant experience and why this role interests you.]'}\n\n[Add a specific example from your work that matches the job requirements.]\n\nThank you for considering my application. I would welcome the opportunity to discuss how I can contribute.\n\nKind regards,\n${[p.firstName, p.lastName].filter(Boolean).join(' ')}` });
    setError('');
  };
  const generate = async () => {
    if (!user) return onSignIn();
    if (user?.plan !== 'pro') {
      setError('AI writing assistance is exclusively available on the ₹499 Pro plan. Upgrade to unlock instant AI drafting.');
      return;
    }
    setBusy('generate'); setError('');
    try { const result = await api('/workspace/generate/', { method: 'POST', body: { task: kind, resume: data, context, source_text: sourceText } }); if (mounted.current) setDraft(result); }
    catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(''); }
  };
  const save = async () => {
    if (!user) return onSignIn();
    if (!title.trim() || !Object.values(draft).some(value => value.trim())) return setError('Add a title and some content before saving.');
    setBusy('save'); setError('');
    try { const result = await api('/documents/', { method: 'POST', body: { kind, title: title.trim(), content: draft } }); if (mounted.current) { setDocuments(previous => [result, ...previous]); notify('Draft saved to your account', 'success'); } }
    catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(''); }
  };
  const remove = async id => {
    if (!await askConfirmation({title:'Delete this draft?',message:'This removes the saved draft from your account. Your current editable copy will remain.',confirmLabel:'Delete draft',danger:true})) return;
    try { await api(`/documents/${id}/`, { method: 'DELETE' }); setDocuments(previous => previous.filter(item => item.id !== id)); } catch (err) { setError(err.message); }
  };
  const uploadSource = async file => {
    if (!file) return;
    setBusy('upload'); setError(''); setReview([]);
    try {const text=await readDocumentText(file); if(mounted.current)setSourceText(text);}
    catch(err){if(mounted.current)setError(err.message);}finally{if(mounted.current)setBusy('');}
  };
  const importProfile = async () => {
    setBusy('profile');setError('');setReview([]);
    try {const result=await api('/workspace/linkedin/import/',{method:'POST',body:{url:profileUrl}});if(mounted.current){setSourceText(result.profile_text);setProfileUrl(result.profile_url);}}
    catch(err){if(mounted.current)setError(err.message);}finally{if(mounted.current)setBusy('');}
  };
  const reviewProfile = async () => {
    setBusy('review');setError('');setReview([]);
    try {const result=await api('/workspace/assist/',{method:'POST',body:{task:'linkedin_review',resume:data,context,source_text:sourceText,profile_url:profileUrl}});if(mounted.current)setReview(result.recommendations);}
    catch(err){if(mounted.current)setError(err.message);}finally{if(mounted.current)setBusy('');}
  };
  return <>
    <div className="rc-page-heading"><div><span className="rc-eyebrow">{isLinkedIn ? 'MAKE A STRONG FIRST IMPRESSION' : 'MAKE THE INTRODUCTION PERSONAL'}</span><h1>{isLinkedIn ? 'Your story, professionally told.' : 'A letter that sounds like you.'}</h1><p>{isLinkedIn ? 'Turn your resume into a clear LinkedIn profile. Review, refine, then copy it to LinkedIn.' : 'Connect your experience to the opportunity. Build a draft, make it yours, and save it for later.'}</p></div></div>
    <div className="rc-studio-grid"><div className="rc-panel rc-form"><div className="rc-panel-heading"><h2>{isLinkedIn ? 'Profile workspace' : 'Letter workspace'}</h2><span className="rc-tag">Editable draft</span></div>
      <label>Draft title<input disabled={!!busy} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label>
      {isLinkedIn&&<><label>Existing LinkedIn profile URL<input type="url" placeholder="https://www.linkedin.com/in/your-profile" value={profileUrl} maxLength={500} onChange={e=>{setProfileUrl(e.target.value);setReview([]);}} disabled={!!busy}/></label><button className="rc-button" onClick={importProfile} disabled={!!busy||!profileUrl}>Import profile details</button><p className="rc-fine">URL import requires a connected profile-data provider. You can also paste your profile text or upload your LinkedIn PDF export.</p></>}
      <label>{isLinkedIn?'Upload profile export':'Upload your resume'}<input type="file" accept=".pdf,.docx,.txt" disabled={!!busy} onChange={e=>{uploadSource(e.target.files[0]);e.target.value='';}}/></label>
      <label>{isLinkedIn?'Existing profile text':'Resume source text'}<textarea rows={5} maxLength={20000} value={sourceText} disabled={!!busy} onChange={e=>{setSourceText(e.target.value);setReview([]);}} placeholder={isLinkedIn?'Paste your current headline, about, experience and skills.':'Upload a resume, paste its text, or use your current Resume Studio content.'}/></label>
      {isLinkedIn&&cfg.ai_enabled&&<button className="rc-button" onClick={reviewProfile} disabled={!!busy||!sourceText.trim()}>{busy==='review'?'Reviewing profile…':'Review existing profile'}</button>}
      {review.length>0&&<div className="rc-ai-result"><h3>Recommended improvements</h3><ul>{review.map((item,i)=><li key={i}>{item}</li>)}</ul><p className="rc-fine">Use these recommendations as you refine the editable profile draft below.</p></div>}
      <div className="rc-actions"><button className="rc-button" disabled={!!busy} onClick={useResume}>Use current resume</button><button className="rc-text-button" disabled={!!busy} onClick={onResume}>Edit resume <ArrowUpRight size={14} /></button></div>
      <label>{isLinkedIn ? 'Target role & tone' : 'Company, role & job description'}<textarea disabled={!!busy} rows={4} maxLength={12000} value={context} onChange={e => {setContext(e.target.value);setReview([]);}} placeholder={isLinkedIn ? 'e.g. Product designer · thoughtful, concise, approachable' : 'Paste the role requirements and tell us why you want to join this company.'} /></label>
      {cfg.ai_enabled && <button className="rc-button rc-primary" disabled={!!busy} onClick={generate}>{busy === 'generate' ? 'Preparing your draft…' : 'Draft with AI assistance'} <ArrowRight size={16} /></button>}
      <p className="rc-fine">Use your real experience. Review every detail before publishing or sending.</p>
      {error && <p className="rc-error" role="alert">{error}</p>}
      {fields.map(([key, label, rows]) => <label key={key}><span className="rc-label-row">{label}<button className="rc-text-button" type="button" aria-label={`Copy ${label.toLowerCase()}`} disabled={!draft[key]} onClick={() => copy(draft[key])}><Copy size={13} /> Copy</button></span><textarea aria-label={label} rows={rows} disabled={!!busy} value={draft[key] || ''} maxLength={20000} onChange={e => setDraft({ ...draft, [key]: e.target.value })} placeholder={`Write your ${label.toLowerCase()} here…`} /></label>)}
      <div className="rc-actions"><button className="rc-button rc-primary" disabled={!!busy} onClick={save}><Save size={16} /> {busy === 'save' ? 'Saving…' : 'Save a copy'}</button><button className="rc-button" onClick={() => copy(Object.values(draft).filter(Boolean).join('\n\n'))}>Copy all</button></div>
    </div><aside className="rc-studio-aside"><div className="rc-panel rc-guidance"><span className="rc-eyebrow">THE FINISHING TOUCHES</span><h2>{isLinkedIn ? 'A profile worth opening.' : 'Before you send.'}</h2>{(isLinkedIn ? ['Use a clear, recent profile photograph.', 'Choose a banner that reflects your field.', 'Lead with your role and the value you bring.', 'Add specific achievements to your experience.', 'Check your public profile URL and contact details.'] : ['Address the right company and role.', 'Include one relevant, specific example.', 'Keep it focused—ideally one page.', 'Remove placeholders and check all names.']).map((item, i) => <p className="rc-check-item" key={item}><span>{String(i + 1).padStart(2, '0')}</span>{item}</p>)}</div>
      <div className="rc-panel"><h2>Saved drafts</h2>{documents.filter(item => item.kind === kind).length ? documents.filter(item => item.kind === kind).map(item => <div className="rc-saved-row" key={item.id}><button onClick={() => { setTitle(item.title); setDraft(item.content); }}><strong>{item.title}</strong><small>{new Date(item.updated_at).toLocaleDateString()}</small></button><button className="rc-icon-button" aria-label={`Delete ${item.title}`} onClick={() => remove(item.id)}><Trash2 size={15} /></button></div>) : <p className="rc-muted">Your saved drafts will appear here.</p>}</div>
    </aside></div><section className="rc-section"><div className="rc-section-heading"><h2>Learn as you go</h2></div><TutorialList videos={videos} section={kind === 'cover' ? 'cover' : 'linkedin'} /></section>
  </>;
}

export default function ReadyWorkspace({ page, setPage, data, template, onLoad, onNew, onImport, onAccount, onSignIn, onTutorial, onPreview, onConfig, onRequestEditing, theme, toggleTheme, notify }) {
  const { user, fetchMe } = useAuth();
  const [cfg, setCfg] = useState(fallbackConfig);
  const [resumes, setResumes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState('My resume');
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState('all');
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  useEffect(() => { let live = true; Promise.all([api('/workspace/config/'), api('/tutorials/')]).then(([settings, list]) => { if (live) { setCfg(settings); onConfig?.(settings); setVideos(list); } }).catch(err => { if (live) setError(`Workspace content could not load: ${err.message}`); }); return () => { live = false; }; }, [onConfig]);
  useEffect(() => {
    let live = true; setResumes([]); setDocuments([]); setSelectedId(null); setTitle('My resume'); setError(''); setBusy(false);
    if (user) { setLoading(true); Promise.all([api('/resumes/'), api('/documents/')]).then(([saved, drafts]) => { if (live) { setResumes(saved); setDocuments(drafts); } }).catch(err => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); }); }
    else setLoading(false);
    return () => { live = false; };
  }, [user?.id]);
  const navigate = value => { setPage(value); setMenu(false); };
  const newResume = () => { setSelectedId(null); setTitle('My resume'); onNew(); navigate('resume'); };
  const saveResume = async copy => {
    if (!user) return onSignIn();
    if (!title.trim()) return setError('Give your resume a title before saving.');
    const owner = user.id; setBusy(true); setError('');
    try { const id = copy ? null : selectedId; const result = await api(id ? `/resumes/${id}/` : '/resumes/', { method: id ? 'PATCH' : 'POST', body: { title: title.trim(), template, content_json: data } }); if (currentUser.current !== owner) return; setSelectedId(result.id); setResumes(previous => [result, ...previous.filter(item => item.id !== result.id)]); notify('Resume saved to your account', 'success'); }
    catch (err) { if (currentUser.current === owner) setError(err.message); }
    finally { if (currentUser.current === owner) setBusy(false); }
  };
  const removeResume = async id => { if (!await askConfirmation({title:'Delete this resume?',message:'This removes the saved resume from your account. Your current editor draft will remain.',confirmLabel:'Delete resume',danger:true})) return; try { await api(`/resumes/${id}/`, { method: 'DELETE' }); setResumes(previous => previous.filter(item => item.id !== id)); if (selectedId === id) setSelectedId(null); } catch (err) { setError(err.message); } };
  const checkout = async (planType = 'pro') => {
    if (!user) return onSignIn();
    if (!cfg.payments_enabled) { setError('Checkout will be available after the administrator configures Razorpay.'); navigate('account'); return; }
    setBusy(planType); setError('');
    try {
      if (!window.Razorpay) await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = () => reject(new Error('Checkout could not load. Please check your internet connection.')); document.body.appendChild(script); });
      const order = await api('/payments/orders/', { method: 'POST', body: { plan: planType } });
      const checkoutWindow = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Ready Candidate',
        description: `${planType === 'starter' ? 'Basic' : 'Pro'} access · one-time payment`,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#254f43' },
        handler: async result => {
          try {
            await api('/payments/verify/', { method: 'POST', body: result });
            await fetchMe();
            notify(planType === 'starter' ? 'Basic plan activated! All 50 resume templates unlocked.' : 'Ready Candidate Pro activated! LinkedIn Studio and AI features unlocked.', 'success');
          } catch (err) {
            setError(err.message);
          }
        }
      });
      checkoutWindow.on('payment.failed', () => setError('Payment did not complete. You can try again.'));
      checkoutWindow.open();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const currentLabel = navigation.find(item => item[0] === page)?.[1] || 'Overview';
  return <>
    {menu && <button className="rc-nav-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside className={`rc-sidebar ${menu ? 'is-open' : ''}`}><button className="rc-brand-button" onClick={() => navigate('dashboard')} aria-label="Ready Candidate home"><Brand /></button><span className="rc-nav-label">YOUR WORKSPACE</span><nav aria-label="Workspace navigation">{navigation.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{page === id && <i />}</button>)}</nav><div className="rc-sidebar-bottom"><div className="rc-sidebar-note"><ShieldCheck size={22} /><strong>Built around your story.</strong><p>Your resumes and drafts, together in your account.</p></div><button className="rc-sidebar-user" onClick={user ? () => navigate('account') : onSignIn}><span className="rc-avatar">{user?.name?.slice(0, 1) || <UserRound size={17} />}</span><span><strong>{user?.name || 'Make yourself at home'}</strong><small>{user ? `${user.plan === 'pro' ? 'Pro' : user.plan === 'starter' ? 'Basic' : 'Guest'} account` : 'Sign in to save your work'}</small></span><ArrowUpRight size={16} /></button></div></aside>
    <header className="rc-header"><div><button className="rc-icon-button rc-mobile-menu" aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(!menu)}>{menu ? <X size={20} /> : <Menu size={20} />}</button><span className="rc-breadcrumb">Workspace <span>/</span> <strong>{currentLabel}</strong></span></div><div className="rc-header-actions"><span className="rc-private"><ShieldCheck size={14} /> Your personal workspace</span><button className="rc-icon-button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button><button className="rc-button rc-small" onClick={user ? onAccount : onSignIn}>{user ? <UserRound size={16} /> : <LogIn size={16} />}{user ? 'My account' : 'Sign in'}</button></div></header>
    {page === 'resume' && !['starter','pro'].includes(user?.plan) && <div className="rc-savebar rc-preview-savebar"><span className="rc-tag"><Eye size={14}/> Preview only · sample content</span><button className="rc-button rc-small rc-primary" onClick={onRequestEditing}>Unlock editing</button></div>}
    {page === 'resume' && ['starter','pro'].includes(user?.plan) && <div className="rc-savebar"><label className="rc-resume-title">Resume title<input aria-label="Resume title" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} /></label><span className="rc-fine">Save your changes before leaving.</span><button className="rc-icon-button rc-mobile-preview" aria-label="Preview resume" onClick={onPreview}><Eye size={18} /></button><button className="rc-button rc-small rc-primary" disabled={busy} onClick={() => saveResume(false)}><Save size={15} /> {busy ? 'Saving…' : 'Save resume'}</button>{selectedId && <button className="rc-button rc-small" disabled={busy} onClick={() => saveResume(true)}>Save a copy</button>}{error && <p className="rc-error" role="alert">{error}</p>}</div>}
    {(page !== 'resume' || cfg.resume_enabled === false) && <main className="rc-main" id="workspace-content" key={user?.id || 'guest'}>
      {page === 'resume' && <Empty title="Resume Studio is taking a short break">The administrator has temporarily disabled resume editing.</Empty>}
      {error && <div className="rc-error" role="alert">{error}<button className="rc-text-button" onClick={() => setError('')}>Dismiss</button></div>}
      {cfg.announcement && <div className="rc-announcement">{cfg.announcement}</div>}
      {page === 'dashboard' && <>
        <div className="rc-page-heading"><div><span className="rc-eyebrow">A LITTLE PREPARATION. A LOT OF POSSIBILITY.</span><h1>{user ? `Welcome back, ${user.name?.split(' ')[0]}.` : 'Welcome to your next move.'}</h1><p>Your career essentials, thoughtfully brought together.</p></div><button className="rc-button" onClick={onTutorial}><BookOpen size={16} /> Take a quick tour</button></div>
        <section className="rc-hero"><div className="rc-hero-copy"><span className="rc-pill">READY FOR WHAT’S NEXT</span><h2>{cfg.dashboard_title}</h2><p>{cfg.dashboard_description}</p><button className="rc-button rc-cream" onClick={() => navigate('resume')}>Work on my resume <ArrowRight size={17} /></button></div><div className="rc-hero-art" aria-hidden="true"><div className="rc-orbit" /><div className="rc-paper rc-paper-back" /><div className="rc-paper"><span className="rc-paper-name">YOUR NAME</span><span className="rc-paper-sub">A story worth sharing.</span><div className="rc-paper-rule" /><b>EXPERIENCE</b><i /><i /><i className="short" /><b>WHAT YOU BRING</b><i /><i className="short" /><div className="rc-paper-tags"><span>Curiosity</span><span>Craft</span><span>Impact</span></div></div><div className="rc-art-note"><Check size={17} /><span>One step closer.</span></div><span className="rc-art-star">✳</span></div></section>
        <section className="rc-section"><div className="rc-section-heading"><h2>Make your first impression count</h2><span>Three tools. One clear story.</span></div><div className="rc-tool-grid">{[['resume', '01', 'Resume Studio', 'Build, refine and download a resume that puts your experience first.', FileText, 'Start creating', 'sage'], ['linkedin', '02', 'LinkedIn Studio', 'Bring the same clarity to your headline, about section and profile.', Linkedin, 'Shape your profile', 'blue'], ['cover', '03', 'Cover Letters', 'Write a thoughtful introduction for the opportunity you have in mind.', Mail, 'Write your letter', 'clay']].map(([id, num, label, copy, Icon, cta, tone]) => <button className={`rc-tool rc-tone-${tone}`} key={id} onClick={() => navigate(id)}><div className="rc-tool-top"><span className="rc-tool-icon"><Icon size={23} /></span><span>{num}</span></div><h3>{label}</h3><p>{copy}</p><span className="rc-tool-cta">{cta}<ArrowUpRight size={18} /></span></button>)}</div></section>
        <section className="rc-section"><div className="rc-section-heading"><div><h2>Your resume collection</h2><p>Keep a version for every opportunity.</p></div><button className="rc-text-button" onClick={newResume}><Plus size={16} /> New resume</button></div>{loading ? <p className="rc-muted" role="status">Loading your saved resumes…</p> : resumes.length ? <div className="rc-resume-grid">{resumes.map(item => <article className="rc-resume-card" key={item.id}><div className="rc-resume-mini"><FileText size={36} /><span>{item.template}</span></div><div><h3>{item.title}</h3><p>Edited {new Date(item.updated_at).toLocaleDateString()}</p><div className="rc-actions"><button className="rc-text-button" onClick={() => { setSelectedId(item.id); setTitle(item.title); onLoad(item); navigate('resume'); }}>Open resume <ArrowRight size={14} /></button><button className="rc-icon-button" aria-label={`Delete ${item.title}`} onClick={() => removeResume(item.id)}><Trash2 size={15} /></button></div></div></article>)}</div> : <div className="rc-collection-empty"><span className="rc-empty-icon"><FileText size={27} /></span><div><h3>{user ? 'Your first resume belongs here.' : 'A home for your best work.'}</h3><p>{user ? 'Build a new resume or import one you already have, then save it to your account.' : 'Sign in to keep your resumes and drafts together, ready whenever you need them.'}</p></div><button className="rc-button" onClick={user ? onImport : onSignIn}>{user ? <Upload size={16} /> : <LogIn size={16} />}{user ? 'Import resume' : 'Sign in to save'}</button></div>}</section>
        <section className="rc-bottom-grid"><div className="rc-learning-banner"><span className="rc-eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</span><h2>Good applications start<br />with a little know-how.</h2><button className="rc-text-button" onClick={() => navigate('tutorials')}>Explore the learning library <ArrowUpRight size={17} /></button><BookOpen size={75} strokeWidth={1} /></div><div className="rc-progress-card"><span className="rc-eyebrow">YOUR WORKSPACE, AT A GLANCE</span><div><strong>{resumes.length.toString().padStart(2, '0')}</strong><span>saved resumes</span><strong>{documents.length.toString().padStart(2, '0')}</strong><span>saved drafts</span></div><p><ShieldCheck size={14} /> Saved work is accessible from your account.</p></div></section>
      </>}
      {(page === 'linkedin' || page === 'cover') && <WritingStudio key={`${page}-${user?.id || 'guest'}`} kind={page} data={data} documents={documents} setDocuments={setDocuments} cfg={cfg} onSignIn={onSignIn} notify={notify} user={user} videos={videos} onResume={() => navigate('resume')} onUpgrade={checkout} onNavigate={navigate} />}
      {page === 'tutorials' && <><div className="rc-page-heading"><div><span className="rc-eyebrow">SMALL LESSONS. USEFUL PROGRESS.</span><h1>A little guidance for your next step.</h1><p>Practical walkthroughs for your resume, LinkedIn profile and cover letters.</p></div><button className="rc-button" onClick={onTutorial}>Start the guided tour <ArrowRight size={16} /></button></div><div className="rc-filters" aria-label="Tutorial categories">{[['all', 'All guides'], ['resume', 'Resume'], ['linkedin', 'LinkedIn'], ['cover', 'Cover letters'], ['account', 'Account']].map(([id, label]) => <button className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)} key={id}>{label}</button>)}</div><TutorialList videos={videos} section={filter === 'all' ? undefined : filter} /><div className="rc-section rc-panel"><h2>Your first five minutes</h2>{[['01', 'Build your foundation', 'Add your contact details, experience and skills in Resume Studio.', 'resume'], ['02', 'Make your profile consistent', 'Use your resume to shape your LinkedIn headline and about section.', 'linkedin'], ['03', 'Make a personal introduction', 'Write a cover letter for a specific role and save a copy.', 'cover']].map(([n, title, copy, destination]) => <button className="rc-guide-step" key={n} onClick={() => navigate(destination)}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div><ArrowUpRight size={19} /></button>)}</div></>}
      {page === 'account' && <><div className="rc-page-heading"><div><span className="rc-eyebrow">YOUR SPACE. YOUR PACE.</span><h1>Account & plans</h1><p>Manage your details, saved work and access to the tools you need.</p></div></div><div className="rc-account-summary rc-panel"><span className="rc-avatar">{user?.name?.slice(0, 1) || <UserRound />}</span><div><h2>{user?.name || 'Your personal workspace'}</h2><p>{user?.email || 'Create an account to save your resumes and drafts.'}</p></div><button className="rc-button" onClick={user ? onAccount : onSignIn}>{user ? 'Manage account' : 'Sign in / Register'}<ArrowUpRight size={15} /></button></div><>{!cfg.payments_enabled&&<div className="rc-payment-note" role="status"><strong>Online payments are currently unavailable.</strong><p>You can continue previewing templates. Please try again later or contact support to purchase a plan.</p></div>}<div className="rc-plans">
        <article className="rc-panel rc-starter-plan">
          <span className="rc-eyebrow">ESSENTIAL TOOLKIT</span>
          <h2>Basic</h2>
          <div className="rc-price">₹{cfg.starter_price || 199}<small>one-time payment</small></div>
          <p>The essential toolkit for crafting, tailoring and downloading your resume.</p>
          <ul>
            <li>Resume Studio editor & live preview</li>
            <li>All 50 resume templates</li>
            <li>{cfg.starter_ats_limit || 5} ATS scoring reports</li>
            <li>{cfg.starter_resume_limit || 5} saved resumes</li>
            <li>{cfg.starter_download_limit || 5} PDF downloads</li>
            <li className="rc-plan-excluded">LinkedIn Studio (Pro exclusive)</li>
            <li className="rc-plan-excluded">AI writing & ATS optimization (Pro exclusive)</li>
          </ul>
          {user?.plan === 'starter' ? (
            <span className="rc-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface2)', fontWeight: 700 }}>
              <Check size={14} color="var(--accent)" /> Your active plan
            </span>
          ) : user?.plan === 'pro' ? (
            <span className="rc-tag" style={{ padding: '8px 14px' }}>Included in Pro</span>
          ) : (
            <button className="rc-button" disabled={busy || !cfg.payments_enabled} onClick={() => checkout('starter')}>
              {busy === 'starter' ? 'Opening checkout…' : cfg.payments_enabled ? `Choose Basic (₹${cfg.starter_price || 199})` : 'Online upgrades coming soon'}
              <ArrowRight size={16} />
            </button>
          )}
        </article>
        <article className="rc-panel rc-pro-plan">
          <span className="rc-eyebrow">COMPLETE CAREER SUITE</span>
          <h2>Ready Candidate Pro</h2>
          <div className="rc-price">₹{cfg.pro_price || 499}<small>one-time payment</small></div>
          <p>The complete workspace with LinkedIn Studio, AI writing assistance, and room to grow.</p>
          <ul>
            <li><strong>Everything in Basic</strong> plus Cover Letters</li>
            <li><strong>Full access to LinkedIn Studio</strong> (Headlines & About)</li>
            <li>{cfg.pro_resume_limit || 50} saved resumes & all 50 templates</li>
            <li>AI writing assistance & ATS bullet optimization</li>
            <li>Unlimited PDF downloads & ATS reports</li>
            <li>Learning library and practical guides</li>
          </ul>
          {user?.plan === 'pro' ? (
            <span className="rc-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--rc-forest)', color: '#fff', fontWeight: 700 }}>
              <Check size={14} /> Your active plan
            </span>
          ) : (
            <button className="rc-button rc-primary" disabled={busy || !cfg.payments_enabled} onClick={() => checkout('pro')}>
              {busy === 'pro' ? 'Opening checkout…' : cfg.payments_enabled ? (user?.plan === 'starter' ? `Upgrade to Pro (₹${cfg.pro_price || 499})` : `Choose Pro (₹${cfg.pro_price || 499})`) : 'Online upgrades coming soon'}
              <ArrowRight size={16} />
            </button>
          )}
          {!cfg.payments_enabled && cfg.support_email && (
            <a className="rc-text-button" href={`mailto:${cfg.support_email}`}>Contact support</a>
          )}
        </article>
      </div></></>}
      <footer className="rc-footer"><span>Ready Candidate <span>·</span> Built for your next chapter.</span><span>Take your time. Make it yours.</span></footer>
    </main>}
  </>;
}
