import { applyMask, parseMasked, MAX_CENTS } from '@/components/accounts/helpers'

describe('components/accounts/helpers (re-exports)', () => {
  it('re-exports applyMask from lib/utils', () => {
    expect(applyMask('1234')).toBe('12,34')
  })

  it('re-exports parseMasked from lib/utils', () => {
    expect(parseMasked('1.234,56')).toBeCloseTo(1234.56)
  })

  it('re-exports MAX_CENTS from lib/utils', () => {
    expect(MAX_CENTS).toBe(100_000_000)
  })
})
