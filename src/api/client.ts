import { HEADER_CSRF, HEADER_XRW, HEADER_XRW_VALUE } from './headers';
import { ApiError, errorFromResponse } from './errors';
import { getFingerprint } from '../auth/fingerprint';
import { notifySessionExpired } from '../session/store';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

type Method = 'GET' | 'POST' | 'PUT';

export type RequestOptions = {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  /** Rotate не має запускати ще один rotate, якщо сам отримав 401. */
  skipAuthRefresh?: boolean;
};

type Attempt = {
  auth: boolean;
  csrf: boolean;
};

let csrfToken: string | null = null;
let csrfInflight: Promise<string> | null = null;
let rotateInflight: Promise<void> | null = null;

export function resetTransportState(): void {
  csrfToken = null;
  csrfInflight = null;
  rotateInflight = null;
}

function resolveUrl(path: string): string {
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

async function loadCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  if (!csrfInflight) {
    csrfInflight = (async () => {
      const response = await fetch(resolveUrl('/csrf'), {
        method: 'GET',
        headers: { [HEADER_XRW]: HEADER_XRW_VALUE },
      });
      const token = response.headers.get(HEADER_CSRF);
      if (response.status !== 204 || !token) {
        throw new ApiError(response.status, 'TokenMismatchException', 'CSRF token was not issued.');
      }
      csrfToken = token;
      return token;
    })().finally(() => {
      csrfInflight = null;
    });
  }

  return csrfInflight;
}

/**
 * Усі виклики, що отримали 401, поки триває оновлення, ділять цей Promise.
 * Запит rotate вимикає оновлення авторизації, тож не може запланувати ще один.
 */
function rotateSession(): Promise<void> {
  if (!rotateInflight) {
    rotateInflight = apiRequest<unknown>('/auth/token/rotate', {
      method: 'POST',
      body: { fingerprint: getFingerprint() },
      skipAuthRefresh: true,
    })
      .then(() => undefined)
      .finally(() => {
        rotateInflight = null;
      });
  }

  return rotateInflight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  attempt: Attempt = { auth: false, csrf: false },
): Promise<T> {
  const method = options.method ?? 'GET';
  const mutating = method === 'POST' || method === 'PUT';

  if (path !== '/csrf') {
    await loadCsrfToken();
  }

  const headers = new Headers(options.headers);
  headers.set(HEADER_XRW, HEADER_XRW_VALUE);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (mutating && csrfToken) {
    headers.set(HEADER_CSRF, csrfToken);
  }

  const response = await fetch(resolveUrl(path), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 419 && mutating && !attempt.csrf) {
    csrfToken = null;
    await loadCsrfToken();
    return apiRequest<T>(path, options, { ...attempt, csrf: true });
  }

  if (response.status === 401 && !options.skipAuthRefresh && !attempt.auth) {
    try {
      await rotateSession();
    } catch (error) {
      notifySessionExpired();
      throw error;
    }
    return apiRequest<T>(path, options, { ...attempt, auth: true });
  }

  if (response.status === 401 && !options.skipAuthRefresh && attempt.auth) {
    notifySessionExpired();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await errorFromResponse(response);
  }

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, 'BadRequestException', 'Response was not valid JSON.');
  }
}
