type Entry = {
  hits: number;
  expiresAt: number;
};

const STORE = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = STORE.get(key);

  if (existing && existing.expiresAt > now) {
    if (existing.hits >= limit) {
      return false;
    }
    existing.hits += 1;
    return true;
  }

  STORE.set(key, { hits: 1, expiresAt: now + windowMs });
  return true;
}
