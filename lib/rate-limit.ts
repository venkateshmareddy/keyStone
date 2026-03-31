type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function getBucket(key: string, now: number): Bucket {
  let bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, bucket);
  }
  return bucket;
}

export function assertNotRateLimited(
  key: string,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = store.get(key);
  if (bucket && now <= bucket.resetAt && bucket.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export function registerFailure(key: string): void {
  const now = Date.now();
  const bucket = getBucket(key, now);
  bucket.count += 1;
  store.set(key, bucket);
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
