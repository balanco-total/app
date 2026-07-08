import { invoiceCycleForDate } from '@/lib/credit-card'

describe('lib/credit-card', () => {
  describe('invoiceCycleForDate', () => {
    it('purchase before closing day → closes this month, due next month (close 28 / due 5)', () => {
      expect(invoiceCycleForDate('2026-07-15', 28, 5)).toEqual({
        reference_month: '2026-08',
        closing_date: '2026-07-28',
        due_date: '2026-08-05',
      })
    })

    it('purchase after closing day → rolls to next month cycle', () => {
      expect(invoiceCycleForDate('2026-07-29', 28, 5)).toEqual({
        reference_month: '2026-09',
        closing_date: '2026-08-28',
        due_date: '2026-09-05',
      })
    })

    it('purchase exactly on the closing day still closes this month', () => {
      expect(invoiceCycleForDate('2026-07-28', 28, 5)).toEqual({
        reference_month: '2026-08',
        closing_date: '2026-07-28',
        due_date: '2026-08-05',
      })
    })

    it('due day after closing day → due in the same month as closing (close 5 / due 20)', () => {
      expect(invoiceCycleForDate('2026-07-03', 5, 20)).toEqual({
        reference_month: '2026-07',
        closing_date: '2026-07-05',
        due_date: '2026-07-20',
      })
    })

    it('equal closing and due day → due next month', () => {
      expect(invoiceCycleForDate('2026-07-10', 10, 10)).toEqual({
        reference_month: '2026-08',
        closing_date: '2026-07-10',
        due_date: '2026-08-10',
      })
    })

    it('rolls across the year boundary (December → January)', () => {
      expect(invoiceCycleForDate('2026-12-30', 28, 5)).toEqual({
        reference_month: '2027-02',
        closing_date: '2027-01-28',
        due_date: '2027-02-05',
      })
    })

    it('clamps closing day 31 to the last day of a short month (February)', () => {
      // Purchase on Feb 20, closing day 31 → clamps to Feb 28 (2026 is not a leap year)
      expect(invoiceCycleForDate('2026-02-20', 31, 10)).toEqual({
        reference_month: '2026-03',
        closing_date: '2026-02-28',
        due_date: '2026-03-10',
      })
    })

    it('clamps closing day 29 in a leap-year February', () => {
      expect(invoiceCycleForDate('2028-02-15', 29, 8)).toEqual({
        reference_month: '2028-03',
        closing_date: '2028-02-29',
        due_date: '2028-03-08',
      })
    })

    it('clamps due day 31 to the last day of the due month', () => {
      // Close 15 Jun, due day 31 (> closing) → same month, clamps to Jun 30
      expect(invoiceCycleForDate('2026-06-10', 15, 31)).toEqual({
        reference_month: '2026-06',
        closing_date: '2026-06-15',
        due_date: '2026-06-30',
      })
    })

    it('accepts a full ISO timestamp and uses only the date part', () => {
      expect(invoiceCycleForDate('2026-07-15T12:00:00.000Z', 28, 5)).toEqual({
        reference_month: '2026-08',
        closing_date: '2026-07-28',
        due_date: '2026-08-05',
      })
    })

    it('maps consecutive installment months to consecutive invoices', () => {
      const base = ['2026-07-10', '2026-08-10', '2026-09-10']
      const refs = base.map(d => invoiceCycleForDate(d, 28, 5).reference_month)
      expect(refs).toEqual(['2026-08', '2026-09', '2026-10'])
    })
  })
})
