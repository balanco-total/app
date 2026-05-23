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
  return new Request('http://x/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function authedSupabase(insertResponse: { data?: unknown; error?: unknown } = { data: [{ id: 'exp-1' }], error: null }) {
  return makeSupabase({
    user: { id: 'user-1' },
    fromResponses: {
      profiles: [{ data: { id: 'user-1', account_id: 'acc-1' }, error: null }],
      expenses: [insertResponse],
    },
  })
}

describe('POST /api/expenses', () => {
  beforeEach(() => {
    jest.resetModules()
    supabase = authedSupabase()
  })

  const validBody = {
    description: 'Almoço',
    amount: 50,
    category_id: 'cat-1',
    date: '2026-05-22',
    financial_account_id: 'fa-1',
  }

  it('rejects an empty body', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const req = new Request('http://x', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing description', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, description: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Descrição é obrigatória/i)
  })

  it('rejects description with invalid characters', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, description: 'foo@bar' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/caracteres inválidos/i)
  })

  it('rejects non-positive amount', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, amount: 0 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/maior que zero/i)
  })

  it('rejects amount > 1.000.000', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, amount: 1_000_001 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/1\.000\.000/i)
  })

  it('rejects missing category', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, category_id: undefined }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Categoria/i)
  })

  it('rejects invalid quantity', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, quantity: 200 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Quantidade/i)
  })

  it('rejects malformed date', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, date: '22/05/2026' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Formato de data inválido/i)
  })

  it('rejects an invalid date (e.g. 31/02)', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, date: '2026-02-31' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Data inválida/i)
  })

  it('rejects an installment that lands on an invalid day (31/03 +1 month → 31/04 inexistent)', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest({ ...validBody, date: '2026-03-31', quantity: 2 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/dia 31 não existe em abril/i)
  })

  it('returns 401 when not authenticated', async () => {
    supabase = makeSupabase({ user: null })
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 400 when financial_account_id is missing', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const { financial_account_id: _omit, ...rest } = validBody
    const res = await POST(jsonRequest(rest))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Conta é obrigatória/i)
  })

  it('inserts the expense on success', async () => {
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest(validBody))
    expect(res.status).toBe(200)
    expect(supabase.from).toHaveBeenCalledWith('expenses')
  })

  it('returns 500 when insert fails', async () => {
    supabase = authedSupabase({ data: null, error: { message: 'db error' } })
    const { POST } = await import('@/app/api/expenses/route')
    const res = await POST(jsonRequest(validBody))
    expect(res.status).toBe(500)
  })
})
