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
