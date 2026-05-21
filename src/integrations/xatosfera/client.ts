import type { AuthResponse, AuthUser, RefreshResponse } from '../../types/api';

const ACCESS_TOKEN_KEY = 'xatosfera_access_token';
const REFRESH_TOKEN_KEY = 'xatosfera_refresh_token';
const USER_KEY = 'xatosfera_user';
const REFRESH_SKEW_MS = 60_000;

const API_URL = (import.meta.env.VITE_API_URL || 'https://api.hatosfera-crm.pp.ua').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export function getAccessToken() {
  return hasStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
}

export function getRefreshToken() {
  return hasStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
}

export function getStoredUser() {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuthSession(session: { access?: string; refresh?: string; user?: AuthUser }) {
  if (!hasStorage()) return;
  if (session.access) window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access);
  if (session.refresh) window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh);
  if (session.user) window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearAuthSession() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function normalizePath(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function tokenExpMs(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const parsed = JSON.parse(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function shouldRefresh(token: string) {
  const exp = tokenExpMs(token);
  return !!exp && exp - Date.now() < REFRESH_SKEW_MS;
}

let refreshPromise: Promise<AuthUser | null> | null = null;

export async function refreshSession() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = apiFetch<RefreshResponse>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      },
      false,
    )
      .then((session) => {
        storeAuthSession(session);
        return session.user || getStoredUser();
      })
      .catch((error: unknown) => {
        clearAuthSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function ensureFreshToken() {
  const access = getAccessToken();
  if (access && shouldRefresh(access) && getRefreshToken()) {
    await refreshSession();
  }
}

async function parseResponse<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return undefined as T;
  if (contentType.includes('application/json')) return (await response.json()) as T;
  return (await response.text()) as T;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  if (auth) await ensureFreshToken();

  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const access = getAccessToken();
  if (auth && access) headers.set('Authorization', `Bearer ${access}`);

  const request = () =>
    fetch(normalizePath(path), {
      ...options,
      headers,
    });

  let response = await request();
  if (auth && response.status === 401 && getRefreshToken()) {
    await refreshSession();
    const refreshed = getAccessToken();
    if (refreshed) headers.set('Authorization', `Bearer ${refreshed}`);
    response = await request();
  }

  const payload = await parseResponse<T>(response);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : response.statusText;
    throw new ApiError(response.status, message, payload);
  }

  return payload;
}

export async function loginRequest(email: string, password: string) {
  const session = await apiFetch<AuthResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  storeAuthSession(session);
  return session;
}
