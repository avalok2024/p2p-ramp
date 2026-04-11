import axios from 'axios';

function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (import.meta.env.PROD) {
    if (!raw) return '/api';
    return `${raw.replace(/\/$/, '').replace(/\/api$/i, '')}/api`;
  }
  if (raw && import.meta.env.VITE_DEV_DIRECT_API === 'true') {
    return `${raw.replace(/\/$/, '').replace(/\/api$/i, '')}/api`;
  }
  return '/api';
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof Error && !axios.isAxiosError(err)) return err.message;
  if (!axios.isAxiosError(err)) return 'Something went wrong.';
  if (err.code === 'ECONNABORTED') return 'Request timed out.';
  if (!err.response) {
    return 'Cannot reach API. Start Docker + postgres, then backend on port 3000.';
  }
  const m = err.response.data?.message as string | string[] | undefined;
  if (Array.isArray(m)) return m.join(' ');
  if (typeof m === 'string') return m;
  return `Error ${err.response.status ?? ''}`.trim();
}

export const api = axios.create({ baseURL: resolveApiBase(), timeout: 15000 });
api.interceptors.request.use(c => { const t = localStorage.getItem('rampx_admin_token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use(r => r, e => { if (e.response?.status === 401) { localStorage.removeItem('rampx_admin_token'); window.location.href = '/login'; } return Promise.reject(e); });
export default api;
