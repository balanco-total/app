'use client'

import { useState } from 'react'
import { AlertCircle, X, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

type BillingBannerProps = {
  subscriptionStatus: string
  trialEndsAt: string
  isOwner: boolean
}

function daysRemaining(trialEndsAt: string): number {
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function BillingBanner({ subscriptionStatus, trialEndsAt, isOwner }: BillingBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (subscriptionStatus === 'active' || dismissed) return null

  const days = daysRemaining(trialEndsAt)
  const isExpired = days === 0

  const bgClass = isExpired
    ? 'bg-red-50 border-red-200 text-red-700'
    : days <= 3
      ? 'bg-orange-50 border-orange-200 text-orange-700'
      : 'bg-amber-50 border-amber-200 text-amber-700'

  const iconClass = isExpired ? 'text-red-500' : days <= 3 ? 'text-orange-500' : 'text-amber-500'

  let message: string
  if (isExpired) {
    message = isOwner
      ? 'Seu período de teste encerrou. Assine para continuar.'
      : 'Período de teste encerrado. Aguarde o responsável assinar o plano.'
  } else if (days === 1) {
    message = isOwner
      ? 'Último dia de teste! Assine agora para não perder o acesso.'
      : 'Último dia de teste da conta.'
  } else {
    message = isOwner
      ? `${days} dias restantes no período de teste. Assine para garantir o acesso.`
      : `${days} dias restantes no período de teste da conta.`
  }

  return (
    <div className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 mb-4 ${bgClass}`}>
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle size={18} className={`shrink-0 ${iconClass}`} />
        <span className="text-sm font-medium truncate">{message}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isOwner && (
          <button
            onClick={() => router.push('/app/billing')}
            className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
          >
            <CreditCard size={14} />
            Assinar
          </button>
        )}
        {!isExpired && (
          <button
            onClick={() => setDismissed(true)}
            className="text-current opacity-50 hover:opacity-100 transition"
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
