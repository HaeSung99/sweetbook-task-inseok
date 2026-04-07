import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/** localStorage JWT */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/** JWT 저장 또는 삭제 */
export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('access_token', token);
  else localStorage.removeItem('access_token');
}

/** 요청마다 Authorization 부여, FormData면 Content-Type 제거 */
api.interceptors.request.use((config) => {
  const t = getStoredToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});
