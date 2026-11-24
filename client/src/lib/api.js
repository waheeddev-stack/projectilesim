// Thin fetch wrapper for the Express API. Cookies carry the session (httpOnly).

const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const qs = query
    ? '?' +
      new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== null))
    : '';
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Is the API running?');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code || 'ERROR',
      data?.error?.message || `Request failed (${res.status})`,
    );
  }
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listExperiments: (query) => request('/experiments', { query }),
  getExperiment: (id) => request(`/experiments/${id}`),
  createExperiment: (body) => request('/experiments', { method: 'POST', body }),
  deleteExperiment: (id) => request(`/experiments/${id}`, { method: 'DELETE' }),
  stats: () => request('/stats'),
};
