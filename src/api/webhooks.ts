import { apiRequest } from './client';
import type { Webhook, WebhookList } from './types';
import { PAGE_SIZE } from '../lib/paging';

export function listWebhooks(input: { page: number; search: string }): Promise<WebhookList> {
  const params = new URLSearchParams({
    page: String(input.page),
    limit: String(PAGE_SIZE),
  });
  if (input.search) params.set('search', input.search);
  return apiRequest<WebhookList>(`/v1/webhooks?${params.toString()}`);
}

export function getWebhook(id: string): Promise<Webhook> {
  return apiRequest<Webhook>(`/v1/webhooks/${encodeURIComponent(id)}`);
}

export function updateWebhook(id: string, input: { name: string; url: string }): Promise<Webhook> {
  return apiRequest<Webhook>(`/v1/webhooks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  });
}
