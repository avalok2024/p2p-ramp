import axios from 'axios';

/** Dev uses Vite proxy `/api` → backend (same-origin, no CORS). Prod uses `VITE_API_URL`. */
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
    return 'Cannot reach API. Start Docker Desktop, run `docker compose up -d postgres` in p2p-ramp, then `npm run dev` in apps/backend.';
  }
  const m = err.response.data?.message as string | string[] | undefined;
  if (Array.isArray(m)) return m.join(' ');
  if (typeof m === 'string') return m;
  return `Error ${err.response.status ?? ''}`.trim();
}

const baseURL = resolveApiBase();

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rampx_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear storage and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rampx_token');
      localStorage.removeItem('rampx_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
