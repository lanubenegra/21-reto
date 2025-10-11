const WINDOW_MS = 60_000
const LIMIT = 30

type Bucket = { count: number; expiresAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit = LIMIT) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + WINDOW_MS })
    return true
  }

  if (bucket.count >= limit) {
    return false
  }

  bucket.count += 1
  return true
}

