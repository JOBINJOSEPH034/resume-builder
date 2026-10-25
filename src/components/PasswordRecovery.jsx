import { useState } from 'react';
import { api } from '../api.js';

export default function PasswordRecovery({ onBack }) {
  const [step,setStep]=useState('request');
  const [email,setEmail]=useState('');
  const [code,setCode]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [challenge,setChallenge]=useState('');
  const [token,setToken]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const submit=async event=>{
    event.preventDefault();setBusy(true);
    try {
      if(step==='reset' && password!==confirm) throw new Error('Passwords do not match.');
      const body=step==='request'?{email}:step==='verify'?{challenge,code}:{challenge,reset_token:token,password};
      const result=await api(`/auth/recovery/${step}/`,{method:'POST',body});
      if(step==='request'){setChallenge(result.challenge);setStep('verify');setMessage(result.message);}
      else if(step==='verify'){setToken(result.reset_token);setStep('reset');setMessage('Email verified. Choose your new password.');}
      else {setPassword('');setConfirm('');setToken('');setStep('done');setMessage(result.message);}
    }catch(error){setMessage(error.message);}finally{setBusy(false);}
  };
  return <div className="rc-form"><h2>Reset your password</h2><form onSubmit={submit}>{step==='request'&&<label>Account email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}{step==='verify'&&<label>Six-digit email code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/></label>}{step==='reset'&&<><label>New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label></>}<p role="status" className="rc-fine">{message}</p>{step!=='done'&&<button className="rc-button rc-primary" disabled={busy}>{busy?'Please wait…':step==='request'?'Send verification code':step==='verify'?'Verify code':'Update password'}</button>}</form><div className="rc-actions"><button className="rc-text-button" onClick={onBack}>Back to sign in</button>{step==='verify'&&<button className="rc-text-button" onClick={()=>{setStep('request');setCode('');setMessage('');}}>Request a new code</button>}</div></div>;
}
