import { HEADER_CAPTCHA } from './headers';
import { apiRequest } from './client';
import type { User } from './types';
import { getFingerprint } from '../auth/fingerprint';
import {
  endLocalSession,
  markAuthenticated,
  notifySessionExpired,
  setDeviceSessionToken,
} from '../session/store';

export function getMe(): Promise<User> {
  return apiRequest<User>('/v1/me');
}

export async function login(email: string, password: string): Promise<User> {
  const fingerprint = getFingerprint();
  const issued = await apiRequest<{ device_session_token: string }>('/auth/login', {
    method: 'POST',
    body: { email, password, fingerprint },
    headers: { [HEADER_CAPTCHA]: 'accepted-by-mock' },
  });

  setDeviceSessionToken(issued.device_session_token);

  try {
    await apiRequest('/auth/token/issue', {
      method: 'POST',
      body: {
        device_session_token: issued.device_session_token,
        fingerprint,
      },
    });
    markAuthenticated();
    return await getMe();
  } catch (error) {
    endLocalSession();
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/token/revoke', {
      method: 'POST',
      body: { fingerprint: getFingerprint() },
      skipAuthRefresh: true,
    });
  } finally {
    notifySessionExpired('logout');
  }
}
