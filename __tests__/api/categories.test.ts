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

function jsonRequest(body: unknown) {
  return new Request('http://x/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/categories', () => {
  beforeEach(() => {
    jest.resetModules()
    supabase = makeSupabase({
      user: { id: 'user-1' },
      fromResponses: {
        profiles: [{ data: { account_id: 'acc-1' }, error: null }],
        categories: [
          { data: null, error: null }, // existing lookup → none
          { data: { id: 'cat-1', name: 'Alimentação', color: 'bg-orange-500' }, error: null }, // insert
        ],
      },
    })
  })

  it('rejects an empty body', async () => {
    const { POST } = await import('@/app/api/categories/route')
    const req = new Request('http://x', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects when name is missing', async () => {
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: '', color: 'bg-red-500' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Nome é obrigatório/i)
  })

  it('rejects when name is too short', async () => {
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'ab', color: 'bg-red-500' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/mínimo 3/i)
  })

  it('rejects when name has invalid characters', async () => {
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'foo@bar', color: 'bg-red-500' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/caracteres inválidos/i)
  })

  it('returns 401 when not authenticated', async () => {
    supabase = makeSupabase({ user: null })
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'Lazer', color: 'bg-purple-500' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when profile is missing', async () => {
    supabase = makeSupabase({
      user: { id: 'user-1' },
      fromResponses: { profiles: [{ data: null, error: null }] },
    })
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'Lazer', color: 'bg-purple-500' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when category already exists', async () => {
    supabase = makeSupabase({
      user: { id: 'user-1' },
      fromResponses: {
        profiles: [{ data: { account_id: 'acc-1' }, error: null }],
        categories: [{ data: { id: 'existing' }, error: null }],
      },
    })
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'Alimentação', color: 'bg-orange-500' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/já existe/i)
  })

  it('inserts the category on success', async () => {
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'Alimentação', color: 'bg-orange-500' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ id: 'cat-1', name: 'Alimentação', color: 'bg-orange-500' })
    expect(supabase.from).toHaveBeenCalledWith('categories')
  })

  it('returns 500 when insert fails', async () => {
    supabase = makeSupabase({
      user: { id: 'user-1' },
      fromResponses: {
        profiles: [{ data: { account_id: 'acc-1' }, error: null }],
        categories: [
          { data: null, error: null }, // lookup
          { data: null, error: { message: 'boom' } }, // insert fails
        ],
      },
    })
    const { POST } = await import('@/app/api/categories/route')
    const res = await POST(jsonRequest({ name: 'Lazer', color: 'bg-purple-500' }))
    expect(res.status).toBe(500)
  })
})
