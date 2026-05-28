'use client'

import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import DashboardHeader from './dashboard/DashboardHeader'
import PlanSummary from './plan/PlanSummary'
import InvoiceHistory from './plan/InvoiceHistory'
import CancelSubscription from './plan/CancelSubscription'
import type { Profile, BillingData } from './plan/types'

export default function PlanPage({ profile }: { profile: Profile }) {
  const [data, setData] = useState<BillingData | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetch('/api/billing/invoices')
      .then(r => r.json())
      .then(d => { if (d.error) setLoadError(d.error); else setData(d) })
      .catch(() => setLoadError('Erro ao carregar dados de cobrança.'))
  }, [])

  const showCancel = profile.role === 'owner'
    && data?.status === 'active'
    && !data?.cancelAtPeriodEnd

  return (
    <div className="min-h-screen bg-white dark:bg-dm-surface p-4">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader profile={profile} />

        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-dm-text mb-5 flex items-center gap-2">
              <CreditCard size={20} className="text-emerald-600 shrink-0" />
              Meu plano
            </h1>

            {loadError && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg px-4 py-2 mb-4">
                {loadError}
              </p>
            )}

            {!data && !loadError && (
              <div className="py-8 text-center text-gray-400 dark:text-dm-muted text-sm">Carregando...</div>
            )}

            {data && (
              <>
                <PlanSummary data={data} />
                <InvoiceHistory invoices={data.invoices} />
                {showCancel && <CancelSubscription />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
