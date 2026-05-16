import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'

export function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR')
}

export function formatCurrency(amount: number) {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function statusLabel(status: string | null) {
  switch (status) {
    case 'paid':          return { label: 'Pago',         color: 'text-emerald-600 bg-emerald-50' }
    case 'open':          return { label: 'Em aberto',    color: 'text-amber-600 bg-amber-50' }
    case 'void':          return { label: 'Cancelada',    color: 'text-gray-500 bg-gray-100' }
    case 'uncollectible': return { label: 'Não cobrada',  color: 'text-red-600 bg-red-50' }
    default:              return { label: status ?? '—',  color: 'text-gray-500 bg-gray-100' }
  }
}

export function subscriptionStatusLabel(status: string) {
  switch (status) {
    case 'active':    return { label: 'Ativo',               icon: CheckCircle2,   color: 'text-emerald-600' }
    case 'trialing':  return { label: 'Período de teste',    icon: Clock,          color: 'text-amber-600' }
    case 'past_due':  return { label: 'Pagamento pendente',  icon: AlertTriangle,  color: 'text-red-600' }
    case 'canceled':  return { label: 'Cancelado',           icon: XCircle,        color: 'text-gray-500' }
    default:          return { label: status,                icon: Clock,          color: 'text-gray-500' }
  }
}
