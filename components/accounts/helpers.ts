export const MAX_CENTS = 100_000_000

export function applyMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const cents = Math.min(parseInt(digits, 10), MAX_CENTS)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseMasked(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}
