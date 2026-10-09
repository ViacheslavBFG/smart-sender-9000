import { http, HttpResponse } from 'msw';
import { HEADER_CAPTCHA, HEADER_CSRF, HEADER_XRW, HEADER_XRW_VALUE } from '../api/headers';
import {
  CSRF_TOKEN,
  authenticate,
  currentUser,
  findWebhook,
  isSessionValid,
  issueSession,
  queryWebhooks,
  recordMeCall,
  recordWebhookListCall,
  revokeSession,
  rotateCurrentSession,
  updateWebhook,
  waitForProtectedGate,
} from './state';

type ErrorType =
  | 'BadRequestException'
  | 'AuthenticationException'
  | 'NotFoundException'
  | 'TokenMismatchException'
  | 'ValidationException';

function jsonError(
  status: number,
  type: ErrorType,
  message: string,
  payload?: Record<string, string[]>,
): Response {
  return HttpResponse.json(
    {
      error: {
        type,
        message,
        ...(payload ? { payload } : {}),
      },
    },
    { status },
  );
}

function validation(payload: Record<string, string[]>): Response {
  return jsonError(422, 'ValidationException', 'The given data was invalid.', payload);
}

function unauthorized(): Response {
  return jsonError(401, 'AuthenticationException', 'Unauthenticated.');
}

function guard(request: Request, csrf: boolean): Response | null {
  if (request.headers.get(HEADER_XRW) !== HEADER_XRW_VALUE) {
    return jsonError(400, 'BadRequestException', 'X-Requested-With header is required.');
  }
  if (csrf && request.headers.get(HEADER_CSRF) !== CSRF_TOKEN) {
    return jsonError(419, 'TokenMismatchException', 'CSRF token mismatch.');
  }
  return null;
}

async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return jsonError(400, 'BadRequestException', 'Invalid JSON body.');
    }
    return value as Record<string, unknown>;
  } catch {
    return jsonError(400, 'BadRequestException', 'Invalid JSON body.');
  }
}

function isResponse(value: Record<string, unknown> | Response): value is Response {
  return value instanceof Response;
}

function isWebhookItemPath(url: string): boolean {
  return /^\/v1\/webhooks\/[^/]+$/.test(new URL(url).pathname);
}

function webhookIdFromUrl(url: string): string {
  return new URL(url).pathname.split('/').pop() ?? '';
}

export const handlers = [
  http.get('*/csrf', ({ request }) => {
    const rejected = guard(request, false);
    if (rejected) return rejected;
    return new HttpResponse(null, {
      status: 204,
      headers: { [HEADER_CSRF]: CSRF_TOKEN },
    });
  }),

  http.post('*/auth/login', async ({ request }) => {
    const rejected = guard(request, true);
    if (rejected) return rejected;
    if (!request.headers.get(HEADER_CAPTCHA)?.trim()) {
      return validation({ captcha: ['The captcha token is required.'] });
    }

    const body = await readJson(request);
    if (isResponse(body)) return body;

    const result = authenticate(body.email, body.password, body.fingerprint);
    if (!result.ok) return validation(result.payload);
    return HttpResponse.json({ device_session_token: result.token });
  }),

  http.post('*/auth/token/issue', async ({ request }) => {
    const rejected = guard(request, true);
    if (rejected) return rejected;

    const body = await readJson(request);
    if (isResponse(body)) return body;

    const result = issueSession(body.device_session_token, body.fingerprint);
    if (!result.ok) return validation(result.payload);
    return HttpResponse.json({});
  }),

  http.post('*/auth/token/rotate', async ({ request }) => {
    const rejected = guard(request, true);
    if (rejected) return rejected;

    const body = await readJson(request);
    if (isResponse(body)) return body;

    if (!rotateCurrentSession(body.fingerprint)) {
      return jsonError(400, 'BadRequestException', 'Unable to rotate session.');
    }
    return HttpResponse.json({});
  }),

  http.post('*/auth/token/revoke', async ({ request }) => {
    const rejected = guard(request, true);
    if (rejected) return rejected;

    const body = await readJson(request);
    if (isResponse(body)) return body;

    if (typeof body.fingerprint !== 'string' || !/^[a-f0-9]{32}$/.test(body.fingerprint)) {
      return validation({ fingerprint: ['The fingerprint must be 32 hex characters.'] });
    }

    revokeSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/v1/me', async ({ request }) => {
    await waitForProtectedGate();
    recordMeCall();
    const rejected = guard(request, false);
    if (rejected) return rejected;
    if (!isSessionValid()) return unauthorized();
    return HttpResponse.json(currentUser());
  }),

  http.get(({ request }) => isWebhookItemPath(request.url), async ({ request }) => {
    await waitForProtectedGate();
    const rejected = guard(request, false);
    if (rejected) return rejected;
    if (!isSessionValid()) return unauthorized();

    const webhook = findWebhook(webhookIdFromUrl(request.url));
    if (!webhook) return jsonError(404, 'NotFoundException', 'Webhook not found.');
    return HttpResponse.json(webhook);
  }),

  http.get('*/v1/webhooks', async ({ request }) => {
    await waitForProtectedGate();
    recordWebhookListCall();
    const rejected = guard(request, false);
    if (rejected) return rejected;
    if (!isSessionValid()) return unauthorized();

    const url = new URL(request.url);
    return HttpResponse.json(queryWebhooks(url.searchParams.get('page'), url.searchParams.get('search')));
  }),

  http.put(({ request }) => isWebhookItemPath(request.url), async ({ request }) => {
    const rejected = guard(request, true);
    if (rejected) return rejected;
    if (!isSessionValid()) return unauthorized();

    const id = webhookIdFromUrl(request.url);
    if (!findWebhook(id)) return jsonError(404, 'NotFoundException', 'Webhook not found.');

    const body = await readJson(request);
    if (isResponse(body)) return body;

    const result = updateWebhook(id, body.name, body.url);
    if (!result.ok) return validation(result.payload);
    return HttpResponse.json(result.webhook);
  }),
];
