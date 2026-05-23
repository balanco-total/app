/**
 * @jest-environment node
 */
import { makeSupabase } from '../helpers/supabaseMock'

const supabase = makeSupabase()

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [], set: () => {} })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => supabase),
}))

import { GET } from '@/app/api/auth/signout/route'

describe('GET /api/auth/signout', () => {
  it('signs the user out and redirects to /login', async () => {
    const res = await GET(new Request('http://example.com/api/auth/signout'))
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(307) // NextResponse.redirect default
    expect(res.headers.get('location')).toBe('http://example.com/login')
  })
})
