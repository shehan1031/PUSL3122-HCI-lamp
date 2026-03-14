/** API client — calls the Express backend at NEXT_PUBLIC_API_URL */

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getUser() {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('lamp_user');
  return s ? JSON.parse(s) : null;
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('lamp_token') || '';
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API error');
  return data.data;
}

export const authAPI = {
  login:  (email: string, password: string) =>
    api('/api/auth/login',  { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () =>
    api('/api/auth/logout', { method: 'POST' }),
  me:     () => api('/api/auth/me'),
};

export const designAPI = {
  list:   ()                                    => api('/api/designs'),
  create: (d: Record<string, unknown>)          => api('/api/designs',    { method: 'POST',  body: JSON.stringify(d) }),
  get:    (id: string)                          => api(`/api/designs/${id}`),
  update: (id: string, d: Record<string, unknown>) => api(`/api/designs/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete: (id: string)                          => api(`/api/designs/${id}`, { method: 'DELETE' }),
};

export const adminAPI = {
  stats:      ()                                    => api('/api/admin/stats'),
  users:      (search = '')                         => api(`/api/admin/users?search=${encodeURIComponent(search)}`),
  updateUser: (id: string, d: Record<string, unknown>) => api(`/api/admin/users/${id}`, { method: 'PATCH',  body: JSON.stringify(d) }),
  deleteUser: (id: string)                          => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
  designs:    (status = '')                         => api(`/api/admin/designs${status ? `?status=${status}` : ''}`),
};
