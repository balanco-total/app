import { applyMask, parseMasked, MAX_CENTS, FIELD_PATTERN } from '@/lib/utils'

describe('lib/utils', () => {
  describe('applyMask', () => {
    it('returns empty for empty string', () => {
      expect(applyMask('')).toBe('')
    })

    it('returns empty when input has no digits', () => {
      expect(applyMask('abc')).toBe('')
    })

    it('formats single-digit input as cents', () => {
      expect(applyMask('5')).toBe('0,05')
    })

    it('formats two digits as cents', () => {
      expect(applyMask('99')).toBe('0,99')
    })

    it('formats three digits as reais and cents', () => {
      expect(applyMask('100')).toBe('1,00')
    })

    it('uses pt-BR thousand separators', () => {
      expect(applyMask('123456')).toBe('1.234,56')
    })

    it('strips non-digit characters before formatting', () => {
      expect(applyMask('abc1.234,56xyz')).toBe('1.234,56')
    })

    it('clamps at MAX_CENTS (R$ 1.000.000,00)', () => {
      const big = applyMask('99999999999999')
      expect(big).toBe((MAX_CENTS / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    })
  })

  describe('parseMasked', () => {
    it('parses a masked value back to a number', () => {
      expect(parseMasked('1.234,56')).toBeCloseTo(1234.56, 2)
    })

    it('parses zero', () => {
      expect(parseMasked('0,00')).toBe(0)
    })

    it('returns 0 for empty string', () => {
      expect(parseMasked('')).toBe(0)
    })

    it('returns 0 for invalid input', () => {
      expect(parseMasked('abc')).toBe(0)
    })

    it('is the inverse of applyMask', () => {
      const formatted = applyMask('123456')
      expect(parseMasked(formatted)).toBeCloseTo(1234.56, 2)
    })
  })

  describe('FIELD_PATTERN', () => {
    it('matches forbidden characters', () => {
      expect('hello@world'.match(FIELD_PATTERN)).toEqual(['@'])
    })

    it('does not match allowed characters (letters, digits, dash, slash, dot, space, accents)', () => {
      expect('Compras-2024 / Café 1.50'.match(FIELD_PATTERN)).toBeNull()
    })
  })

  describe('MAX_CENTS', () => {
    it('equals R$ 1.000.000,00 in cents', () => {
      expect(MAX_CENTS).toBe(100_000_000)
    })
  })
})
