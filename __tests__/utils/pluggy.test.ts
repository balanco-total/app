import { getPluggyApiKey, PLUGGY_BASE } from '@/utils/pluggy'

describe('utils/pluggy.getPluggyApiKey', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('POSTs credentials to /auth and returns apiKey', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ apiKey: 'pluggy-key-123' }),
    })
    // @ts-expect-error overriding global
    global.fetch = mockFetch

    await expect(getPluggyApiKey()).resolves.toBe('pluggy-key-123')

    expect(mockFetch).toHaveBeenCalledWith(
      `${PLUGGY_BASE}/auth`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.clientId).toBe(process.env.PLUGGY_CLIENT_ID)
    expect(body.clientSecret).toBe(process.env.PLUGGY_CLIENT_SECRET)
  })

  it('throws when the response is not ok', async () => {
    // @ts-expect-error overriding global
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 })
    await expect(getPluggyApiKey()).rejects.toThrow(/Pluggy \/auth failed: 401/)
  })

  it('throws when the response is missing apiKey', async () => {
    // @ts-expect-error overriding global
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    await expect(getPluggyApiKey()).rejects.toThrow(/missing apiKey/)
  })
})
