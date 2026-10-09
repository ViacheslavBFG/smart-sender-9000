import { useSyncExternalStore } from 'react';

type Listener = () => void;

export type SessionEndReason = 'logout' | 'expired';

let deviceSessionToken: string | null = null;
let authenticated = false;
let sessionEndReason: SessionEndReason | null = null;
const listeners = new Set<Listener>();
let onExpired: () => void = () => {};

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthenticated(): boolean {
  return authenticated;
}

export function useAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, getAuthenticated, getAuthenticated);
}

export function setDeviceSessionToken(token: string): void {
  deviceSessionToken = token;
}

export function getDeviceSessionToken(): string | null {
  return deviceSessionToken;
}

export function markAuthenticated(): void {
  if (authenticated) return;
  authenticated = true;
  emit();
}

export function endLocalSession(): void {
  deviceSessionToken = null;
  if (!authenticated) return;
  authenticated = false;
  emit();
}

export function setSessionExpiredHandler(handler: () => void): void {
  onExpired = handler;
}

export function notifySessionExpired(reason: SessionEndReason = 'expired'): void {
  sessionEndReason = reason;
  endLocalSession();
  onExpired();
}

export function consumeSessionEndReason(): SessionEndReason | null {
  const reason = sessionEndReason;
  sessionEndReason = null;
  return reason;
}
