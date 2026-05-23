import { checkRateLimit, getIp } from '@/utils/rateLimit'

describe('utils/rateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-22T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('allows the first request', () => {
      expect(checkRateLimit('rl:first', 3, 60_000)).toBe(true)
    })

    it('allows up to `limit` requests in the window', () => {
      const key = 'rl:burst'
      expect(checkRateLimit(key, 3, 60_000)).toBe(true)
      expect(checkRateLimit(key, 3, 60_000)).toBe(true)
      expect(checkRateLimit(key, 3, 60_000)).toBe(true)
      expect(checkRateLimit(key, 3, 60_000)).toBe(false)
    })

    it('resets after the window expires', () => {
      const key = 'rl:window'
      checkRateLimit(key, 2, 60_000)
      checkRateLimit(key, 2, 60_000)
      expect(checkRateLimit(key, 2, 60_000)).toBe(false)

      jest.advanceTimersByTime(60_001)
      expect(checkRateLimit(key, 2, 60_000)).toBe(true)
    })

    it('uses distinct counters per key', () => {
      checkRateLimit('rl:k1', 1, 60_000)
      expect(checkRateLimit('rl:k1', 1, 60_000)).toBe(false)
      expect(checkRateLimit('rl:k2', 1, 60_000)).toBe(true)
    })
  })

  describe('getIp', () => {
    it('returns first IP from x-forwarded-for', () => {
      const req = new Request('http://test', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      expect(getIp(req)).toBe('1.2.3.4')
    })

    it('falls back to x-real-ip', () => {
      const req = new Request('http://test', { headers: { 'x-real-ip': '9.9.9.9' } })
      expect(getIp(req)).toBe('9.9.9.9')
    })

    it('returns "unknown" when no IP headers are present', () => {
      const req = new Request('http://test')
      expect(getIp(req)).toBe('unknown')
    })

    it('trims whitespace around x-forwarded-for values', () => {
      const req = new Request('http://test', {
        headers: { 'x-forwarded-for': '   10.0.0.1   ' },
      })
      expect(getIp(req)).toBe('10.0.0.1')
    })
  })
})
