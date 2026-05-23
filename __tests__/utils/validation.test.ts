import { isValidFieldText, isValidEmail } from '@/utils/validation'

describe('utils/validation', () => {
  describe('isValidFieldText', () => {
    it('accepts ASCII letters and digits', () => {
      expect(isValidFieldText('Hello123')).toBe(true)
    })

    it('accepts allowed punctuation (dash, slash, dot, space)', () => {
      expect(isValidFieldText('a-b/c.d e')).toBe(true)
    })

    it('accepts accented Latin characters', () => {
      expect(isValidFieldText('Coração à toà')).toBe(true)
    })

    it('rejects @ symbol', () => {
      expect(isValidFieldText('foo@bar')).toBe(false)
    })

    it('rejects parentheses', () => {
      expect(isValidFieldText('foo(bar)')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidFieldText('')).toBe(false)
    })

    it('rejects script-like content', () => {
      expect(isValidFieldText('<script>alert(1)</script>')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it.each([
      ['simple@example.com', true],
      ['name.surname@sub.domain.io', true],
      ['x@y.z', true],
      ['no-at-symbol.com', false],
      ['', false],
      ['@example.com', false],
      ['user@', false],
      ['user@host', false],
      ['has space@example.com', false],
    ])('isValidEmail(%j) → %s', (input, expected) => {
      expect(isValidEmail(input)).toBe(expected)
    })
  })
})
