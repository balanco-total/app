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

function patch(body: unknown) {
  return new Request('http://x/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    jest.resetModules()
    supabase = makeSupabase({
      user: { id: 'user-1' },
      fromResponses: { profiles: [{ data: null, error: null }] }, // update returns nothing
    })
  })

  it('rejects empty body', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const req = new Request('http://x', { method: 'PATCH' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing name', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(patch({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Nome é obrigatório/i)
  })

  it('rejects name > 60 chars', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(patch({ name: 'a'.repeat(61) }))
    expect(res.status).toBe(400)
  })

  it('rejects invalid characters', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(patch({ name: 'foo@bar' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/caracteres inválidos/i)
  })

  it('returns 401 when not authenticated', async () => {
    supabase = makeSupabase({ user: null })
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(patch({ name: 'Ana' }))
    expect(res.status).toBe(401)
  })

  it('updates the profile and returns the trimmed name', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(patch({ name: '  Ana  ' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, name: 'Ana' })
  })

  it('returns 500 when the update fails', async () => {
    supabase = makeSupabase({
      user: { id: 'user-1' },
      fromResponses: { profiles: [{ data: null, error: { message: 'boom' } }] },
    })
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(patch({ name: 'Ana' }))
    expect(res.status).toBe(500)
  })
})
