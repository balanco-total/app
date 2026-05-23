export { MAX_CENTS, applyMask, parseMasked, FIELD_PATTERN } from '@/lib/utils'

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-500' },
  { name: 'Transporte', color: 'bg-blue-500' },
  { name: 'Saúde', color: 'bg-red-500' },
  { name: 'Lazer', color: 'bg-purple-500' },
  { name: 'Moradia', color: 'bg-green-500' },
  { name: 'Educação', color: 'bg-indigo-500' },
  { name: 'Vestuário', color: 'bg-pink-500' },
  { name: 'Outros', color: 'bg-gray-500' },
]

export const CATEGORY_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500',
  'bg-green-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500',
  'bg-yellow-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500',
]

export const AVATAR_COLORS = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316',
  '#ef4444', '#14b8a6', '#6366f1', '#ec4899',
]

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTHS_PT_LOWER = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function toLocalDateDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

export function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function parseDateDisplay(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length < 8) return ''
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8)
  const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  if (parsed.getDate() !== parseInt(d) || parsed.getMonth() !== parseInt(m) - 1) return ''
  return `${y}-${m}-${d}`
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function getAvatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}