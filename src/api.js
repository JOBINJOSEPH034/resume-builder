import { announce,readableMessage } from './feedback.js';
const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch(()=>{const message='We couldn’t connect. Check your connection and try again.';announce(message,'error');throw new Error(message);});
  if (response.status === 204) return null;
  const data = await response.json().catch(() => { const message='The service is temporarily unavailable. Please try again.';announce(message,'error');throw new Error(message); });
  if (!response.ok) {
    const detail = readableMessage(data, 'We couldn’t complete that request. Please try again.');
    announce(detail,'error');
    throw new Error(detail);
  }
  return data;
}
