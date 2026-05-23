/**
 * @jest-environment node
 */
import { makeSupabase, type MockSupabase } from '../helpers/supabaseMock'

let supabase: MockSupabase

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [], set: () => {} })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => supabase),
}))

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    supabase = makeSupabase({ signUpResponse: { error: null } })
    // Reset modules so the rate-limit in-memory Map is fresh each test.
    jest.resetModules()
  })

  it('rejects an empty body with 400', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const req = new Request('http://x/api/auth/signup', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/inválida/i)
  })

  it('rejects when name is missing', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(jsonRequest('http://x', { email: 'a@b.com', password: '123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Nome/i)
  })

  it('rejects an invalid email', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(jsonRequest('http://x', { name: 'Ana', email: 'notanemail', password: '123456' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/E-mail inválido/i)
  })

  it('rejects when password is missing', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(jsonRequest('http://x', { name: 'Ana', email: 'a@b.com', password: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Senha/i)
  })

  it('rejects when name exceeds 60 chars', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const longName = 'a'.repeat(61)
    const res = await POST(jsonRequest('http://x', { name: longName, email: 'a@b.com', password: '123456' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/máximo 60/i)
  })

  it('calls supabase.auth.signUp and returns success on valid input', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(
      jsonRequest('http://x.test/api/auth/signup', { name: 'Ana', email: 'a@b.com', password: 'pass123' }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        password: 'pass123',
        options: expect.objectContaining({
          data: { name: 'Ana' },
          emailRedirectTo: 'http://x.test/api/auth/callback',
        }),
      }),
    )
  })

  it('returns the supabase error message on signUp failure', async () => {
    supabase = makeSupabase({ signUpResponse: { error: { message: 'Email já cadastrado.' } } })
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(jsonRequest('http://x', { name: 'Ana', email: 'a@b.com', password: 'pass123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Email já cadastrado.')
  })
})
