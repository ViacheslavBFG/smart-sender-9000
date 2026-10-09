import { randomHex } from '../lib/hex';

const FINGERPRINT_KEY = 'smart_sender_fingerprint';
const memoryStore = new Map<string, string>();

const memoryStorage = {
  getItem(key: string): string | null {
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
  },
};

function storage(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    if (typeof localStorage === 'undefined') return memoryStorage;
    localStorage.getItem(FINGERPRINT_KEY);
    return localStorage;
  } catch {
    return memoryStorage;
  }
}

/** Стабільний ідентифікатор пристрою з 32 шістнадцяткових символів. Створюється один раз і зберігається в localStorage. */
export function getFingerprint(): string {
  const store = storage();
  const existing = store.getItem(FINGERPRINT_KEY);
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;

  const created = randomHex(16);
  store.setItem(FINGERPRINT_KEY, created);
  return created;
}
