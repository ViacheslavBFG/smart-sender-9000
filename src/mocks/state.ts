import type { User, Webhook, WebhookList } from '../api/types';
import { randomHex } from '../lib/hex';
import { PAGE_SIZE, parsePage } from '../lib/paging';
import { DEMO_USER } from './credentials';

/** Тривалість сесії. Rotate подовжує її на той самий час. */
const SESSION_MS = 30_000;

export const CSRF_TOKEN = 'smart-sender-csrf-token';

const WEBHOOK_NAMES = [
  'Order created',
  'Order paid',
  'User registered',
  'Cart abandoned',
  'Message delivered',
  'Message failed',
  'Campaign started',
  'Campaign finished',
  'Subscriber added',
  'Subscriber removed',
  'Tag assigned',
  'Payment refunded',
  'Chat opened',
  'Chat closed',
  'Operator assigned',
  'Lead scored',
  'Form submitted',
  'Webhook ping',
  'Invoice issued',
  'Subscription renewed',
  'Subscription canceled',
  'Template approved',
  'Broadcast queued',
  'Broadcast sent',
  'Import finished',
  'Export finished',
  'Channel connected',
  'Channel disconnected',
];

type SessionStatus = 'none' | 'active';

type MockState = {
  webhooks: Webhook[];
  deviceToken: string | null;
  fingerprint: string | null;
  session: SessionStatus;
  expiresAt: number;
  rotateCalls: number;
  meCalls: number;
  webhookListCalls: number;
};

type Gate = {
  expected: number;
  arrived: number;
  opened: boolean;
  open: Promise<void>;
  release: () => void;
};

type FieldErrors = Record<string, string[]>;

let state: MockState = createState();
let gate: Gate | null = null;

function createState(): MockState {
  return {
    webhooks: WEBHOOK_NAMES.map((name, index) => ({
      id: String(index + 1),
      name,
      url: `https://hooks.smartsender.example/${index + 1}`,
      active: index % 5 !== 0,
      created_at: new Date(Date.UTC(2024, 0, 1, 8, index)).toISOString(),
    })),
    deviceToken: null,
    fingerprint: null,
    session: 'none',
    expiresAt: 0,
    rotateCalls: 0,
    meCalls: 0,
    webhookListCalls: 0,
  };
}

export function resetMockState(): void {
  state = createState();
  gate = null;
}

/** Затримує наступні захищені читання, доки одночасно не піде `expected` запитів. */
export function holdNextProtectedRequests(expected: number): void {
  let release = (): void => {};
  const open = new Promise<void>((resolve) => {
    release = () => resolve();
  });
  gate = { expected, arrived: 0, opened: false, open, release };
}

export async function waitForProtectedGate(): Promise<void> {
  if (!gate || gate.opened) return;
  gate.arrived += 1;
  if (gate.arrived >= gate.expected) {
    gate.opened = true;
    gate.release();
  }
  await gate.open;
}

export function expireSession(): void {
  state.expiresAt = Date.now() - 1_000;
}

export function getRequestCounts(): { rotate: number; me: number; webhooks: number } {
  return {
    rotate: state.rotateCalls,
    me: state.meCalls,
    webhooks: state.webhookListCalls,
  };
}

export function isSessionValid(): boolean {
  return state.session === 'active' && Date.now() < state.expiresAt;
}

export function currentUser(): User {
  return {
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    first_name: DEMO_USER.first_name,
    last_name: DEMO_USER.last_name,
    name: DEMO_USER.name,
  };
}

export function recordMeCall(): void {
  state.meCalls += 1;
}

export function recordWebhookListCall(): void {
  state.webhookListCalls += 1;
}

export function authenticate(
  email: unknown,
  password: unknown,
  fingerprint: unknown,
): { ok: true; token: string } | { ok: false; payload: FieldErrors } {
  const payload: FieldErrors = {};
  if (typeof email !== 'string' || email.trim() === '') {
    payload.email = ['The email field is required.'];
  }
  if (typeof password !== 'string' || password === '') {
    payload.password = ['The password field is required.'];
  }
  if (typeof fingerprint !== 'string' || !/^[a-f0-9]{32}$/.test(fingerprint)) {
    payload.fingerprint = ['The fingerprint must be 32 hex characters.'];
  }
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof fingerprint !== 'string' ||
    Object.keys(payload).length > 0
  ) {
    return { ok: false, payload };
  }

  if (email.trim().toLowerCase() !== DEMO_USER.email) {
    return {
      ok: false,
      payload: { email: ['These credentials do not match our records.'] },
    };
  }
  if (password !== DEMO_USER.password) {
    return {
      ok: false,
      payload: { password: ['The provided password is incorrect.'] },
    };
  }

  const token = randomHex(32);
  state.deviceToken = token;
  state.fingerprint = fingerprint;
  return { ok: true, token };
}

export function issueSession(
  token: unknown,
  fingerprint: unknown,
): { ok: true } | { ok: false; payload: FieldErrors } {
  if (typeof token !== 'string' || token !== state.deviceToken) {
    return {
      ok: false,
      payload: { device_session_token: ['The device session token is invalid.'] },
    };
  }
  if (typeof fingerprint !== 'string' || fingerprint !== state.fingerprint) {
    return {
      ok: false,
      payload: { fingerprint: ['The fingerprint is invalid.'] },
    };
  }

  state.session = 'active';
  state.expiresAt = Date.now() + SESSION_MS;
  return { ok: true };
}

/** Повертає false до issue і після revoke. Прострочена сесія все ще може зробити rotate. */
export function rotateCurrentSession(fingerprint: unknown): boolean {
  state.rotateCalls += 1;
  if (state.session !== 'active') return false;
  if (typeof fingerprint !== 'string' || fingerprint !== state.fingerprint) return false;
  state.expiresAt = Date.now() + SESSION_MS;
  return true;
}

export function revokeSession(): void {
  state.session = 'none';
  state.expiresAt = 0;
  state.deviceToken = null;
}

export function queryWebhooks(pageParam: string | null, searchParam: string | null): WebhookList {
  const page = parsePage(pageParam);
  const search = (searchParam ?? '').toLowerCase();
  const filtered = state.webhooks
    .slice()
    .sort((left, right) => Number(left.id) - Number(right.id))
    .filter((webhook) => webhook.name.toLowerCase().includes(search));
  const total = filtered.length;
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  return {
    data: filtered.slice(start, start + PAGE_SIZE).map((webhook) => ({ ...webhook })),
    paging: {
      pages: { current: page, last },
      results: { total, limitation: PAGE_SIZE },
    },
  };
}

export function findWebhook(id: string): Webhook | null {
  const webhook = state.webhooks.find((item) => item.id === id);
  return webhook ? { ...webhook } : null;
}

export function updateWebhook(
  id: string,
  name: unknown,
  url: unknown,
): { ok: true; webhook: Webhook } | { ok: false; payload: FieldErrors } {
  const payload: FieldErrors = {};
  if (typeof name !== 'string' || name.trim() === '') {
    payload.name = ['The name field is required.'];
  }
  if (typeof url !== 'string' || url.trim() === '') {
    payload.url = ['The url field is required.'];
  } else if (!isHttpUrl(url.trim())) {
    payload.url = ['The url must be a valid URL.'];
  }
  if (typeof name !== 'string' || typeof url !== 'string' || Object.keys(payload).length > 0) {
    return { ok: false, payload };
  }

  const webhook = state.webhooks.find((item) => item.id === id);
  if (!webhook) return { ok: false, payload: {} };

  webhook.name = name.trim();
  webhook.url = url.trim();
  return { ok: true, webhook: { ...webhook } };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
