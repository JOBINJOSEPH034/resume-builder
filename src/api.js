const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected response. Please try again.'); });
  if (!response.ok) {
    const detail = data.error || data.detail || Object.values(data).flat().find(value => typeof value === 'string');
    throw new Error(detail || `Request failed (${response.status}). Please try again.`);
  }
  return data;
}
