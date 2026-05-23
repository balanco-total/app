import { daysRemaining } from '@/utils/billing'

describe('utils/billing.daysRemaining', () => {
  const FIXED_NOW = new Date('2026-05-22T12:00:00.000Z').getTime()

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
  })

  it('returns 0 when the trial has already ended', () => {
    expect(daysRemaining('2026-05-20T12:00:00.000Z')).toBe(0)
  })

  it('returns 0 when the trial ends right now', () => {
    expect(daysRemaining(new Date(FIXED_NOW).toISOString())).toBe(0)
  })

  it('rounds up partial days (ceil)', () => {
    // 1 hour from now should round up to 1 full day remaining
    const inOneHour = new Date(FIXED_NOW + 60 * 60 * 1000).toISOString()
    expect(daysRemaining(inOneHour)).toBe(1)
  })

  it('returns the correct number of days for a future date', () => {
    const inFiveDays = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysRemaining(inFiveDays)).toBe(5)
  })

  it('never returns negative', () => {
    expect(daysRemaining('2000-01-01T00:00:00.000Z')).toBe(0)
  })
})
