import { formatDate, subscriptionStatusLabel } from './helpers'
import type { BillingData } from './types'

export default function PlanSummary({ data }: { data: BillingData }) {
  const statusInfo = subscriptionStatusLabel(data.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="border border-gray-100 rounded-xl p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Plano atual</p>
          <p className="font-semibold text-gray-800">Plano Mensal — R$ 7,99/mês</p>
        </div>
        <div className="flex flex-row sm:flex-col sm:items-end items-center gap-2 sm:gap-1">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${statusInfo.color}`}>
            <StatusIcon size={15} />
            {statusInfo.label}
          </span>
          {data.status === 'active' && data.nextBillingDate && !data.cancelAtPeriodEnd && (
            <p className="text-xs text-gray-400">
              Próxima cobrança: {formatDate(data.nextBillingDate)}
            </p>
          )}
          {data.cancelAtPeriodEnd && data.nextBillingDate && (
            <p className="text-xs text-amber-600">
              Cancela em: {formatDate(data.nextBillingDate)}
            </p>
          )}
          {data.status === 'trialing' && (
            <p className="text-xs text-gray-400">
              Teste encerra em: {new Date(data.trialEndsAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
