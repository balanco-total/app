export const COLOR_MAP: Record<string, string> = {
  'bg-orange-500': '#f97316',
  'bg-blue-500':   '#3b82f6',
  'bg-red-500':    '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-green-500':  '#22c55e',
  'bg-indigo-500': '#6366f1',
  'bg-pink-500':   '#ec4899',
  'bg-gray-500':   '#6b7280',
  'bg-yellow-500': '#eab308',
  'bg-teal-500':   '#14b8a6',
  'bg-cyan-500':   '#06b6d4',
  'bg-rose-500':   '#f43f5e',
}

export const FALLBACK_COLORS = [
  '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#eab308', '#06b6d4',
]

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const fmt = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtAxis = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`

/**
 * The month ('YYYY-MM') a lançamento counts toward in the charts.
 *
 * A credit-card lançamento is attributed to its fatura's due month
 * (`reference_month`), NOT its purchase date — a purchase on Jul 25 whose fatura
 * is due Aug 10 is August spending. Non-card expenses count in their own date
 * month. This mirrors how the Dashboard folds faturas into the month, so the two
 * screens agree and a card lançamento is never counted twice (once by purchase
 * date and again via its fatura).
 */
export function effectiveMonth(e: {
  date: string
  credit_card_invoice_id?: string | null
  credit_card_invoices?: { reference_month?: string | null; due_date?: string | null } | null
}): string {
  const inv = e.credit_card_invoices
  if (e.credit_card_invoice_id && inv) {
    if (inv.reference_month) return inv.reference_month
    if (inv.due_date) return inv.due_date.slice(0, 7)
  }
  return e.date.slice(0, 7)
}
