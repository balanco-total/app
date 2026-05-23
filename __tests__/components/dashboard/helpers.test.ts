import {
  toLocalDateStr,
  toLocalDateDisplay,
  applyDateMask,
  parseDateDisplay,
  getInitials,
  getAvatarColor,
  AVATAR_COLORS,
  DEFAULT_CATEGORIES,
  CATEGORY_COLORS,
  MONTHS_PT,
  MONTHS_PT_LOWER,
} from '@/components/dashboard/helpers'

describe('components/dashboard/helpers', () => {
  describe('toLocalDateStr', () => {
    it('formats a Date as YYYY-MM-DD with zero padding', () => {
      expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
    })

    it('handles December correctly (month + 1)', () => {
      expect(toLocalDateStr(new Date(2026, 11, 31))).toBe('2026-12-31')
    })
  })

  describe('toLocalDateDisplay', () => {
    it('formats a Date as DD/MM/YYYY', () => {
      expect(toLocalDateDisplay(new Date(2026, 0, 5))).toBe('05/01/2026')
    })
  })

  describe('applyDateMask', () => {
    it('returns plain digits for 1–2 chars', () => {
      expect(applyDateMask('1')).toBe('1')
      expect(applyDateMask('15')).toBe('15')
    })

    it('inserts first slash after day', () => {
      expect(applyDateMask('150')).toBe('15/0')
      expect(applyDateMask('1503')).toBe('15/03')
    })

    it('inserts second slash after month', () => {
      expect(applyDateMask('15032026')).toBe('15/03/2026')
    })

    it('strips non-digits before masking', () => {
      expect(applyDateMask('15/03/2026')).toBe('15/03/2026')
    })

    it('clamps at 8 digits', () => {
      expect(applyDateMask('150320261111')).toBe('15/03/2026')
    })
  })

  describe('parseDateDisplay', () => {
    it('returns ISO date for a valid display value', () => {
      expect(parseDateDisplay('15/03/2026')).toBe('2026-03-15')
    })

    it('returns empty string when input is too short', () => {
      expect(parseDateDisplay('15/03')).toBe('')
    })

    it('returns empty string for an invalid date (e.g. 31/02)', () => {
      expect(parseDateDisplay('31/02/2026')).toBe('')
    })

    it('strips non-digits before parsing', () => {
      expect(parseDateDisplay('15-03-2026')).toBe('2026-03-15')
    })
  })

  describe('getInitials', () => {
    it('returns the first letter of the first two words, uppercased', () => {
      expect(getInitials('Gilglecio Oliveira')).toBe('GO')
    })

    it('returns a single letter for a one-word name', () => {
      expect(getInitials('Maria')).toBe('M')
    })

    it('takes only the first two words for names with 3+ words', () => {
      expect(getInitials('Ana Carolina Souza')).toBe('AC')
    })
  })

  describe('getAvatarColor', () => {
    it('returns a color from AVATAR_COLORS', () => {
      const color = getAvatarColor('Alice')
      expect(AVATAR_COLORS).toContain(color)
    })

    it('is deterministic for the same name', () => {
      expect(getAvatarColor('Bob')).toBe(getAvatarColor('Bob'))
    })

    it('returns a valid color even for an empty name', () => {
      const color = getAvatarColor('')
      expect(AVATAR_COLORS).toContain(color)
    })
  })

  describe('constants', () => {
    it('DEFAULT_CATEGORIES has 8 entries', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(8)
      expect(DEFAULT_CATEGORIES[0]).toEqual({ name: 'Alimentação', color: 'bg-orange-500' })
    })

    it('CATEGORY_COLORS has 12 entries', () => {
      expect(CATEGORY_COLORS).toHaveLength(12)
    })

    it('MONTHS_PT has 12 entries starting with Janeiro', () => {
      expect(MONTHS_PT).toHaveLength(12)
      expect(MONTHS_PT[0]).toBe('Janeiro')
      expect(MONTHS_PT[11]).toBe('Dezembro')
    })

    it('MONTHS_PT_LOWER matches MONTHS_PT lowercased', () => {
      expect(MONTHS_PT_LOWER).toEqual(MONTHS_PT.map(m => m.toLowerCase()))
    })
  })
})
