/** קליינט API פשוט עבור endpoints של auth */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export interface ApiError extends Error { status: number }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const e = new Error((data as { error?: string }).error ?? 'שגיאה') as ApiError;
    e.status = res.status;
    throw e;
  }
  return data as T;
}

export const api = {
  login:    (email: string, password: string) =>
    call<{ status: 'ok' | '2fa_required'; sessionId?: string; accessToken?: string; methods?: string[] }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup:   (input: { email: string; password: string; fullName: string; phone?: string }) =>
    call<{ id: string; email: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  verify2fa: (sessionId: string, method: string, code: string, accessToken: string) =>
    call<{ status: 'ok' }>('/auth/2fa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ sessionId, method, code }),
    }),
  setup2fa: (accessToken: string) =>
    call<{ qrDataUrl: string; otpauthUrl: string; backupCodes: string[] }>('/auth/2fa/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  forgot:   (email: string) =>
    call<{ ok: true; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  reset:    (token: string, newPassword: string) =>
    call<{ ok: true }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  logout:   () => call<{ ok: true }>('/auth/logout', { method: 'POST' }),
};
