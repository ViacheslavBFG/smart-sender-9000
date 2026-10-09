import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { login, getMe } from '../api/auth';
import { resetTransportState } from '../api/client';
import { listWebhooks } from '../api/webhooks';
import { DEMO_USER } from '../mocks/credentials';
import { server } from '../mocks/server';
import { expireSession, getRequestCounts, holdNextProtectedRequests, resetMockState } from '../mocks/state';
import { endLocalSession, getDeviceSessionToken } from '../session/store';

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  resetMockState();
  resetTransportState();
  endLocalSession();
});

afterAll(() => {
  server.close();
});

it('coalesces two parallel 401 responses into one rotate and retries both', async () => {
  await login(DEMO_USER.email, DEMO_USER.password);
  expect(getDeviceSessionToken()).toMatch(/^[a-f0-9]{64}$/);
  expect(getRequestCounts()).toEqual({ rotate: 0, me: 1, webhooks: 0 });

  expireSession();
  holdNextProtectedRequests(2);

  const [me, list] = await Promise.all([getMe(), listWebhooks({ page: 1, search: '' })]);

  expect(getRequestCounts()).toEqual({ rotate: 1, me: 3, webhooks: 2 });
  expect(me).toMatchObject({ id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name });
  expect(list.data).toHaveLength(10);
  expect(list.paging).toEqual({
    pages: { current: 1, last: 3 },
    results: { total: 28, limitation: 10 },
  });

  const followUp = await getMe();
  expect(followUp.email).toBe(DEMO_USER.email);
  expect(getRequestCounts()).toEqual({ rotate: 1, me: 4, webhooks: 2 });
});
