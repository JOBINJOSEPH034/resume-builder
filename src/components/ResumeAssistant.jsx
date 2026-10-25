import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { uid } from '../utils.js';

export default function ResumeAssistant({data,onChange,enabled,initialTask='summary'}) {
  const [task,setTask]=useState(initialTask);
  const [context,setContext]=useState('');
  const [index,setIndex]=useState(0);
  const [result,setResult]=useState(null);
  const [selected,setSelected]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const source=useRef(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const suggest=async()=>{
    setBusy(true);setError('');setResult(null);setSelected([]);source.current=data;
    try {const value=await api('/workspace/assist/',{method:'POST',body:{task,resume:data,context,experience_index:Number(index)}});if(mounted.current)setResult(value);}
    catch(e){if(mounted.current)setError(e.message);}finally{if(mounted.current)setBusy(false);}
  };
  const apply=()=>{
    if(source.current!==data){setError('Your resume changed after this suggestion. Generate a fresh suggestion before applying.');return;}
    if(result.summary)onChange({...data,summary:result.summary});
    if(result.bullets)onChange({...data,experience:data.experience.map((item,i)=>i===Number(index)?{...item,bullets:result.bullets}:item)});
    if(result.skills && selected.length)onChange({...data,skills:[...data.skills,{id:uid(),category:'Additional skills',skills:selected}]});
    setResult(null);setSelected([]);
  };
  return <div className="rc-panel rc-form rc-assistant"><div className="rc-panel-heading"><h2>Resume AI assistant</h2><span className="rc-tag">Pro</span></div><p className="rc-fine">Suggestions use your real background. Review every change before applying.</p><label>Help me with<select disabled={busy} className="f-select" value={task} onChange={e=>{setTask(e.target.value);setResult(null);setSelected([]);}}><option value="summary">Professional summary · including early career</option><option value="experience">Improve experience bullets</option><option value="skills">Recommend relevant skills</option><option value="resume_review">Review my resume</option></select></label>{task==='experience'&&<label>Experience entry<select disabled={busy} className="f-select" value={index} onChange={e=>{setIndex(e.target.value);setResult(null);}}>{data.experience.map((item,i)=><option value={i} key={item.id}>{item.jobTitle||`Experience ${i+1}`}{item.company?` · ${item.company}`:''}</option>)}</select></label>}<label>Target role, job requirements or additional facts<textarea disabled={busy} rows={3} maxLength={12000} value={context} onChange={e=>{setContext(e.target.value);setResult(null);}} placeholder="For an early-career resume, describe your actual projects, education and strengths."/></label><button className="rc-button rc-primary" onClick={suggest} disabled={busy||!enabled}>{busy?'Preparing suggestions…':'Get suggestions'}</button>{!enabled&&<p className="rc-fine">AI is disabled by the administrator.</p>}{error&&<p className="rc-error" role="alert">{error}</p>}{result&&<div className="rc-ai-result"><h3>Review the suggestion</h3>{(result.summary||result.bullets)&&<textarea aria-label="Editable AI suggestion" rows={7} maxLength={10000} value={result.summary||result.bullets} onChange={e=>setResult({...result,[result.summary!==undefined?'summary':'bullets']:e.target.value})}/>} {result.skills&&<><p className="rc-fine">Select only skills you actually have. Other recommendations can guide your learning.</p>{result.skills.map(skill=><label className="rc-skill-choice" key={skill}><input type="checkbox" checked={selected.includes(skill)} onChange={e=>setSelected(e.target.checked?[...selected,skill]:selected.filter(s=>s!==skill))}/>{skill}</label>)}</>}{result.recommendations&&<ul>{result.recommendations.map((item,i)=><li key={i}>{item}</li>)}</ul>}{!result.recommendations&&<button className="rc-button" disabled={!!result.skills&&!selected.length} onClick={apply}>Apply reviewed suggestion</button>}</div>}</div>;
}
