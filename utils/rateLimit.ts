// In-memory sliding window rate limiter.
// Resets on cold start in serverless environments.
// For multi-instance production, replace with Upstash Redis or Vercel KV.

type Window = { count: number; resetAt: number }

const store = new Map<string, Window>()

function evict() {
  const now = Date.now()
  store.forEach((win, key) => {
    if (now > win.resetAt) store.delete(key)
  })
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  evict()
  const now = Date.now()
  const win = store.get(key)

  if (!win || now > win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (win.count >= limit) return false
  win.count++
  return true
}

export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
