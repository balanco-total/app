/**
 * @jest-environment node
 */
import { GET } from '@/app/api/version/route'

describe('GET /api/version', () => {
  const orig = process.env.VERCEL_GIT_COMMIT_SHA

  afterEach(() => {
    if (orig === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = orig
  })

  it('returns "dev" when VERCEL_GIT_COMMIT_SHA is unset', async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ buildId: 'dev' })
  })

  it('returns the commit SHA when set', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123'
    const res = await GET()
    await expect(res.json()).resolves.toEqual({ buildId: 'abc123' })
  })
})
