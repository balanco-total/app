/**
 * @jest-environment node
 */
import { makeSupabase, type MockSupabase } from '../helpers/supabaseMock'

let supabase: MockSupabase
let admin: MockSupabase

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [], set: () => {} })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => supabase),
}))

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(() => admin),
}))

function jsonReq(body: unknown, method: 'DELETE' | 'PATCH') {
  return new Request('http://x/api/users/target', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('DELETE /api/users/[id]', () => {
  beforeEach(() => {
    jest.resetModules()
    supabase = makeSupabase({
      user: { id: 'owner-1' },
      fromResponses: {
        profiles: [
          { data: { id: 'owner-1', account_id: 'acc-1', role: 'owner' }, error: null }, // caller
          { data: { id: 'target', account_id: 'acc-1', role: 'member' }, error: null },  // target
        ],
      },
    })
    admin = makeSupabase()
  })

  it('returns 403 when caller is not the owner', async () => {
    supabase = makeSupabase({
      user: { id: 'member-1' },
      fromResponses: {
        profiles: [{ data: { id: 'member-1', account_id: 'acc-1', role: 'member' }, error: null }],
      },
    })
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({}, 'DELETE'), { params: { id: 'target' } })
    expect(res.status).toBe(403)
  })

  it('returns 400 when trying to delete self', async () => {
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({}, 'DELETE'), { params: { id: 'owner-1' } })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/excluir a si mesmo/i)
  })

  it('returns 404 when target is in another account', async () => {
    supabase = makeSupabase({
      user: { id: 'owner-1' },
      fromResponses: {
        profiles: [
          { data: { id: 'owner-1', account_id: 'acc-1', role: 'owner' }, error: null },
          { data: { id: 'target', account_id: 'OTHER', role: 'member' }, error: null },
        ],
      },
    })
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({}, 'DELETE'), { params: { id: 'target' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when target is an owner', async () => {
    supabase = makeSupabase({
      user: { id: 'owner-1' },
      fromResponses: {
        profiles: [
          { data: { id: 'owner-1', account_id: 'acc-1', role: 'owner' }, error: null },
          { data: { id: 'target', account_id: 'acc-1', role: 'owner' }, error: null },
        ],
      },
    })
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({}, 'DELETE'), { params: { id: 'target' } })
    expect(res.status).toBe(400)
  })

  it('deletes the user via admin client and returns success', async () => {
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({}, 'DELETE'), { params: { id: 'target' } })
    expect(res.status).toBe(200)
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('target')
  })

  it('migrates expenses before deletion when migrate=true', async () => {
    admin = makeSupabase({
      fromResponses: { expenses: [{ data: null, error: null }] },
    })
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({ migrate: true }, 'DELETE'), { params: { id: 'target' } })
    expect(res.status).toBe(200)
    expect(admin.from).toHaveBeenCalledWith('expenses')
  })

  it('returns 500 when admin deleteUser fails', async () => {
    admin = makeSupabase({
      adminAuth: { deleteUser: async () => ({ error: { message: 'boom' } }) },
    })
    const { DELETE } = await import('@/app/api/users/[id]/route')
    const res = await DELETE(jsonReq({}, 'DELETE'), { params: { id: 'target' } })
    expect(res.status).toBe(500)
  })
})

describe('PATCH /api/users/[id]', () => {
  beforeEach(() => {
    jest.resetModules()
    supabase = makeSupabase({
      user: { id: 'owner-1' },
      fromResponses: {
        profiles: [
          { data: { id: 'owner-1', account_id: 'acc-1', role: 'owner' }, error: null },
          { data: { id: 'target', account_id: 'acc-1', role: 'member' }, error: null },
        ],
      },
    })
    admin = makeSupabase({
      fromResponses: { profiles: [{ data: null, error: null }] },
    })
  })

  it('returns 400 when disabled is not boolean', async () => {
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const res = await PATCH(jsonReq({ disabled: 'yes' }, 'PATCH'), { params: { id: 'target' } })
    expect(res.status).toBe(400)
  })

  it('returns 400 when changing own status', async () => {
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const res = await PATCH(jsonReq({ disabled: true }, 'PATCH'), { params: { id: 'owner-1' } })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/próprio status/i)
  })

  it('disables the user by updating profile + banning auth', async () => {
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const res = await PATCH(jsonReq({ disabled: true }, 'PATCH'), { params: { id: 'target' } })
    expect(res.status).toBe(200)
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'target',
      expect.objectContaining({ ban_duration: '876000h' }),
    )
  })

  it('re-enables the user with ban_duration none', async () => {
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const res = await PATCH(jsonReq({ disabled: false }, 'PATCH'), { params: { id: 'target' } })
    expect(res.status).toBe(200)
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'target',
      expect.objectContaining({ ban_duration: 'none' }),
    )
  })

  it('rolls back the profile flag when auth update fails', async () => {
    admin = makeSupabase({
      fromResponses: {
        profiles: [
          { data: null, error: null }, // first update succeeds
          { data: null, error: null }, // rollback update
        ],
      },
      adminAuth: { updateUserById: async () => ({ error: { message: 'fail' } }) },
    })
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const res = await PATCH(jsonReq({ disabled: true }, 'PATCH'), { params: { id: 'target' } })
    expect(res.status).toBe(500)
    expect(admin.from).toHaveBeenCalledWith('profiles')
    // Verify at least 2 update calls (initial + rollback)
    const profileBuilderCalls = (admin.from as jest.Mock).mock.results
      .filter(r => (r.value as Record<string, unknown>)._table === 'profiles').length
    expect(profileBuilderCalls).toBeGreaterThanOrEqual(2)
  })
})
