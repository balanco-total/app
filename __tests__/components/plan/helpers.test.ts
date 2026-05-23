import { formatDate, formatCurrency, statusLabel, subscriptionStatusLabel } from '@/components/plan/helpers'

describe('components/plan/helpers', () => {
  describe('formatDate', () => {
    it('formats Unix seconds in pt-BR', () => {
      // 2026-05-22 12:00:00 UTC = 1779788800
      const ts = Math.floor(new Date('2026-05-22T12:00:00.000Z').getTime() / 1000)
      const result = formatDate(ts)
      // Expect DD/MM/YYYY shape
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('formatCurrency', () => {
    it('returns a BRL-formatted currency string', () => {
      const result = formatCurrency(7.99)
      expect(result).toContain('7,99')
      expect(result).toMatch(/R\$/)
    })
  })

  describe('statusLabel', () => {
    it.each([
      ['paid', 'Pago'],
      ['open', 'Em aberto'],
      ['void', 'Cancelada'],
      ['uncollectible', 'Não cobrada'],
    ])('maps %s → %s', (status, label) => {
      expect(statusLabel(status).label).toBe(label)
    })

    it('falls back to em-dash for null', () => {
      expect(statusLabel(null).label).toBe('—')
    })

    it('falls back to the input for an unknown status', () => {
      expect(statusLabel('foo').label).toBe('foo')
    })
  })

  describe('subscriptionStatusLabel', () => {
    it.each([
      ['active', 'Ativo'],
      ['trialing', 'Período de teste'],
      ['past_due', 'Pagamento pendente'],
      ['canceled', 'Cancelado'],
    ])('maps %s → %s', (status, label) => {
      expect(subscriptionStatusLabel(status).label).toBe(label)
    })

    it('returns an icon component for all known statuses', () => {
      ;['active', 'trialing', 'past_due', 'canceled'].forEach(s => {
        expect(typeof subscriptionStatusLabel(s).icon).toBe('object')
      })
    })

    it('falls back to the input string for unknown status', () => {
      expect(subscriptionStatusLabel('weird').label).toBe('weird')
    })
  })
})
