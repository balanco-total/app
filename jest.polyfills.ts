// Polyfills that must run before Jest installs the test framework.
// Required for: Next.js NextResponse/Request/Response in jsdom env, fetch in utils/pluggy.
import { TextEncoder, TextDecoder } from 'util'

const g = global as unknown as Record<string, unknown>

if (typeof g.TextEncoder === 'undefined') {
  g.TextEncoder = TextEncoder
}
if (typeof g.TextDecoder === 'undefined') {
  g.TextDecoder = TextDecoder
}

// Provide Web Fetch API (Request/Response/Headers/fetch) in jsdom.
// next/server depends on these globals.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const undici = require('undici')
  if (typeof g.Request === 'undefined') {
    g.Request = undici.Request
  }
  if (typeof g.Response === 'undefined') {
    g.Response = undici.Response
  }
  if (typeof g.Headers === 'undefined') {
    g.Headers = undici.Headers
  }
  if (typeof g.fetch === 'undefined') {
    g.fetch = undici.fetch
  }
  if (typeof g.FormData === 'undefined') {
    g.FormData = undici.FormData
  }
} catch {
  // undici is optional; tests that don't need fetch will still work.
}
