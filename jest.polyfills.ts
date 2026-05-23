// Polyfills that must run before Jest installs the test framework.
// Required for: Next.js NextResponse/Request/Response in jsdom env, fetch in utils/pluggy.
import { TextEncoder, TextDecoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  // @ts-expect-error attaching to global
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  // @ts-expect-error attaching to global
  global.TextDecoder = TextDecoder
}

// Provide Web Fetch API (Request/Response/Headers/fetch) in jsdom.
// next/server depends on these globals.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const undici = require('undici')
  if (typeof global.Request === 'undefined') {
    // @ts-expect-error attaching to global
    global.Request = undici.Request
  }
  if (typeof global.Response === 'undefined') {
    // @ts-expect-error attaching to global
    global.Response = undici.Response
  }
  if (typeof global.Headers === 'undefined') {
    // @ts-expect-error attaching to global
    global.Headers = undici.Headers
  }
  if (typeof global.fetch === 'undefined') {
    // @ts-expect-error attaching to global
    global.fetch = undici.fetch
  }
  if (typeof global.FormData === 'undefined') {
    // @ts-expect-error attaching to global
    global.FormData = undici.FormData
  }
} catch {
  // undici is optional; tests that don't need fetch will still work.
}
