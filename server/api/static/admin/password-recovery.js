(() => {
  const byId = id => document.getElementById('recovery-' + id);
  const form = byId('form');
  let step = 'request', challenge = '', resetToken = '';
  byId('restart').onclick = () => location.reload();
  form.onsubmit = async event => {
    event.preventDefault();
    const button = byId('submit');
    button.disabled = true;
    try {
      if (step === 'reset' && byId('password').value !== byId('confirm').value) throw new Error('Passwords do not match.');
      const body = step === 'request' ? {email: byId('email').value} : step === 'verify' ? {challenge, code: byId('code').value} : {challenge, reset_token: resetToken, password: byId('password').value};
      const response = await fetch('/api/auth/recovery/' + step + '/', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-CSRFToken':form.querySelector('[name=csrfmiddlewaretoken]').value}, body:JSON.stringify(body)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Recovery is unavailable. Please try again.');
      if (step === 'request') {
        challenge = data.challenge; step = 'verify';
        byId('email').readOnly = true;
        document.getElementById('code-row').hidden = false;
        byId('code').required = true; byId('code').focus();
        byId('restart').hidden = false;
        button.value = 'Verify code'; byId('message').textContent = data.message;
      } else if (step === 'verify') {
        resetToken = data.reset_token; step = 'reset';
        document.getElementById('code-row').hidden = true; byId('code').required = false;
        document.getElementById('password-row').hidden = false; document.getElementById('confirm-row').hidden = false;
        byId('password').required = true; byId('confirm').required = true; byId('password').focus();
        button.value = 'Update password'; byId('message').textContent = 'Email verified. Choose your new password.';
      } else {
        byId('password').value = ''; byId('confirm').value = ''; resetToken = '';
        button.hidden = true; byId('restart').hidden = true;
        byId('message').textContent = data.message;
      }
    } catch(error) { byId('message').textContent = error.message; }
    finally {button.disabled = false;}
  };
})();
