import { useEffect,useId,useRef,useState } from 'react';
import { LockKeyhole,Info,Trash2 } from 'lucide-react';
export default function FeedbackDialog(){
  const [request,setRequest]=useState(null);
  const ref=useRef(null),pending=useRef([]),current=useRef(null);
  const titleId=useId(),descriptionId=useId();
  useEffect(()=>{const receive=e=>{if(current.current){pending.current.push(e.detail);return;}current.current=e.detail;setRequest(e.detail);};window.addEventListener('rc-dialog',receive);return()=>{window.removeEventListener('rc-dialog',receive);current.current?.resolve(false);pending.current.forEach(item=>item.resolve(false));};},[]);
  useEffect(()=>{if(request&&!ref.current.open)ref.current.showModal();},[request]);
  const close=value=>{ref.current.close();current.current?.resolve(value);const next=pending.current.shift()||null;current.current=next;setRequest(next);};
  const Icon=request?.kind==='plan'?LockKeyhole:request?.danger?Trash2:Info;
  return <dialog ref={ref} className="rc-feedback-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={e=>{e.preventDefault();close(false);}} onClick={e=>{if(e.target===ref.current)close(false);}}>{request&&<div className="rc-dialog-content"><span className={`rc-dialog-icon ${request.danger?'is-danger':''}`}><Icon size={25}/></span><h2 id={titleId}>{request.title}</h2><p id={descriptionId}>{request.message}</p>{request.detail&&<div className="rc-dialog-detail">{request.detail}</div>}<div className="rc-dialog-actions"><button className="rc-button" autoFocus onClick={()=>close(false)}>{request.cancelLabel||'Cancel'}</button><button className={`rc-button ${request.danger?'rc-danger':'rc-primary'}`} onClick={()=>close(true)}>{request.confirmLabel||'Continue'}</button></div></div>}</dialog>;
}
