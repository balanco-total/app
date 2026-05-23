import { COLOR_MAP, FALLBACK_COLORS, MONTHS_PT, fmt, fmtAxis } from '@/components/charts/helpers'

describe('components/charts/helpers', () => {
  describe('fmt', () => {
    it('formats currency with pt-BR thousands and decimals', () => {
      // Use replace + regex because pt-BR may use non-breaking space; we just verify shape.
      const result = fmt(1234.56)
      expect(result.startsWith('R$ ')).toBe(true)
      expect(result).toContain('1.234,56')
    })

    it('formats zero', () => {
      expect(fmt(0)).toContain('0,00')
    })

    it('formats integers with two decimals', () => {
      expect(fmt(7)).toContain('7,00')
    })
  })

  describe('fmtAxis', () => {
    it('uses k suffix for values >= 1000', () => {
      expect(fmtAxis(1500)).toBe('R$ 2k')
      expect(fmtAxis(1000)).toBe('R$ 1k')
    })

    it('omits k suffix for values < 1000', () => {
      expect(fmtAxis(999)).toBe('R$ 999')
      expect(fmtAxis(0)).toBe('R$ 0')
    })
  })

  describe('COLOR_MAP', () => {
    it('maps tailwind class to hex', () => {
      expect(COLOR_MAP['bg-orange-500']).toBe('#f97316')
      expect(COLOR_MAP['bg-rose-500']).toBe('#f43f5e')
    })
  })

  describe('FALLBACK_COLORS', () => {
    it('contains at least one valid hex color', () => {
      expect(FALLBACK_COLORS.length).toBeGreaterThan(0)
      FALLBACK_COLORS.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i))
    })
  })

  describe('MONTHS_PT', () => {
    it('has 12 month names', () => {
      expect(MONTHS_PT).toHaveLength(12)
      expect(MONTHS_PT[0]).toBe('Janeiro')
    })
  })
})
