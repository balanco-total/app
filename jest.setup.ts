import '@testing-library/jest-dom'

// Silence intentional console output in unit tests.
const originalError = console.error
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Allow React's act warnings to surface; suppress noisy logs from intentional error paths.
    const first = args[0]
    if (typeof first === 'string' && /not wrapped in act\(/.test(first)) {
      originalError(...args)
    }
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

// Default env vars for modules that read them at import time.
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'test-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role'
process.env.PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID ?? 'test-client'
process.env.PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET ?? 'test-secret'
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_dummy'
process.env.STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? 'price_dummy'
